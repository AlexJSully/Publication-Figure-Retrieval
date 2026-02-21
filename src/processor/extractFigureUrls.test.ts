import type { PMCArticle } from "../types";
import { extractFigureUrls } from "./extractFigureUrls";

describe("extractFigureUrls", () => {
	type TestCase = {
		name: string;
		input: {
			article: PMCArticle;
			pmcId: string;
		};
		want: string[];
	};

	const testCases: TestCase[] = [
		{
			name: "returns absolute URLs for figures with extensions",
			input: {
				article: {
					front: [],
					body: [
						{
							fig: [
								{
									graphic: [
										{ $: { "xlink:href": "image1.jpg" } },
										{ $: { "xlink:href": "image2.png" } },
									],
								},
							],
						},
					],
				},
				pmcId: "123456",
			},
			want: [
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image1.jpg",
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image2.png",
			],
		},
		{
			name: "adds .jpg extension if not present",
			input: {
				article: {
					front: [],
					body: [
						{
							fig: [
								{
									graphic: [{ $: { "xlink:href": "image1" } }, { $: { "xlink:href": "image2" } }],
								},
							],
						},
					],
				},
				pmcId: "123456",
			},
			want: [
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image1.jpg",
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/bin/image2.jpg",
			],
		},
		{
			name: "returns empty array if no figures are found",
			input: {
				article: {
					front: [],
					body: [
						{
							fig: [],
						},
					],
				},
				pmcId: "123456",
			},
			want: [],
		},
		{
			name: "returns empty array if no body section is present",
			input: {
				article: {
					front: [],
				},
				pmcId: "123456",
			},
			want: [],
		},
		{
			name: "handles multiple image formats correctly",
			input: {
				article: {
					front: [],
					body: [
						{
							fig: [
								{
									graphic: [
										{ $: { "xlink:href": "fig1.gif" } },
										{ $: { "xlink:href": "fig2.tiff" } },
										{ $: { "xlink:href": "fig3.svg" } },
									],
								},
							],
						},
					],
				},
				pmcId: "789012",
			},
			want: [
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC789012/bin/fig1.gif",
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC789012/bin/fig2.tiff",
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC789012/bin/fig3.svg",
			],
		},
		{
			name: "handles PMC IDs that already include PMC prefix",
			input: {
				article: {
					front: [],
					body: [
						{
							fig: [
								{
									graphic: [
										{ $: { "xlink:href": "PBI-24-486-g001.jpg" } },
										{ $: { "xlink:href": "figure-2" } },
									],
								},
							],
						},
					],
				},
				pmcId: "PMC12906822",
			},
			want: [
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12906822/bin/PBI-24-486-g001.jpg",
				"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12906822/bin/figure-2.jpg",
			],
		},
	];

	it.each(testCases)("$name", ({ input, want }) => {
		const result = extractFigureUrls(input.article, input.pmcId);
		expect(result).toEqual(want);
	});
});
