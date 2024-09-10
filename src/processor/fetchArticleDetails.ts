import axios from "axios";
import fs from "fs";
import path from "path";
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
	/** An array of PMC IDs to fetch details for. */
	pmids: string[],
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<void> {
	/** Number of PMC IDs per batch. */
	const batchSize = 50;

	// Grab cached IDs
	/** Path to the cached IDs file. */
	const cachedIDsFilePath = path.resolve(__dirname, "../output/cache/id.json");
	/** Cached IDs list. */
	let cachedIDs: string[] = [];
	// Check if the cached IDs file exists
	if (fs.existsSync(cachedIDsFilePath)) {
		const data = fs.readFileSync(cachedIDsFilePath, "utf-8");
		cachedIDs = JSON.parse(data);
	} else {
		// Create the directory if it doesn't exist
		fs.mkdirSync(path.dirname(cachedIDsFilePath), { recursive: true });
	}

	// Check if PMIDs array is undefined/null or empty
	if (!pmids || pmids.length === 0) {
		console.log(`No PMC IDs provided for ${species.replace("_", " ")}.`);
		return;
	}

	// Get article details based on PMC IDs
	for (let i = 0; i < pmids.length; i += batchSize) {
		// Extract a batch of 50 PMC IDs
		const batch = pmids.slice(i, i + batchSize);

		// Filter out IDs that are already cached
		const newBatch = batch.filter((id) => !cachedIDs.includes(id));

		if (newBatch.length === 0) {
			console.log(
				`All IDs in ${species.replace("_", " ")} batch ${i + 1}-${i + batch.length} are already cached.`,
			);

			continue;
		}

		/** Comma-separated string of PMC IDs for the batch. */
		const ids = newBatch.join(",");
		/** URL for fetching article details from the NCBI API. */
		let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${ids}&retmode=xml`;
		// Add the API key if available
		if (process?.env?.NCBI_API_KEY) {
			url += `&api_key=${process.env.NCBI_API_KEY}`;
		}

		console.log(
			`Fetching ${species.replace("_", " ")} article details for batch ${i + 1}-${i + newBatch.length}...`,
		);

		try {
			const response = await throttle(async () => await axios.get(url));
			await parseFigures(throttle, response.data, species);

			// Add the new IDs to the cached list and write to the file
			cachedIDs.push(...newBatch);
			fs.writeFileSync(cachedIDsFilePath, JSON.stringify(cachedIDs, null, 2));
		} catch (error) {
			console.error("Error fetching article details:", error);
		}
	}
}
