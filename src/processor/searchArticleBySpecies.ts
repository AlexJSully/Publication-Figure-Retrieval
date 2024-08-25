import axios from "axios";

/**
 * Fetches a list of article PMCIDs based on a species query.
 *
 * This function constructs a query for the specified species and applies an open-access filter.
 * It then makes an HTTP request to the NCBI E-utilities API to search for articles.
 * The function returns an array of PubMed Central IDs (PMCIDs) for the articles found.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of PMCIDs.
 *
 * @example
 * const throttle = throttledQueue(2, 1000);
 * const species = "Homo sapiens";
 * const pmids = await searchArticlesBySpecies(throttle, species);
 */
export async function searchArticlesBySpecies(
	/** The throttling function to control the rate of API requests. */
	throttle: any,
	/** The species name to be used in the query. */
	species: string,
): Promise<string[]> {
	// Construct query for species and open-access filter
	const query = `${species}[organism]`;
	const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
		query,
	)}&retmode=json&retmax=100000`;

	try {
		// Make HTTP request to NCBI E-utilities API to search for articles
		const response = await throttle(async () => await axios.get(url));
		return response.data.esearchresult.idlist; // Returns an array of PubMed Central IDs (PMCIDs)
	} catch (error) {
		console.error("Error fetching articles:", error);
		return [];
	}
}
