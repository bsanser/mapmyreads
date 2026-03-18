# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run dev:clean    # Clear cache + start dev
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all Vitest unit tests
```

To run a single test file:
```bash
npx vitest run tests/csvParser.test.ts
```

## Architecture Overview

**Map My Reads** is a Next.js 14 App Router app that visualizes a user's reading history on an interactive world map. No login is required — users upload a Goodreads or StoryGraph CSV export.

### Data Flow

1. User uploads CSV → `lib/csvParser.ts` detects format and parses it client-side
2. Books render immediately on the map with blank countries
3. Two enrichment processes run in parallel (progress tracked via `EnrichmentContext`):
   - **Author countries**: `lib/authorCountryService.ts` → `POST /api/authors/batch-resolve` → Wikidata API → cached in `AuthorCache` (Prisma)
   - **Book covers**: `lib/bookCoverService.ts` → `POST /api/books/batch-covers` → Open Library API → cached in `BookMetadataCache` (Prisma)
4. Enriched books are saved to `localStorage` via `lib/storage.ts`
5. Users can share their map via a URL-encoded, base64-compressed payload

### State Management

Three React contexts in `contexts/`:
- **BooksContext** — global `books[]` array, `selectedCountry`, and summary stats
- **EnrichmentContext** — progress tracking for the author/cover loading UI
- **ThemeContext** — active map theme

### API Routes (server-side)

Both routes in `app/api/` follow the same pattern:
1. Check Prisma cache (DB hit → return immediately)
2. Call external API for cache misses
3. Write results back to cache (best-effort, non-fatal on DB error)
4. Return partial results on timeout (25s Vercel limit)

### Key Library Files

| File | Responsibility |
|------|---------------|
| `lib/csvParser.ts` | Goodreads + StoryGraph CSV parsing |
| `lib/countryDetection.ts` | Wikidata SPARQL queries for author birthplace/nationality |
| `lib/authorCountryService.ts` | Orchestrates batch author resolution with progress callbacks |
| `lib/bookCoverService.ts` | Open Library cover fetching (ISBN first, title+author fallback) |
| `lib/storage.ts` | localStorage/sessionStorage persistence + share URL encoding |
| `lib/mapUtilities.ts` | Country name ↔ ISO2 code conversions |
| `lib/heatmapEngine.ts` | Heat map generation from country read counts |
| `lib/themeManager.ts` | MapLibre map theme definitions |

### Database

PostgreSQL via Prisma. Schema in `prisma/schema.prisma`. The DB is currently used **only as a cache** — `AuthorCache` and `BookMetadataCache` tables. The `User`, `Book`, `Session`, `SessionBook` models are defined for a future login system but are not yet active.

### TypeScript

`strict` mode is **off**. The primary type is `Book` in `types/book.ts` — all components and lib functions work with this type.

### Testing

Vitest with `node` environment. Tests live in `tests/` and cover pure utility functions (`csvParser`, `heatmapEngine`, `mapUtilities`, `applyAuthorCountries`, `applyCoverResults`). There are no component or integration tests.

## Other information
    - Do NOT apply tailwind classes directly in component templates unless essential or just 1 at most. If an element needs more than a single tailwind class, combine them into a custom class using the `@apply`directive.
    - Use minimal project dependencies where possible.
    - Use the `git switch -c` command to switch to new branches, not `git checkout`
    - When finishing a task, generate the git commit message immediately based in the command /commit-message but let me be the one staging, and commiting.