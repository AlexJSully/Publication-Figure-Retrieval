# Publication figure web scraping

This tool provides a method for scraping through NCBI's [PubMed](https://www.ncbi.nlm.nih.gov/pubmed) publications and retrieving (downloading) the figures from open access and publicly available publications.

## Requirements

-   Node.js >= 16.13.1

## Installation/Open

If you would like to run or modify the publication figure web scraping tool locally, clone the repository with git by running the following command:

```git
git clone https://github.com/ASully/Publication-Figures-Web-Scraping.git
```

Then run `npm install` within the host, client and server directories, then change to appropriate directory and then `npm start`. This tool will run at http://localhost:3000/ (port 3000 is used by default).

The images are downloaded then downloaded locally within this containing directory under [src/data/figures](https://github.com/ASully/Publication-Figures-Web-Scraping/tree/master/src/data/figures).

If you would like to run against commercial use publications, ou will need to download `oa_comm_use_file.list.txt` from [ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/](https://ftp.ncbi.nlm.nih.gov/pub/pmc/)

## Known issues

We aim to make this tool as perfect as possible but unfortunately, there may be some unforseen bugs. If you manage to find one that is not here, feel free to create a bug report so we can fix it.

-   None at the moment... Help us find some!

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

[GLP-2.0](LICENSE.md)

## Authors

-   Alexander Sullivan - [GitHub](https://github.com/ASully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
