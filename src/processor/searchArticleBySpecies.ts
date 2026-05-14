import axios from "axios";
import type { ThrottleFunction } from "../types";

/**
 * Fetches a list of article PMCIDs based on a species query.
 *
 * This function constructs an organism query for the specified species and calls
 * the NCBI E-utilities ESearch API (`db=pmc`, `retmode=json`, `retmax=1000000`).
 * When `NCBI_API_KEY` is set, it appends the key to the request.
 *
 * On request failures it logs the error and returns an empty array.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of PMCIDs.
 *
 * @example
 * const throttle = throttledQueue({ maxPerInterval: 3, interval: 1000 });
 * const species = "Homo_sapiens";
 * const pmids = await searchArticlesBySpecies(throttle, species);
 */
export async function searchArticlesBySpecies(
	/** The throttling function to control the rate of API requests. */
	throttle: ThrottleFunction,
	/** The species name to be used in the query. */
	species: string,
): Promise<string[]> {
	// Construct organism query for the species.
	const query = `${species}[organism]`;
	let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
		query,
	)}&retmode=json&retmax=1000000`;

	// Attach API key when provided.
	if (process?.env?.NCBI_API_KEY) {
		url += `&api_key=${process.env.NCBI_API_KEY}`;
	}

	try {
		// Execute the API request through the shared throttle.
		const response = await throttle(async () => await axios.get(url));

		return response.data.esearchresult.idlist;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Error fetching articles:", errorMessage, { species });

		return [];
	}
}
