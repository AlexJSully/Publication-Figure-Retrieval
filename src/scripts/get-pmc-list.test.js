import axios from "axios";
import { getPMCList } from "./get-pmc-list";

// Mock the axios module
jest.mock("axios");

describe("getPMCList", () => {
	it("should return a list of 5 PMC IDs as strings", async () => {
		// Mocked XML response
		const mockResponseData = `
			<eSearchResult>
				<IdList>
				<Id>PMC1234567</Id>
				<Id>PMC2345678</Id>
				<Id>PMC3456789</Id>
				<Id>PMC4567890</Id>
				<Id>PMC5678901</Id>
				</IdList>
			</eSearchResult>
    	`;

		// Mock the axios get request to return the mockResponseData
		axios.get.mockResolvedValue({ data: mockResponseData });

		// Call the function with maxIDs set to 5
		const pmcList = await getPMCList("Arabidopsis thaliana", 5);

		// Assert that the returned list has 5 elements
		expect(pmcList).toHaveLength(5);

		// Assert that each element in the list is a string
		pmcList.forEach((id) => {
			expect(typeof id).toBe("string");
		});

		// Optional: Assert that the returned IDs match the mocked response
		expect(pmcList).toEqual(["PMC1234567", "PMC2345678", "PMC3456789", "PMC4567890", "PMC5678901"]);
	});
});
