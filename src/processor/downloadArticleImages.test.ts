import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { type FakeArticle, fakePmcCloud, md5Of, mediaUrl } from "../__fixtures__/pmcCloud";
import { PMC_CLOUD_BASE_URL } from "../constants";
import { downloadArticleImages } from "./downloadArticleImages";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("downloadArticleImages", () => {
	const throttle = async <T>(fn: () => Promise<T>) => fn();
	let outputDir: string;
	let root: string;

	function serve(articles: FakeArticle[], failingUrls: string[] = []) {
		mockedAxios.get.mockImplementation(fakePmcCloud(articles, failingUrls) as typeof axios.get);
	}

	function requestedUrls(): string[] {
		return mockedAxios.get.mock.calls.map(([url]) => url);
	}

	beforeEach(() => {
		jest.resetAllMocks();
		root = fs.mkdtempSync(path.join(os.tmpdir(), "pfr-"));
		outputDir = path.join(root, "out");
		jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		fs.rmSync(root, { recursive: true, force: true });
	});

	it.each([
		{ name: "command substitution", pmcId: "PMC1$(touch x)" },
		{ name: "backtick substitution", pmcId: "PMC1`id`" },
		{ name: "double quote", pmcId: 'PMC1"' },
		{ name: "path traversal ending in a PMC ID", pmcId: "../PMC1" },
		{ name: "path traversal ending in digits", pmcId: "../../123" },
		{ name: "empty string", pmcId: "" },
		{ name: "non-string value", pmcId: ["123"] as unknown as string },
	])("rejects a PMC ID containing $name before any network or filesystem work", async ({ pmcId }) => {
		await expect(downloadArticleImages(throttle, pmcId, outputDir)).rejects.toThrow("Invalid PMC ID");

		expect(mockedAxios.get).not.toHaveBeenCalled();
		expect(fs.existsSync(outputDir)).toBe(false);
	});

	it("writes one image per figure, preferring the higher-priority extension, and skips other media", async () => {
		// JPEG start-of-image bytes are not valid UTF-8, so decoding them as text would change their MD5
		const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		serve([
			{
				pmcid: "PMC123",
				version: 1,
				files: { "gr1.gif": "gif bytes", "gr1.jpg": jpegBytes, "gr2.png": "png bytes", "mmc1.doc": "doc" },
			},
		]);

		const written = await downloadArticleImages(throttle, "PMC123", outputDir);

		expect(written).toEqual(["gr1.jpg", "gr2.png"]);
		expect(fs.readFileSync(path.join(outputDir, "gr1.jpg"))).toEqual(jpegBytes);
		expect(fs.readFileSync(path.join(outputDir, "gr2.png"), "utf-8")).toBe("png bytes");
		expect(requestedUrls()).not.toContain(`${PMC_CLOUD_BASE_URL}/PMC123.1/gr1.gif`);
		expect(requestedUrls()).not.toContain(`${PMC_CLOUD_BASE_URL}/PMC123.1/mmc1.doc`);
	});

	it("does not write an image whose content fails its MD5 check, and rejects after writing the rest", async () => {
		serve([
			{
				pmcid: "PMC123",
				version: 1,
				files: { "gr1.jpg": "tampered", "gr2.jpg": "intact" },
				mediaUrls: [
					mediaUrl("PMC123", 1, "gr1.jpg", md5Of("original")),
					mediaUrl("PMC123", 1, "gr2.jpg", md5Of("intact")),
				],
			},
		]);

		await expect(downloadArticleImages(throttle, "PMC123", outputDir)).rejects.toThrow(
			"1 of 2 images failed for PMC123",
		);

		expect(fs.existsSync(path.join(outputDir, "gr1.jpg"))).toBe(false);
		expect(fs.readFileSync(path.join(outputDir, "gr2.jpg"), "utf-8")).toBe("intact");
	});

	it("does not write an image whose media URL carries no MD5", async () => {
		serve([
			{
				pmcid: "PMC123",
				version: 1,
				files: { "gr1.jpg": "image" },
				mediaUrls: [mediaUrl("PMC123", 1, "gr1.jpg")],
			},
		]);

		await expect(downloadArticleImages(throttle, "PMC123", outputDir)).rejects.toThrow(
			"1 of 1 images failed for PMC123",
		);

		expect(fs.existsSync(outputDir)).toBe(false);
	});

	it("never requests or writes media listed outside the article's own version prefix", async () => {
		serve([
			{
				pmcid: "PMC123",
				version: 1,
				files: { "gr1.jpg": "own" },
				mediaUrls: [
					mediaUrl("PMC123", 1, "gr1.jpg", md5Of("own")),
					mediaUrl("PMC999", 1, "other.jpg", md5Of("other")),
					`s3://another-bucket/PMC123.1/foreign.jpg?md5=${md5Of("foreign")}`,
				],
			},
		]);

		const written = await downloadArticleImages(throttle, "PMC123", outputDir);

		expect(written).toEqual(["gr1.jpg"]);
		expect(requestedUrls().filter((url) => url.endsWith(".jpg"))).toEqual([
			`${PMC_CLOUD_BASE_URL}/PMC123.1/gr1.jpg`,
		]);
		expect(fs.readdirSync(outputDir)).toEqual(["gr1.jpg"]);
	});

	it("never requests or writes media whose file name holds a Windows path separator or drive", async () => {
		serve([
			{
				pmcid: "PMC123",
				version: 1,
				files: { "gr1.jpg": "own", "..\\outside.jpg": "escapes on Windows", "C:evil.jpg": "drive-relative" },
			},
		]);

		const written = await downloadArticleImages(throttle, "PMC123", outputDir);

		expect(written).toEqual(["gr1.jpg"]);
		expect(requestedUrls().filter((url) => url.endsWith(".jpg"))).toEqual([
			`${PMC_CLOUD_BASE_URL}/PMC123.1/gr1.jpg`,
		]);
	});

	it("resolves with no images and creates no directory when the article has no images", async () => {
		serve([{ pmcid: "PMC123", version: 1, files: { "mmc1.doc": "doc" } }]);

		const written = await downloadArticleImages(throttle, "PMC123", outputDir);

		expect(written).toEqual([]);
		expect(fs.existsSync(outputDir)).toBe(false);
	});

	it("writes the remaining images when one image download fails, then rejects", async () => {
		serve(
			[{ pmcid: "PMC123", version: 1, files: { "gr1.jpg": "first", "gr2.jpg": "second" } }],
			[`${PMC_CLOUD_BASE_URL}/PMC123.1/gr1.jpg`],
		);

		await expect(downloadArticleImages(throttle, "PMC123", outputDir)).rejects.toThrow(
			"1 of 2 images failed for PMC123",
		);

		expect(fs.readdirSync(outputDir)).toEqual(["gr2.jpg"]);
	});
});
