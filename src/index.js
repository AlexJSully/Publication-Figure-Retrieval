// Required packages
import * as fs from "fs";
import lodash from "lodash";
import throttledQueue from "throttled-queue";
// Custom imports
import {getPMCList, retrieveFigures} from "./scripts/data-retrieval.js";

/** Throttled queue for ENTREZ API requests (1 per second) */
const throttle = throttledQueue(1, 1000);

async function init(useOACommData = true) {
	// console feedback
	console.log(`Initializing publication figure retrieval...`);

	// Variables to determine what will be downloaded

	/** List of all species available */
	let speciesList = await JSON.parse(fs.readFileSync("./src/data/species.json"));
	// Just species names
	speciesList = Object.keys(speciesList);
	// If you want to just scrape one species, do
	// speciesList = ['Arabidopsis thaliana']; or whatever species you want
	// console feedback
	console.log(
		`Retrieving data for ${speciesList.length} species including ${speciesList[0].split("_").join(" ")}...`,
	);

	/** List of all commercial use publications */
	let oaCommUse;
	/** List of the PMIDs for commercial use publications */
	let oaCommUseList;
	if (useOACommData) {
		// Get PMIDs for commercial use publications
		oaCommUse = await JSON.parse(fs.readFileSync("./src/data/oa-comm-use-list.json"));
		// Just the PMIDs
		oaCommUseList = Object.keys(oaCommUse);
		// console feedback
		console.log(`Found ${oaCommUseList.length} commercial use publications...`);
	}

	/** List of all species and their retrievable PMID lists */
	let speciesPMIDList = {};

	let speciesCount = 0;

	// Go through each species and get the PMID list
	for (let i = 0; i < speciesList.length; i++) {
		let species = speciesList[i];

		throttle(async () => {
			/** PMID list for species */
			let pmidList = await getPMCList(species);

			// If using OA commercial data, only keep PMIDs that are in the commercial use list
			if (useOACommData) {
				pmidList = lodash.intersection(pmidList, oaCommUseList);

				// console feedback
				console.log(
					`Found ${pmidList.length} commercial use publications for ${species.split("_").join(" ")}...`,
				);
			} else {
				// console feedback
				console.log(`Found ${pmidList.length} publications for ${species.split("_").join(" ")}...`);
			}

			// Add to speciesPMIDList
			speciesPMIDList[species] = pmidList;

			speciesCount++;

			if (speciesCount === speciesList.length) {
				// console feedback
				console.log(`Finished retrieving data for ${speciesList.length} species...`);

				// Write speciesPMIDList to file
				await fs.writeFileSync("./src/data/species-pmid-list.json", JSON.stringify(speciesPMIDList, null, 2));

				// Start downloading figures based on retrieved data
				await retrieveFigures(speciesPMIDList);
			}
		});
	}
}

await init(false);
