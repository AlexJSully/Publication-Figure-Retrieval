/**
 * Fetch PMC article package URL from the OA Web Service API
 *
 * NCBI has migrated image serving to a new CDN infrastructure where direct image URLs
 * cannot be constructed. Instead, images must be downloaded from article package files
 * available via the PMC Open Access FTP service.
 *
 * @see https://pmc.ncbi.nlm.nih.gov/tools/oa-service/
 * @see https://pmc.ncbi.nlm.nih.gov/tools/ftp/
 */
import axios from "axios";
import * as xml2js from "xml2js";

const OA_API_BASE_URL = "https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi";

export interface PackageInfo {
	pmcId: string;
	tgzUrl?: string;
	pdfUrl?: string;
	license?: string;
	citation?: string;
	retracted?: string;
}

/**
 * Fetch package URL for a PMC article from the OA Web Service API
 *
 * @param pmcId - The PMC ID (with or without "PMC" prefix)
 * @returns Package information including tar.gz URL containing images
 * @throws Error if the API request fails or article is not in Open Access subset
 */
export async function fetchPackageUrl(pmcId: string): Promise<PackageInfo> {
	// Ensure PMC ID has the "PMC" prefix
	const pmcIdWithPrefix = pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;

	try {
		const response = await axios.get(OA_API_BASE_URL, {
			params: { id: pmcIdWithPrefix },
			timeout: 10000,
		});

		const parser = new xml2js.Parser({ explicitArray: false });
		const result = await parser.parseStringPromise(response.data);

		// Check if we got an error response
		if (result.OA?.error) {
			throw new Error(`OA API error: ${result.OA.error}`);
		}

		// Extract record information
		const records = result.OA?.records?.record;
		if (!records) {
			throw new Error(`Article ${pmcIdWithPrefix} not found in Open Access subset`);
		}

		// Handle both single record and array of records
		const record = Array.isArray(records) ? records[0] : records;

		const packageInfo: PackageInfo = {
			pmcId: pmcIdWithPrefix,
			license: record.$?.license,
			citation: record.$?.citation,
			retracted: record.$?.retracted,
		};

		// Extract download links
		if (record.link) {
			const links = Array.isArray(record.link) ? record.link : [record.link];
			for (const link of links) {
				if (link.$?.format === "tgz") {
					// Convert FTP URL to HTTPS URL for better compatibility
					packageInfo.tgzUrl = link.$?.href?.replace("ftp://", "https://");
				} else if (link.$?.format === "pdf") {
					packageInfo.pdfUrl = link.$?.href?.replace("ftp://", "https://");
				}
			}
		}

		if (!packageInfo.tgzUrl) {
			throw new Error(
				`No downloadable package found for ${pmcIdWithPrefix}. Article may not be in Open Access subset.`,
			);
		}

		return packageInfo;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			throw new Error(`Failed to fetch package URL for ${pmcIdWithPrefix}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Batch fetch package URLs for multiple PMC articles
 * Note: OA API doesn't support batch requests, so this makes individual requests
 * with throttling to respect rate limits
 *
 * @param pmcIds - Array of PMC IDs
 * @param delayMs - Delay between requests in milliseconds (default: 334ms = ~3 req/sec)
 * @returns Array of package information
 */
export async function fetchPackageUrlsBatch(pmcIds: string[], delayMs: number = 334): Promise<PackageInfo[]> {
	const results: PackageInfo[] = [];

	for (const pmcId of pmcIds) {
		try {
			const packageInfo = await fetchPackageUrl(pmcId);
			results.push(packageInfo);
		} catch (error) {
			console.error(`Error fetching package URL for ${pmcId}:`, error);
			// Continue with other PMC IDs even if one fails
		}

		// Add delay between requests to respect rate limits
		if (pmcIds.indexOf(pmcId) < pmcIds.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return results;
}
