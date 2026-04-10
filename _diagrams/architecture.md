# Map My Reads — Architecture Diagrams

---

## 1. Component Tree

```
app/layout.tsx
└── SessionProvider (contexts/SessionContext)
    └── BooksProvider (contexts/BooksContext)
        └── ThemeProvider (contexts/ThemeContext)
            └── EnrichmentProvider (contexts/EnrichmentContext)
                └── app/page.tsx  (Home)
                    ├── HeroScreen              ← shown when books.length === 0
                    │   └── file input (CSV upload)
                    │
                    └── Main view               ← shown when books.length > 0
                        ├── MapContainer
                        │   ├── MapLibreMap     (MapLibre GL canvas)
                        │   └── MapControls     (theme switcher + account popover)
                        │       ├── FeedbackButton  (via overflow menu)
                        │       └── ShareButton     (via overflow menu)
                        ├── DesktopSidebar      (lg+, left panel)
                        │   ├── AccountStatus   ← shown when logged in
                        │   ├── ReadingAtlasSummary
                        │   └── BookList
                        ├── MobileBottomSheet   (< lg, slides up)
                        ├── DeveloperTools      (debug overlay, hidden by default)
                        ├── EnrichmentProgress  (loading indicator)
                        ├── AddBookFAB          (floating action button)
                        ├── AddBookModal        (manual book entry)
                        └── Toast               (transient notifications)

app/map/[uuid]/page.tsx  (shared read-only view)
    └── Same providers, isReadOnly=true
        ├── MapContainer  (with "Create your own" CTA)
        └── DesktopSidebar (isReadOnly=true, no add/edit)
```

---

## 2. Context Ownership

```
┌─────────────────────────────────────────────────────────────┐
│  SessionContext                                             │
│  ─────────────────────────────────────────────────────────  │
│  sessionId: string         ← UUID in localStorage          │
│  userId: string|null       ← set after magic link login    │
│  userEmail: string|null                                     │
│  isLoggedIn: boolean       ← derived: userId !== null      │
│  syncBooks()               ← POST to /api/sessions/[id]/sync│
│  remoteBooks: Book[]|null  ← loaded from DB on login       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BooksContext                                               │
│  ─────────────────────────────────────────────────────────  │
│  books: Book[]                 ← full library               │
│  setBooks()                                                 │
│  selectedCountry: string|null  ← clicked country (ISO2)    │
│  setSelectedCountry()                                       │
│  summaryStats                  ← derived: counts/coverage  │
│  updateBookCountries()         ← manual country override   │
│  addBook()                     ← deduplication-aware add   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ThemeContext                                               │
│  ─────────────────────────────────────────────────────────  │
│  currentTheme: ThemeKey        ← claret|amber|sage|dusk|   │
│  setCurrentTheme()                sepia                     │
│  themeObject                   ← derived: colors object    │
│                                  also sets CSS vars on <html>│
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

## 3. Authentication Flow — Magic Link

```
User enters email in MapControls account popover
        │
        ▼
POST /api/auth/magic-link
        │
        ├── Validate email format
        ├── createTokenRecord(email, sessionId)   ← 15-min expiry
        ├── prisma.magicToken.create()
        └── sendMagicLinkEmail()  via Resend
            from: noreply@mapmyreads.com
                │
                ▼
User clicks link in email
        │
        ▼
GET /api/auth/verify?token=...
        │
        ├── verifyMagicToken()   ← checks not_found / expired / used
        ├── prisma.user.findUnique or .create  ← upsert by email
        ├── prisma.magicToken.update({ usedAt: now })
        ├── claimSession(sessionId, userId)     ← links anon session to user
        └── Set cookie: mmr_uid = user.id
            httpOnly, sameSite: lax, maxAge: 30 days
                │
                ▼
Redirect to /
        │
        ▼
SessionContext detects cookie via GET /api/auth/me
        └── sets userId, userEmail, remoteBooks
```

---

## 4. Session & Book Persistence

```
On app load (SessionContext useEffect):
        │
        ├── getOrCreateSessionId()   ← localStorage key: map_my_reads_session_id
        │
        ├── POST /api/sessions       ← upsert session in DB (no-op if exists)
        │   └── P2002 conflict handled: falls back to findUnique
        │
        └── GET /api/auth/me
                │
                ├── Not logged in → done
                │
                └── Logged in → GET /api/sessions/[uuid]/books
                        └── setRemoteBooks(books)
                                │
                                ▼
                        BooksContext hydration effect
                        if (remoteBooks.length > local.length)
                            setBooks(remoteBooks)   ← cross-device restore

On books change (BooksContext sync effect):
        │
        ├── Skips /map/* pages (read-only)
        ├── Filters: only readStatus === 'read'
        ├── First load → immediate sync
        └── Subsequent changes → debounced 1s
                │
                ▼
        POST /api/sessions/[uuid]/sync
                │
                ├── Upsert each book in `books` table
                │   └── includes coverUrl from book.coverImage
                ├── Link to session via SessionBook join table
                └── Update session.lastSyncedAt
```

---

## 5. Database Schema

```
users
  id            cuid PK
  email         unique
  emailVerified DateTime?
  createdAt / updatedAt

sessions
  id            cuid PK
  sessionId     unique     ← matches localStorage UUID
  userId        FK → users (nullable, set after login)
  isShared      bool       ← true when share link generated
  lastSyncedAt  DateTime?
  expiresAt     DateTime?

books
  id            cuid PK
  title, author, isbn13?, year?
  readDate      DateTime
  author_countries  String[]   ← ISO2 codes from Wikidata
  book_countries    String[]
  coverUrl      String?        ← from bookMetadataCache
  userId        FK → users (nullable)

session_books             ← join table
  sessionId     FK → sessions
  bookId        FK → books
  UNIQUE(sessionId, bookId)

magic_tokens
  token         unique
  email
  sessionId     String?    ← anon session to claim on verify
  expiresAt     DateTime   ← 15 minutes
  usedAt        DateTime?  ← one-time use

author_cache              ← shared lookup cache
  name / normalizedName   unique
  countries     String[]   ← ISO2 codes
  resolved      bool       ← false = lookup failed, retry allowed
  wikidataId    String?
  source        String

book_metadata_cache       ← shared cover cache
  isbn13        unique?
  title + author index
  coverUrl      String?
  source        String
```

---

## 6. Data Flow — CSV Upload

```
User drops CSV file
        │
        ▼
  Papa.parse()
  lib/csvParser.ts
  detectCSVFormat() → parseCSVData()
        │
        ▼
  deduplicateBooks(new, existing)   ← merge against localStorage
        │
        ▼
  setBooks(mergedBooks)           ← map renders immediately (no countries yet)
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
              syncBooks()                 ← debounced POST to DB
```

---

## 7. Data Flow — Map Rendering

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

ThemeContext also sets CSS custom properties on <html>:
  --color-accent, --color-accent-hover, --color-accent-soft, --color-accent-border
  → all primary action buttons + links update automatically with theme
```

---

## 8. Country Resolution Pipeline

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
        │ FAST PATH                                   │
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
  resolved: true in author_cache   ← allows cache hit next time
        │
        ▼
  mapISO2ToDisplayName()      lib/mapUtilities.ts
        │
        ▼
  MapLibre fill-color match expression
  (country display name → color)
```

---

## 9. Wikidata API Optimization

```
withConcurrencyLimit(tasks, maxConcurrent, delayMs)
        │
        ├── Max 2 parallel Wikidata requests
        ├── 150ms delay between requests
        └── Prevents "thundering herd" throttling

Purpose: 8 authors × 4 API calls = 32 concurrent requests → throttled by Wikidata
Solution: Queue executor with backoff → 2 concurrent with delay → completes in time

author_cache.resolved flag:
  true  → cache hit, return immediately
  false → lookup previously failed, retry on next upload (not permanently poisoned)

Implemented in: app/api/authors/batch-resolve/route.ts
```

---

## 10. Enrichment Observability Logging

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
                └── Write JSON line to logs/enrichment-YYYY-MM-DD.log
                    Format: {timestamp, source, total_books, read_books,
                             books_with_countries, books_coverage_pct,
                             unique_authors, cache_hits, cache_misses, duration_sec}

Also logged to browser console (table format) for immediate visibility.
```

---

## 11. Persistence Layers

```
Layer 1 — localStorage (primary client cache)
        ├── key: "processedBooks"  → Book[] (full library)
        │   written: saveProcessedBooks()
        │   read:    loadProcessedBooks() on mount
        └── key: "map_my_reads_session_id"  → UUID
            generated once, stable for life of browser

Layer 2 — PostgreSQL via Prisma (server persistence)
        ├── sessions table     ← one row per browser/device
        ├── books table        ← deduplicated book records
        ├── session_books      ← which books belong to which session
        ├── users table        ← created on first magic link verify
        ├── magic_tokens       ← short-lived (15 min), one-time use
        ├── author_cache       ← shared across all users, Wikidata results
        └── book_metadata_cache ← shared across all users, cover URLs

App degrades gracefully if DB is unavailable:
  localStorage alone is sufficient to render the map.
  Sync failures are logged (console.warn) but never crash the UI.
```
