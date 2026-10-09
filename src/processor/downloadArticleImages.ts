import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
	IMAGE_EXTENSION_PATTERN,
	IMAGE_EXTENSION_PRIORITY,
	PMC_CLOUD_BASE_URL,
	PMC_CLOUD_BUCKET,
	PMC_CLOUD_REQUEST_TIMEOUT_MS,
	PMC_ID_PATTERN,
} from "../constants";
import type { ArticleMetadata, ThrottleFunction } from "../types";
import { fetchArticleMetadata } from "./fetchArticleMetadata";

/** An image object in the PMC Cloud Service bucket. */
interface ImageObject {
	/** Object key, "<pmcid>.<version>/<fileName>". */
	key: string;
	/** File name, without any directory part. */
	fileName: string;
	/** Expected hex MD5 digest, or null when the metadata lists none. */
	md5: string | null;
}

/**
 * Downloads the figure images of a PMC article from the PMC Cloud Service into `outputDir`.
 *
 * Images are taken from the media files listed in the latest article version's metadata. Where one figure exists
 * in several formats, only the highest-priority extension is downloaded. Each image is checked against the MD5
 * digest the metadata lists for it, and only verified images are written.
 *
 * @param throttle - Throttling function to limit the metadata request rate
 * @param pmcId - PMC ID of the article (with or without "PMC" prefix)
 * @param outputDir - Directory where images will be saved; created only when an image is written
 * @returns Promise that resolves with the file names of the images written
 * @throws Error if the PMC ID is not "PMC" followed by digits, or digits alone
 * @throws ArticleNotInDatasetError if the article has no version in the PMC Article Datasets
 * @throws Error if the metadata cannot be fetched, or if any image fails to download or verify
 *
 * @see https://pmc-oa-opendata.s3.amazonaws.com/README.txt
 * @see https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/
 */
export async function downloadArticleImages(
	throttle: ThrottleFunction,
	pmcId: string,
	outputDir: string,
): Promise<string[]> {
	// The PMC ID comes from fetched article XML, is put into request URLs, and callers build `outputDir` from it
	if (typeof pmcId !== "string" || !PMC_ID_PATTERN.test(pmcId)) {
		throw new Error(`Invalid PMC ID: ${JSON.stringify(pmcId)}`);
	}

	console.log(`Fetching metadata for ${pmcId}...`);
	const metadata = await throttle(async () => await fetchArticleMetadata(pmcId));
	const images = selectImages(metadata);

	if (images.length === 0) {
		console.log(`No images found for ${pmcId}.`);
		return [];
	}

	const written: string[] = [];

	for (const image of images) {
		try {
			await downloadImage(image, outputDir);
			written.push(image.fileName);
			console.log(`Downloaded image: ${image.fileName}`);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to download image ${image.fileName} for ${pmcId}: ${errorMessage}`);
		}
	}

	const failedCount = images.length - written.length;
	if (failedCount > 0) {
		throw new Error(`${failedCount} of ${images.length} images failed for ${pmcId}`);
	}

	console.log(`Successfully downloaded ${written.length} images for ${pmcId}.`);
	return written;
}

/**
 * Returns the images listed in the metadata's media URLs, keeping one file per figure by extension priority.
 * Media outside the bucket or outside the article version's own prefix is ignored.
 */
function selectImages(metadata: ArticleMetadata): ImageObject[] {
	const versionPrefix = `${metadata.pmcid}.${metadata.version}/`;
	const figures = new Map<string, ImageObject>();

	for (const mediaUrl of metadata.media_urls ?? []) {
		const image = parseImageUrl(mediaUrl, versionPrefix);
		if (!image) continue;

		const extension = path.extname(image.fileName);
		const baseName = path.basename(image.fileName, extension);
		const current = figures.get(baseName);

		if (!current || extensionPriority(image.fileName) < extensionPriority(current.fileName)) {
			figures.set(baseName, image);
		}
	}

	return [...figures.values()];
}

/** Returns the image object an S3 media URL names, or undefined when it is not an image under `versionPrefix`. */
function parseImageUrl(mediaUrl: string, versionPrefix: string): ImageObject | undefined {
	let url: URL;
	try {
		url = new URL(mediaUrl);
	} catch {
		return undefined;
	}

	if (url.protocol !== "s3:" || url.hostname !== PMC_CLOUD_BUCKET) return undefined;

	const key = url.pathname.slice(1);
	if (!key.startsWith(versionPrefix)) return undefined;

	const fileName = key.slice(versionPrefix.length);
	if (fileName.includes("/") || !IMAGE_EXTENSION_PATTERN.test(fileName)) return undefined;

	return { key, fileName, md5: url.searchParams.get("md5") };
}

/** Returns the priority of a file's image extension; lower numbers are preferred. */
function extensionPriority(fileName: string): number {
	return IMAGE_EXTENSION_PRIORITY[path.extname(fileName).slice(1).toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
}

/** Downloads one image, verifies its MD5 digest, and writes it to `outputDir`. */
async function downloadImage(image: ImageObject, outputDir: string): Promise<void> {
	if (!image.md5) {
		throw new Error("the metadata lists no MD5 digest to verify against");
	}

	const response = await axios.get<ArrayBuffer>(`${PMC_CLOUD_BASE_URL}/${image.key}`, {
		responseType: "arraybuffer",
		timeout: PMC_CLOUD_REQUEST_TIMEOUT_MS,
	});
	const content = Buffer.from(response.data);
	const digest = crypto.createHash("md5").update(content).digest("hex");

	if (digest !== image.md5) {
		throw new Error(`MD5 mismatch (expected ${image.md5}, got ${digest})`);
	}

	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(path.join(outputDir, image.fileName), content);
}
