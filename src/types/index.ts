/**
 * Throttle function type that wraps async operations with rate limiting.
 * @template T The return type of the throttled function
 */
export type ThrottleFunction = <T>(fn: () => Promise<T>) => Promise<T>;

/** NCBI E-utilities API response for article search. */
export interface NCBISearchResponse {
	data: {
		esearchresult: {
			idlist: string[];
			count?: string;
			retmax?: string;
			retstart?: string;
		};
	};
}

/** XML attribute structure used in parsed XML documents. */
export interface XMLAttributes {
	[key: string]: string;
}

/** Graphic element in PMC article XML representing a figure image. */
export interface XMLGraphic {
	$: XMLAttributes & {
		"xlink:href": string;
	};
}

/** Figure element in PMC article XML containing graphics and metadata. */
export interface XMLFigure {
	graphic?: XMLGraphic[];
	label?: string[];
	caption?: unknown[];
}

/** Article ID element with type attribute. */
export interface XMLArticleId {
	$: {
		"pub-id-type": string;
	};
	_: string;
}

/** Article metadata section. */
export interface XMLArticleMeta {
	"article-id": XMLArticleId[];
	"article-title"?: unknown[];
	contrib?: unknown[];
}

/** Front matter section of PMC article. */
export interface XMLFront {
	"article-meta": XMLArticleMeta[];
}

/** Body section of PMC article containing figures. */
export interface XMLBody {
	fig?: XMLFigure[];
	sec?: unknown[];
	p?: unknown[];
}

/** Complete PMC article structure from XML parsing. */
export interface PMCArticle {
	front: XMLFront[];
	body?: XMLBody[];
	back?: unknown[];
}

/** Root structure of parsed PMC article set XML. */
export interface PMCArticleSet {
	"pmc-articleset": {
		article: PMCArticle[];
	};
}

/** Species data structure from species.json. */
export interface SpeciesData {
	[speciesKey: string]: {
		alias: string[];
	};
}

/** Error with additional context for logging. */
export interface ContextualError extends Error {
	context?: {
		species?: string;
		pmcId?: string;
		url?: string;
		filepath?: string;
	};
}
