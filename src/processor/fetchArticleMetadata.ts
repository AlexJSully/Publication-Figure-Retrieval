import axios from "axios";
import xml2js from "xml2js";
import { PMC_CLOUD_BASE_URL, PMC_CLOUD_REQUEST_TIMEOUT_MS, PMC_ID_PATTERN } from "../constants";
import type { ArticleMetadata } from "../types";

/** Error thrown when an article has no version in the PMC Article Datasets. */
export class ArticleNotInDatasetError extends Error {
	/** Creates the error for `pmcId`, naming the article in its message. */
	constructor(pmcId: string) {
		super(`Article ${pmcId} is not in the PMC Article Datasets`);
		this.name = "ArticleNotInDatasetError";
	}
}

/**
 * Throws unless `pmcId` is a string of "PMC" followed by digits, or digits alone.
 *
 * PMC IDs come from fetched article XML and are put into request URLs and file paths.
 *
 * @throws Error if the PMC ID does not match {@link PMC_ID_PATTERN}
 */
export function assertValidPmcId(pmcId: unknown): asserts pmcId is string {
	if (typeof pmcId !== "string" || !PMC_ID_PATTERN.test(pmcId)) {
		throw new Error(`Invalid PMC ID: ${JSON.stringify(pmcId)}`);
	}
}

/** Returns the PMC ID with its "PMC" prefix, adding it to a digits-only ID. */
export function withPmcPrefix(pmcId: string): string {
	return pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;
}

/**
 * Fetches the metadata JSON of an article's latest version from the PMC Cloud Service.
 *
 * Versions are found by listing the bucket under the "<pmcid>." prefix, since not every article has a version 1.
 *
 * @param pmcId - The PMC ID, with or without the "PMC" prefix
 * @returns Metadata of the highest-numbered article version
 * @throws Error if the PMC ID is not "PMC" followed by digits, or digits alone
 * @throws ArticleNotInDatasetError if the article has no version in the dataset
 * @throws Error if a request to the bucket fails, or the metadata names a different article version
 *
 * @see https://pmc-oa-opendata.s3.amazonaws.com/README.txt
 * @see https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/
 */
export async function fetchArticleMetadata(pmcId: string): Promise<ArticleMetadata> {
	assertValidPmcId(pmcId);
	const pmcIdWithPrefix = withPmcPrefix(pmcId);

	try {
		const listing = await axios.get(PMC_CLOUD_BASE_URL, {
			params: { "list-type": 2, prefix: `${pmcIdWithPrefix}.`, delimiter: "/" },
			timeout: PMC_CLOUD_REQUEST_TIMEOUT_MS,
		});
		const version = await latestVersion(listing.data, pmcIdWithPrefix);

		if (version === undefined) {
			throw new ArticleNotInDatasetError(pmcIdWithPrefix);
		}

		const metadata = await axios.get<ArticleMetadata>(
			`${PMC_CLOUD_BASE_URL}/metadata/${pmcIdWithPrefix}.${version}.json`,
			{ timeout: PMC_CLOUD_REQUEST_TIMEOUT_MS },
		);

		// Image selection trusts these fields to scope media to this article version
		const { pmcid, version: metadataVersion } = metadata.data;
		if (pmcid !== pmcIdWithPrefix || metadataVersion !== version) {
			throw new Error(`Metadata names ${pmcid}.${metadataVersion}, not ${pmcIdWithPrefix}.${version}`);
		}

		return metadata.data;
	} catch (error) {
		if (error instanceof ArticleNotInDatasetError) {
			throw error;
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to fetch metadata for ${pmcIdWithPrefix}: ${errorMessage}`);
	}
}

/** Returns the highest version number among the "<pmcid>.<version>/" prefixes in an S3 ListObjectsV2 response. */
async function latestVersion(listingXml: string, pmcId: string): Promise<number | undefined> {
	const result = await xml2js.parseStringPromise(listingXml);
	const commonPrefixes: Array<{ Prefix?: string[] }> = result?.ListBucketResult?.CommonPrefixes ?? [];
	const versionStart = `${pmcId}.`.length;

	const versions = commonPrefixes
		.map((commonPrefix) => commonPrefix.Prefix?.[0] ?? "")
		.filter((prefix) => prefix.startsWith(`${pmcId}.`) && prefix.endsWith("/"))
		.map((prefix) => prefix.slice(versionStart, -1))
		.filter((version) => /^\d+$/.test(version))
		.map(Number);

	return versions.length > 0 ? Math.max(...versions) : undefined;
}
