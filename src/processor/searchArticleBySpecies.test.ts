import axios from "axios";
import { searchArticlesBySpecies } from "./searchArticleBySpecies";

jest.mock("axios");

describe("searchArticlesBySpecies", () => {
	const throttle = jest.fn((fn) => fn());
	const species = "Homo sapiens";
	const query = `${species}[organism]`;
	const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(
		query,
	)}&retmode=json&retmax=1000000`;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return an array of PMCIDs when the API call is successful", async () => {
		const mockResponse = { data: { esearchresult: { idlist: ["PMC123456", "PMC654321"] } } };
		(axios.get as jest.Mock).mockResolvedValue(mockResponse);

		const result = await searchArticlesBySpecies(throttle, species);

		expect(axios.get).toHaveBeenCalledWith(url);
		expect(result).toEqual(["PMC123456", "PMC654321"]);
	});

	it("should return an empty array when the API call fails", async () => {
		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		(axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

		const result = await searchArticlesBySpecies(throttle, species);

		expect(axios.get).toHaveBeenCalledWith(url);
		expect(result).toEqual([]);
		expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching articles:", expect.any(Error));

		consoleErrorSpy.mockRestore();
	});
});
