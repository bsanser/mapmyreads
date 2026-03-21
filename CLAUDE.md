# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run dev:clean    # Clear cache + start dev
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all Vitest unit tests
npx vitest run tests/csvParser.test.ts  # Run single test file
npx prisma db push  # Apply schema changes to database
```

## Architecture Overview

**Map My Reads** is a Next.js 14 App Router app that visualizes reading history on an interactive world map. No login required — users upload a Goodreads or StoryGraph CSV export. The app is client-first with optional server-side caching.

### High-Level Data Flow

```
User uploads CSV
    ↓
Parse (Goodreads or StoryGraph format)
    ↓
Display books immediately on map (no countries yet)
    ↓
Two parallel enrichment processes:
├── Author countries: CSV → Wikidata SPARQL → Prisma cache → map colors
└── Book covers: CSV → Open Library API → Prisma cache → book thumbnails
    ↓
Results saved to localStorage
    ↓
User can share map via URL-encoded payload
```

### Key Architectural Decisions

**Client-first data handling**: Books live in `BooksContext`, displayed instantly. Enrichment is *async and optional* — the app is usable even if Wikidata is down.

**Shared server cache**: Prisma stores author countries and book covers keyed by author name / ISBN. One entry per author/book, shared across all anonymous users. Poisoned entries (failed lookups) are marked with a `resolved: false` field so retries can happen on next upload.

**No user accounts yet**: Sessions are anonymous. Users identified by browser localStorage only. Future account system will use `sessionId` + optional `userId` fields for seamless migration.

---

## State Management

Three React contexts in `contexts/`:

### BooksContext
- `books[]` — full library, updated as enrichment completes
- `selectedCountry` — clicked country (ISO2 code), used to filter map and sidebar
- `summaryStats` — derived counts (readBooks, distinctAuthors, authorCountriesCovered, booksMissingAuthorCountry)
- `updateBookCountries(bookIndex, newCountries)` — manual country override

### EnrichmentContext
- `isEnriching` — author resolution running
- `enrichmentProgress` — `{ current, total, stage }` for progress UI
- `isLoadingCovers` — cover fetching running
- `coverProgress` — `{ current, total, stage }` for progress UI

### ThemeContext
- `currentTheme` — active map theme (sepia, blue, yellow, pink, purple, green)

---

## API Routes (Server-Side)

All routes in `app/api/` follow the same pattern:
1. Check Prisma cache (instant return if hit)
2. Call external API for cache misses
3. Write results back to cache (best-effort, non-fatal on DB error)
4. Return partial results on timeout (9s limit for Vercel)

### POST `/api/authors/batch-resolve`

Resolves author names to ISO2 country codes via Wikidata.

**Input**: `{ authors: string[] }`

**Flow**:
1. Prisma cache check (returns `{ [authorName]: iso2[] }`)
2. Cache misses go through `withConcurrencyLimit()` (max 2 concurrent, 150ms delay)
3. For each author:
   - Search Wikidata for entity ID + description
   - **Fast path (Problem 3)**: extract nationality from description (e.g. "American novelist" → USA) — skips 3 API calls
   - **Slow path**: if no description match, fetch P27 (citizenship) → P19 (birthplace) → country labels
4. Upsert to `author_cache` with `resolved: true` (or `false` if failed)

**Response**: `{ [authorName]: { iso2: string[] }, cacheHits, cacheMisses, duration_ms }`

**Why concurrency limiting?** Without it, 8 authors × 4 API calls = 32 concurrent Wikidata requests → throttled. Solution: queue with 2-concurrent + 150ms backoff.

### POST `/api/books/batch-covers`

Fetches book covers from Open Library.

**Input**: `{ books: { isbn13, title, authors }[] }`

**Flow**:
1. Prisma cache check
2. Cache misses: try ISBN lookup first, fallback to title+author
3. Store in `book_metadata_cache`

### POST `/api/logs/enrichment`

Persists enrichment metrics to daily log files (observability).

**Input**: `{ source, total_books, read_books, books_with_countries, unique_authors, cache_hits, cache_misses, duration_sec }`

**Output**: writes JSON line to `logs/enrichment-YYYY-MM-DD.log`

---

## Key Library Files

| File | Responsibility |
|------|---------------|
| `lib/csvParser.ts` | Goodreads + StoryGraph CSV parsing, format detection |
| `lib/countryDetection.ts` | Wikidata SPARQL queries for author countries, description extraction, nationality keyword matching |
| `lib/authorCountryService.ts` | Orchestrates batch author resolution with progress callbacks, tracks cache hits/misses |
| `lib/bookCoverService.ts` | Open Library cover fetching (ISBN first, title+author fallback) |
| `lib/storage.ts` | localStorage/sessionStorage persistence, share URL encoding/decoding |
| `lib/mapUtilities.ts` | Country name ↔ ISO2 code conversions, flag emoji |
| `lib/heatmapEngine.ts` | Generates MapLibre heatmap style from book read counts |
| `lib/themeManager.ts` | MapLibre map theme definitions (sepia, blue, yellow, etc.) |
| `lib/enrichmentMetrics.ts` | Tracks start/end times for profiling, formats duration in seconds |

---

## Database

PostgreSQL via Prisma 7 (driver adapter pattern). Database is *optional* — app works without it.

**Current schema**:
- `authorCache` — author name → ISO2 codes, includes `resolved: boolean` flag
- `bookMetadataCache` — ISBN13 → cover URL
- `User`, `Session`, `SessionBook` — defined but not yet active (planned for account system)

**Future**: `AuthorCountryOverride` table (documented in `_plans/user_country_overrides.md`) for persistent user edits without accounts.

**Connection**: Set `DATABASE_URL` in `.env`. Prisma 7 requires:
```typescript
// lib/prisma.ts uses @prisma/adapter-pg for connection pooling
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg(process.env.DATABASE_URL)
new PrismaClient({ adapter })
```

---

## TypeScript

`strict` mode is **off** (set in `tsconfig.json`). Primary type is `Book` in `types/book.ts` — all components and lib functions work with this type.

---

## Testing

Vitest with `node` environment. Tests in `tests/` cover pure utility functions:
- `csvParser` — parsing logic
- `heatmapEngine` — heatmap generation
- `mapUtilities` — country name conversions
- `applyAuthorCountries`, `applyCoverResults` — data application

No component or integration tests yet.

---

## UI & Styling

**Tailwind**: Use minimal direct classes. If an element needs >1 class, combine into a custom `@apply` class in `app/globals.css`.

**Typography**: Warm indie aesthetic (serif display font, sans body). See `.impeccable.md` for design context and `app/globals.css` for type scale.

**Layout**: Map is the hero. Sidebars and overlays are lightweight and secondary.

---

## Git Workflow

- Use `git switch -c <branch>` to create branches (not `git checkout`)
- Write commit messages with context: explain *why* not just *what*
- Use `/commit-message` skill to draft messages from diffs
- Stage files manually (don't auto-commit)

---

## Recent Optimizations (This Session)

### Problem 1: Poisoned Cache
**Issue**: Failed Wikidata lookups were cached as `countries: []`, blocking retries.
**Solution**: Added `resolved: boolean` field to `authorCache`. Only cache misses have `resolved: false`, allowing retries on next upload.

### Problem 2: Wikidata Throttling
**Issue**: 8 authors × 4 API calls = 32 concurrent requests → throttled by Wikidata.
**Solution**: `withConcurrencyLimit()` function limits to 2 concurrent with 150ms delay between requests.
**Location**: `app/api/authors/batch-resolve/route.ts`

### Problem 3: Description Extraction
**Issue**: Even with concurrency limiting, enrichment was slow (needed 4 API calls per author).
**Solution**: Extract nationality directly from Wikidata description field (e.g. "American novelist" → USA). Most authors match, skipping 3 API calls.
**Expected**: ~75% fewer Wikidata calls per author.
**Location**: `lib/countryDetection.ts:extractCountryFromDescription()`

### Problem 4: Enrichment Observability
**Issue**: No visibility into enrichment effectiveness or cache performance.
**Solution**: Log coverage %, cache hits/misses, duration to `logs/enrichment-YYYY-MM-DD.log` + browser console.
**Locations**: `app/page.tsx` (reporting), `app/api/logs/enrichment/route.ts` (persistence), `lib/enrichmentMetrics.ts` (timing)

### Bug: Map Coloring Race Condition
**Issue**: When books loaded from localStorage before map initialized, countries showed in sidebar but map didn't color.
**Solution**: Use `booksRef` (useRef) to keep latest books accessible to map load callback, avoiding stale closure.
**Location**: `components/MapLibreMap.tsx`

---

## Design Context

See `.impeccable.md` for comprehensive design system. Key principles:
1. **Warmth over polish** — curated, slightly imperfect, handcrafted feel
2. **Map is the hero** — every other element complements it
3. **Typography carries personality** — warm serif for display, clean sans for UI
4. **Tinted, never cold** — all neutrals carry warm tint (no pure black, no cold grays)
5. **Delight in small moments** — hover states, transitions, micro-interactions are where personality lives

---

## User Country Overrides (Planned)

See `_plans/user_country_overrides.md` for architecture design. No implementation yet, but keep this in mind for future work:
- Users can edit book countries via plus/minus icon
- Edits need to persist across CSV re-uploads
- No login system required (anonymous sessions with optional account migration)
- Design: session ID in localStorage + server-side `author_country_overrides` table

---

## Common Patterns

**Batch processing**: Authors/books are resolved in batches (8 authors, 10 books) to balance API efficiency vs memory. See `authorCountryService.ts` and `bookCoverService.ts`.

**Progress callbacks**: Long-running enrichment uses callback functions to report progress. Allows real-time UI updates via `EnrichmentContext`.

**Graceful degradation**: DB unavailable? App still works from localStorage. Wikidata down? Books display without countries. Covers not found? Placeholder image used.

**ISO2 everywhere**: Internal country codes are ISO2 (GB, US, ES). Display names and map matching use these codes. Conversion functions in `mapUtilities.ts`.
