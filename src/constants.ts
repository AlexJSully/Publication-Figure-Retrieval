/**
 * Shared constants for the Publication Figure Retrieval system.
 */

/**
 * Supported image file extensions with priority order (highest to lowest).
 * When multiple versions of the same figure exist, the highest priority format is kept.
 *
 * Priority rationale:
 * - jpg/jpeg: Best balance of quality and file size, most common
 * - png: Lossless compression, supports transparency
 * - tiff: High quality, but large file sizes
 * - webp: Modern format with good compression
 * - gif: Limited colours, mainly for animations
 * - svg: Vector format, scalable
 * - ico: Icon format, typically low resolution
 * - heif: Modern format, not widely supported
 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "tiff", "webp", "gif", "svg", "ico", "heif"] as const;

/** Priority map for image extensions (lower number = higher priority). */
export const IMAGE_EXTENSION_PRIORITY: Record<string, number> = IMAGE_EXTENSIONS.reduce(
	(acc, ext, index) => {
		acc[ext] = index;
		return acc;
	},
	{} as Record<string, number>,
);

/** Regular expression pattern to match supported image file extensions. */
export const IMAGE_EXTENSION_PATTERN = new RegExp(`\\.(${IMAGE_EXTENSIONS.join("|")})$`, "i");

/** Regular expression pattern matching a PMC ID: digits, optionally prefixed with "PMC". */
export const PMC_ID_PATTERN = /^(?:PMC)?\d+$/;

/**
 * Name of the public S3 bucket holding the PMC Article Datasets.
 * @see https://pmc-oa-opendata.s3.amazonaws.com/README.txt
 */
export const PMC_CLOUD_BUCKET = "pmc-oa-opendata";

/** HTTPS base URL of the PMC Cloud Service bucket, readable without credentials. */
export const PMC_CLOUD_BASE_URL = `https://${PMC_CLOUD_BUCKET}.s3.amazonaws.com`;

/** Milliseconds to wait for a PMC Cloud Service response. */
export const PMC_CLOUD_REQUEST_TIMEOUT_MS = 30000;
