import axios from "axios";
import { parseFigures } from "./parseFigures";

/**
 * Fetches article metadata and figures based on PMCIDs in batches of 50.
 *
 * This function processes a list of PMCIDs, fetching article details in XML format from the NCBI API.
 * It handles the requests in batches of 50 PMCIDs to avoid overwhelming the API.
 * The fetched XML data is then passed to the `parseFigures` function for further processing.
 *
 * @returns {Promise<void>} A promise that resolves when all article details have been fetched and processed.
 *
 * @example
 * const throttle = throttledQueue(2, 1000);
 * const pmids = ["PMC123456", "PMC654321", ...];
 * const species = "Homo sapiens";
 * await fetchArticleDetails(throttle, pmids, species);
 */
export async function fetchArticleDetails(
	/** The throttling function to control the rate of API requests. */
	throttle: any,
	/** An array of PMCIDs to fetch details for. */
	pmids: string[],
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<void> {
	/** Number of PMCIDs per batch. */
	const batchSize = 50;

	for (let i = 0; i < pmids.length; i += batchSize) {
		// Extract a batch of 50 PMCIDs
		/** A batch of 50 PMCIDs. */
		const batch = pmids.slice(i, i + batchSize);
		/** Comma-separated list of PMCIDs. */
		const ids = batch.join(",");
		/** The URL to fetch article details for the current batch. */
		let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${ids}&retmode=xml`;
		// Check if there is a NCBI API key available and if so, add it to the URL
		if (process?.env?.NCBI_API_KEY) {
			url += `&api_key=${process.env.NCBI_API_KEY}`;
		}

		console.log(`Fetching article details for batch ${i + 1}-${i + batch.length}...`);

		try {
			// Make HTTP request to fetch article details in XML format for the current batch
			/** The response from the API request. */
			const response = await throttle(async () => await axios.get(url));
			await parseFigures(throttle, response.data, species);
		} catch (error) {
			console.error("Error fetching article details:", error);
		}
	}
}
