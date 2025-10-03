# Publication Figure Retrieval Tool

This tool provides a method for retrieving figures from NCBI's [PMC](https://www.ncbi.nlm.nih.gov/labs/pmc/) publications using the Entrez API. The tool systematically searches for publications related to specific plant species and downloads associated figures for research and analysis purposes.

[![Follow on Twitter](https://img.shields.io/twitter/follow/alexjsully?style=social)](https://twitter.com/alexjsully)
[![GitHub repo size](https://img.shields.io/github/repo-size/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)
[![GitHub](https://img.shields.io/github/license/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)

## Features

- **Automated Species Search**: Searches for publications related to 30+ plant species
- **Figure Extraction**: Downloads high-quality figures from PMC articles
- **Resume Capability**: Caches processed PMC IDs to resume interrupted downloads
- **Rate Limiting**: Respects NCBI API limits (3 requests/second, 10 with API key)
- **Batch Processing**: Efficiently processes thousands of articles per species
- **Organized Output**: Structures downloaded figures by species and publication ID

## Disclaimer

This code is maintained for educational and historical reference purposes only. The tool was originally developed for academic research. Please note that the use of this tool for retrieving figures from PMC publications is subject to NCBI's policies. Use at own risk.

## Requirements

- **Node.js**: Version 20 or higher
- **RAM**: 4GB minimum
- **Internet**: Stable connection with >7MB/s download speed

## Installation & Setup

### Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/AlexJSully/Publication-Figure-Retrieval.git
cd Publication-Figure-Retrieval
npm ci
```

### API Key Configuration (Recommended)

To increase API rate limits from 3 to 10 requests per second, obtain an NCBI API key:

1. Visit [NCBI API Key Documentation](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
2. Create a `.env` file in the project root:

```bash
NCBI_API_KEY=your_api_key_here
```

### Running the Tool

Start the figure retrieval process:

```bash
npm run start
```

The tool will:

1. Process each species from `src/data/species.json`
2. Search PMC for related articles
3. Download figures to `build/output/[species_name]/`
4. Cache progress in `build/output/cache/id.json`

### Resume Capability

If interrupted, simply run `npm run start` again. The tool will:

- Check the cache for already processed PMC IDs
- Resume from where it left off
- Skip duplicate downloads

To reset and start fresh, delete the cache file:

```bash
rm build/output/cache/id.json
```

## Output Structure

Downloaded figures are organized in a structured hierarchy:

```text
build/output/
├── cache/
│   └── id.json                    # Cached PMC IDs for resume capability
├── Arabidopsis_thaliana/
│   ├── PMC123456/
│   │   ├── figure1.jpg
│   │   ├── figure2.png
│   │   └── metadata.json          # Article metadata
│   └── PMC789012/
│       └── figure1.svg
├── Cannabis_sativa/
│   └── PMC345678/
│       ├── figure1.jpg
│       └── figure2.tiff
└── [other_species]/
```

## Known Issues

We aim to make this tool as perfect as possible but unfortunately, there may be some unforeseen bugs. If you manage to find one that is not here, feel free to create a bug report so we can fix it.

- None at the moment... Help us find some!

## Documentation

For comprehensive documentation, see the [`docs/`](docs/) folder:

- [**Getting Started**](docs/index.md) - Complete overview and setup guide
- [**Architecture**](docs/architecture/) - Technical architecture and design decisions
- [**Usage Examples**](docs/usage/examples/) - Detailed usage examples and troubleshooting
- [**API Reference**](docs/usage/api/) - Complete API documentation
- [**Contributing**](docs/contributing/) - Development setup and contribution guidelines

## License

[GLP-2.0](LICENSE.md)

## Maintenance Mode

This project is currently in maintenance mode. This means that:

- Only critical bug fixes and security updates will be addressed.
- New feature requests are unlikely to be implemented.

## Sponsorship

If you want to support my work, you can do so through the following methods:

- [BTC](3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog) - 3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog
- [ETH](0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2) - 0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2

## Authors

- Alexander Sullivan - [GitHub](https://github.com/AlexJSully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
