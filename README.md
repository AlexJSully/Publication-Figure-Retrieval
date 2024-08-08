# Publication figure web scraping

This tool provides a method for scraping through NCBI's [PMC](https://www.ncbi.nlm.nih.gov/labs/pmc/) publications and retrieving (downloading) the figures from open access and publicly available publications.

[![Follow on Twitter](https://img.shields.io/twitter/follow/alexjsully?style=social)](https://twitter.com/alexjsully)
[![GitHub repo size](https://img.shields.io/github/repo-size/AlexJSully/Publication-Figures-Web-Scraping)](https://github.com/AlexJSully/Publication-Figures-Web-Scraping)
[![GitHub](https://img.shields.io/github/license/AlexJSully/Publication-Figures-Web-Scraping)](https://github.com/AlexJSully/Publication-Figures-Web-Scraping)

## Requirements

-   Node.js >= 16.13.1
-   RAM >= 4GB
-   Internet connection with greater than 7mb/s download speed

## Installation & Setup

If you would like to run or modify the publication figure web scraping tool locally, clone the repository with git by running the following command:

```git
git clone https://github.com/AlexJSully/Publication-Figures-Web-Scraping.git
```

Then run `npm install` then `npm start`. This tool runs within your node environment. On Windows, this script needs to run in an administrator mode.

The images are downloaded then downloaded locally within this containing directory under [src/data/figures/{species}/{PMC ID}](./src/data/figures).

If you would like to run against commercial use publications, you will need to download [`oa_comm_use_file.list.txt`](https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_comm_use_file.list.txt) from [ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/](https://ftp.ncbi.nlm.nih.gov/pub/pmc/) then run `npm run process`. Once that is done, set [index.js](./src/index.js) init function to true (`await init(true);`)

The publication figure scraper will resume where you last left off. If you would like to reset the scraper, empty [species-pmid-list.json](./src/data/species-pmid-list.json), [data-retrieved.json](./src/data/data-retrieved.json) and [data-empty-pubs.json](./src/data/data-empty-pubs.json) to contain only just an empty JSON object (`{}`).

If you would like to add more species support for publications to be scraped, add the species to [species.json](./src/data/species.json) and then run `npm start`. Currently, this JSON includes species' common aliases which are not currently being used but may be useful in the future. If you would like to scrape a single species, then change `speciesList` in [index.js](./src/index.js) to an array of species scientific name(s) to scrape. For example: `speciesList = ['Arabidopsis thaliana']; // Or whatever species name(s) you would like to scrape`. Currently, it is set to scrape all species within the [species.json](./src/data/species.json) file.

If in the instance that you do not have an internet connection/speed greater than 7mb/s, you will need to change all the Axios request timeouts in [data-retrieval.js](./src/scripts/data-retrieval.js) to a value of at least half of your speed (e.g. down speed of 10mb/s, set timeout to 5s).

## Known issues

We aim to make this tool as perfect as possible but unfortunately, there may be some unforeseen bugs. If you manage to find one that is not here, feel free to create a bug report so we can fix it.

-   None at the moment... Help us find some!

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

[GLP-2.0](LICENSE.md)

## Maintenance Mode

This project is currently in maintenance mode. This means that:

-   Only critical bug fixes and security updates will be addressed.
-   New feature requests are unlikely to be implemented.

## Sponsorship

If you want to support my work, you can through the following methods:

-   [BTC](3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog) - 3Lp4pwF5nXqwFA62BYx4DSvDswyYpskBog
-   [ETH](0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2) - 0xc6EB17BD7cbe5976Bfc4f845669cD66Ff340a1A2
-   [PayPal](https://paypal.me/alexjsully) - paypal.me/alexjsully

## Authors

-   Alexander Sullivan - [GitHub](https://github.com/AlexJSully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
