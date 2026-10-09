# Publication Figure Retrieval Tool

## Overview

The Publication Figure Retrieval Tool is a specialized utility that automatically downloads scientific figures from publications in NCBI's PubMed Central (PMC) database. It processes a predefined list of species, searches for relevant open-access publications and author manuscripts, and downloads all associated figures from the PMC Cloud Service in an organized directory structure.

This tool is particularly valuable for researchers in bioinformatics, comparative biology, and data mining who need to analyze scientific figures across multiple publications for specific organisms.

## 🚨 Important Disclaimers

- **Educational and Historical Use Only**: This code is maintained primarily for educational and historical reference purposes
- **NCBI Policy Compliance**: Usage must comply with NCBI's policies and rate limits
- **PMC Article Datasets Only**: The tool only searches PMC articles with the `open_access` or `author_manuscript` filter, the articles available in the PMC Article Datasets on the PMC Cloud Service
- **Use at Your Own Risk**: Users are responsible for ensuring their usage complies with applicable policies and terms of service

## Key Features

- **Species-Based Search**: Automatically searches for publications related to specific organisms
- **Bulk Figure Download**: Downloads all figures from matching publications
- **Rate Limiting**: Respects NCBI API rate limits (3 requests/second without API key, 10 with key)
- **Resume Capability**: Can resume interrupted downloads using cached progress
- **Organized Output**: Files are organized by species and publication ID

## System Requirements

- **Node.js**: Version 24 or higher
- **RAM**: Minimum 4GB recommended
- **Internet**: 7+ Mbps download speed recommended
- **Storage**: Varies based on number of figures downloaded

## Workflow Overview

```mermaid
graph TD
    accTitle: End-to-End Figure Retrieval Workflow
    accDescr: The tool starts, loads the species list, and for each species searches PMC articles, gets PMC IDs, fetches article details, parses the XML response, fetches each article's metadata from the PMC Cloud Service, downloads the article's images and verifies each one's MD5 digest, and saves the verified images to a species and PMC ID directory before moving to the next species until all are complete.

    A[Start] --> B[Load Species List]
    B --> C[For Each Species]
    C --> D[Search PMC Articles]
    D --> E[Get Article PMC IDs]
    E --> F[Fetch Article Details]
    F --> G[Parse XML Response]
    G --> H[Fetch Article Metadata from PMC Cloud Service]
    H --> I[Download Images and Verify MD5]
    I --> J[Save to Species/PMCID Directory]
    J --> K{More Species?}
    K -->|Yes| C
    K -->|No| L[Complete]
```

## Example Use Cases

### 1. Figure Dataset Creation

Perfect for creating training datasets for machine learning models that analyze scientific figures:

```bash
# After running the tool, you'll have:
build/output/
├── Homo_sapiens/
│   ├── PMC123456/
│   │   ├── figure1.jpg
│   │   └── figure2.png
│   └── PMC789012/
│       └── figure1.jpg
└── Mus_musculus/
    └── PMC345678/
        ├── figure1.jpg
        ├── figure2.jpg
        └── figure3.png
```

### 2. Research Meta-Analysis

Collecting visual data across multiple publications for systematic reviews or meta-analyses.

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/AlexJSully/Publication-Figure-Retrieval.git
cd Publication-Figure-Retrieval

# Install dependencies
npm ci
```

### Validate

You can ensure the code is functioning correctly by running the validation script:

```bash
npm run validate
```

### Basic Usage

```bash
# Run the tool
npm run start
```

The tool will:

1. Read species from [`src/data/species.json`](../src/data/species.json)
2. Search PMC for each species (see [`src/processor/searchArticleBySpecies.ts`](../src/processor/searchArticleBySpecies.ts))
3. For each article: fetch article XML, identify the PMC ID, fetch the article's metadata from the PMC Cloud Service, and download its images one at a time into `build/output/[species]/[pmcid]/`, writing only images that match their MD5 digest (see [`src/processor/parseFigures.ts`](../src/processor/parseFigures.ts) and [`src/processor/downloadArticleImages.ts`](../src/processor/downloadArticleImages.ts))
4. Cache handled articles in `build/output/cache/id.json` to enable resume; articles that failed are not cached and are retried on the next run

### With API Key (Recommended)

```bash
# Create .env file
echo "NCBI_API_KEY=your_api_key_here" > .env

# Run with faster rate limits (10 req/sec vs 3 req/sec)
npm run start
```

Get your API key from [NCBI](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/).

## Data Flow Architecture

```mermaid
sequenceDiagram
    accTitle: Data Flow Between Pipeline Functions and PMC
    accDescr: The user runs npm run start, which calls main. Main calls searchArticlesBySpecies, which queries the PMC esearch endpoint and returns PMC IDs. Main then calls fetchArticleDetails, which queries the efetch endpoint in batches and receives XML. fetchArticleDetails calls parseFigures, which calls downloadArticleImages for each article. downloadArticleImages lists the PMC Cloud Service bucket for the article's versions, reads the metadata of the highest version, and downloads each image, saving the images whose MD5 digest matches to disk. parseFigures returns the handled PMC IDs to fetchArticleDetails, which records them in the cache, and the user receives organized files.

    participant User
    participant Main
    participant Search
    participant Fetch
    participant Parse
    participant Download
    participant PMC as PMC Database
    participant Cloud as PMC Cloud Service

    User->>Main: npm run start
    Main->>Search: searchArticlesBySpecies()
    Search->>PMC: esearch.fcgi?db=pmc&term=species query
    PMC-->>Search: List of PMC IDs
    Search-->>Main: PMC IDs array

    Main->>Fetch: fetchArticleDetails(pmcIds)
    Fetch->>PMC: efetch.fcgi?db=pmc&id=batch
    PMC-->>Fetch: XML article data

    Fetch->>Parse: parseFigures(xmlData)
    Parse->>Download: downloadArticleImages(pmcId)
    Download->>Cloud: List article versions and get metadata JSON
    Cloud-->>Download: Metadata with image URLs and MD5 digests
    Download->>Cloud: Get each image
    Cloud-->>Download: Image file
    Download-->>Parse: Verified images saved to disk
    Parse-->>Fetch: Handled PMC IDs
    Fetch->>Fetch: Cache handled IDs
    Parse-->>User: Organized files
```

## Output Structure

```text
build/output/
├── cache/
│   └── id.json                    # Cached PMC IDs for resume capability
├── Arabidopsis_thaliana/
│   ├── PMC123456/
│   │   ├── figure1.jpg
│   │   ├── figure2.png
│   │   └── supplementary1.tiff
│   └── PMC789012/
│       └── figure1.jpg
├── Cannabis_sativa/
│   └── PMC345678/
│       ├── figure1.jpg
│       └── figure2.png
└── [other_species]/
    └── [pmcid]/
        └── [figures]
```

## Resume Functionality

If the process is interrupted, simply run `npm run start` again. The tool will:

1. Read cached PMC IDs from `build/output/cache/id.json`
2. Skip already processed publications
3. Continue from where it left off, retrying any article that failed on an earlier run

To start fresh, delete the cache file:

```bash
rm build/output/cache/id.json
```

## Performance Considerations

### Rate Limiting

- **Without API Key**: 3 requests per second
- **With API Key**: 10 requests per second
- Built-in throttling prevents API violations

### Batch Processing

- Article details fetched in batches of 50 PMC IDs
- Efficient for large datasets
- Memory-conscious processing

### Error Handling

- Network errors are logged but don't stop execution
- Media URLs outside the article version's own folder in the PMC Cloud Service are skipped
- Each image is checked against the MD5 digest listed in the article metadata, and only verified images are written
- An article with any failed image is not cached, so the next run retries it; images already verified stay on disk and are downloaded again on the retry

## Supported Species

The tool processes 27 plant species defined in [`src/data/species.json`](../src/data/species.json). These include:

- Arabidopsis thaliana (model plant)
- Cannabis sativa (hemp)
- Oryza sativa (rice)
- Triticum aestivum (wheat)
- Zea mays (maize)
- Glycine max (soybean)
- Solanum lycopersicum (tomato)
- And 20 more...

Each species entry includes aliases for better search coverage:

```json
{
	"Arabidopsis_thaliana": {
		"alias": ["Arabidopsis thaliana", "Mouse-ear cress", "Thale cress"]
	}
}
```

## Next Steps

- [Architecture Overview](./architecture/index.md) - Understand the system design
- [Usage Guide](./usage/index.md) - Detailed usage instructions and examples
- [API Documentation](./usage/api/index.md) - Module and function references
- [Contributing](../CONTRIBUTING.md) - How to contribute to the project
- [FAQ](./faq.md) - Common questions and troubleshooting

## Support

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/AlexJSully/Publication-Figure-Retrieval).
