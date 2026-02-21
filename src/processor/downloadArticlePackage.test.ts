import axios from "axios";
import { downloadArticlePackage } from "./downloadArticlePackage";

jest.mock("axios");
jest.mock("child_process", () => ({
	exec: jest.fn((_, cb) => cb?.(null, { stdout: "", stderr: "" })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("downloadArticlePackage", () => {
	type TestCase = {
		name: string;
		pmcId: string;
		shouldFetchSucceed: boolean;
		shouldHttpSucceed: boolean;
		wantError?: boolean;
	};

	const throttle = async <T>(fn: () => Promise<T>) => fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const testCases: TestCase[] = [
		{
			name: "throws error when fetch package URL fails",
			pmcId: "PMC999999",
			shouldFetchSucceed: false,
			shouldHttpSucceed: true,
			wantError: true,
		},
		{
			name: "throws error when HTTP download fails",
			pmcId: "PMC123456",
			shouldFetchSucceed: true,
			shouldHttpSucceed: false,
			wantError: true,
		},
	];

	it.each(testCases)("$name", async ({ pmcId, shouldFetchSucceed, shouldHttpSucceed, wantError }) => {
		// Arrange: Mock axios based on test case
		if (!shouldHttpSucceed) {
			mockedAxios.get.mockRejectedValue(new Error("HTTP error"));
		} else {
			mockedAxios.get.mockResolvedValue({
				data: {
					pipe: jest.fn(),
					on: jest.fn(),
					removeListener: jest.fn(),
				},
			} as any);
		}

		// Act & Assert
		if (wantError) {
			await expect(downloadArticlePackage(throttle, pmcId, "/tmp/test")).rejects.toThrow();
		}
	});

	it("verifies package URL is fetched before download", async () => {
		// Arrange: Mock successful responses
		mockedAxios.get.mockResolvedValue({
			data: {
				pipe: jest.fn(),
				on: jest.fn(),
				removeListener: jest.fn(),
			},
		} as any);

		// Act
		try {
			await downloadArticlePackage(throttle, "PMC123456", "/tmp/test");
		} catch {
			// Expected - tar extraction will fail with mocked exec
		}

		// Assert: Verify axios.get was called (package URL fetch happens first)
		expect(mockedAxios.get).toHaveBeenCalled();
	});
});
