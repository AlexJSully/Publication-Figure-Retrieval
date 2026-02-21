import axios from "axios";
import fs from "fs";
import path from "path";
import { fetchArticleDetails } from "./fetchArticleDetails";

jest.mock("axios");
jest.mock("./parseFigures"); // Only mock the downstream function being tested

const mockedAxios = axios as jest.Mocked<typeof axios>;
const cachedIDsFilePath = path.resolve(__dirname, "../output/cache/id.json");

describe("fetchArticleDetails", () => {
	type TestCase = {
		name: string;
		pmids: string[];
		species: string;
		cachedIds?: string[];
		mockError?: Error;
		wantApiCalls: number;
		wantLogMessage?: string;
	};

	const throttle = async <T>(fn: () => Promise<T>) => fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Set up cache directory and file
		const dir = path.dirname(cachedIDsFilePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		if (fs.existsSync(cachedIDsFilePath)) {
			fs.unlinkSync(cachedIDsFilePath);
		}
		fs.writeFileSync(cachedIDsFilePath, JSON.stringify([]));
	});

	afterEach(() => {
		// Cleanup cache after each test
		const dir = path.dirname(cachedIDsFilePath);
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	const testCases: TestCase[] = [
		{
			name: "fetches article details and calls parseFigures for new PMIDs",
			pmids: ["PMC123456", "PMC654321"],
			species: "Homo sapiens",
			wantApiCalls: 1,
		},
		{
			name: "handles API errors gracefully",
			pmids: ["PMC123456"],
			species: "Homo sapiens",
			mockError: new Error("Network error"),
			wantApiCalls: 1,
		},
		{
			name: "skips already cached PMIDs",
			pmids: ["PMC123456", "PMC654321"],
			species: "Homo sapiens",
			cachedIds: ["PMC123456", "PMC654321"],
			wantApiCalls: 0,
			wantLogMessage: "All IDs",
		},
		{
			name: "handles empty PMID array",
			pmids: [],
			species: "Homo sapiens",
			wantApiCalls: 0,
			wantLogMessage: "No PMC IDs provided",
		},
		{
			name: "fetches only new uncached PMIDs",
			pmids: ["PMC123456", "PMC654321", "PMC999999"],
			species: "Homo sapiens",
			cachedIds: ["PMC123456"],
			wantApiCalls: 1,
		},
	];

	it.each(testCases)("$name", async ({ pmids, species, cachedIds, mockError, wantApiCalls, wantLogMessage }) => {
		// Arrange: Set up cache if provided
		if (cachedIds) {
			fs.writeFileSync(cachedIDsFilePath, JSON.stringify(cachedIds));
		}

		if (mockError) {
			mockedAxios.get.mockRejectedValue(mockError);
		} else {
			mockedAxios.get.mockResolvedValue({ data: "<xml>mock</xml>" });
		}

		const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act
		await fetchArticleDetails(throttle, pmids, species);

		// Assert
		expect(mockedAxios.get).toHaveBeenCalledTimes(wantApiCalls);

		if (mockError) {
			expect(errorSpy).toHaveBeenCalledWith(
				"Error fetching article details:",
				mockError.message,
				expect.objectContaining({ species }),
			);
		}

		if (wantLogMessage) {
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(wantLogMessage));
		}

		logSpy.mockRestore();
		errorSpy.mockRestore();
	});
});
