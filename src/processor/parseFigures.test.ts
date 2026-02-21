import xml2js from "xml2js";
import { parseFigures } from "./parseFigures";

describe("parseFigures", () => {
	type TestCase = {
		name: string;
		xmlData: string;
		species: string;
		wantLogsNoArticles?: boolean;
		wantLogsParseError?: boolean;
		wantLogsSkipArticle?: boolean;
	};

	/* Helper to build valid PMC XML structure for testing */
	function buildXml(articles: any[]): string {
		const builder = new xml2js.Builder();
		return builder.buildObject({
			"pmc-articleset": { article: articles },
		});
	}

	const testCases: TestCase[] = [
		{
			name: "logs when no articles found",
			xmlData: buildXml([]),
			species: "Homo sapiens",
			wantLogsNoArticles: true,
		},
		{
			name: "skips article with no PMC ID",
			xmlData: buildXml([
				{
					front: [
						{
							"article-meta": [
								{
									"article-id": [{ $: { "pub-id-type": "pmid" }, _: "12345" }],
								},
							],
						},
					],
				},
			]),
			species: "Homo sapiens",
			wantLogsSkipArticle: true,
		},
		{
			name: "handles pub-id-type pmc",
			xmlData: buildXml([
				{
					front: [
						{
							"article-meta": [
								{
									"article-id": [{ $: { "pub-id-type": "pmc" }, _: "PMC123456" }],
								},
							],
						},
					],
				},
			]),
			species: "Homo sapiens",
		},
		{
			name: "handles pub-id-type pmcid",
			xmlData: buildXml([
				{
					front: [
						{
							"article-meta": [
								{
									"article-id": [{ $: { "pub-id-type": "pmcid" }, _: "PMC654321" }],
								},
							],
						},
					],
				},
			]),
			species: "Homo sapiens",
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it.each(testCases)(
		"$name",
		async ({ xmlData, species, wantLogsNoArticles, wantLogsSkipArticle, wantLogsParseError }) => {
			// Arrange
			const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
			const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			// Act - throttle function that executes immediately
			const throttle: import("../types").ThrottleFunction = <T>(fn: () => Promise<T>) => fn();
			await parseFigures(throttle, xmlData, species);

			// Assert
			if (wantLogsNoArticles) {
				expect(logSpy).toHaveBeenCalledWith("No articles found in the response.");
			}

			if (wantLogsSkipArticle) {
				expect(logSpy).toHaveBeenCalledWith("Skipping article: PMC ID not found.");
			}

			if (wantLogsParseError) {
				expect(errorSpy).toHaveBeenCalledWith(
					"Error parsing XML:",
					expect.anything(),
					expect.objectContaining({ species }),
				);
			}

			logSpy.mockRestore();
			errorSpy.mockRestore();
		},
	);

	it("logs error on XML parsing failure", async () => {
		// Arrange
		const invalidXml = "<badxml>";
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		// Act
		const throttle: import("../types").ThrottleFunction = <T>(fn: () => Promise<T>) => fn();
		await parseFigures(throttle, invalidXml, "Homo sapiens");

		// Assert
		expect(errorSpy).toHaveBeenCalledWith(
			"Error parsing XML:",
			expect.any(String),
			expect.objectContaining({ species: "Homo sapiens" }),
		);

		errorSpy.mockRestore();
	});
});
