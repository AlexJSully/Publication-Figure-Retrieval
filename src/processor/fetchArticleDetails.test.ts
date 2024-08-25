import axios from "axios";
import { fetchArticleDetails } from "./fetchArticleDetails";
import { parseFigures } from "./parseFigures";

jest.mock("axios");
jest.mock("./parseFigures");

describe("fetchArticleDetails", () => {
	const throttle = jest.fn((fn) => fn());
	const pmids = ["PMC123456", "PMC654321"];
	const species = "Homo sapiens";

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should fetch article details in batches and call parseFigures", async () => {
		const mockResponse = { data: "<xml>mock data</xml>" };
		(axios.get as jest.Mock).mockResolvedValue(mockResponse);

		await fetchArticleDetails(throttle, pmids, species);

		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(axios.get).toHaveBeenCalledWith(
			"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=PMC123456,PMC654321&retmode=xml",
		);
		expect(parseFigures).toHaveBeenCalledWith(throttle, mockResponse.data, species);
	});

	it("should handle errors gracefully", async () => {
		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		(axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

		await fetchArticleDetails(throttle, pmids, species);

		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching article details:", expect.any(Error));

		consoleErrorSpy.mockRestore();
	});
});
