/**
 * @fileoverview Test suite for parseFigures module.
 *
 * Tests the functionality of parsing PMC XML data to extract figure information
 * and coordinate the downloading of figures to the local filesystem.
 */
import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { downloadImage } from "./downloadImage";
import { extractFigureUrls } from "./extractFigureUrls";
import { parseFigures } from "./parseFigures";

// Mock all external dependencies for controlled testing
jest.mock("fs");
jest.mock("path");
jest.mock("./downloadImage");
jest.mock("./extractFigureUrls");

// Type-safe mock objects
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockDownloadImage = downloadImage as jest.MockedFunction<typeof downloadImage>;
const mockExtractFigureUrls = extractFigureUrls as jest.MockedFunction<typeof extractFigureUrls>;

describe("parseFigures", () => {
	// Test data setup
	const throttle = (fn: any) => fn(); // Mock throttle that executes immediately
	const species = "Homo sapiens";
	const pmcId = "PMC123456";
	const filename = "figure1.jpg";

	// Use same path logic as implementation for consistency
	const outputDir = path.join(__dirname, "../output", species, pmcId);
	const filePath = path.join(outputDir, filename);

	// Console spies for capturing log output
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		// Reset all mocks for clean test state
		jest.clearAllMocks();

		// Configure default mock behaviors
		mockFs.existsSync.mockReturnValue(false); // Directory doesn't exist initially
		mockFs.mkdirSync.mockImplementation(() => undefined); // Directory creation succeeds
		mockDownloadImage.mockResolvedValue(); // Downloads succeed
		mockExtractFigureUrls.mockReturnValue([`http://example.com/${filename}`]); // Mock figure URLs

		// Set up console spies
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		// Clean up console spies
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	/** Helper function to build valid PMC XML structure for testing */
	function buildXml(articles: any[]): string {
		const builder = new xml2js.Builder();
		return builder.buildObject({
			"pmc-articleset": { article: articles },
		});
	}

	it("downloads all figures for all articles", async () => {
		// Arrange: Create valid PMC XML with article structure
		const xml = buildXml([
			{
				front: [
					{
						"article-meta": [
							{
								"article-id": [{ $: { "pub-id-type": "pmc" }, _: pmcId }],
							},
						],
					},
				],
				// Note: body section not needed for this test as extractFigureUrls is mocked
			},
		]);

		// Act: Process the XML data
		await parseFigures(throttle, xml, species);

		// Assert: Verify complete workflow execution
		expect(mockExtractFigureUrls).toHaveBeenCalledWith(expect.anything(), pmcId);
		expect(mockFs.existsSync).toHaveBeenCalledWith(outputDir);
		expect(mockFs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true });
		expect(mockDownloadImage).toHaveBeenCalledWith(throttle, `http://example.com/${filename}`, filePath);
	});

	it("logs and skips if no articles found", async () => {
		// Arrange: Create XML with empty article array
		const xml = buildXml([]);
		const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

		// Act: Process empty XML
		await parseFigures(throttle, xml, species);

		// Assert: Verify empty result handling
		expect(logSpy).toHaveBeenCalledWith("No articles found in the response.");
		logSpy.mockRestore();
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
		expect(errorSpy).toHaveBeenCalledWith("Error parsing XML:", expect.any(Error));

		// Cleanup: Restore original parser
		errorSpy.mockRestore();
		xml2js.Parser = origParser;
	});

	it("handles empty figureUrls array", async () => {
		// Arrange: Mock extractFigureUrls to return no figures
		mockExtractFigureUrls.mockReturnValue([]);
		const xml = buildXml([
			{
				front: [
					{
						"article-meta": [
							{
								"article-id": [{ $: { "pub-id-type": "pmc" }, _: pmcId }],
							},
						],
					},
				],
			},
		]);

		// Act: Process article with no figures
		await parseFigures(throttle, xml, species);

		// Assert: Verify no download attempts were made
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});
});
