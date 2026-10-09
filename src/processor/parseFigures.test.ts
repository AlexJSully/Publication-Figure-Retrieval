import axios from "axios";
import { buildArticleSetXml, fakePmcCloud } from "../__fixtures__/pmcCloud";
import { PMC_CLOUD_BASE_URL } from "../constants";
import type { ThrottleFunction } from "../types";
import { parseFigures } from "./parseFigures";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("parseFigures", () => {
	const throttle: ThrottleFunction = <T>(fn: () => Promise<T>) => fn();
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.resetAllMocks();
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		// Fixture articles list no media, so nothing is written under the output directory
		mockedAxios.get.mockImplementation(
			fakePmcCloud([
				{ pmcid: "PMC123456", version: 1 },
				{ pmcid: "PMC654321", version: 1 },
			]) as typeof axios.get,
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it.each([
		{ name: "pmc", xmlData: buildArticleSetXml(["PMC123456"], "pmc"), wantHandled: ["PMC123456"] },
		{ name: "pmcid", xmlData: buildArticleSetXml(["PMC654321"], "pmcid"), wantHandled: ["PMC654321"] },
	])("resolves with the article identified by pub-id-type $name", async ({ xmlData, wantHandled }) => {
		await expect(parseFigures(throttle, xmlData, "Homo sapiens")).resolves.toEqual(wantHandled);
	});

	it("logs and resolves with no IDs when no articles are found", async () => {
		await expect(parseFigures(throttle, buildArticleSetXml([]), "Homo sapiens")).resolves.toEqual([]);

		expect(logSpy).toHaveBeenCalledWith("No articles found in the response.");
	});

	it("skips an article with no PMC ID", async () => {
		const xmlData = buildArticleSetXml(["12345"], "pmid");

		await expect(parseFigures(throttle, xmlData, "Homo sapiens")).resolves.toEqual([]);

		expect(logSpy).toHaveBeenCalledWith("Skipping article: PMC ID not found.");
	});

	it.each([
		{ name: "no front matter", malformed: "<article><back/></article>" },
		{
			name: "an empty PMC ID",
			malformed:
				'<article><front><article-meta><article-id pub-id-type="pmcid"/></article-meta></front></article>',
		},
	])("skips an article with $name and still processes the rest of the batch", async ({ malformed }) => {
		const xmlData =
			`<pmc-articleset>${malformed}<article><front><article-meta>` +
			'<article-id pub-id-type="pmcid">PMC123456</article-id>' +
			"</article-meta></front></article></pmc-articleset>";

		await expect(parseFigures(throttle, xmlData, "Homo sapiens")).resolves.toEqual(["PMC123456"]);

		expect(logSpy).toHaveBeenCalledWith("Skipping article: PMC ID not found.");
	});

	it("logs and resolves with no IDs when the XML cannot be parsed", async () => {
		await expect(parseFigures(throttle, "<badxml>", "Homo sapiens")).resolves.toEqual([]);

		expect(errorSpy).toHaveBeenCalledWith(
			"Error parsing XML:",
			expect.any(String),
			expect.objectContaining({ species: "Homo sapiens" }),
		);
	});

	it("resolves, after every download settles, with the articles retrieved or confirmed missing from the dataset", async () => {
		const failingMetadataUrl = `${PMC_CLOUD_BASE_URL}/metadata/PMC777.1.json`;
		mockedAxios.get.mockImplementation(
			fakePmcCloud(
				[
					{ pmcid: "PMC123456", version: 1 },
					{ pmcid: "PMC777", version: 1 },
				],
				[failingMetadataUrl],
			) as typeof axios.get,
		);
		const xmlData = buildArticleSetXml(["PMC123456", "PMC404", "PMC777"]);

		const handled = await parseFigures(throttle, xmlData, "Homo sapiens");

		expect(handled).toEqual(["PMC123456", "PMC404"]);
		expect(mockedAxios.get).toHaveBeenCalledWith(failingMetadataUrl, expect.anything());
	});
});
