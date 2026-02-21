import axios from "axios";
import { fetchPackageUrl, fetchPackageUrlsBatch } from "./fetchPackageUrl";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchPackageUrl", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should fetch package URL for a valid PMC ID", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <responseDate>2026-02-21 10:45:55</responseDate>
  <request id="PMC11869999">https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC11869999</request>
  <records returned-count="1" total-count="1">
    <record id="PMC11869999" citation="Nano Lett. 2025 Feb 11; 25(8):3038-3044" license="CC BY-NC-ND" retracted="no">
      <link format="tgz" updated="2026-02-11 16:25:12" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/3a/5e/PMC11869999.tar.gz" />
      <link format="pdf" updated="2025-02-28 13:47:57" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/3a/5e/nl4c04541.PMC11869999.pdf" />
    </record>
  </records>
</OA>`;

		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		const result = await fetchPackageUrl("PMC11869999");

		expect(mockedAxios.get).toHaveBeenCalledWith("https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi", {
			params: { id: "PMC11869999" },
			timeout: 10000,
		});

		expect(result).toEqual({
			pmcId: "PMC11869999",
			tgzUrl: "https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/3a/5e/PMC11869999.tar.gz",
			pdfUrl: "https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/3a/5e/nl4c04541.PMC11869999.pdf",
			license: "CC BY-NC-ND",
			citation: "Nano Lett. 2025 Feb 11; 25(8):3038-3044",
			retracted: "no",
		});
	});

	it("should add PMC prefix if not present", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC123456" citation="Test" license="CC BY" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/aa/bb/PMC123456.tar.gz" />
    </record>
  </records>
</OA>`;

		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		const result = await fetchPackageUrl("123456");

		expect(mockedAxios.get).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				params: { id: "PMC123456" },
			}),
		);

		expect(result.pmcId).toBe("PMC123456");
	});

	it("should throw error if article not found", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <responseDate>2026-02-21 10:45:55</responseDate>
  <request id="PMC999999999">https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC999999999</request>
  <records returned-count="0" total-count="0"></records>
</OA>`;

		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		await expect(fetchPackageUrl("PMC999999999")).rejects.toThrow("not found in Open Access subset");
	});

	it("should throw error if no tgz link available", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC123456" citation="Test" license="CC BY" retracted="no">
    </record>
  </records>
</OA>`;

		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		await expect(fetchPackageUrl("PMC123456")).rejects.toThrow("No downloadable package found");
	});

	it("should handle API errors", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <error>Invalid request</error>
</OA>`;

		mockedAxios.get.mockResolvedValue({ data: mockResponse });

		await expect(fetchPackageUrl("PMC123456")).rejects.toThrow("OA API error: Invalid request");
	});

	it("should handle network errors", async () => {
		const error = new Error("Network error");
		mockedAxios.get.mockRejectedValue(error);
		mockedAxios.isAxiosError.mockReturnValue(true);

		await expect(fetchPackageUrl("PMC123456")).rejects.toThrow("Failed to fetch package URL");
	});
});

describe("fetchPackageUrlsBatch", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("should fetch package URLs for multiple PMC IDs with throttling", async () => {
		const mockResponse1 = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC111" citation="Test 1" license="CC BY" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/aa/bb/PMC111.tar.gz" />
    </record>
  </records>
</OA>`;

		const mockResponse2 = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC222" citation="Test 2" license="CC BY-NC" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/cc/dd/PMC222.tar.gz" />
    </record>
  </records>
</OA>`;

		mockedAxios.get.mockResolvedValueOnce({ data: mockResponse1 }).mockResolvedValueOnce({ data: mockResponse2 });

		const promise = fetchPackageUrlsBatch(["PMC111", "PMC222"], 100);

		// Fast-forward timers
		await jest.runAllTimersAsync();

		const results = await promise;

		expect(results).toHaveLength(2);
		expect(results[0].pmcId).toBe("PMC111");
		expect(results[1].pmcId).toBe("PMC222");
		expect(mockedAxios.get).toHaveBeenCalledTimes(2);
	});

	it("should continue on error and process remaining PMC IDs", async () => {
		const mockResponse = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC222" citation="Test 2" license="CC BY" retracted="no">
      <link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/cc/dd/PMC222.tar.gz" />
    </record>
  </records>
</OA>`;

		mockedAxios.get.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({ data: mockResponse });

		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		const promise = fetchPackageUrlsBatch(["PMC111", "PMC222"], 100);

		await jest.runAllTimersAsync();

		const results = await promise;

		expect(results).toHaveLength(1);
		expect(results[0].pmcId).toBe("PMC222");
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Error fetching package URL for PMC111"),
			expect.any(Error),
		);

		consoleErrorSpy.mockRestore();
	});
});
