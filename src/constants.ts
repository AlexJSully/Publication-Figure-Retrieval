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
 * - gif: Limited colors, mainly for animations
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
