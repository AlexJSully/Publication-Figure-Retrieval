import { IMAGE_EXTENSION_PATTERN } from "../constants";
import type { PMCArticle } from "../types";

/**
 * Extracts figure URLs from an article object.
 *
 * This function processes the 'body' section of an article to find figures and their associated graphics.
 * It constructs absolute URLs for the figures and returns them in an array.
 *
 * @returns {string[]} An array of absolute URLs for the figures found in the article.
 *
 * @example
 * const article = {
 *   body: [
 *     {
 *       fig: [
 *         {
 *           graphic: [
 *             { $: { "xlink:href": "image1" } },
 *             { $: { "xlink:href": "image2.jpg" } }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * };
 * const pmcId = "123456";
 * const urls = extractFigureUrls(article, pmcId);
 * console.log(urls); // ["https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image1.jpg", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image2.jpg"]
 */
export function extractFigureUrls(
	/** The article object containing the body section with figures. */
	article: PMCArticle,
	/** The PubMed Central ID of the article. */
	pmcId: string,
): string[] {
	/** An array to store the absolute URLs of the figures. */
	const figureUrls: string[] = [];

	// Check the 'body' section for figures
	/** The body section of the article. */
	const body = article.body ? article.body[0] : null;

	if (body?.["fig"]) {
		body["fig"].forEach((fig) => {
			/** The graphic section of the figure. */
			const graphic = fig["graphic"];

			if (graphic) {
				graphic.forEach((g) => {
					/** The URL of the figure graphic. */
					let figureUrl = g.$["xlink:href"];

					if (figureUrl) {
						// Add .jpg extension if not present
						if (!IMAGE_EXTENSION_PATTERN.test(figureUrl)) {
							figureUrl += ".jpg";
						}

						// Construct the correct absolute URL
						// PMC ID may already include 'PMC' prefix from XML, avoid duplication
						const pmcIdWithPrefix = pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;
						/** The absolute URL of the figure graphic. */
						const absoluteUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcIdWithPrefix}/bin/${figureUrl}`;

						figureUrls.push(absoluteUrl);
					}
				});
			}
		});
	}

	return figureUrls;
}
