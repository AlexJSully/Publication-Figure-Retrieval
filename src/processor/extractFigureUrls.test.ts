/**
 * @fileoverview Test suite for extractFigureUrls module.
 *
 * Tests the functionality of extracting downloadable figure URLs from
 * parsed PMC article XML structures and constructing valid NCBI download URLs.
 */
import { extractFigureUrls } from "./extractFigureUrls";

describe("extractFigureUrls", () => {
	const pmcId = "123456";

	it("should return an array of absolute URLs for figures with extensions", () => {
		// Arrange: Article structure with figures containing explicit file extensions
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

		// Expected URLs with original extensions preserved
		const expectedUrls = [
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image1.jpg`,
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image2.png`,
		];

		// Act: Extract figure URLs from article structure
		const result = extractFigureUrls(article, pmcId);

		// Assert: Verify URLs match expected format and preserve extensions
		expect(result).toEqual(expectedUrls);
	});

	it("should add .jpg extension if not present", () => {
		// Arrange: Article with graphics missing file extensions
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

		// Expected URLs with .jpg extension added
		const expectedUrls = [
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image1.jpg`,
			`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/image2.jpg`,
		];

		// Act: Process figures without extensions
		const result = extractFigureUrls(article, pmcId);

		// Assert: Verify default extension was added
		expect(result).toEqual(expectedUrls);
	});

	it("should return an empty array if no figures are found", () => {
		// Arrange: Article with empty figure array
		const article = {
			body: [
				{
					fig: [], // Empty figures array
				},
			],
		};

		// Act: Process article with no figures
		const result = extractFigureUrls(article, pmcId);

		// Assert: Should return empty array for no figures
		expect(result).toEqual([]);
	});

	it("should return an empty array if no body section is present", () => {
		// Arrange: Article missing body section completely
		const article = {}; // No body property

		// Act: Process article without body structure
		const result = extractFigureUrls(article, pmcId);

		// Assert: Should handle missing body gracefully
		expect(result).toEqual([]);
	});
});
