# Frequently Asked Questions (FAQ)

This FAQ addresses common questions, issues, and use cases for the Publication Figure Retrieval Tool.

## General Questions

### What is the Publication Figure Retrieval Tool?

The Publication Figure Retrieval Tool is an open-source Node.js application that automatically downloads figures from scientific publications. It searches the NCBI PMC (PubMed Central) database for articles related to specific species and downloads their figure images from the PMC Cloud Service for research and analysis purposes.

### What formats are supported?

- **Input**: Species names (scientific and common names)
- **Output**: Image files listed in each article's PMC Cloud Service metadata; supported extensions are defined in the code (`IMAGE_EXTENSIONS`) and include common formats such as `jpg`, `png`, `tiff`, `gif`, and `svg` (see [`src/constants.ts`](../src/constants.ts)). Where a figure exists in several formats, only the highest-priority extension is downloaded.
- **Data**: A progress cache file (`build/output/cache/id.json`) that stores the IDs of handled articles as a JSON array, written alongside the downloaded image files

### Is this tool free to use?

The project is open-source; consult the repository [`package.json`](../package.json) for the declared license. Users must comply with NCBI API usage guidelines and any applicable publication copyright restrictions.

## Installation and Setup

### Q: What are the system requirements?

**A:**

- Node.js 24 or higher
- 2GB available disk space (recommended)
- Stable internet connection

### Q: How do I install the tool?

**A:**

```bash
# Clone the repository
git clone https://github.com/AlexJSully/Publication-Figure-Retrieval.git
cd Publication-Figure-Retrieval

# Install dependencies
npm ci

# Run the tool
npm run start
```

### Q: Do I need an API key?

**A:** An NCBI API key is optional but recommended for better rate limits:

```bash
# Add to .env file
NCBI_API_KEY=your_api_key_here
```

Get your API key from: <https://www.ncbi.nlm.nih.gov/account/settings/>

## Usage Questions

### Q: How do I search for a specific species?

**A:** Add your species to `src/data/species.json`:

```json
{
	"Homo_sapiens": {
		"alias": ["Human", "Homo sapiens", "H. sapiens"]
	}
}
```

### Q: Can I download figures for multiple species at once?

**A:** Yes, the tool processes all species defined in the species.json file:

```bash
# This will process all species in the configuration
npm run start
```

### Q: How do I limit the number of articles searched?

**A:** Currently, the tool searches all available articles. You can modify the search parameters in `src/processor/searchArticleBySpecies.ts`:

```typescript
// Modify the retmax parameter
const searchUrl = `${BASE_URL}/esearch.fcgi?db=pmc&term=${encodedTerm}&retmode=json&retmax=100`;
```

For available esearch parameters, refer to the [NCBI E-utilities documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/).

For the example above:

- `db`: The database to search (e.g., `pmc`)
- `term`: The search term (the code uses `<species>[organism] AND (open_access[Filter] OR author_manuscript[Filter])`)
- `retmode`: The return mode (e.g., `json`)
- `retmax`: The maximum number of results to return

### Q: Where are the downloaded figures saved?

**A:** At runtime the tool writes downloaded images to the `build/output/` directory (when running the compiled JavaScript). The layout is organized by species and PMC ID, and an article's folder is created only when its first verified image is written; the download and write behaviour are implemented in [`src/processor/parseFigures.ts`](../src/processor/parseFigures.ts) and [`src/processor/downloadArticleImages.ts`](../src/processor/downloadArticleImages.ts). Example:

```text
build/output/
├── cache/
│   └── id.json
├── Homo_sapiens/
│   ├── PMC123456/
│   │   ├── figure1.jpg
│   │   └── figure2.png
```

## Troubleshooting

### Q: The tool is running slowly. How can I speed it up?

**A:** Several optimization strategies:

1. **Increase throttle limits** (be careful with NCBI limits):

```typescript
// In src/index.ts
const throttle = throttledQueue({ maxPerInterval: 5, interval: 1000 }); // 5 requests per second
```

2. **Use an API key** for better rate limits

3. **Reduce species count** for testing

4. **Check your internet connection**

### Q: I'm getting "Request failed" errors. What should I do?

**A:** Common solutions:

1. **Check internet connection**
2. **Verify NCBI service status**
3. **Reduce request rate**:

```typescript
const throttle = throttledQueue({ maxPerInterval: 2, interval: 2000 }); // Slower rate
```

4. **Note**: Failed requests are logged and skipped; the tool continues with the next item rather than retrying within the same run. Articles that failed are not added to the cache, so the next `npm run start` retries them.

Image downloads from the PMC Cloud Service do not go through the throttle; only the ESearch and EFetch requests and each article's metadata lookup do.

### Q: No figures are being downloaded. Why?

**A:** Possible causes and solutions:

1. **Species not found in PMC**:
    - Check species names in `species.json`
    - Add more aliases for better search coverage

2. **Articles have no figures**:
    - Some articles have no image files in their PMC Cloud Service metadata; the console shows `No images found for <PMCID>.`
    - Some articles are not in the PMC Article Datasets; the console shows `Article <PMCID> is not in the PMC Article Datasets and has no images to download.`
    - Check the console output for per-article processing logs

3. **Images fail verification**:
    - An image is written only when it matches the MD5 digest in the article metadata. Failures are logged with messages such as `MD5 mismatch (expected <digest>, got <digest>)` or `the metadata lists no MD5 digest to verify against`, and the article is retried on the next run

4. **Network issues**:
    - Check console output for error messages
    - Verify internet connection

## Configuration Questions

### Q: How do I customize the search terms?

**A:** Modify the species aliases in `src/data/species.json`:

```json
{
	"Mus_musculus": {
		"alias": ["Mouse", "Mus musculus", "M. musculus", "Laboratory mouse", "House mouse"]
	}
}
```

## Development Questions

### Q: How do I contribute to the project?

**A:** See our [Contributing Guide](../CONTRIBUTING.md) for detailed instructions:

1. Fork the repository
2. Create a branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Q: How do I run tests during development?

**A:**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- searchArticleBySpecies.test.ts
```

### Q: How do I debug the application?

**A:** Several debugging options:

1. **Console logging**:

```typescript
console.log("Debug info:", variable);
```

2. **VS Code debugging**:
    - Set breakpoints in TypeScript files
    - Press F5 to start debugging

## API and Data Questions

### Q: What NCBI databases are used?

**A:** The tool primarily uses:

- **PMC (PubMed Central)**: For searching open-access articles and author manuscripts
- **ESearch**: For article search functionality
- **EFetch**: For retrieving article details
- **PMC Cloud Service**: The public S3 bucket `pmc-oa-opendata`, for article metadata and figure images from the PMC Article Datasets (see the [PMC Cloud Service documentation](https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/))

### Q: What metadata is collected?

**A:** The current implementation primarily tracks progress in `build/output/cache/id.json` and writes downloaded image files to per-species/per-PMCID directories. It reads each article's metadata JSON from the PMC Cloud Service to find its images but does not save it or generate a per-article metadata JSON file.

### Q: How are duplicate articles handled?

**A:** The tool automatically handles duplicates:

- Articles are identified by PMC ID
- PMC IDs already in the cache are skipped during processing, so their figures are not downloaded again
- An article that failed is not cached; on the next run all of its images are downloaded again and existing files are overwritten

## Performance and Limitations

### Q: How many articles can the tool process?

**A:** The tool can process thousands of articles, but consider:

- **NCBI rate limits**: 3 requests/second without API key, 10 with key
- **Disk space**: Each figure is typically 100KB-2MB

### Q: What are the NCBI usage limits?

**A:** NCBI guidelines:

- **Without API key**: 3 requests per second
- **With API key**: 10 requests per second
- **Large jobs**: Contact NCBI for permission

Need more help? Check our [documentation](./index.md) or [open an issue](https://github.com/AlexJSully/Publication-Figure-Retrieval/issues) on GitHub.
