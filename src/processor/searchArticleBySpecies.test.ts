/**
 * @fileoverview Test suite for searchArticlesBySpecies module.
 *
 * Tests the functionality of searching NCBI PMC database for articles
 * related to specific species using the E-utilities API.
 */
import axios from "axios";
import { searchArticlesBySpecies } from "./searchArticleBySpecies";

// Mock axios to control API responses in tests
jest.mock("axios");

describe("searchArticlesBySpecies", () => {
	// Mock throttle function that immediately executes the provided function
	const throttle = jest.fn((fn) => fn());
	const species = "Homo sapiens";
	const query = `${species}[organism]`;
	const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
		query,
	)}&retmode=json&retmax=1000000`;

	beforeEach(() => {
		// Reset all mocks before each test to ensure clean state
		jest.clearAllMocks();
	});

	it("should return an array of PMCIDs when the API call is successful", async () => {
		// Arrange: Mock successful API response with sample PMC IDs
		const mockResponse = { data: { esearchresult: { idlist: ["PMC123456", "PMC654321"] } } };
		(axios.get as jest.Mock).mockResolvedValue(mockResponse);

		// Act: Call the function with test species
		const result = await searchArticlesBySpecies(throttle, species);

		// Assert: Verify API was called correctly and result is as expected
		expect(axios.get).toHaveBeenCalledWith(url);
		expect(result).toEqual(["PMC123456", "PMC654321"]);
	});

	it("should return an empty array when the API call fails", async () => {
		// Arrange: Mock console.error to verify error logging
		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		(axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

		// Act: Call function which should handle the error
		const result = await searchArticlesBySpecies(throttle, species);

		// Assert: Verify graceful error handling
		expect(axios.get).toHaveBeenCalledWith(url);
		expect(result).toEqual([]); // Should return empty array, not throw
		expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching articles:", expect.any(Error));

		// Cleanup: Restore original console.error
		consoleErrorSpy.mockRestore();
	});
});
