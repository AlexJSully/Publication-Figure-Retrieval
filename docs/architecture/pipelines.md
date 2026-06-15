# Pipelines and Workflows

## Data Processing Pipeline

This document provides detailed workflow diagrams and explanations of the data processing pipelines used in the Publication Figure Retrieval Tool.

## Main Processing Pipeline

```mermaid
graph TD
    accTitle: Main Processing Pipeline
    accDescr: The application starts, loads environment variables, configures API rate limiting, loads the species configuration, and initializes the throttled queue. It then loops over species, searching PMC for articles. If no articles are found it logs that and moves on; otherwise it fetches article details, parses the XML, downloads the article package, extracts images, and updates the progress cache. The loop continues until no species remain.

    A[Application Start] --> B[Load Environment Variables]
    B --> C[Configure API Rate Limiting]
    C --> D[Load Species Configuration]
    D --> E[Initialize Throttled Queue]
    E --> F[Start Main Processing Loop]

    F --> G[Select Next Species]
    G --> H[Search PMC for Articles]
    H --> I{Articles Found?}

    I -->|No| J[Log No Articles Found]
    I -->|Yes| K[Process Article Batch]

    J --> L{More Species?}
    K --> M[Fetch Article Details]
    M --> N[Parse XML Content]
    N --> O[Download Article Package]
    O --> P[Extract Images from Package]
    P --> Q[Update Progress Cache]
    Q --> L

    L -->|Yes| G
    L -->|No| R[Processing Complete]
```

## Species Processing Workflow

### Step 1: Species Search Pipeline

```mermaid
sequenceDiagram
    accTitle: Species Search Pipeline
    accDescr: The main loop calls the search module with a species name. The module constructs a query of the form species[organism] and sends a GET request to the NCBI esearch endpoint. The API returns a JSON response whose esearchresult.idlist holds the PMC IDs, which the module returns to the main loop. When no results are found it returns an empty array and the main loop logs that no articles were found.

    participant M as Main Loop
    participant S as Search Module
    participant API as NCBI E-search API
    participant C as Cache System

    M->>S: searchArticlesBySpecies(species)
    S->>S: Construct Search Query
    Note over S: Query: "species[organism]"
    S->>API: GET esearch.fcgi
    Note over API: db=pmc&term=species&retmode=json

    API-->>S: JSON Response
    Note over API: { esearchresult: { idlist: [...] } }
    S->>S: Extract PMC ID List
    S-->>M: Return PMC IDs Array

    alt No Results Found
        S-->>M: Return Empty Array
        M->>M: Log "No articles found"
    end
```

### Step 2: Article Detail Fetching Pipeline

```mermaid
graph TD
    accTitle: Article Detail Fetching Pipeline
    accDescr: The PMC IDs array is filtered against cached IDs loaded from disk. If a batch has no new IDs it is skipped as already cached. Otherwise the tool builds a batch of 50, constructs the efetch URL, makes a throttled API call, receives the XML response, passes it to the parse module, and updates the cache with the new IDs. Processing continues until all batches are handled.

    A[PMC IDs Array] --> B[Check Cached IDs]
    B --> C[Load Existing Cache]
    C --> D[Filter Uncached IDs]
    D --> E{Any New IDs?}

    E -->|No| F[Skip Batch - All Cached]
    E -->|Yes| G[Create Batch of 50]

    G --> H[Construct E-fetch URL]
    H --> I[Make Throttled API Call]
    I --> J[Receive XML Response]
    J --> K[Pass to Parse Module]
    K --> L[Update Cache with New IDs]
    L --> M{More Batches?}

    M -->|Yes| G
    M -->|No| N[Batch Processing Complete]
    F --> N
```

### Step 3: XML Parsing and Package Extraction

```mermaid
graph LR
    accTitle: XML Parsing and Package Extraction
    accDescr: Raw XML data is parsed by xml2js into a JavaScript object. The tool extracts the article array and, for each article, gets the PMC ID. It then resolves the OA package URL, downloads the .tar.gz package, extracts the contents, and selects the highest-priority image per basename. Finally it creates the output directory, copies the selected images, and updates progress.

    subgraph "XML Processing"
        A[Raw XML Data] --> B[xml2js Parser]
        B --> C[JavaScript Object]
    end

    subgraph "Article Processing"
        C --> D[Extract Article Array]
        D --> E[For Each Article]
        E --> F[Get PMC ID]
        F --> G[Extract Figure Elements]
    end

    subgraph "Article Package Processing"
        G --> H[Resolve OA Package URL]
        H --> I[Download .tar.gz Package]
        I --> J[Extract Package Contents]
        J --> K[Select Highest-Priority Image Per Basename]
    end

    subgraph "Download Orchestration"
        K --> L[Create Output Directory]
        L --> M[Copy Selected Images]
        M --> N[Update Progress]
    end
```

## Figure Download Pipeline

### Download State Machine

```mermaid
stateDiagram-v2
    accTitle: Article Package Download and Extraction States
    accDescr: For each article the tool resolves the OA package URL, creates the output directory, downloads the .tar.gz package, and extracts it with tar. If extraction fails, the temporary directory is removed and the error is rethrown to the caller. On success the tool selects the highest-priority image per basename, copies the selected images to the output directory, and removes the temporary files. There is no per-figure retry or HTTP status handling.

    [*] --> Resolve_Package_URL
    Resolve_Package_URL --> Create_Output_Directory
    Create_Output_Directory --> Download_Targz
    Download_Targz --> Extract_With_Tar

    Extract_With_Tar --> Extraction_Error : tar fails
    Extraction_Error --> Cleanup_Temp
    Cleanup_Temp --> Rethrow_Error
    Rethrow_Error --> [*]

    Extract_With_Tar --> Select_Preferred_Images : extraction succeeds
    Select_Preferred_Images --> Copy_To_Output
    Copy_To_Output --> Cleanup_Temp_Final
    Cleanup_Temp_Final --> [*]
```

### Package Download Management

```mermaid
graph TD
    accTitle: Package Download Management
    accDescr: For each article the tool applies rate limiting through the throttled queue, resolves the OA package URL, downloads the .tar.gz package, and extracts its contents. It selects the highest-priority image per basename, copies the selected images to the output directory, and removes temporary files. Articles are processed sequentially rather than in parallel.

    A[Article PMC ID] --> B[Apply Rate Limiting]
    B --> C[Resolve OA Package URL]
    C --> D[Download .tar.gz Package]
    D --> E[Extract Package Contents]
    E --> F[Select Highest-Priority Image Per Basename]
    F --> G[Copy Selected Images to Output Directory]
    G --> H[Remove Temporary Files]
    H --> I{More Articles?}
    I -->|Yes| A
    I -->|No| J[Species Complete]

    subgraph "Rate Limiting"
        B --> K[Check Queue Status]
        K --> L[Wait for Available Slot]
        L --> M[Execute Request]
    end
```

## Error Handling Pipeline

### Error Recovery Workflow

```mermaid
graph TD
    accTitle: Error Recovery Workflow
    accDescr: When an operation runs and an error occurs, the tool identifies where it happened and logs it with console.error or console.log, then continues with the next item. A species search error returns an empty array, a batch fetch error continues with the next batch, and an article package error continues with the next article. Missing output and cache directories are created on demand before writes. The tool does not back off or retry.

    A[Operation Start] --> B[Execute Operation]
    B --> C{Error Occurred?}

    C -->|No| D[Operation Success]
    C -->|Yes| E[Identify Where It Occurred]

    E --> F[Species search: log and return empty array]
    E --> G[Article batch fetch: log and continue next batch]
    E --> H[Article package: log and continue next article]

    F --> O[Continue with Next Item]
    G --> O
    H --> O
    D --> P[Update Progress]
    O --> P
    P --> Q[Complete]
```

## Cache Management Pipeline

### Cache Read/Write Workflow

```mermaid
sequenceDiagram
    accTitle: Cache Read and Write Workflow
    accDescr: The application initializes the cache, and the cache manager checks whether cache/id.json exists. If it exists, its contents are read and parsed into an array; if not, the cache directory is created and an empty array is initialized. For each batch the application filters cached IDs, processes the uncached IDs, and asks the cache manager to add the new IDs, which writes the updated cache to the file system.

    participant App as Application
    participant CM as Cache Manager
    participant FS as File System
    participant Proc as Processing Module

    App->>CM: Initialize Cache
    CM->>FS: Check cache/id.json exists

    alt Cache File Exists
        FS-->>CM: Return file contents
        CM->>CM: Parse JSON to Array
    else Cache File Missing
        CM->>FS: Create cache directory
        CM->>CM: Initialize empty array
    end

    CM-->>App: Return cached IDs

    loop For Each Batch
        App->>CM: Filter cached IDs
        CM-->>App: Return uncached IDs
        App->>Proc: Process uncached IDs
        Proc-->>App: Processing complete
        App->>CM: Add new IDs to cache
        CM->>FS: Write updated cache
    end
```

### Cache Structure

```json
["PMC123456", "PMC789012", "PMC345678"]
```

## Performance Optimization Pipeline

### Batch Processing Strategy

```mermaid
graph TD
    accTitle: Batch Processing Strategy
    accDescr: A large PMC ID list is split into batches of 50. Each batch is processed and the previous batch becomes eligible for garbage collection until no batches remain. Within a batch the tool makes the fetch API call, parses the XML, extracts figures, downloads images, and updates the cache.

    A[Large PMC ID List] --> B[Split into Batches of 50]
    B --> C[Process Batch 1]
    C --> D[Previous Batch Eligible for GC]
    D --> E[Process Batch 2]
    E --> F[Previous Batch Eligible for GC]
    F --> G{More Batches?}
    G -->|Yes| H[Process Next Batch]
    G -->|No| I[All Batches Complete]
    H --> D

    subgraph "Batch Processing Details"
        J[Fetch API Call] --> K[Parse XML]
        K --> L[Extract Figures]
        L --> M[Download Images]
        M --> N[Update Cache]
    end

    C --> J
    E --> J
    H --> J
```

## Rate Limiting Pipeline

### Throttling Implementation

```mermaid
graph LR
    accTitle: Throttling Implementation
    accDescr: An API request enters the throttled queue, which checks the current load against the rate limit. Requests within the limit execute immediately; requests over the limit are queued until a slot is available and then executed. Each request updates the rate counter when complete. The configured rate is 10 requests per second when an API key is present and 3 requests per second otherwise.

    A[API Request] --> B[Throttled Queue]
    B --> C[Check Current Load]
    C --> D{Within Rate Limit?}

    D -->|Yes| E[Execute Immediately]
    D -->|No| F[Add to Queue]

    F --> G[Wait for Available Slot]
    G --> H[Execute When Ready]

    E --> I[Update Rate Counter]
    H --> I
    I --> J[Request Complete]

    subgraph "Rate Limiting Config"
        K[API Key Available?] --> L{Has Key?}
        L -->|Yes| M[10 requests/second]
        L -->|No| N[3 requests/second]
    end

    K --> B
```

## Monitoring and Logging Pipeline

### Progress Tracking

```mermaid
graph TD
    accTitle: Progress Tracking and Logging
    accDescr: Processing starts and counters are initialized. For each species the tool logs the species start, searches articles, logs the articles found, processes batches while logging batch progress, downloads figures while logging download status, and logs species completion. It repeats for each species and logs a final summary when done.

    A[Start Processing] --> B[Initialize Counters]
    B --> C[Process Species]
    C --> D[Log Species Start]
    D --> E[Search Articles]
    E --> F[Log Articles Found]
    F --> G[Process Batches]
    G --> H[Log Batch Progress]
    H --> I[Download Figures]
    I --> J[Log Download Status]
    J --> K{More Batches?}
    K -->|Yes| G
    K -->|No| L[Log Species Complete]
    L --> M{More Species?}
    M -->|Yes| C
    M -->|No| N[Log Final Summary]
```

### Example Log Output Flow

```bash
Searching articles for the species: Arabidopsis_thaliana...
Fetching Arabidopsis thaliana article details for batch 1-50...
Processing article PMC ID: PMC123456
Fetching package URL for PMC123456...
Downloading package from https://.../PMC123456.tar.gz...
Package downloaded. Extracting images...
Extracted image: figure1.jpg (priority: jpg)
Successfully extracted 1 images from package.
Successfully processed article package for PMC123456
All IDs in Arabidopsis thaliana batch 51-100 are already cached.
```

## Resume and Recovery Pipeline

### Interrupted Process Recovery

```mermaid
graph TD
    accTitle: Interrupted Process Recovery
    accDescr: After an application restart the tool loads the cache file. If the cache exists, the cached PMC IDs are parsed and compared with the species list to identify processed work and continue from the last position, filtering cached IDs and processing the remaining ones while updating the cache incrementally. If no cache exists, a new cache is initialized and processing starts fresh.

    A[Application Restart] --> B[Load Cache File]
    B --> C{Cache Exists?}

    C -->|Yes| D[Parse Cached IDs]
    C -->|No| E[Start Fresh Process]

    D --> F[Compare with Species List]
    F --> G[Identify Processed Species]
    G --> H[Continue from Last Position]

    H --> I[Filter Cached IDs]
    I --> J[Process Remaining IDs]
    J --> K[Update Cache Incrementally]

    E --> L[Initialize New Cache]
    L --> J
```

This pipeline architecture ensures robust, efficient, and resumable processing of scientific publication figures while respecting external API constraints and providing clear progress tracking throughout the entire workflow.
