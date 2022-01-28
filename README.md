# Publication figure web scraping

This tool provides a method for scraping through NCBI's [PubMed](https://www.ncbi.nlm.nih.gov/pubmed) publications and retrieving (downloading) the figures from open access and publicly available publications.

## Requirements

-   Node.js >= 16.13.1

## Installation & Setup

If you would like to run or modify the publication figure web scraping tool locally, clone the repository with git by running the following command:

```git
git clone https://github.com/ASully/Publication-Figures-Web-Scraping.git
```

Then run `npm install` within the host, client and server directories, then change to appropriate directory and then `npm start`. This tool runs within your node environment.

The images are downloaded then downloaded locally within this containing directory under [src/data/figures](./src/data/figures).

If you would like to run against commercial use publications, you will need to download [`oa_comm_use_file.list.txt`](https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_comm_use_file.list.txt) from [ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/](https://ftp.ncbi.nlm.nih.gov/pub/pmc/) then run `npm run process`. Once that is done, set [index.js](./src/index.js) init function to true (`await init(true);`)

The publication figure scraper will resume where you last left off. If you would like to reset the scraper, empty [species-pmid-list.json](./src/data/species-pmid-list.json) and [data-retrieved.json](./src/data/data-retrieved.json) to contain only just an empty JSON object (`{}`).

If you would like to add more species support for publications to be scraped, add the species to [species.json](./src/data/species.json) and then run `npm start`. Currently, this JSON includes species' common aliases which are not currently being used but may be useful in the future. If you would like to scrape a single species, then change `speciesList` in [index.js](./src/index.js) to an array of species scientific name(s) to scrape. For example: `speciesList = ['Arabidopsis thaliana']; // Or whatever species name(s) you would like to scrape`. Currently, it is set to scrape all species within the [species.json](./src/data/species.json) file.

## Known issues

We aim to make this tool as perfect as possible but unfortunately, there may be some unforeseen bugs. If you manage to find one that is not here, feel free to create a bug report so we can fix it.

-   None at the moment... Help us find some!

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

[GLP-2.0](LICENSE.md)

## Authors

-   Alexander Sullivan - [GitHub](https://github.com/ASully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
