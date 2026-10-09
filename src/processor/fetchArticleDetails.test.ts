import axios from "axios";
import fs from "fs";
import path from "path";
import { type FakeArticle, buildArticleSetXml, fakePmcCloud } from "../__fixtures__/pmcCloud";
import { PMC_CLOUD_BASE_URL } from "../constants";
import { fetchArticleDetails } from "./fetchArticleDetails";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const cachedIDsFilePath = path.resolve(__dirname, "../output/cache/id.json");
const efetchUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

describe("fetchArticleDetails", () => {
	const throttle = async <T>(fn: () => Promise<T>) => fn();
	const species = "Homo_sapiens";
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	/** Serves efetch XML for the requested IDs, and the given articles from the fake PMC Cloud Service. */
	function serve(articles: FakeArticle[], failingUrls: string[] = []) {
		const bucket = fakePmcCloud(articles, failingUrls);

		mockedAxios.get.mockImplementation((async (url: string, config?: { params?: Record<string, unknown> }) => {
			if (url.startsWith(efetchUrl)) {
				const ids = new URL(url).searchParams.get("id")?.split(",") ?? [];

				return { data: buildArticleSetXml(ids.map((id) => `PMC${id}`)) };
			}

			return bucket(url, config);
		}) as typeof axios.get);
	}

	function efetchCalls(): number {
		return mockedAxios.get.mock.calls.filter(([url]) => url.startsWith(efetchUrl)).length;
	}

	function readCache(): string[] {
		return JSON.parse(fs.readFileSync(cachedIDsFilePath, "utf-8"));
	}

	beforeEach(() => {
		jest.resetAllMocks();
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		fs.mkdirSync(path.dirname(cachedIDsFilePath), { recursive: true });
		fs.writeFileSync(cachedIDsFilePath, JSON.stringify([]));
	});

	afterEach(() => {
		jest.restoreAllMocks();
		fs.rmSync(path.dirname(cachedIDsFilePath), { recursive: true, force: true });
	});

	it("caches every article retrieved or confirmed missing from the dataset", async () => {
		serve([{ pmcid: "PMC123456", version: 1 }]);

		await fetchArticleDetails(throttle, ["123456", "654321"], species);

		expect(efetchCalls()).toBe(1);
		expect(readCache()).toEqual(["123456", "654321"]);
	});

	it("caches an article whose XML identifies it by digits only", async () => {
		mockedAxios.get.mockImplementation((async (url: string, config?: { params?: Record<string, unknown> }) =>
			url.startsWith(efetchUrl)
				? { data: buildArticleSetXml(["123456"], "pmc") }
				: fakePmcCloud([{ pmcid: "PMC123456", version: 1 }])(url, config)) as typeof axios.get);

		await fetchArticleDetails(throttle, ["123456"], species);

		expect(readCache()).toEqual(["123456"]);
	});

	it("does not cache an article whose retrieval failed, so the next run retries it", async () => {
		serve(
			[
				{ pmcid: "PMC123456", version: 1 },
				{ pmcid: "PMC654321", version: 1 },
			],
			[`${PMC_CLOUD_BASE_URL}/metadata/PMC654321.1.json`],
		);

		await fetchArticleDetails(throttle, ["123456", "654321"], species);

		expect(readCache()).toEqual(["123456"]);
	});

	it("logs the error and caches nothing when the efetch request fails", async () => {
		mockedAxios.get.mockRejectedValue(new Error("Network error"));

		await fetchArticleDetails(throttle, ["123456"], species);

		expect(errorSpy).toHaveBeenCalledWith(
			"Error fetching article details:",
			"Network error",
			expect.objectContaining({ species }),
		);
		expect(readCache()).toEqual([]);
	});

	it("skips a batch whose IDs are all cached", async () => {
		fs.writeFileSync(cachedIDsFilePath, JSON.stringify(["123456", "654321"]));
		serve([]);

		await fetchArticleDetails(throttle, ["123456", "654321"], species);

		expect(efetchCalls()).toBe(0);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("All IDs"));
	});

	it("fetches only the uncached IDs of a batch", async () => {
		fs.writeFileSync(cachedIDsFilePath, JSON.stringify(["123456"]));
		serve([{ pmcid: "PMC654321", version: 1 }]);

		await fetchArticleDetails(throttle, ["123456", "654321"], species);

		const efetchIds = new URL(mockedAxios.get.mock.calls[0][0]).searchParams.get("id");
		expect(efetchIds).toBe("654321");
		expect(readCache()).toEqual(["123456", "654321"]);
	});

	it("logs and makes no request for an empty ID list", async () => {
		await fetchArticleDetails(throttle, [], species);

		expect(mockedAxios.get).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No PMC IDs provided"));
	});
});
