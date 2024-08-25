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
	article: any,
	/** The PubMed Central ID of the article. */
	pmcId: string,
): string[] {
	/** An array to store the absolute URLs of the figures. */
	const figureUrls: string[] = [];

	// Check the 'body' section for figures
	/** The body section of the article. */
	const body = article.body ? article.body[0] : null;

	if (body?.["fig"]) {
		body["fig"].forEach((fig: any) => {
			/** The graphic section of the figure. */
			const graphic = fig["graphic"];

			if (graphic) {
				graphic.forEach((g: any) => {
					/** The URL of the figure graphic. */
					let figureUrl = g.$["xlink:href"];

					if (figureUrl) {
						// Add .jpg extension if not present
						if (!figureUrl.match(/\.(jpg|jpeg|png|gif|tiff|svg)$/)) {
							figureUrl += ".jpg";
						}

						// Construct the correct absolute URL
						/** The absolute URL of the figure graphic. */
						const absoluteUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/${figureUrl}`;

						figureUrls.push(absoluteUrl);
					}
				});
			}
		});
	}

	return figureUrls;
}
