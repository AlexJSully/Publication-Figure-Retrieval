# Open Source and API Acknowledgements

This project makes use of the following open-source dependencies and APIs:

## Open Source Dependencies

The following open-source packages are used in this project. For a complete and up-to-date list, see [`package.json`](../../package.json) in the project root.

- axios
- throttled-queue
- xml2js
- typescript
- @types/node
- @types/xml2js
- jest
- ts-jest
- @types/jest
- eslint
- eslint-plugin-node
- prettier
- @trivago/prettier-plugin-sort-imports
- markdownlint-cli2
- globals

We thank the maintainers and contributors of these open-source projects for their work.

## External APIs

This tool relies on the following public APIs and services:

- **NCBI E-utilities API** ([documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/))
    - Used for searching and retrieving publication metadata and full-text articles from PubMed Central (PMC).
- **PMC Cloud Service** ([documentation](https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/))
    - The public S3 bucket `pmc-oa-opendata`, read over HTTPS without credentials. Used for retrieving article metadata and figure images from the PMC Article Datasets.

We gratefully acknowledge the NCBI and NIH for providing these valuable public resources.
