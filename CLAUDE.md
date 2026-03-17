# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js on http://localhost:3000)
npm run dev:clean    # Clear Prisma cache then start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run clear-cache  # Clear Prisma author/cover caches (via tsx scripts/clear-cache.ts)
npm run generate-countries  # Regenerate lib/countries.ts from Wikidata
```

There are no automated tests in this project.

## Architecture

This is a **Next.js 14 App Router** app where nearly all logic lives in a single client component (`app/page.tsx`). State is managed entirely with React hooks — no Redux, no Context.

### Data flow on CSV upload

1. **Parse** — PapaParse detects Goodreads vs StoryGraph format (`lib/csvParser.ts`), returns `Book[]`
2. **Render immediately** — map displays with no country data yet
3. **Enrich in background** (sequential, not parallel):
   - Author countries: POST `/api/authors/batch-resolve` → Prisma cache → Wikidata
   - Book covers: POST `/api/books/batch-covers` (batches of 10) → Prisma cache → Open Library
4. **Persist** — `saveProcessedBooks()` writes to `localStorage` (falls back to `sessionStorage`)
5. On next load, books are restored from storage and covers are filled in for any still missing

### Backend API routes

Both routes follow the same pattern: check Prisma cache → fetch from external API for misses → write to cache → return results. Prisma is **only used server-side** for caching; the app works without a database (Prisma errors are caught silently in `lib/prisma.ts`).

- `POST /api/authors/batch-resolve` — author names → ISO2 country codes via Wikidata, 25s timeout
- `POST /api/books/batch-covers` — isbn13/title/author → cover URL via Open Library, 100ms delay between requests

### Country resolution

Country data flows as **ISO2 codes** (`authorCountries`, `bookCountries` on `Book`). The map uses display names internally, so there are two translation layers:

- `lib/mapUtilities.ts` — ISO2 ↔ map display name
- `lib/countryDetection.ts` — raw text/Wikidata response → ISO2, plus a `COUNTRY_KEYWORDS` lookup table for text matching

`lib/countries.ts` is auto-generated — edit via `npm run generate-countries`, not by hand.

### Theme system

Five themes defined in `lib/themeManager.ts` as `THEMES` keyed by `ThemeKey` (`blue | yellow | purple | pink | green`). Each theme has `fill`, `outline`, `hover`, `selected`, `background`. The map (`MapLibreMap.tsx`) and UI components both consume the active theme object from `page.tsx` state.

### Responsive layout

- `>= 1024px`: `DesktopSidebar` is shown alongside the map
- `< 1024px`: `MobileBottomSheet` slides up; `ReadingAtlasSummary` renders above the map

### Shareable links

`lib/storage.ts` encodes the full `Book[]` array as `btoa(encodeURIComponent(JSON.stringify(books)))` into a `?data=` URL param. On load, if the param exists, the data is written to localStorage and the URL is cleaned up.

## Key types

```typescript
// types/book.ts
Book {
  title, authors, isbn13, yearPublished
  bookCountries: string[]      // ISO2 — where the book is set
  authorCountries: string[]    // ISO2 — where authors are from
  readStatus: 'read' | 'to_read'
  readDate, avgRating, myRating, numberOfPages, bookshelves
  coverImage: string | null    // Open Library URL
  source: 'goodreads' | 'storygraph'
  originalData: Record<string, any>
}
```

## Environment

`DATABASE_URL` must be set for Prisma/PostgreSQL (author and cover caching). The app degrades gracefully if the DB is unavailable — caching is skipped and Wikidata/Open Library are called directly.
