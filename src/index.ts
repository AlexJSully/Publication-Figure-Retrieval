import { throttledQueue } from "throttled-queue";
import speciesData from "./data/species.json";
import { fetchArticleDetails } from "./processor/fetchArticleDetails";
import { searchArticlesBySpecies } from "./processor/searchArticleBySpecies";
import type { SpeciesData } from "./types";

/** The API key for the NCBI E-utilities. */
const ncbiApiKey = process?.env?.NCBI_API_KEY;

/**
 * The number of API calls allowed per second.
 * If an API key is provided, we can make up to 10 calls per second.
 * Otherwise, we are limited to 3 calls per second.
 * See [Entrez Programming Utilities Help](https://www.ncbi.nlm.nih.gov/books/NBK25497/) for more information.
 */
const callsPerSecond = ncbiApiKey ? 10 : 3;

/** Throttled queue for the API */
const throttle = throttledQueue({
	maxPerInterval: callsPerSecond,
	interval: 1000,
});

/** The list of species to search for. */
const speciesList = Object.keys(speciesData as SpeciesData);

/** Runs the end-to-end retrieval workflow for all configured species. */
export async function main() {
	for (const species of speciesList) {
		console.log(`Searching articles for the species: ${species}...`);
		const pmids = await searchArticlesBySpecies(throttle, species);

		if (pmids?.length > 0) {
			await fetchArticleDetails(throttle, pmids, species);
		} else {
			console.log(`No articles found for the species: ${species}.`);
		}
	}
}

// Execute only when run directly from Node.
if (require.main === module) {
	main();
}
