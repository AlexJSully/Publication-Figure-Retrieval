import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { downloadArticlePackage } from "./downloadArticlePackage";
import { parseFigures } from "./parseFigures";

// Mock all external dependencies for controlled testing
jest.mock("fs");
jest.mock("path");
jest.mock("./downloadArticlePackage");

// Type-safe mock objects
const mockFs = fs as jest.Mocked<typeof fs>;
const mockDownloadArticlePackage = downloadArticlePackage as jest.MockedFunction<typeof downloadArticlePackage>;

describe("parseFigures", () => {
	// Test data setup
	const throttle = (fn: any) => fn();
	const species = "Homo sapiens";
	const pmcId = "PMC123456";
	const extractedImages = ["figure1.jpg", "figure2.jpg"];

	// Use same path logic as implementation for consistency
	const outputDir = path.join(__dirname, "../output", species, pmcId);

	/** Helper function to build valid PMC XML structure for testing */
	function buildXml(articles: any[]): string {
		const builder = new xml2js.Builder();
		return builder.buildObject({
			"pmc-articleset": { article: articles },
		});
	}

	beforeEach(() => {
		// Reset all mocks for clean test state
		jest.clearAllMocks();

		// Configure default mock behaviors
		mockFs.existsSync.mockReturnValue(false);
		mockFs.mkdirSync.mockImplementation(() => undefined);
		mockDownloadArticlePackage.mockResolvedValue(extractedImages);
	});

	type TestCase = {
		name: string;
		input: {
			xmlData: string;
			species: string;
		};
		mockExtractedImages?: string[];
		wantPackageDownloadCalls?: number;
		wantError?: boolean;
		wantNoArticlesLog?: boolean;
	};

	const testCases: TestCase[] = [
		{
			name: "downloads article package and extracts figures",
			input: {
				xmlData: buildXml([
					{
						front: [
							{
								"article-meta": [
									{
										"article-id": [{ $: { "pub-id-type": "pmcid" }, _: pmcId }],
									},
								],
							},
						],
					},
				]),
				species,
			},
			mockExtractedImages: extractedImages,
			wantPackageDownloadCalls: 1,
		},
		{
			name: "logs and skips if no articles found",
			input: {
				xmlData: buildXml([]),
				species,
			},
			wantPackageDownloadCalls: 0,
			wantNoArticlesLog: true,
		},
		{
			name: "handles article with no PMC ID",
			input: {
				xmlData: buildXml([
					{
						front: [
							{
								"article-meta": [
									{
										"article-id": [{ $: { "pub-id-type": "pmid" }, _: "12345" }],
									},
								],
							},
						],
					},
				]),
				species,
			},
			wantPackageDownloadCalls: 0,
		},
	];

	it.each(testCases)("$name", async ({ input, mockExtractedImages, wantPackageDownloadCalls, wantNoArticlesLog }) => {
		// Arrange: Set up mocks based on test case
		if (mockExtractedImages !== undefined) {
			mockDownloadArticlePackage.mockResolvedValue(mockExtractedImages);
		}

		const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act: Process the XML data
		await parseFigures(throttle, input.xmlData, input.species);

		// Assert: Verify expected behavior
		if (wantNoArticlesLog) {
			expect(logSpy).toHaveBeenCalledWith("No articles found in the response.");
		}

		if (wantPackageDownloadCalls !== undefined) {
			expect(mockDownloadArticlePackage).toHaveBeenCalledTimes(wantPackageDownloadCalls);
		}

		if (wantPackageDownloadCalls && wantPackageDownloadCalls > 0) {
			expect(mockDownloadArticlePackage).toHaveBeenCalledWith(throttle, pmcId, outputDir);
		}

		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it("logs error if XML parsing fails", async () => {
		// Arrange: Mock XML parser to simulate parsing failure
		const origParser = xml2js.Parser;
		xml2js.Parser = jest.fn().mockImplementation(() => ({
			parseString: (xml: string, cb: Function) => cb(new Error("bad xml")),
		})) as any;
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act: Attempt to parse invalid XML
		await parseFigures(throttle, "<badxml>", species);

		// Assert: Verify error was logged correctly
		expect(errorSpy).toHaveBeenCalledWith("Error parsing XML:", "bad xml", expect.objectContaining({ species }));

		// Cleanup: Restore original parser
		errorSpy.mockRestore();
		xml2js.Parser = origParser;
	});
});
