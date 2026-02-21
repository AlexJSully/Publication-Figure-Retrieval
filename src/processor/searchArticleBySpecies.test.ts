import axios from "axios";
import { searchArticlesBySpecies } from "./searchArticleBySpecies";

// Mock axios to control API responses in tests
jest.mock("axios");

describe("searchArticlesBySpecies", () => {
	type TestCase = {
		name: string;
		input: {
			species: string;
		};
		mockResponse?: {
			data: {
				esearchresult: {
					idlist: string[];
				};
			};
		};
		mockError?: Error;
		want: string[];
	};

	// Mock throttle function that immediately executes the provided function
	const throttle = jest.fn((fn) => fn());

	beforeEach(() => {
		// Reset all mocks before each test to ensure clean state
		jest.clearAllMocks();
	});

	const testCases: TestCase[] = [
		{
			name: "returns array of PMCIDs when API call is successful",
			input: {
				species: "Homo sapiens",
			},
			mockResponse: {
				data: {
					esearchresult: {
						idlist: ["PMC123456", "PMC654321"],
					},
				},
			},
			want: ["PMC123456", "PMC654321"],
		},
		{
			name: "returns empty array when API call fails",
			input: {
				species: "Invalid species",
			},
			mockError: new Error("Network error"),
			want: [],
		},
		{
			name: "returns empty array for species with no results",
			input: {
				species: "Nonexistent species",
			},
			mockResponse: {
				data: {
					esearchresult: {
						idlist: [],
					},
				},
			},
			want: [],
		},
	];

	it.each(testCases)("$name", async ({ input, mockResponse, mockError, want }) => {
		// Arrange: Set up mock based on test case
		if (mockError) {
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			(axios.get as jest.Mock).mockRejectedValue(mockError);

			// Act: Call function which should handle the error
			const result = await searchArticlesBySpecies(throttle, input.species);

			// Assert: Verify graceful error handling
			expect(result).toEqual(want);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error fetching articles:",
				mockError.message,
				expect.objectContaining({ species: input.species }),
			);

			consoleErrorSpy.mockRestore();
		} else if (mockResponse) {
			(axios.get as jest.Mock).mockResolvedValue(mockResponse);

			// Act: Call the function with test species
			const result = await searchArticlesBySpecies(throttle, input.species);

			// Assert: Verify API was called correctly and result is as expected
			const query = `${input.species}[organism]`;
			const expectedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
				query,
			)}&retmode=json&retmax=1000000`;
			expect(axios.get).toHaveBeenCalledWith(expectedUrl);
			expect(result).toEqual(want);
		}
	});
});
