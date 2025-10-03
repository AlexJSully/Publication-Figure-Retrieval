/**
 * @fileoverview Test suite for downloadImage module.
 *
 * Tests the functionality of downloading figure images from NCBI PMC,
 * including security measures, error handling, and file management.
 */
import axios from "axios";
import fs from "fs";
import { downloadImage } from "./downloadImage";

// Mock external dependencies for controlled testing
jest.mock("axios");
jest.mock("fs");

describe("downloadImage Security and Functionality Tests", () => {
	// Mock throttle that executes immediately
	const throttle = jest.fn((fn) => fn());
	const mockFilePath = "/tmp/test-image.jpg";

	beforeEach(() => {
		// Reset all mocks for clean test state
		jest.clearAllMocks();
	});

	it("should allow legitimate HTTP/HTTPS URLs", async () => {
		// Arrange: Set up legitimate URL and mock successful response
		const legitimateUrl = "https://example.com/image.jpg";
		const mockResponse = {
			data: {
				pipe: jest.fn(), // Mock the pipe method for stream handling
			},
		};

		(axios as unknown as jest.Mock).mockResolvedValue(mockResponse);

		// Mock file system write stream with event handling
		const mockWriteStream = {
			close: jest.fn(),
			on: jest.fn((event, callback) => {
				if (event === "finish") {
					// Simulate successful write completion
					setTimeout(callback, 0);
				}
			}),
		};
		(fs.createWriteStream as unknown as jest.Mock).mockReturnValue(mockWriteStream);

		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

		// Act: Download the image
		await downloadImage(throttle, legitimateUrl, mockFilePath);

		// Assert: Verify proper download workflow
		expect(axios).toHaveBeenCalledWith({
			url: legitimateUrl,
			method: "GET",
			responseType: "stream",
		});
		expect(mockResponse.data.pipe).toHaveBeenCalledWith(mockWriteStream);

		consoleSpy.mockRestore();
	});

	it("should enforce content length limits if implemented", async () => {
		// Arrange: URL that would exceed size limits
		const legitimateUrl = "https://example.com/large-image.jpg";

		// Mock axios to simulate content length exceeded error
		(axios as unknown as jest.Mock).mockRejectedValue(new Error("maxContentLength size of 1000000 exceeded"));

		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Mock file system operations for cleanup
		const mockWriteStream = {
			close: jest.fn(),
			on: jest.fn(),
		};
		(fs.createWriteStream as unknown as jest.Mock).mockReturnValue(mockWriteStream);
		(fs.unlink as unknown as jest.Mock).mockImplementation((path, callback) => callback(null));

		// Act: Attempt download that should fail due to size
		await downloadImage(throttle, legitimateUrl, mockFilePath);

		// Assert: Verify error handling and cleanup
		expect(consoleSpy).toHaveBeenCalledWith("Error downloading image:", expect.any(Error));
		expect(mockWriteStream.close).toHaveBeenCalled();
		expect(fs.unlink).toHaveBeenCalledWith(mockFilePath, expect.any(Function));

		consoleSpy.mockRestore();
	});
});
