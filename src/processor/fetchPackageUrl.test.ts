import axios from "axios";
import { fetchPackageUrl, fetchPackageUrlsBatch } from "./fetchPackageUrl";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchPackageUrl", () => {
	type TestCase = {
		name: string;
		pmcId: string;
		mockResponse: string;
		wantError?: boolean;
		wantErrorMessage?: string;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const testCases: TestCase[] = [
		{
			name: "fetches package URL for valid PMC ID",
			pmcId: "PMC11869999",
			mockResponse: `<?xml version="1.0"?>
<OA>
  <responseDate>2026-02-21 10:45:55</responseDate>
  <request id="PMC11869999">https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC11869999</request>
  <records returned-count="1" total-count="1">
    <record id="PMC11869999" citation="Nano Lett. 2025 Feb 11" license="CC BY-NC-ND" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/3a/5e/PMC11869999.tar.gz" />
      <link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/3a/5e/PMC11869999.pdf" />
    </record>
  </records>
</OA>`,
		},
		{
			name: "adds PMC prefix if not present",
			pmcId: "123456",
			mockResponse: `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC123456" citation="Test" license="CC BY" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/aa/bb/PMC123456.tar.gz" />
    </record>
  </records>
</OA>`,
		},
		{
			name: "throws error when article not found",
			pmcId: "PMC999999999",
			mockResponse: `<?xml version="1.0"?>
<OA>
  <records returned-count="0" total-count="0"></records>
</OA>`,
			wantError: true,
			wantErrorMessage: "not found in Open Access subset",
		},
		{
			name: "throws error when no tgz link available",
			pmcId: "PMC123456",
			mockResponse: `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC123456" citation="Test" license="CC BY" retracted="no">
    </record>
  </records>
</OA>`,
			wantError: true,
			wantErrorMessage: "No downloadable package found",
		},
		{
			name: "throws error on API error response",
			pmcId: "PMC123456",
			mockResponse: `<?xml version="1.0"?>
<OA>
  <error>Invalid request</error>
</OA>`,
			wantError: true,
			wantErrorMessage: "OA API error",
		},
	];

	it.each(testCases)("$name", async ({ pmcId, mockResponse, wantError, wantErrorMessage }) => {
		// Arrange
		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		// Act & Assert
		if (wantError) {
			await expect(fetchPackageUrl(pmcId)).rejects.toThrow(wantErrorMessage);
		} else {
			const result = await fetchPackageUrl(pmcId);
			expect(result.pmcId).toBe(pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`);
			expect(result.tgzUrl).toContain("https://ftp.ncbi.nlm.nih.gov");
		}
	});

	it("handles network errors gracefully", async () => {
		// Arrange
		const networkError = new Error("Network error");
		mockedAxios.get.mockRejectedValue(networkError);
		mockedAxios.isAxiosError.mockReturnValue(true);

		// Act & Assert
		await expect(fetchPackageUrl("PMC123456")).rejects.toThrow("Failed to fetch package URL");
	});
});

describe("fetchPackageUrlsBatch", () => {
	type BatchTestCase = {
		name: string;
		pmcIds: string[];
		successResponses: string[];
		failureIndexes?: number[];
		wantCount: number;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const batchTestCases: BatchTestCase[] = [
		{
			name: "fetches multiple PMC IDs with throttling",
			pmcIds: ["PMC111", "PMC222"],
			successResponses: [
				`<?xml version="1.0"?><OA><records returned-count="1"><record id="PMC111" citation="Test 1" license="CC BY"><link format="tgz" href="ftp://example.com/PMC111.tar.gz" /></record></records></OA>`,
				`<?xml version="1.0"?><OA><records returned-count="1"><record id="PMC222" citation="Test 2" license="CC BY"><link format="tgz" href="ftp://example.com/PMC222.tar.gz" /></record></records></OA>`,
			],
			wantCount: 2,
		},
		{
			name: "continues on error and processes remaining PMC IDs",
			pmcIds: ["PMC111", "PMC222"],
			successResponses: [
				`<?xml version="1.0"?><OA><records returned-count="1"><record id="PMC222" citation="Test 2" license="CC BY"><link format="tgz" href="ftp://example.com/PMC222.tar.gz" /></record></records></OA>`,
			],
			failureIndexes: [0],
			wantCount: 1,
		},
	];

	it.each(batchTestCases)("$name", async ({ pmcIds, successResponses, failureIndexes = [], wantCount }) => {
		// Arrange: Set up mock responses
		let callIndex = 0;
		mockedAxios.get.mockImplementation(async () => {
			if (failureIndexes.includes(callIndex)) {
				callIndex++;
				return Promise.reject(new Error("Network error"));
			}
			const failedCount = failureIndexes.filter((i) => i < callIndex).length;
			const response = successResponses[callIndex - failedCount];
			callIndex++;
			return Promise.resolve({ data: response });
		});

		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act
		const promise = fetchPackageUrlsBatch(pmcIds, 100);
		await jest.runAllTimersAsync();
		const results = await promise;

		// Assert
		expect(results).toHaveLength(wantCount);
		if (failureIndexes.length > 0) {
			expect(consoleErrorSpy).toHaveBeenCalled();
		}

		consoleErrorSpy.mockRestore();
	});
});
