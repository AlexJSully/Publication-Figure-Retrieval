import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { downloadImage } from "./downloadImage";
import { extractFigureUrls } from "./extractFigureUrls";
import { parseFigures } from "./parseFigures";

jest.mock("fs");
jest.mock("path");
jest.mock("./downloadImage");
jest.mock("./extractFigureUrls");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockDownloadImage = downloadImage as jest.MockedFunction<typeof downloadImage>;
const mockExtractFigureUrls = extractFigureUrls as jest.MockedFunction<typeof extractFigureUrls>;

describe("parseFigures", () => {
	const throttle = (fn: any) => fn();
	const species = "Homo sapiens";
	const pmcId = "PMC123456";
	const filename = "figure1.jpg";
	// Use the same logic as the implementation for outputDir and filePath
	const outputDir = path.join(__dirname, "../output", species, pmcId);
	const filePath = path.join(outputDir, filename);

	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		// Do not mock path.join or path.basename; use real implementation
		mockFs.existsSync.mockReturnValue(false);
		mockFs.mkdirSync.mockImplementation(() => undefined);
		mockDownloadImage.mockResolvedValue();
		mockExtractFigureUrls.mockReturnValue([`http://example.com/${filename}`]);
		logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	function buildXml(articles: any[]): string {
		const builder = new xml2js.Builder();
		return builder.buildObject({
			"pmc-articleset": { article: articles },
		});
	}

	it("downloads all figures for all articles", async () => {
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
				// ...body, etc. not needed for this test
			},
		]);

		await parseFigures(throttle, xml, species);

		expect(mockExtractFigureUrls).toHaveBeenCalledWith(expect.anything(), pmcId);
		expect(mockFs.existsSync).toHaveBeenCalledWith(outputDir);
		expect(mockFs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true });
		expect(mockDownloadImage).toHaveBeenCalledWith(throttle, `http://example.com/${filename}`, filePath);
	});

	it("logs and skips if no articles found", async () => {
		const xml = buildXml([]);
		const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		await parseFigures(throttle, xml, species);
		expect(logSpy).toHaveBeenCalledWith("No articles found in the response.");
		logSpy.mockRestore();
	});

	it("logs error if XML parsing fails", async () => {
		// Patch xml2js.Parser to call callback with error
		const origParser = xml2js.Parser;
		xml2js.Parser = jest.fn().mockImplementation(() => ({
			parseString: (xml: string, cb: Function) => cb(new Error("bad xml")),
		})) as any;
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		await parseFigures(throttle, "<badxml>", species);
		expect(errorSpy).toHaveBeenCalledWith("Error parsing XML:", expect.any(Error));
		errorSpy.mockRestore();
		xml2js.Parser = origParser;
	});

	it("handles empty figureUrls array", async () => {
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
		await parseFigures(throttle, xml, species);
		expect(mockDownloadImage).not.toHaveBeenCalled();
	});
});
