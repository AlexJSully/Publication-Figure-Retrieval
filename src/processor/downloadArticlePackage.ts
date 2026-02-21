import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { IMAGE_EXTENSIONS, IMAGE_EXTENSION_PRIORITY } from "../constants";
import type { ThrottleFunction } from "../types";
import { fetchPackageUrl } from "./fetchPackageUrl";

const execAsync = promisify(exec);

/**
 * Downloads a complete PMC article package (tar.gz) and extracts image files.
 *
 * NCBI has migrated to a new image serving infrastructure where direct image URLs
 * are no longer predictable. Instead, images must be downloaded from article
 * package files (.tar.gz) available via the PMC Open Access FTP service.
 *
 * @param throttle - Throttling function to limit HTTP request rate
 * @param pmcId - PMC ID of the article (with or without "PMC" prefix)
 * @param outputDir - Directory where extracted images will be saved
 * @returns Promise that resolves with array of extracted image filenames
 * @throws Error if the article is not in the Open Access subset or download fails
 *
 * @see https://pmc.ncbi.nlm.nih.gov/tools/oa-service/
 * @see https://pmc.ncbi.nlm.nih.gov/tools/ftp/
 */
export async function downloadArticlePackage(
	throttle: ThrottleFunction,
	pmcId: string,
	outputDir: string,
): Promise<string[]> {
	// Fetch package URL from OA Web Service API
	console.log(`Fetching package URL for ${pmcId}...`);
	const packageInfo = await fetchPackageUrl(pmcId);

	if (!packageInfo.tgzUrl) {
		throw new Error(`No downloadable package found for ${pmcId}. Article may not be in Open Access subset.`);
	}

	// Create output directory if it doesn't exist
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Download tar.gz file to a temporary location
	const tempDir = path.join(outputDir, ".temp");
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	const tempTarPath = path.join(tempDir, `${pmcId}.tar.gz`);

	console.log(`Downloading package from ${packageInfo.tgzUrl}...`);

	// Download the tar.gz file
	const response = await throttle(
		async () =>
			await axios({
				url: packageInfo.tgzUrl!,
				method: "GET",
				responseType: "stream",
			}),
	);

	const writer = fs.createWriteStream(tempTarPath);
	response.data.pipe(writer);

	await new Promise<void>((resolve, reject) => {
		writer.on("finish", resolve);
		writer.on("error", reject);
	});

	console.log(`Package downloaded. Extracting images...`);

	// Extract tar.gz to temporary directory
	await execAsync(`tar -xzf "${tempTarPath}" -C "${tempDir}"`);

	// Find extracted image files and deduplicate based on extension priority
	const extractedPackageDir = path.join(tempDir, pmcId);
	const extractedImages: string[] = [];

	if (fs.existsSync(extractedPackageDir)) {
		const files = fs.readdirSync(extractedPackageDir);

		// Group files by base name (without extension)
		const fileGroups = new Map<string, Array<{ file: string; ext: string; priority: number }>>();

		for (const file of files) {
			const ext = path.extname(file).toLowerCase().slice(1); // Remove leading dot

			// Check if this is a supported image extension
			if (IMAGE_EXTENSIONS.includes(ext as any)) {
				const baseName = path.basename(file, path.extname(file));
				const priority = IMAGE_EXTENSION_PRIORITY[ext] ?? 999;

				if (!fileGroups.has(baseName)) {
					fileGroups.set(baseName, []);
				}
				fileGroups.get(baseName)!.push({ file, ext, priority });
			}
		}

		// For each group, select the file with the highest priority (lowest priority number)
		for (const [, versions] of fileGroups) {
			versions.sort((a, b) => a.priority - b.priority);
			const selectedFile = versions[0].file;

			const sourcePath = path.join(extractedPackageDir, selectedFile);
			const destPath = path.join(outputDir, selectedFile);

			// Copy selected image to output directory
			fs.copyFileSync(sourcePath, destPath);
			extractedImages.push(selectedFile);
			console.log(`Extracted image: ${selectedFile} (priority: ${versions[0].ext})`);

			if (versions.length > 1) {
				const skipped = versions
					.slice(1)
					.map((v) => `${v.file} (${v.ext})`)
					.join(", ");
				console.log(`  Skipped duplicates: ${skipped}`);
			}
		}
	}

	// Clean up temporary files
	fs.rmSync(tempDir, { recursive: true, force: true });

	console.log(`Successfully extracted ${extractedImages.length} images from package.`);
	return extractedImages;
}
