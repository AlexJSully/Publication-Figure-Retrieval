// Intent of this code is meant to process the list of publications that are allowed to be used for commercial use
// To run this script, use ```npm run process```
// fs need for file writing and reading
import * as fs from "fs";

// console feedback
console.log("Initializing processing of OA commercial use list...");

// Get raw commercial use list
/** @type {String} All commercial use publications */
const rawCommUseList = fs.readFileSync("./src/data/raw/oa_comm_use_file_list.txt", "utf8");

// Split raw file by new line then by tab indentation into following object:
// {
// 	"file_directory": [0],
// 	"info": [1],
// 	"pmc": [2],
// 	"pmid": [3],
// 	"license": [4],
// }
/** @type {Object} Raw data as an object instead of raw text data */
const rawData = rawCommUseList.split("\n").map((data) => {
	return {
		pmc: data.split("\t")[2],
		pmid: data.split("\t")[3],
		license: data.split("\t")[4],
	};
});

// console feedback
console.log(`Found ${rawData.length} files in raw commercial use list...`);

/** @type {Object} Useable publications where key is the PMID */
const useableData = {};
// Go through each data point and determine which entries are usable
rawData.forEach((data) => {
	// If has PMC, PMID and a CC BY license, that is useable data
	if (data?.pmc !== "" && data?.license === "CC BY" && data?.pmc?.split("PMC")?.[1]) {
		const pmc = data.pmc.split("PMC")[1];
		useableData[pmc] = data;
	}
});

// console feedback
console.log(
	`Found ${Object.keys(useableData).length} (of ${rawData.length}) useable files in raw commercial use list...`,
);

// Write useable data to file (oa-comm-use-list.json)
// NOTE: The JSON object is a huge file
fs.writeFileSync("./src/data/oa-comm-use-list.json", JSON.stringify(useableData, null, 2));

// console feedback
console.log("Finished processing of OA commercial use list.");

// END
