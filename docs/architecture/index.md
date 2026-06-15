# Architecture Overview

## High-Level System Design

The Publication Figure Retrieval Tool follows a modular, pipeline-based architecture designed for scalability, maintainability, and efficient processing of scientific publications from NCBI's PMC database.

## System Architecture Diagram

```mermaid
graph TB
    accTitle: High-Level System Architecture
    accDescr: Inputs (species configuration, environment variables, and API keys) feed the main orchestrator, which drives the search, fetch, parse, and download modules. The search and fetch modules call the NCBI E-utilities API and PMC database. The download module writes to the output file system, cache, and progress tracking. A throttled queue mediates the search, fetch, and download API requests under an API rate controller.

    subgraph "Input Layer"
        A[Species Configuration]
        B[Environment Variables]
        C[API Keys]
    end

    subgraph "Core Processing Pipeline"
        D[Main Orchestrator]
        E[Search Module]
        F[Fetch Module]
        G[Parse Module]
        H[Download Module]
    end

    subgraph "External APIs"
        I[NCBI E-utilities API]
        J[PMC Database]
    end

    subgraph "Storage Layer"
        K[Output File System]
        L[Cache System]
        M[Progress Tracking]
    end

    subgraph "Rate Limiting"
        N[Throttled Queue]
        O[API Rate Controller]
    end

    A --> D
    B --> D
    C --> D

    D --> E
    E --> I
    I --> E

    E --> F
    F --> J
    J --> F

    F --> G
    G --> H

    H --> K
    H --> L
    H --> M

    N --> E
    N --> F
    N --> H
    O --> N
```

## Component Architecture

### 1. Main Orchestrator (`src/index.ts`)

The central coordinator that manages the entire workflow:

```mermaid
flowchart TD
    accTitle: Main Orchestrator Control Flow
    accDescr: The orchestrator initializes the throttle queue, loads the species list, and processes each species by searching articles. If articles are found it fetches article details, otherwise it logs that no articles were found. It then processes the next species, repeating until no species remain, at which point it completes.

    A[Initialize Throttle Queue] --> B[Load Species List]
    B --> C[Process Each Species]
    C --> D[Search Articles by Species]
    D --> E{Articles Found?}
    E -->|Yes| F[Fetch Article Details]
    E -->|No| G[Log No Articles]
    F --> H[Process Next Species]
    G --> H
    H --> I{More Species?}
    I -->|Yes| C
    I -->|No| J[Complete]
```

**Key Responsibilities:**

- Initialize rate limiting and API configuration
- Coordinate species processing workflow
- Handle high-level error management
- Manage overall application lifecycle

### 2. Search Module (`src/processor/searchArticleBySpecies.ts`)

Handles publication discovery through NCBI's E-utilities API:

```mermaid
sequenceDiagram
    accTitle: Search Module Request Sequence
    accDescr: The search module constructs a query string and sends a GET request to the NCBI esearch endpoint with the PMC database and species term. The API returns a JSON response containing PMC IDs. The module extracts the ID list and returns the PMC ID array to the caller.

    participant SM as Search Module
    participant API as NCBI E-utilities
    participant Cache as Local Cache

    SM->>SM: Construct Query String
    SM->>API: GET esearch.fcgi?db=pmc&term=species
    API-->>SM: JSON Response with PMC IDs
    SM->>SM: Extract ID List
    SM-->>Cache: Return PMC ID Array
```

**Search Query Construction:**

```typescript
// Example query construction
const query = `${species}[organism]`;
const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmode=json&retmax=1000000`;
```

For further details on the E-utilities API, refer to the [NCBI E-utilities documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/).

### 3. Fetch Module (`src/processor/fetchArticleDetails.ts`)

Retrieves detailed article metadata and content:

```mermaid
graph TD
    accTitle: Fetch Module Batch Processing
    accDescr: The fetch module batches PMC IDs and checks the cache. Already-cached batches are skipped, while uncached batches are fetched as article details, parsed from XML, and recorded in the cache before figures are processed. Each batch leads to the next until all are handled.

    A[Batch PMC IDs] --> B[Check Cache]
    B --> C{Already Cached?}
    C -->|Yes| D[Skip Batch]
    C -->|No| E[Fetch Article Details]
    E --> F[Parse XML Response]
    F --> G[Update Cache]
    G --> H[Process Figures]
    D --> I[Next Batch]
    H --> I
```

**Batch Processing Strategy:**

- Processes PMC IDs in batches of 50
- Implements caching to avoid redundant API calls
- Handles network errors gracefully

### 4. Parse Module (`src/processor/parseFigures.ts`)

Processes XML article data to extract PMC IDs and orchestrate package downloads:

```mermaid
graph LR
    accTitle: Parse Module Figure Extraction
    accDescr: The parse module takes XML article data, parses its structure, extracts the article metadata, locates the PMC ID, requests the article package, extracts images from the package, and saves the images to the file system.

        A[XML Article Data] --> B[Parse XML Structure]
        B --> C[Extract Article Metadata]
        C --> D[Locate PMC ID]
        D --> E[Request Article Package]
        E --> F[Extract Images from Package]
        F --> G[Save Images to File System]
```

**XML Structure Navigation (PMC ID extraction):**

The parser locates the PMC identifier in the article front matter (see implementation: [`src/processor/parseFigures.ts`](../../src/processor/parseFigures.ts)).

```xml
<pmc-articleset>
    <article>
        <front>
            <article-meta>
                <article-id pub-id-type="pmcid">PMC123456</article-id>
            </article-meta>
        </front>
    </article>
</pmc-articleset>
```

### 5. Download Module (`src/processor/downloadArticlePackage.ts`)

Downloads a complete PMC article package (.tar.gz) and extracts image files. The implementation fetches a package URL from the OA Web Service API, downloads the archive, extracts media, and selects the highest-priority image format per basename before copying results to the output directory (see implementation: [`src/processor/downloadArticlePackage.ts`](../../src/processor/downloadArticlePackage.ts)).

Key implementation behaviours (implementation proof):

- Fetches OA package metadata via the OA API and converts FTP links to HTTPS (see [`src/processor/fetchPackageUrl.ts`](../../src/processor/fetchPackageUrl.ts)).
- Downloads the package archive and extracts it to a temporary directory (see [`src/processor/downloadArticlePackage.ts`](../../src/processor/downloadArticlePackage.ts)).
- Groups files by basename and keeps the highest-priority extension using the `IMAGE_EXTENSIONS` priority map (see [`src/constants.ts`](../../src/constants.ts)).

Console-level messages written by the implementation include `Fetching package URL for <PMCID>`, `Package downloaded. Extracting images...`, `Extracted image: <filename>`, and `Successfully extracted <N> images from package.` (see [`src/processor/downloadArticlePackage.ts`](../../src/processor/downloadArticlePackage.ts)).

## Data Flow Architecture

### Primary Data Pipeline

```mermaid
graph TD
    accTitle: Primary Data Pipeline
    accDescr: The species list generates species queries that drive the PMC search and article-detail API calls. Responses are parsed from XML, the PMC ID is extracted, the article package is requested and its images extracted. Output directories are created and images written to the file system. A progress cache records completed work, and resume logic skips already-processed PMC IDs when fetching article details.

    subgraph "Input Processing"
        A[Species List] --> B[Species Query Generation]
    end

    subgraph "API Interaction"
        B --> C[PMC Search API Call]
        C --> D[Article Details API Call]
    end

    subgraph "Content Processing"
        D --> E[XML Parsing]
        E --> F[PMC ID Extraction]
        F --> G[Request Article Package]
        G --> H[Extract Images from Package]
    end

    subgraph "File Operations"
        H --> I[Directory Creation]
        I --> J[File System Storage]
    end

    subgraph "Caching & Resume"
        K[Progress Cache] --> L[Resume Logic]
        J --> K
        L --> C
    end
```

### Error Handling Flow

```mermaid
graph TD
    accTitle: Error Handling and Continuation Flow
    accDescr: When an operation runs, the tool checks whether an error occurred. If not, processing continues. If an error occurs, the tool classifies where it happened. A species search error is logged with console.error and returns an empty array. An article batch fetch error is logged and processing continues with the next batch. An article package error is logged and processing continues with the next article, with an extra log when the message mentions the Open Access subset. The tool does not retry or apply backoff.

    A[Operation Start] --> B{Error Occurred?}
    B -->|No| C[Continue Processing]
    B -->|Yes| D{Where did it occur?}
    D -->|Species search| E[console.error and return empty array]
    D -->|Article batch fetch| F[console.error and continue next batch]
    D -->|Article package| G[console.error and continue next article]
    G --> H{Message mentions Open Access subset?}
    H -->|Yes| I[Log article not in Open Access subset]
    H -->|No| C
    I --> C
    E --> C
    F --> C
    C --> J[Operation Complete]
```

## Key Architectural Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:

- **Search**: Publication discovery
- **Fetch**: Data retrieval
- **Parse**: Content extraction
- **Download**: File management

### 2. Rate Limiting Strategy

```mermaid
graph LR
    accTitle: Rate Limiting Strategy
    accDescr: An API request enters the throttled queue, which checks the rate limit. Requests within the limit execute immediately, while requests that exceed it are queued until a slot is available and then executed. Each executed request updates the rate counter.

    A[API Request] --> B[Throttled Queue]
    B --> C{Rate Limit Check}
    C -->|Within Limits| D[Execute Request]
    C -->|Exceeds Limits| E[Queue Request]
    E --> F[Wait for Available Slot]
    F --> D
    D --> G[Update Rate Counter]
```

**Rate Limiting Implementation:**

- Uses `throttled-queue` library for precise control
- Configurable based on API key availability
- Prevents API violations and ensures sustainable usage

### 3. Caching and Resume Capability

```mermaid
graph TB
    accTitle: Caching and Resume Capability
    accDescr: At process start the tool checks for the cache file. If it exists, the cached PMC IDs are loaded; if not, an empty cache is initialized. New PMC IDs are filtered from the cache, processed, and the cache is updated and saved to disk.

    A[Process Start] --> B[Check Cache File]
    B --> C{Cache Exists?}
    C -->|Yes| D[Load Cached PMC IDs]
    C -->|No| E[Initialize Empty Cache]
    D --> F[Filter New PMC IDs]
    E --> F
    F --> G[Process New PMC IDs]
    G --> H[Update Cache]
    H --> I[Save Cache to Disk]
```

### 4. Error Handling and Continuation

The system logs operation-level failures and continues processing subsequent species/articles:

1. **Search failures**: `searchArticlesBySpecies` returns an empty list on request failures
2. **Batch fetch failures**: `fetchArticleDetails` logs batch-level errors and continues with remaining batches
3. **Package failures**: `parseFigures` logs package-level failures and continues with remaining articles
4. **Filesystem setup**: output/cache directories are created on demand before writes

## Performance Considerations

### Memory Management

```mermaid
graph TD
    accTitle: Memory Management Through Batching
    accDescr: A large dataset is handled through batch processing. The tool processes 50 PMC IDs at a time, so only one batch is held in memory at once and the previous batch becomes eligible for garbage collection, repeating until no batches remain.

    A[Large Dataset] --> B[Batch Processing]
    B --> C[Process 50 PMC IDs]
    C --> D[Previous Batch Eligible for GC]
    D --> E{More Batches?}
    E -->|Yes| C
    E -->|No| F[Complete]
```

### Concurrent Operations

- **Single-threaded** design for API compliance
- **Sequential processing** to respect rate limits
- **Asynchronous I/O** for file operations

### Storage Optimization

- **Hierarchical directory structure** for organization
- **Original file format preservation**
- **Duplicate detection** through caching

## Related Documentation

- [Dependencies](./dependencies.md) - External libraries and tools used
- [Pipelines](./pipelines.md) - Detailed workflow diagrams

## Real-World Scenarios

### Large-Scale Data Collection

When processing hundreds of species with thousands of publications each:

1. **Memory**: Batch processing prevents memory overflow
2. **Network**: Rate limiting ensures API compliance
3. **Storage**: Hierarchical structure maintains organization
4. **Resume**: Cache allows recovery from interruptions

### Research Integration

The modular architecture allows easy integration with research workflows:

```typescript
// Example integration
import { fetchArticleDetails } from "./processor/fetchArticleDetails";
import { searchArticlesBySpecies } from "./processor/searchArticleBySpecies";

// Custom workflow
async function customResearchPipeline(targetSpecies: string[]) {
	for (const species of targetSpecies) {
		const pmids = await searchArticlesBySpecies(throttle, species);
		await fetchArticleDetails(throttle, pmids, species);
		// Additional custom processing...
	}
}
```

This architecture ensures the tool is both robust for production use and flexible for research customization.
