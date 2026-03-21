# Map My Reads — Architecture Diagrams

---

## 1. Component Tree

```
app/layout.tsx
└── BooksProvider (contexts/BooksContext)
    └── ThemeProvider (contexts/ThemeContext)
        └── EnrichmentProvider (contexts/EnrichmentContext)
            └── app/page.tsx  (Home)
                ├── HeroScreen              ← shown when books.length === 0
                │   └── file input (CSV upload)
                │
                └── Main view               ← shown when books.length > 0
                    ├── ReadingAtlasSummary  (mobile only, above map)
                    ├── MapContainer
                    │   ├── MapLibreMap     (MapLibre GL canvas)
                    │   ├── MapControls     (theme switcher)
                    │   └── FeedbackButton
                    ├── DesktopSidebar      (lg+, right panel)
                    ├── MobileBottomSheet   (< lg, slides up)
                    ├── DeveloperTools      (debug overlay, hidden by default)
                    └── EnrichmentProgress  (loading indicator)
```

---

## 2. Context Ownership

```
┌─────────────────────────────────────────────────────────────┐
│  BooksContext                                               │
│  ─────────────────────────────────────────────────────────  │
│  books: Book[]                 ← full library               │
│  setBooks()                                                 │
│  selectedCountry: string|null  ← clicked country (ISO2)    │
│  setSelectedCountry()                                       │
│  summaryStats                  ← derived: counts/coverage  │
│  updateBookCountries()         ← manual country override   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ThemeContext                                               │
│  ─────────────────────────────────────────────────────────  │
│  currentTheme: ThemeKey        ← blue|yellow|purple|pink|  │
│  setCurrentTheme()                green                     │
│  themeObject                   ← derived: colors object    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EnrichmentContext                                          │
│  ─────────────────────────────────────────────────────────  │
│  isEnriching: bool             ← author resolution running │
│  enrichmentProgress            ← { current, total, stage } │
│  isLoadingCovers: bool         ← cover fetching running    │
│  coverProgress                 ← { current, total, stage } │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow — CSV Upload

```
User drops CSV file
        │
        ▼
  Papa.parse()
  lib/csvParser.ts
  detectCSVFormat() → parseCSVData()
        │
        ▼
  setBooks(parsedBooks)           ← map renders immediately (no countries yet)
        │
        ├─────────────────────────────────────────┐
        │  (parallel)                             │
        ▼                                         ▼
  resolveAuthorCountriesBackend()      enrichBooksWithCoversBatched()
  lib/authorCountryService.ts          lib/bookCoverService.ts
        │                                         │
        │  batches of 8 authors                   │  batches of 10 books
        ▼                                         ▼
  POST /api/authors/batch-resolve      POST /api/books/batch-covers
        │                                         │
        │  Prisma cache check                     │  Prisma cache check
        │  └─ miss → Wikidata SPARQL              │  └─ miss → Open Library API
        │                                         │
        │  onBatchComplete(delta map)             │  onProgress(loaded, total, coverMap)
        ▼                                         ▼
  applyAuthorCountriesToBooks()        applyCoverResultsToBooks()
        │                                         │
        └──────────────┬──────────────────────────┘
                       ▼
              setBooks(prev => updated)
              saveProcessedBooks()        ← localStorage / sessionStorage
```

---

## 4. Data Flow — Map Rendering

```
books (from BooksContext)
        │
        ▼
  MapContainer
  filters: readStatus === 'read'
        │
        ▼
  MapLibreMap (memo)
        │
        ├── booksRef (useRef)            ← caches latest books for load callback
        │
        ├── on init:  createMapStyle(theme) → MapLibre map instance
        │   └── map.on('load', ...) uses booksRef.current
        │       (fixes race condition when localStorage loads books before map)
        │
        └── on [books, theme] change:
              booksRef.current = books   ← keep ref in sync
              applyMapStyle()
                ├── setPaintProperty background-color
                ├── setPaintProperty outline/label colors
                ├── generateHeatmapStyle(books, theme)   ← heatmap fill-color expression
                │   lib/heatmapEngine.ts
                │   getCountryBookCounts() → MapLibre match expression
                └── wave SVG → Image → map.addImage('waves')
                    → setPaintProperty background-pattern
```

---

## 5. Country Resolution Pipeline

```
Book.authors  (raw string, e.g. "Donna Tartt, Elena Ferrante")
        │
        ▼
  splitAuthorNames()          lib/authorUtils.ts
        │
        ▼
  normalizeAuthorName()       dedupe key
        │
        ▼
  POST /api/authors/batch-resolve
        │
        ├─ Wikidata search API (1 call)
        │
        ├─────────────────────────────────────────────┐
        │                                             │
        │ FAST PATH (Problem 3)                       │
        │ Extract nationality from description        │
        │ e.g. "American novelist" → USA              │
        ▼                                             │
  extractCountryFromDescription()                     │
  lib/countryDetection.ts                            │
  Pattern match AUTHOR_NATIONALITY_KEYWORDS           │
        │                                             │
        │ Match found? Return early.                  │
        │ (skips 3 API calls per author)              │
        │                                             │
        └─────────────┬──────────────────────────────┘
                      │
                      │ No match in description
                      ▼
  Wikidata SPARQL (3 more calls)
  1. P27 (citizenship)
  2. P19 (birthplace) if no citizenship
  3. Labels for country names
        │
        ▼
  ISO2 codes stored on Book.authorCountries[]
        │
        ▼
  mapISO2ToDisplayName()      lib/mapUtilities.ts
        │
        ▼
  MapLibre fill-color match expression
  (country display name → color)
```

---

## 6. Wikidata API Optimization (Problem 2)

```
withConcurrencyLimit(tasks, maxConcurrent, delayMs)
        │
        ├── Max 2 parallel Wikidata requests
        ├── 150ms delay between requests
        └── Prevents "thundering herd" throttling

Purpose: 8 authors × 4 API calls = 32 concurrent requests → throttled by Wikidata
Solution: Queue executor with backoff → 2 concurrent with delay → completes in time

Implemented in: app/api/authors/batch-resolve/route.ts
```

---

## 7. Enrichment Observability Logging (Problem 4)

```
After enrichment completes:

app/page.tsx
        │
        ├── Calculate enrichment report:
        │   ├── coverage % = (books_with_countries / read_books) × 100
        │   ├── cache_hits, cache_misses (from batch-resolve response)
        │   ├── duration_sec (from enrichmentMetrics.getAuthorsDuration())
        │   └── source, unique_authors, total_books
        │
        └── POST /api/logs/enrichment
                │
                ├── Server receives metrics
                │
                └── Write JSON line to logs/enrichment-YYYY-MM-DD.log
                    Format: {timestamp, source, total_books, read_books,
                             books_with_countries, books_coverage_pct,
                             unique_authors, cache_hits, cache_misses, duration_sec}

Also logged to browser console (table format) for immediate visibility.

Purpose: Track improvement over time, measure cache effectiveness, identify bottlenecks
```

---

## 8. Persistence

```
localStorage  (primary)
sessionStorage (fallback)
        │
        ├── key: "processedBooks"
        │   value: JSON.stringify(Book[])
        │   written by: saveProcessedBooks()
        │   read by:    loadProcessedBooks()  on mount
        │
        └── key: "data" (URL param, shareable links)
            value: btoa(encodeURIComponent(JSON.stringify(books)))
            on load: decoded → saved to localStorage → URL cleaned up

Server-side Prisma cache (PostgreSQL, optional)
        ├── bookMetadataCache  ← coverUrl by isbn13 or title+author
        └── authorCache        ← ISO2 codes by author name (includes resolved flag)
            App degrades gracefully if DB is unavailable.

FUTURE: author_country_overrides table (planned in _plans/user_country_overrides.md)
        └── sessionId + userId for anonymous → account migration
```
