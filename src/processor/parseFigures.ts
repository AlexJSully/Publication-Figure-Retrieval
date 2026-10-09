import path from "path";
import xml2js from "xml2js";
import type { PMCArticleSet, ThrottleFunction } from "../types";
import { downloadArticleImages } from "./downloadArticleImages";
import { ArticleNotInDatasetError } from "./fetchArticleMetadata";

/**
 * Parses XML data to extract PMC IDs and download each article's figure images.
 *
 * This function processes the provided XML data, extracts the PMC ID of each article, and downloads the
 * article's images from the PMC Cloud Service, one article at a time.
 *
 * @returns {Promise<string[]>} A promise that resolves, once every article has been processed, with the PMC IDs
 * of the articles whose images were retrieved or which are not in the PMC Article Datasets. Articles that failed
 * for any other reason are left out so they can be retried.
 *
 * @example
 * const throttle = throttledQueue({ maxPerInterval: 2, interval: 1000 });
 * const xmlData = "<xml>mock data</xml>";
 * const species = "Homo sapiens";
 * const handledIds = await parseFigures(throttle, xmlData, species);
 *
 * @see https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/
 */
export async function parseFigures(
	/** The throttling function to control the rate of downloads. */
	throttle: ThrottleFunction,
	/** The XML data containing article information. */
	xmlData: string,
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<string[]> {
	/** Parser instance to parse the XML data. */
	const parser = new xml2js.Parser();
	let result: PMCArticleSet;

	try {
		result = await parser.parseStringPromise(xmlData);
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error("Error parsing XML:", errorMessage, { species });

		return [];
	}

	// Extract articles from parsed XML data
	const articles = result?.["pmc-articleset"]?.article;
	if (!articles) {
		console.log("No articles found in the response.");
		return [];
	}

	const handledIds: string[] = [];

	for (const article of articles) {
		const pmcIdObj = article.front?.[0]?.["article-meta"]?.[0]?.["article-id"]?.find(
			(id) => id.$?.["pub-id-type"] === "pmc" || id.$?.["pub-id-type"] === "pmcid",
		);

		const pmcId = pmcIdObj?._;

		if (!pmcId) {
			console.log("Skipping article: PMC ID not found.");
			continue;
		}

		console.log(`Processing article PMC ID: ${pmcId}`);

		const outputDir = path.join(__dirname, "../output", species, pmcId);

		try {
			await downloadArticleImages(throttle, pmcId, outputDir);
			console.log(`Successfully processed article images for ${pmcId}`);
			handledIds.push(pmcId);
		} catch (error: unknown) {
			if (error instanceof ArticleNotInDatasetError) {
				console.log(`Article ${pmcId} is not in the PMC Article Datasets and has no images to download.`);
				handledIds.push(pmcId);
				continue;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to download article images for ${pmcId}: ${errorMessage}`, { pmcId, species });
		}
	}

	return handledIds;
}
