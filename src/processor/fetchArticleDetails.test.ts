import axios from "axios";
import fs from "fs";
import path from "path";
import { fetchArticleDetails } from "./fetchArticleDetails";
import { parseFigures } from "./parseFigures";

// Mock external dependencies to control behavior in tests
jest.mock("axios");
jest.mock("./parseFigures");

describe("fetchArticleDetails", () => {
	type TestCase = {
		name: string;
		input: {
			pmids: string[];
			species: string;
		};
		cacheSetup?: string[];
		mockResponse?: { data: string };
		mockError?: Error;
		wantApiCalls: number;
		wantCacheUpdate?: boolean;
		wantNoIdsLog?: boolean;
		wantAllCachedLog?: boolean;
	};

	// Mock throttle function that immediately executes provided function
	const throttle = jest.fn((fn) => fn());
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
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	const testCases: TestCase[] = [
		{
			name: "fetches article details in batches and calls parseFigures",
			input: {
				pmids: ["PMC123456", "PMC654321"],
				species: "Homo sapiens",
			},
			mockResponse: { data: "<xml>mock data</xml>" },
			wantApiCalls: 1,
			wantCacheUpdate: true,
		},
		{
			name: "handles errors gracefully",
			input: {
				pmids: ["PMC123456", "PMC654321"],
				species: "Homo sapiens",
			},
			mockError: new Error("Network error"),
			wantApiCalls: 1,
			wantCacheUpdate: false,
		},
		{
			name: "caches fetched IDs and skips already cached IDs",
			input: {
				pmids: ["PMC123456", "PMC654321"],
				species: "Homo sapiens",
			},
			cacheSetup: ["PMC123456", "PMC654321"],
			wantApiCalls: 0,
			wantAllCachedLog: true,
		},
		{
			name: "handles empty PMID array gracefully",
			input: {
				pmids: [],
				species: "Homo sapiens",
			},
			wantApiCalls: 0,
			wantNoIdsLog: true,
		},
		{
			name: "fetches only new IDs when some are already cached",
			input: {
				pmids: ["PMC123456", "PMC654321", "PMC999999"],
				species: "Homo sapiens",
			},
			cacheSetup: ["PMC123456"],
			mockResponse: { data: "<xml>mock data</xml>" },
			wantApiCalls: 1,
			wantCacheUpdate: true,
		},
	];

	it.each(testCases)(
		"$name",
		async ({
			input,
			cacheSetup,
			mockResponse,
			mockError,
			wantApiCalls,
			wantCacheUpdate,
			wantNoIdsLog,
			wantAllCachedLog,
		}) => {
			// Arrange: Set up cache if needed
			if (cacheSetup) {
				fs.writeFileSync(cachedIDsFilePath, JSON.stringify(cacheSetup));
			}

			const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			// Set up mock responses
			if (mockError) {
				(axios.get as jest.Mock).mockRejectedValue(mockError);
			} else if (mockResponse) {
				(axios.get as jest.Mock).mockResolvedValue(mockResponse);
			}

			// Act: Process the PMC IDs
			await fetchArticleDetails(throttle, input.pmids, input.species);

			// Assert: Verify behavior
			expect(axios.get).toHaveBeenCalledTimes(wantApiCalls);

			if (mockError) {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					"Error fetching article details:",
					mockError.message,
					expect.objectContaining({ species: input.species }),
				);
			}

			if (wantCacheUpdate && mockResponse) {
				expect(parseFigures).toHaveBeenCalledWith(throttle, mockResponse.data, input.species);
				const cachedIDs = JSON.parse(fs.readFileSync(cachedIDsFilePath, "utf-8"));
				expect(cachedIDs.length).toBeGreaterThan(0);
			}

			if (wantNoIdsLog) {
				expect(consoleLogSpy).toHaveBeenCalledWith(`No PMC IDs provided for ${input.species}.`);
			}

			if (wantAllCachedLog) {
				expect(consoleLogSpy).toHaveBeenCalledWith(
					expect.stringContaining(`All IDs in ${input.species} batch`),
				);
			}

			consoleLogSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		},
	);
});
