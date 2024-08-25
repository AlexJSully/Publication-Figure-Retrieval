import throttledQueue from "throttled-queue";
import speciesData from "./data/species.json";
import { fetchArticleDetails } from "./processor/fetchArticleDetails";
import { searchArticlesBySpecies } from "./processor/searchArticleBySpecies";

// Check if NCBI API key is present in environment variables
/** The API key for the NCBI E-utilities. */
const ncbiApiKey = process.env.NCBI_API_KEY;
/**
 * The number of API calls allowed per second.
 * If an API key is provided, we can make up to 10 calls per second.
 * Otherwise, we are limited to 3 calls per second.
 * See [Entrez Programming Utilities Help](https://www.ncbi.nlm.nih.gov/books/NBK25497/) for more information.
 */
let callsPerSecond = ncbiApiKey ? 10 : 3;

/** Throttled queue for the API */
const throttle = throttledQueue(callsPerSecond, 1000);

// Read species from species.json
/** The list of species to search for. */
const speciesList = Object.keys(speciesData);

/** Main function to search for articles for each species. */
async function main() {
	// Loop through each species and search for articles
	for (const species of speciesList) {
		console.log(`Searching articles for the species: ${species}...`);
		/** Array of PubMed Central IDs (PMCIDs) for the articles found. */
		const pmids = await searchArticlesBySpecies(throttle, species);

		if (pmids.length > 0) {
			await fetchArticleDetails(throttle, pmids, species);
		} else {
			console.log(`No articles found for the species: ${species}.`);
		}
	}
}

// Start the workflow by calling the main function
main();
