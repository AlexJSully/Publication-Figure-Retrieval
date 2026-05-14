import axios from "axios";
import fs from "fs";
import path from "path";
import type { ThrottleFunction } from "../types";
import { parseFigures } from "./parseFigures";

/**
 * Fetches article metadata and figures based on PMCIDs in batches of 50.
 *
 * This function requests article XML from NCBI EFetch in batches of 50 IDs,
 * skips IDs already present in `build/output/cache/id.json`, and passes each
 * successful XML response to `parseFigures`.
 *
 * @returns {Promise<void>} A promise that resolves when all article details have been fetched and processed.
 *
 * @example
 * const throttle = throttledQueue({ maxPerInterval: 3, interval: 1000 });
 * const pmids = ["PMC123456", "PMC654321", ...];
 * const species = "Homo_sapiens";
 * await fetchArticleDetails(throttle, pmids, species);
 */
export async function fetchArticleDetails(
	/** The throttling function to control the rate of API requests. */
	throttle: ThrottleFunction,
	/** An array of PMC IDs to fetch details for. */
	pmids: string[],
	/** The species name to be used in the processing of figures. */
	species: string,
): Promise<void> {
	/** Number of PMC IDs per request batch. */
	const batchSize = 50;

	/** Path to the cached IDs file. */
	const cachedIDsFilePath = path.resolve(__dirname, "../output/cache/id.json");
	/** Cached IDs list. */
	let cachedIDs: string[] = [];

	if (fs.existsSync(cachedIDsFilePath)) {
		const data = fs.readFileSync(cachedIDsFilePath, "utf-8");
		cachedIDs = JSON.parse(data);
	} else {
		// Ensure cache directory exists before first write.
		fs.mkdirSync(path.dirname(cachedIDsFilePath), { recursive: true });
	}

	// Nothing to fetch for an empty ID list.
	if (!pmids || pmids.length === 0) {
		console.log(`No PMC IDs provided for ${species.replace("_", " ")}.`);
		return;
	}

	for (let i = 0; i < pmids.length; i += batchSize) {
		// Extract a fixed-size batch.
		const batch = pmids.slice(i, i + batchSize);

		// Skip IDs that were previously processed.
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
		// Attach API key when provided.
		if (process?.env?.NCBI_API_KEY) {
			url += `&api_key=${process.env.NCBI_API_KEY}`;
		}

		console.log(
			`Fetching ${species.replace("_", " ")} article details for batch ${i + 1}-${i + newBatch.length}...`,
		);

		try {
			const response = await throttle(async () => await axios.get(url));
			await parseFigures(throttle, response.data, species);

			// Persist processed IDs so reruns can resume.
			cachedIDs.push(...newBatch);
			fs.writeFileSync(cachedIDsFilePath, JSON.stringify(cachedIDs, null, 2));
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Error fetching article details:", errorMessage, { species, batch: i });
		}
	}
}
