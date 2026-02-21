import axios from "axios";
import fs from "fs";
import path from "path";
import { downloadArticlePackage } from "./downloadArticlePackage";
import { fetchPackageUrl } from "./fetchPackageUrl";

jest.mock("axios");
jest.mock("fs");
jest.mock("./fetchPackageUrl");
jest.mock("child_process", () => ({
	exec: jest.fn((_, cb) => cb?.(null, { stdout: "", stderr: "" })),
}));

const mockedAxios = axios as jest.MockedFunction<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedFetchPackageUrl = fetchPackageUrl as jest.MockedFunction<typeof fetchPackageUrl>;

describe("downloadArticlePackage", () => {
	// Throttle mock that executes immediately
	const throttle: import("../types").ThrottleFunction = <T>(fn: () => Promise<T>) => fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(mockedFs.mkdirSync as jest.Mock).mockImplementation(() => {});
		(mockedFs.rmSync as jest.Mock).mockImplementation(() => {});
	});

	it("downloads package, extracts images, and keeps highest-priority formats", async () => {
		mockedFetchPackageUrl.mockResolvedValue({
			pmcId: "PMC123",
			tgzUrl: "https://example.com/PMC123.tar.gz",
		});

		// Mock axios download stream
		const mockPipe = jest.fn();
		mockedAxios.mockResolvedValue({ data: { pipe: mockPipe } } as any);

		// Mock write stream finish
		const mockWriterOn = jest.fn((event, cb) => {
			if (event === "finish") setImmediate(cb);
		});
		(mockedFs.createWriteStream as jest.Mock).mockReturnValue({ on: mockWriterOn } as any);

		// existsSync calls: outputDir (false), tempDir (false), extractedPackageDir (true)
		(mockedFs.existsSync as jest.Mock)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		(mockedFs.readdirSync as jest.Mock).mockReturnValue([
			"figure1.jpg",
			"figure1.gif",
			"figure2.tiff",
			"figure2.png",
		]);

		const copied: Array<{ from: string; to: string }> = [];
		(mockedFs.copyFileSync as jest.Mock).mockImplementation((from, to) => copied.push({ from, to }));

		const result = await downloadArticlePackage(throttle, "PMC123", "/tmp/output/PMC123");

		// Stream piping and extraction were invoked
		expect(mockPipe).toHaveBeenCalled();
		expect(mockWriterOn).toHaveBeenCalledWith("finish", expect.any(Function));

		// Only the highest priority per basename kept (jpg over gif, png over tiff)
		expect(result).toEqual(["figure1.jpg", "figure2.png"]);
		expect(copied.map((c) => path.basename(c.to))).toEqual(["figure1.jpg", "figure2.png"]);
	});

	it("throws when no package URL is available", async () => {
		mockedFetchPackageUrl.mockResolvedValue({ pmcId: "PMC999" } as any);

		await expect(downloadArticlePackage(throttle, "PMC999", "/tmp/output/PMC999")).rejects.toThrow(
			"No downloadable package found",
		);
	});
});
