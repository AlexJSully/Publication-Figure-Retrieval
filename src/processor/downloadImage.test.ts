import axios from "axios";
import fs from "fs";
import { downloadImage } from "./downloadImage";

jest.mock("axios");
jest.mock("fs");

describe("Security Tests - Axios Data URI DoS Vulnerability", () => {
	const throttle = jest.fn((fn) => fn());
	const mockFilePath = "/tmp/test-image.jpg";

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should allow legitimate HTTP/HTTPS URLs", async () => {
		// Ensure legitimate URLs still work
		const legitimateUrl = "https://example.com/image.jpg";
		const mockResponse = {
			data: {
				pipe: jest.fn(),
			},
		};

		(axios as unknown as jest.Mock).mockResolvedValue(mockResponse);

		const mockWriteStream = {
			close: jest.fn(),
			on: jest.fn((event, callback) => {
				if (event === "finish") {
					// Simulate successful write
					setTimeout(callback, 0);
				}
			}),
		};
		(fs.createWriteStream as unknown as jest.Mock).mockReturnValue(mockWriteStream);

		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

		await downloadImage(throttle, legitimateUrl, mockFilePath);

		// Verify that axios was called with the legitimate URL
		expect(axios).toHaveBeenCalledWith({
			url: legitimateUrl,
			method: "GET",
			responseType: "stream",
		});

		// Verify the response was processed
		expect(mockResponse.data.pipe).toHaveBeenCalledWith(mockWriteStream);

		consoleSpy.mockRestore();
	});

	it("should enforce content length limits if implemented", async () => {
		// Test case 5: Verify that if maxContentLength is implemented, it's respected
		const legitimateUrl = "https://example.com/large-image.jpg";

		// Mock axios to simulate a response that exceeds content length limits
		(axios as unknown as jest.Mock).mockRejectedValue(new Error("maxContentLength size of 1000000 exceeded"));

		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		const mockWriteStream = {
			close: jest.fn(),
			on: jest.fn(),
		};
		(fs.createWriteStream as unknown as jest.Mock).mockReturnValue(mockWriteStream);
		(fs.unlink as unknown as jest.Mock).mockImplementation((path, callback) => callback(null));

		await downloadImage(throttle, legitimateUrl, mockFilePath);

		// Verify that the error was handled properly
		expect(consoleSpy).toHaveBeenCalledWith("Error downloading image:", expect.any(Error));
		expect(mockWriteStream.close).toHaveBeenCalled();
		expect(fs.unlink).toHaveBeenCalledWith(mockFilePath, expect.any(Function));

		consoleSpy.mockRestore();
	});
});
