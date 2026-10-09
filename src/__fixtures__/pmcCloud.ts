/** Test fixtures standing in for NCBI responses: the PMC Cloud Service bucket and efetch article XML. */
import crypto from "crypto";
import xml2js from "xml2js";
import { PMC_CLOUD_BASE_URL, PMC_CLOUD_BUCKET } from "../constants";

/** One article version served by {@link fakePmcCloud}. */
export interface FakeArticle {
	/** PMC accession ID, e.g. "PMC123". */
	pmcid: string;
	/** Article version number. */
	version: number;
	/** Media files in the version, by file name, with their content. */
	files?: Record<string, string | Buffer>;
	/** Media URLs listed in the metadata JSON; defaults to one URL per entry in `files`, carrying its true MD5. */
	mediaUrls?: string[];
}

/** A request handler with the shape of `axios.get`, as passed to `mockImplementation`. */
export type FakeGet = (
	url: string,
	config?: { params?: Record<string, unknown>; responseType?: string },
) => Promise<{ data: unknown }>;

/** Returns the hex MD5 digest of `content`. */
export function md5Of(content: string | Buffer): string {
	return crypto.createHash("md5").update(content).digest("hex");
}

/** Returns the S3 media URL the metadata JSON lists for a file, with an `md5` parameter when one is given. */
export function mediaUrl(pmcid: string, version: number, name: string, md5?: string): string {
	const url = `s3://${PMC_CLOUD_BUCKET}/${pmcid}.${version}/${name}`;

	return md5 === undefined ? url : `${url}?md5=${md5}`;
}

/**
 * Returns a fake `axios.get` serving the given article versions the way the PMC Cloud Service and axios do.
 *
 * Prefix listings are S3 ListObjectsV2 XML, sorted by key as S3 sorts them, with version prefixes grouped
 * into `CommonPrefixes` only when the request asks for the "/" delimiter. Metadata is parsed JSON. A media
 * file is a Buffer only when `responseType` is "arraybuffer", and is otherwise decoded as UTF-8 text, as axios
 * does in Node. A URL in `failingUrls` rejects with a 500 error, and any other unknown URL rejects with a 404
 * error.
 */
export function fakePmcCloud(articles: FakeArticle[], failingUrls: string[] = []): FakeGet {
	return async (url, config) => {
		if (failingUrls.includes(url)) {
			throw new Error("Request failed with status code 500");
		}

		const prefix = config?.params?.prefix;
		if (url === PMC_CLOUD_BASE_URL && typeof prefix === "string") {
			return { data: listingXml(articles, prefix, config?.params?.delimiter === "/") };
		}

		for (const article of articles) {
			const versionPrefix = `${article.pmcid}.${article.version}`;
			const files = article.files ?? {};

			if (url === `${PMC_CLOUD_BASE_URL}/metadata/${versionPrefix}.json`) {
				const mediaUrls =
					article.mediaUrls ??
					Object.entries(files).map(([name, content]) =>
						mediaUrl(article.pmcid, article.version, name, md5Of(content)),
					);

				return { data: { pmcid: article.pmcid, version: article.version, media_urls: mediaUrls } };
			}

			for (const [name, content] of Object.entries(files)) {
				if (url === `${PMC_CLOUD_BASE_URL}/${versionPrefix}/${name}`) {
					const bytes = Buffer.from(content);

					return { data: config?.responseType === "arraybuffer" ? bytes : bytes.toString("utf-8") };
				}
			}
		}

		throw new Error("Request failed with status code 404");
	};
}

/** Returns the ListObjectsV2 XML for the article versions whose keys start with `prefix`. */
function listingXml(articles: FakeArticle[], prefix: string, groupByVersion: boolean): string {
	const matching = articles.filter((article) => `${article.pmcid}.${article.version}/`.startsWith(prefix));
	let entries: string;

	if (groupByVersion) {
		entries = matching
			.map((article) => `${article.pmcid}.${article.version}/`)
			.sort()
			.map((versionPrefix) => `<CommonPrefixes><Prefix>${versionPrefix}</Prefix></CommonPrefixes>`)
			.join("");
	} else {
		entries = matching
			.map((article) => `${article.pmcid}.${article.version}/${article.pmcid}.${article.version}.json`)
			.sort()
			.map((key) => `<Contents><Key>${key}</Key></Contents>`)
			.join("");
	}

	return `<ListBucketResult><Name>${PMC_CLOUD_BUCKET}</Name><Prefix>${prefix}</Prefix>${entries}</ListBucketResult>`;
}

/** Returns efetch-style article set XML holding one article per ID, each identified by an article-id of `idType`. */
export function buildArticleSetXml(ids: string[], idType = "pmcid"): string {
	const articles = ids.map((id) => ({
		front: [{ "article-meta": [{ "article-id": [{ $: { "pub-id-type": idType }, _: id }] }] }],
	}));

	return new xml2js.Builder().buildObject({ "pmc-articleset": { article: articles } });
}
