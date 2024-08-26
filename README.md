# Publication Figure Retrieval Tool

This tool provides a method for retrieving figures from NCBI's [PMC](https://www.ncbi.nlm.nih.gov/labs/pmc/) publications using the Entrez API.

[![Follow on Twitter](https://img.shields.io/twitter/follow/alexjsully?style=social)](https://twitter.com/alexjsully)
[![GitHub repo size](https://img.shields.io/github/repo-size/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)
[![GitHub](https://img.shields.io/github/license/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)

## Disclaimer

This code is maintained for educational and historical reference purposes only. The tool was originally developed for academic research. Please note that the use of this tool for retrieving figures from PMC publications is subject to NCBI's policies. Use at own risk.

## Requirements

-   Node.js >= 20
-   RAM >= 4GB
-   Internet connection with greater than 7mb/s download speed

## Installation & Setup

If you would like to run or modify the publication figure retrieval tool locally, clone the repository with git by running the following command:

```bash
git clone https://github.com/AlexJSully/Publication-Figure-Retrieval.git
```

Then run

```bash
npm install
```

### Running locally

To start and run the publication figure retrieval tool, run the following command:

```bash
npm run start
```

If you chose to cancel this process at any time, you can resume and continue where you left off by running the same command. It will store the already processed PMC IDs in `build/output/cache/id.json`. To reset the cache, delete the `id.json` file.

### Usage

The images are downloaded locally within the `build/output` directory. They are organized by species then by publication ID.

### API Key

If you have an API key, create a `.env` file in the root directory and add your API key as follows:

```bash
NCBI_API_KEY=your_api_key_here
```

With an API key, the tool can retrieve up to 10 calls per second instead of 3. Details on obtaining an API key can be found [here](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/).

## Known Issues

We aim to make this tool as perfect as possible but unfortunately, there may be some unforeseen bugs. If you manage to find one that is not here, feel free to create a bug report so we can fix it.

-   None at the moment... Help us find some!

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

Before contributing, ensure that all tests pass by running:

```bash
npm run validate
```

## License

[GLP-2.0](LICENSE.md)

## Maintenance Mode

This project is currently in maintenance mode. This means that:

-   Only critical bug fixes and security updates will be addressed.
-   New feature requests are unlikely to be implemented.

## Sponsorship

If you want to support my work, you can do so through the following methods:

-   [BTC](3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog) - 3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog
-   [ETH](0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2) - 0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2

## Authors

-   Alexander Sullivan - [GitHub](https://github.com/AlexJSully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
