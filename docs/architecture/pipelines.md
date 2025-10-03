# Pipelines and Workflows

## Data Processing Pipeline

This document provides detailed workflow diagrams and explanations of the data processing pipelines used in the Publication Figure Retrieval Tool.

## Main Processing Pipeline

```mermaid
graph TD
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
    N --> O[Extract Figure URLs]
    O --> P[Download Figures]
    P --> Q[Update Progress Cache]
    Q --> L

    L -->|Yes| G
    L -->|No| R[Processing Complete]
```

## Species Processing Workflow

### Step 1: Species Search Pipeline

```mermaid
sequenceDiagram
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

### Step 3: XML Parsing and Figure Extraction

```mermaid
graph LR
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

    subgraph "Figure Processing"
        G --> H[Process Figure Graphics]
        H --> I[Construct Figure URLs]
        I --> J[Validate URL Format]
        J --> K[Add .jpg if No Extension]
    end

    subgraph "Download Orchestration"
        K --> L[Create Output Directory]
        L --> M[Queue Figure Download]
        M --> N[Update Progress]
    end
```

## Figure Download Pipeline

### Download State Machine

```mermaid
stateDiagram-v2
    [*] --> Validate_URL
    Validate_URL --> Check_Directory
    Check_Directory --> Create_Directory : Directory Missing
    Check_Directory --> Download_Image : Directory Exists
    Create_Directory --> Download_Image

    Download_Image --> Success : HTTP 200
    Download_Image --> Not_Found : HTTP 404
    Download_Image --> Rate_Limited : HTTP 429
    Download_Image --> Network_Error : Connection Error

    Success --> [*]
    Not_Found --> Log_Skip
    Log_Skip --> [*]

    Rate_Limited --> Wait_Retry
    Network_Error --> Wait_Retry
    Wait_Retry --> Retry_Count

    Retry_Count --> Download_Image : Count < 3
    Retry_Count --> Failed : Count >= 3
    Failed --> [*]
```

### Parallel Download Management

```mermaid
graph TD
    A[Figure URL List] --> B[Sequential Processing]
    B --> C[Apply Rate Limiting]
    C --> D[Create Directory Structure]
    D --> E[Download Single Figure]
    E --> F[Save to File System]
    F --> G{More Figures?}
    G -->|Yes| E
    G -->|No| H[Article Complete]

    subgraph "Rate Limiting"
        C --> I[Check Queue Status]
        I --> J[Wait for Available Slot]
        J --> K[Execute Download]
        K --> C
    end
```

## Error Handling Pipeline

### Error Recovery Workflow

```mermaid
graph TD
    A[Operation Start] --> B[Execute Operation]
    B --> C{Error Occurred?}

    C -->|No| D[Operation Success]
    C -->|Yes| E[Identify Error Type]

    E --> F{Network Error?}
    E --> G{Rate Limit Error?}
    E --> H{Data Format Error?}
    E --> I{File System Error?}

    F -->|Yes| J[Exponential Backoff]
    G -->|Yes| K[Wait for Rate Reset]
    H -->|Yes| L[Log and Skip]
    I -->|Yes| M[Create Directories]

    J --> N{Retry Count < 3?}
    K --> N
    M --> N

    N -->|Yes| B
    N -->|No| L

    L --> O[Continue with Next Item]
    D --> P[Update Progress]
    O --> P
    P --> Q[Complete]
```

## Cache Management Pipeline

### Cache Read/Write Workflow

```mermaid
sequenceDiagram
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
{
	"cached_ids": ["PMC123456", "PMC789012", "PMC345678"],
	"last_updated": "2024-01-15T10:30:00Z",
	"species_processed": ["Arabidopsis_thaliana", "Cannabis_sativa"]
}
```

## Performance Optimization Pipeline

### Batch Processing Strategy

```mermaid
graph TD
    A[Large PMC ID List] --> B[Split into Batches of 50]
    B --> C[Process Batch 1]
    C --> D[Memory Cleanup]
    D --> E[Process Batch 2]
    E --> F[Memory Cleanup]
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
[INFO] Searching articles for the species: Arabidopsis_thaliana...
[INFO] Found 1,234 articles for Arabidopsis_thaliana
[INFO] Fetching Arabidopsis thaliana article details for batch 1-50...
[INFO] Processing article PMC ID: PMC123456
[INFO] Found 3 figures in the article.
[INFO] Downloaded image: figure1.jpg
[INFO] Downloaded image: figure2.png
[INFO] Downloaded image: supplementary1.tiff
[INFO] All IDs in Arabidopsis thaliana batch 51-100 are already cached.
[INFO] Processing complete for Arabidopsis_thaliana
```

## Resume and Recovery Pipeline

### Interrupted Process Recovery

```mermaid
graph TD
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
