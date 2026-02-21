import path from "path";
import xml2js from "xml2js";
import type { PMCArticleSet, ThrottleFunction } from "../types";
import { downloadArticlePackage } from "./downloadArticlePackage";

/**
 * Parses XML data to extract PMC IDs and download article packages containing figures.
 *
 * This function processes the provided XML data, extracts PMC IDs for each article,
 * and downloads complete article packages from the PMC Open Access FTP service.
 * The packages are extracted to retrieve all figure images.
 *
 * Note: As of NCBI's infrastructure migration, direct image URLs are no longer available.
 * Images must be downloaded from article package files (.tar.gz) which contain all
 * media files for an article.
 *
 * @returns {Promise<void>} A promise that resolves when all article packages have been processed.
 *
 * @example
 * const throttle = throttledQueue(2, 1000);
 * const xmlData = "<xml>mock data</xml>";
 * const species = "Homo sapiens";
 * await parseFigures(throttle, xmlData, species);
 *
 * @see https://pmc.ncbi.nlm.nih.gov/tools/oa-service/
 * @see https://pmc.ncbi.nlm.nih.gov/tools/ftp/
 */
export async function parseFigures(
	/** The throttling function to control the rate of downloads. */
	throttle: ThrottleFunction,
	/** The XML data containing article information. */
	xmlData: string,
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<void> {
	/** Parser instance to parse the XML data. */
	const parser = new xml2js.Parser();

	parser.parseString(xmlData, async (err: Error | null, result: PMCArticleSet) => {
		if (err) {
			console.error("Error parsing XML:", err.message, { species });
			return;
		}

		// Extract articles from parsed XML data
		const articles = result["pmc-articleset"].article;
		if (!articles) {
			console.log("No articles found in the response.");
			return;
		}

		// Process each article to download the complete package including all figures
		for (const article of articles) {
			const pmcIdObj = article.front[0]["article-meta"][0]["article-id"].find(
				(id) => id.$["pub-id-type"] === "pmcid",
			);

			if (!pmcIdObj) {
				console.log("Skipping article: PMC ID not found.");
				continue;
			}

			const pmcId = pmcIdObj._;
			console.log(`Processing article PMC ID: ${pmcId}`);

			// Create the output directory for species and PMC ID
			const outputDir = path.join(__dirname, "../output", species, pmcId);

			try {
				// Download complete article package and extract all images
				await throttle(async () => await downloadArticlePackage(throttle, pmcId, outputDir));
				console.log(`Successfully processed article package for ${pmcId}`);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`Failed to download article package for ${pmcId}: ${errorMessage}`, { pmcId, species });

				// Check if it's an Open Access issue
				if (errorMessage.includes("Open Access subset")) {
					console.log(`Article ${pmcId} is not in the Open Access subset and cannot be downloaded via FTP.`);
				}
			}
		}
	});
}
