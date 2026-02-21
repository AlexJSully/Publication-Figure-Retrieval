import axios from "axios";
import { searchArticlesBySpecies } from "./searchArticleBySpecies";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("searchArticlesBySpecies", () => {
	type TestCase = {
		name: string;
		species: string;
		mockResponse?: { data: { esearchresult: { idlist: string[] } } };
		mockError?: Error;
		wantIds: string[];
		wantError?: boolean;
	};

	const throttle = async <T>(fn: () => Promise<T>) => fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const testCases: TestCase[] = [
		{
			name: "returns array of PMC IDs when API call succeeds",
			species: "Homo sapiens",
			mockResponse: {
				data: {
					esearchresult: {
						idlist: ["PMC123456", "PMC654321"],
					},
				},
			},
			wantIds: ["PMC123456", "PMC654321"],
		},
		{
			name: "returns empty array when API call fails",
			species: "Invalid species",
			mockError: new Error("Network error"),
			wantIds: [],
			wantError: true,
		},
		{
			name: "returns empty array for species with no results",
			species: "Nonexistent species",
			mockResponse: {
				data: {
					esearchresult: {
						idlist: [],
					},
				},
			},
			wantIds: [],
		},
	];

	it.each(testCases)("$name", async ({ species, mockResponse, mockError, wantIds, wantError }) => {
		// Arrange
		if (mockError) {
			mockedAxios.get.mockRejectedValue(mockError);
		} else if (mockResponse) {
			mockedAxios.get.mockResolvedValue(mockResponse);
		}

		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act
		const result = await searchArticlesBySpecies(throttle, species);

		// Assert
		expect(result).toEqual(wantIds);

		if (wantError && mockError) {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error fetching articles:",
				mockError.message,
				expect.objectContaining({ species }),
			);
		}

		consoleErrorSpy.mockRestore();
	});
});
