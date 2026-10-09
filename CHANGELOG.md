# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

To see tags and releases, please go to [Tags](https://github.com/AlexJSully/Publication-Figure-Retrieval/tags) on [GitHub](https://github.com/AlexJSully/Publication-Figure-Retrieval).

## [3.1.0] - 2026-10-09

Feature:

- Retrieved figures from the PMC Cloud Service after NCBI retired the PMC OA Web Service and FTP article packages in August 2026; each image is downloaded individually and verified against its MD5 checksum
- Search queries include the `open_access` and `author_manuscript` filters

Bug fix:

- Fixed no figures being retrieved because every PMC OA Web Service lookup returned 404
- Fixed articles being cached as processed before their downloads finished; failed articles are now retried on the next run

Security:

- Validated PMC IDs before use and removed shell-based archive extraction, preventing command injection and path traversal from crafted NCBI responses
- Addressed CVE-2026-33228, CVE-2026-13149 and CVE-2026-84375 by updating npm packages
- Required npm packages to be at least 14 days old before installation (`min-release-age=14` in `.npmrc`) to reduce supply chain risk

Dependencies:

- Upgraded TypeScript to v6
- Replaced `markdownlint` with `markdownlint-cli2` for `npm run lint:markdown`
- Removed `eslint-plugin-prettier` and `eslint-config-prettier`; Prettier runs on its own
- Updated all other dependencies

## [3.0.2] - 2026-02-21

Bug fix:

- Fixed unable to download images
- Fixed handling of empty PMID array

Documentation:

- Created comprehensive docs/ directory to explain codebase architecture and usage

## [3.0.1] - 2024-08-26

Feature:

- Re-added the ability to resume the process if it was canceled

## [3.0.0] - 2024-08-25

The `Publication Figures Web Scraper` has been renamed to `Publication Figure Retrieval` as it no longer scrapes data from the web. Instead, it retrieves data from the NCBI API. This major change was done to comply with the NCBI's terms of service and policies.

Feature:

- No longer scrapes data from the web, instead retrieves data from the NCBI API

Optimization:

- Added TypeScript support and reorganized the codebase

Security:

- Update Axios package to fix security vulnerabilities

Documentation:

- Rewrote README.md to reflect the changes

Update:

- Updated packages, including Axios & ESLint (removed Sentry)

## [2.1.1] - 2024-08-08

Optimization:

- Added Jest unit testing

Documentation:

- Removed unnecessary Deepsource and Codeclimate badges

Update:

- Sentry now tracks console errors
- Update packages, including Prettier & ESLint
- Updated GitHub Actions to use Node 20

Bug fix:

- Fixed getting PMC IDs would always return 0 ID strings for each species

## [2.1.0] - 2022-11-02

Functional release tag
