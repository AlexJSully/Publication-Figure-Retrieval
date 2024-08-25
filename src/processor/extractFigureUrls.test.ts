import { extractFigureUrls } from "./extractFigureUrls";

describe("extractFigureUrls", () => {
	const pmcId = "123456";

	it("should return an array of absolute URLs for figures with extensions", () => {
		const article = {
			body: [
				{
					fig: [
						{
							graphic: [{ $: { "xlink:href": "image1.jpg" } }, { $: { "xlink:href": "image2.png" } }],
						},
					],
				},
			],
		};

		const expectedUrls = [
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image1.jpg`,
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image2.png`,
		];

		const result = extractFigureUrls(article, pmcId);
		expect(result).toEqual(expectedUrls);
	});

	it("should add .jpg extension if not present", () => {
		const article = {
			body: [
				{
					fig: [
						{
							graphic: [{ $: { "xlink:href": "image1" } }, { $: { "xlink:href": "image2" } }],
						},
					],
				},
			],
		};

		const expectedUrls = [
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image1.jpg`,
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image2.jpg`,
		];

		const result = extractFigureUrls(article, pmcId);
		expect(result).toEqual(expectedUrls);
	});

	it("should return an empty array if no figures are found", () => {
		const article = {
			body: [
				{
					fig: [],
				},
			],
		};

		const result = extractFigureUrls(article, pmcId);
		expect(result).toEqual([]);
	});

	it("should return an empty array if no body section is present", () => {
		const article = {};

		const result = extractFigureUrls(article, pmcId);
		expect(result).toEqual([]);
	});
});
