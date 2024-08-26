import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { downloadImage } from "./downloadImage";
import { extractFigureUrls } from "./extractFigureUrls";

/**
 * Parses XML data to extract figure URLs and download the figures.
 *
 * This function processes the provided XML data, extracting figure URLs for each article.
 * It then downloads the figures to a specified directory structure based on species and PMC ID.
 *
 * @returns {Promise<void>} A promise that resolves when all figures have been processed and downloaded.
 *
 * @example
 * const throttle = throttledQueue(2, 1000);
 * const xmlData = "<xml>mock data</xml>";
 * const species = "Homo sapiens";
 * await parseFigures(throttle, xmlData, species);
 */
export async function parseFigures(
	/** The throttling function to control the rate of downloads. */
	throttle: any,
	/** The XML data containing article information. */
	xmlData: string,
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<void> {
	/** Parser instance to parse the XML data. */
	const parser = new xml2js.Parser();

	parser.parseString(xmlData, async (err: any, result: any) => {
		if (err) {
			console.error("Error parsing XML:", err);
			return;
		}

		// Extract articles from parsed XML data
		const articles = result["pmc-articleset"].article;
		if (!articles) {
			console.log("No articles found in the response.");
			return;
		}

		// Process each article to extract figures and download them
		for (const article of articles) {
			const pmcId = article.front[0]["article-meta"][0]["article-id"].find(
				(id: any) => id.$["pub-id-type"] === "pmc",
			)._;
			console.log(`Processing article PMC ID: ${pmcId}`);

			/** Array of figure URLs extracted from the article. */
			const figureUrls = extractFigureUrls(article, pmcId);
			console.log(`Found ${figureUrls.length} figures in the article.`);

			// Download all figures for this article
			for (const url of figureUrls) {
				// Create the directory path for species and PMC ID
				const outputDir = path.join(__dirname, "../output", species, pmcId);
				if (!fs.existsSync(outputDir)) {
					fs.mkdirSync(outputDir, { recursive: true });
				}

				const filename = path.basename(url);
				const filepath = path.join(outputDir, filename);

				try {
					await throttle(async () => await downloadImage(throttle, url, filepath));
					console.log(`Downloaded image: ${filename}`);
				} catch (error) {
					console.error(`Failed to download image ${filename}:`, error);
				}
			}
		}
	});
}
