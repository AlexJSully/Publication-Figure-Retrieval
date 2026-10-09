import axios from "axios";
import { fakePmcCloud } from "../__fixtures__/pmcCloud";
import { PMC_CLOUD_BASE_URL } from "../constants";
import { ArticleNotInDatasetError, fetchArticleMetadata, withPmcPrefix } from "./fetchArticleMetadata";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchArticleMetadata", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("returns the metadata of the highest article version", async () => {
		mockedAxios.get.mockImplementation(
			fakePmcCloud([
				{ pmcid: "PMC123", version: 2, files: { "old.jpg": "old" } },
				{ pmcid: "PMC123", version: 10, files: { "new.jpg": "new" } },
			]) as typeof axios.get,
		);

		const metadata = await fetchArticleMetadata("PMC123");

		expect(metadata.version).toBe(10);
		expect(metadata.media_urls).toEqual([expect.stringContaining("PMC123.10/new.jpg")]);
		expect(mockedAxios.get).toHaveBeenCalledWith(
			`${PMC_CLOUD_BASE_URL}/metadata/PMC123.10.json`,
			expect.anything(),
		);
	});

	it("lists versions under the PMC-prefixed ID when given digits only", async () => {
		mockedAxios.get.mockImplementation(fakePmcCloud([{ pmcid: "PMC123", version: 1 }]) as typeof axios.get);

		const metadata = await fetchArticleMetadata("123");

		expect(metadata.pmcid).toBe("PMC123");
		expect(mockedAxios.get).toHaveBeenCalledWith(
			PMC_CLOUD_BASE_URL,
			expect.objectContaining({ params: expect.objectContaining({ prefix: "PMC123." }) }),
		);
	});

	it("rejects with ArticleNotInDatasetError when the article has no versions", async () => {
		mockedAxios.get.mockImplementation(fakePmcCloud([{ pmcid: "PMC999", version: 1 }]) as typeof axios.get);

		const result = fetchArticleMetadata("PMC123");

		await expect(result).rejects.toBeInstanceOf(ArticleNotInDatasetError);
		await expect(result).rejects.toThrow("Article PMC123 is not in the PMC Article Datasets");
	});

	it("rejects with the request failure when the metadata cannot be fetched", async () => {
		mockedAxios.get.mockImplementation(
			fakePmcCloud(
				[{ pmcid: "PMC123", version: 1 }],
				[`${PMC_CLOUD_BASE_URL}/metadata/PMC123.1.json`],
			) as typeof axios.get,
		);

		await expect(fetchArticleMetadata("PMC123")).rejects.toThrow(
			"Failed to fetch metadata for PMC123: Request failed with status code 500",
		);
	});
});

describe("withPmcPrefix", () => {
	it.each([
		{ id: "123", want: "PMC123" },
		{ id: "PMC123", want: "PMC123" },
	])("returns $want for $id", ({ id, want }) => {
		expect(withPmcPrefix(id)).toBe(want);
	});
});
