# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

To see tags and releases, please go to [Tags](https://github.com/AlexJSully/Publication-Figure-Retrieval/tags) on [GitHub](https://github.com/AlexJSully/Publication-Figure-Retrieval).

## [3.0.1] - 2024-08-26

Feature:

-   Re-added the ability to resume the process if it was canceled

## [3.0.0] - 2024-08-25

The `Publication Figures Web Scraper` has been renamed to `Publication Figure Retrieval` as it no longer scrapes data from the web. Instead, it retrieves data from the NCBI API. This major change was done to comply with the NCBI's terms of service and policies.

Feature:

-   No longer scrapes data from the web, instead retrieves data from the NCBI API

Optimization:

-   Added TypeScript support and reorganized the codebase

Security:

-   Update Axios package to fix security vulnerabilities

Documentation:

-   Rewrote README.md to reflect the changes

Update:

-   Updated packages, including Axios & ESLint (removed Sentry)

## [2.1.1] - 2024-08-08

Optimization:

-   Added Jest unit testing

Documentation:

-   Removed unnecessary Deepsource and Codeclimate badges

Update:

-   Sentry now tracks console errors
-   Update packages, including Prettier & ESLint
-   Updated GitHub Actions to use Node 20

Bug fix:

-   Fixed getting PMC IDs would always return 0 ID strings for each species

## [2.1.0] - 2022-11-02

Functional release tag
