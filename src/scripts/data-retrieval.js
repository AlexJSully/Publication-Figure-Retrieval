import axios from "axios";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import throttledQueue from "throttled-queue";

/** Throttled queue for web scraping (1 per second) */
const throttle = throttledQueue(1, 1000);
/** Throttled queue for image downloading (2 per second) */
const throttleImages = throttledQueue(2, 1000);

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

/** All data that has already been retrieved */
let dataRetrieved;
/** All publications that failed to be scraped or had some issue with them */
let emptyPubData;

/** How many publications will be scraped before memory reset */
const resetRange = 50;
/** Current position of how many publications have been scraped */
let resetIndex = 0;

/** Total number of species available to scrape */
let speciesRange;
/** Current position of species that have been scraped */
let speciesIndex = 0;

/**
 * Retrieve figures based on given PMC IDs
 * @param {Object} data Data object containing PMC IDs and species
 * @param {Array} data.species PMC Ids for a given species
 */
export async function retrieveFigures(data) {
	// console feedback
	console.log("Retrieving figures...");

	if (!dataRetrieved) {
		dataRetrieved = JSON.parse(fs.readFileSync("./src/data/data-retrieved.json"));
	}

	if (!emptyPubData) {
		emptyPubData = JSON.parse(fs.readFileSync("./src/data/data-empty-pubs.json"));
	}

	if (!speciesRange) {
		speciesRange = Object.keys(data).length;
	}

	// Go through each species to retrieve PMC ID's publications
	for (const [species, pmcList] of Object.entries(data)) {
		// Go through each PMC ID for its respective publication
		for (const pmc of pmcList) {
			// Check if PMC ID has already been retrieved
			if (!dataRetrieved?.[pmc] && !emptyPubData?.[pmc] && resetIndex <= resetRange) {
				resetIndex += 1;

				await throttle(async () => {
					if (!dataRetrieved?.[pmc] && !emptyPubData?.[pmc]) {
						// console feedback
						console.log(`Retrieving figures for ${species}'s PMC${pmc}...`);

						// If there is no figures directory under data, create one
						if (!fs.existsSync("./src/data/figures")) {
							await fs.mkdirSync("./src/data/figures");
						}

						// If folder does not exist for species, create folder (data -> figures -> [species])
						/** Path for the given species */
						const speciesFolder = `./src/data/figures/${species}`;
						// If path does not exist, create it
						if (!fs.existsSync(speciesFolder)) {
							await fs.mkdirSync(speciesFolder);
						}

						// Create URL to web scrap
						/** PMC URL */
						const url = `https://www.ncbi.nlm.nih.gov/labs/pmc/articles/${pmc}/`;

						// console feedback
						console.log(`Retrieving publication HTML for ${pmc}...`);

						// Get HTML from URL
						/** Publication's web page from Axios web scraping */
						try {
							const response = await axios.get(url, {
								responseType: "document",
								headers: {
									"Content-Type": "text/html",
								},
								timeout: 3000,
							});

							// If web scraping was successful, get HTML
							if (response?.data) {
								// console feedback
								console.log(`Got publication HTML for ${pmc}...`);

								/** Convert web scraping response into an HTML document */
								const html = new JSDOM(response.data);

								/** Current publication data */
								const currentPubData = {};

								/** Publication class names */
								const domClasses = {
									title: "content-title",
									abstract: "tsec sec",
									figures: ["tileshop", "fig-image", "titleshop"],
								};

								// Get figures
								domClasses.figures.forEach(async (className) => {
									/** Publication's figures */
									const figure = html.window.document.querySelectorAll(`.${className}`);

									if (figure) {
										// console feedback
										console.log(`Found figures for ${pmc} using ${className}...`);

										figure.forEach(async (fig) => {
											/** Name of the figure */
											const imageName = fig.src?.split("/").pop();

											/** Figure's link (just used for verification not downloading) */
											const imageSrc = fig?.src;

											// If figure link exists
											if (imageSrc) {
												// Add title
												if (!currentPubData.title) {
													/** Title of publication */
													let title = html.window.document.querySelector(
														`.${domClasses.title}`,
													)?.textContent;
													// Clean up title so does not begin with \n or any other whitespace
													title = title?.replace(/^\s+|\s+$/g, "");

													if (title) {
														currentPubData.title = title.trim();
													}
												}

												// Add abstract
												if (!currentPubData.abstract) {
													// Abstract is the first <div> under <div class="tsec sec">
													/** Abstract of the publication */
													let abstract = html.window.document.getElementsByClassName(
														domClasses.abstract,
													)?.[0]?.textContent;

													// Clean up abstract by removing the "Go to:Abstract" which it typically begins with
													if (abstract) {
														abstract = abstract.replace(/^Go to:Abstract/, "");
														// Clean again to ensure it does not begin with just "Abstract"
														if (abstract.startsWith("Abstract")) {
															abstract = abstract.replace(/^Abstract/, "");
														}

														// Add abstract
														currentPubData.abstract = abstract?.trim();
													}
												}

												// Add figure data
												if (!currentPubData.figures) {
													currentPubData.figures = {};
												}

												currentPubData.figures[imageName] = {};

												/** Figure fount is typically the last set of numbers following a letter or special character in image name */
												const figureFound = parseInt(imageName.match(/\d+/g)?.pop(), 10);

												// console feedback
												console.log(`Retrieving figure ${imageName} for ${pmc}...`);

												// Find figure caption that begins with "lgnd_" and ends with the figure number found (figureFound)
												/** Figure caption */
												let figureCaption = html.window.document.querySelector(
													`[id^="lgnd_"][id$="${figureFound}"]`,
												)?.textContent;
												// Clean up figure caption text to remove "Fig ${figureFound}", "Fig. ${figureFound}", "Fig${figureFound}" "Figure ${figureFound}" or "FIGURE ${figureFound}" from beginning of text
												if (figureCaption) {
													figureCaption = figureCaption.replace(
														/^Fig\s+|^Fig\.\s+|^Fig\d+\s+|^FIGURE\s+|^Figure\s+|^FIG\s+|^FIG\.\s+|^FIG\d+\s+/g,
														"",
													);
													// Clean again to ensure it does not begin with just "Figure"
													if (figureCaption.startsWith("Figure")) {
														figureCaption = figureCaption.replace(/^Figure/, "");
													}

													// Add figure caption
													currentPubData.figures[imageName].caption = figureCaption?.trim();
												}

												/** Download path */
												const imagePath = `${speciesFolder}/${pmc}/${imageName}`;
												/** Image download link */
												const imageLink = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmc}/bin/${imageName}`;
												if (!fs.existsSync(imagePath)) {
													await throttleImages(async () => {
														try {
															const imageItself = await axios.get(imageLink, {
																responseType: "stream",
																headers: {
																	"Content-Type": "image/jpeg",
																},
																timeout: 3000,
															});

															if (imageItself) {
																// console feedback
																console.log(
																	`Downloading figure ${imageName} for ${pmc} (${species})...`,
																);

																// Download figure to species folder (data -> figures -> [species] -> [pmc] -> [image name])
																if (!fs.existsSync(`${speciesFolder}/${pmc}`)) {
																	await fs.mkdirSync(`${speciesFolder}/${pmc}`);
																}

																await imageItself.data.pipe(
																	fs.createWriteStream(imagePath),
																);
															}
														} catch (e) {
															// console feedback
															console.log(
																`Error downloading figure ${imageName} for ${pmc} (${species}). Error response: `,
																e,
															);
														}
													});
												}
											}
										});
									}
								});

								// If publication data exists, add to master data
								if (currentPubData.title) {
									// console feedback
									console.log(`Retrieved PMC${pmc}...`);

									// Add this pub data to data/data-retrieved.json
									dataRetrieved[pmc] = currentPubData;
									await fs.writeFileSync(
										"./src/data/data-retrieved.json",
										JSON.stringify(dataRetrieved, null, 2),
									);
								} else {
									emptyPubData[pmc] = {
										cause: "No publication title or figures",
									};

									await fs.writeFileSync(
										"./src/data/data-empty-pubs.json",
										JSON.stringify(emptyPubData, null, 2),
									);

									// console feedback
									console.log(`Failed to find title for PMC${pmc}...`);
								}
							} else {
								emptyPubData[pmc] = {
									cause: "Unable to web scrape",
								};

								await fs.writeFileSync(
									"./src/data/data-empty-pubs.json",
									JSON.stringify(emptyPubData, null, 2),
								);

								// console feedback
								console.log(`Failed to find title for PMC${pmc}...`);
							}
						} catch (e) {
							emptyPubData[pmc] = {
								cause: "Error retrieving",
							};

							await fs.writeFileSync(
								"./src/data/data-empty-pubs.json",
								JSON.stringify(emptyPubData, null, 2),
							);

							// console feedback
							console.log(`Failed to retrieve PMC${pmc}... Error response: `, e);
						}
					}
				});
			} else if (resetIndex > resetRange) {
				break;
			}
		}

		speciesIndex += 1;

		if ((!speciesRange || speciesIndex >= speciesRange) && resetIndex < resetRange) {
			// console feedback
			throw new Error("No more available figures to download");
		}
	}
}
