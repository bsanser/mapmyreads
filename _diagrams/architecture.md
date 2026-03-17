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
        ├── on init:  createMapStyle(theme) → MapLibre map instance
        │
        └── on [books, theme] change:
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
        ▼
  Wikidata SPARQL
  → raw country name / ISO2
        │
        ▼
  normalizeCountryCode()      lib/countryDetection.ts
  COUNTRY_KEYWORDS lookup
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

## 6. Persistence

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
        └── authorCache        ← ISO2 codes by author name
            App degrades gracefully if DB is unavailable.
```
