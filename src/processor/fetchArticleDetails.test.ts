/**
 * @fileoverview Test suite for fetchArticleDetails module.
 *
 * Tests the functionality of fetching detailed article metadata from NCBI PMC,
 * including batch processing, caching mechanisms, and error handling.
 */
import axios from "axios";
import fs from "fs";
import path from "path";
import { fetchArticleDetails } from "./fetchArticleDetails";
import { parseFigures } from "./parseFigures";

// Mock external dependencies to control behavior in tests
jest.mock("axios");
jest.mock("./parseFigures");

describe("fetchArticleDetails", () => {
	// Mock throttle function that immediately executes provided function
	const throttle = jest.fn((fn) => fn());
	const pmids = ["PMC123456", "PMC654321"];
	const species = "Homo sapiens";
	const cachedIDsFilePath = path.resolve(__dirname, "../output/cache/id.json");

	beforeEach(() => {
		// Reset all mocks to ensure clean test state
		jest.clearAllMocks();

		// Create cache directory structure for testing
		const dir = path.dirname(cachedIDsFilePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Remove any existing cache file and create empty one
		if (fs.existsSync(cachedIDsFilePath)) {
			fs.unlinkSync(cachedIDsFilePath);
		}
		fs.writeFileSync(cachedIDsFilePath, JSON.stringify([]));
	});

	afterEach(() => {
		// Clean up test files after each test
		const dir = path.dirname(cachedIDsFilePath);
		if (fs.existsSync(dir)) {
			fs.rmdirSync(dir, { recursive: true });
		}
	});

	it("should fetch article details in batches and call parseFigures", async () => {
		// Arrange: Mock successful API response with XML data
		const mockResponse = { data: "<xml>mock data</xml>" };
		(axios.get as jest.Mock).mockResolvedValue(mockResponse);

		// Act: Process the PMC IDs
		await fetchArticleDetails(throttle, pmids, species);

		// Assert: Verify API called correctly and parseFigures invoked
		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(axios.get).toHaveBeenCalledWith(
			"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=PMC123456,PMC654321&retmode=xml",
		);
		expect(parseFigures).toHaveBeenCalledWith(throttle, mockResponse.data, species);
	});

	it("should handle errors gracefully", async () => {
		// Arrange: Mock console.error and network failure
		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		(axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

		// Act: Attempt to fetch details which should fail gracefully
		await fetchArticleDetails(throttle, pmids, species);

		// Assert: Verify error handling
		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching article details:", expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it("should cache fetched IDs and skip already cached IDs", async () => {
		// Arrange: Mock successful API response
		const mockResponse = { data: "<xml>mock data</xml>" };
		(axios.get as jest.Mock).mockResolvedValue(mockResponse);

		// Act: Initial fetch to populate cache
		await fetchArticleDetails(throttle, pmids, species);

		// Assert: Verify cache was created with correct IDs
		expect(fs.existsSync(cachedIDsFilePath)).toBe(true);
		const cachedIDs = JSON.parse(fs.readFileSync(cachedIDsFilePath, "utf-8"));
		expect(cachedIDs).toEqual(pmids);

		// Act: Fetch same IDs again (should use cache)
		await fetchArticleDetails(throttle, pmids, species);

		// Assert: API should only be called once (cache hit on second call)
		expect(axios.get).toHaveBeenCalledTimes(1);
	});

	it("should handle empty PMID array gracefully", async () => {
		// Arrange: Empty PMC ID array and console spy
		const emptyPmids: string[] = [];
		const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

		// Act: Call function with empty array
		await fetchArticleDetails(throttle, emptyPmids, species);

		// Assert: Verify no API calls made and appropriate message logged
		expect(axios.get).not.toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith("No PMC IDs provided for Homo sapiens.");

		consoleLogSpy.mockRestore();
	});
});
