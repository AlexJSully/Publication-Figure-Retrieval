import axios from "axios";
import { JSDOM } from "jsdom";

/**
 * Retrieve PMCs from NCBI's/NIHs ENTREZ database.
 * @param {String} species Species name(s) to search for (default "Arabidopsis thaliana")
 * @param {Number} maxIDs Maximum number of IDs to return (default 10000000)
 * @returns {Array} List of PMCs
 */
export async function getPMCList(species = "Arabidopsis thaliana", maxIDs = 10000000) {
	// Clean arguments
	species = species.trim().split(" ").join("_");
	maxIDs = Number.isNaN(maxIDs) ? 10000000 : maxIDs;

	// Build API URL
	/** ENTREZ's esearch */
	const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?";
	/** Database */
	const db = "db=pmc&";
	/** What is being searched for */
	const term = `term=${species}[Organism]&`;
	/** Maximum number of publications */
	const retmax = `retmax=${maxIDs}`;

	/** API's URL */
	const url = base + db + term + retmax;

	// console feedback
	console.log(`Retrieving ${species.split("_").join(" ")} PMCs...`);

	// Get and return XML document/data
	/** API's response */
	const response = await axios.get(url, {
		responseType: "document",
		headers: {
			"Content-Type": "text/xml",
		},
		params: {
			retmode: "xml",
		},
	});
	/** API's data */
	const data = response?.data;

	// Go through XML and extract PMCs under eSEarchResult -> IdList -> Id
	/** PMC list */
	let pmcList = [];

	if (data) {
		// Parse the XML string with JSDOM
		/** JSDOM document */
		const dom = new JSDOM(data, { contentType: "text/xml" });

		// Use JSDOM to parse XML and get all PMCs
		pmcList = Array.from(dom.window.document.querySelectorAll("Id")).map((id) => id.textContent);

		console.log(`Found ${pmcList.length} PMCs for ${species.split("_").join(" ")}...`);
		return pmcList;
	}

	console.error("No data found...");
	return pmcList;
}
