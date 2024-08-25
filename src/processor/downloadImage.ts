import axios from "axios";
import fs from "fs";

/**
 * Downloads an image from a given URL and saves it to the specified file path.
 *
 * @returns A promise that resolves when the image has been successfully downloaded and saved.
 */
export async function downloadImage(
	/** A throttling function to limit the rate of HTTP requests. */
	throttle: any,
	/** The URL of the image to download. */
	url: string,
	/** The file path where the downloaded image will be saved. */
	filepath: string,
): Promise<void> {
	/** Create a write stream to save the image to the specified file path. */
	const writer = fs.createWriteStream(filepath);

	try {
		console.log("Downloading image:", url);

		// Make HTTP request to download image
		const response = await throttle(
			async () =>
				await axios({
					url,
					method: "GET",
					responseType: "stream",
				}),
		);

		// Pipe the image data to the write stream
		response.data.pipe(writer);

		return new Promise<void>((resolve, reject) => {
			writer.on("finish", () => {
				console.log(`Finished writing image to ${filepath}`);
				resolve();
			});
			writer.on("error", (err) => {
				console.error(`Error writing image to ${filepath}:`, err);
				reject(err);
			});
		});
	} catch (error) {
		console.error("Error downloading image:", error);
		writer.close();
		fs.unlink(filepath, () => {}); // Clean up incomplete file
	}
}
