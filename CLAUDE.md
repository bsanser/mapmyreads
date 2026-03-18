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

## Design Context

### Users
Avid readers (Goodreads and StoryGraph users) visualizing where in the world their books come from. They use the app in a reflective, personal mood — curious about patterns in what they've read, proud of how far they've travelled through literature.

### Brand Personality
Warm · Personal · Charming. The app should feel like a beloved personal project someone made for themselves and decided to share. Not slick, not corporate. Think: a beautifully annotated travel journal, or a hand-labeled map pinned above a desk. Emotional goal: **delight and quiet pride**.

### Aesthetic Direction
**Warm & Indie** — light mode only (for now).
- **Palette:** No purple or indigo. Warm tones: cream/off-white backgrounds, warm ink for text (never pure black), earthy accents (terracotta, amber, sand, warm sage). Tinted neutrals, never cold grays.
- **Typography:** Reserve `font-mono` for small metadata only (dates, ISBNs). Use a warm serif for display headings and a clean sans for UI text.
- **Surfaces:** Off-white, not white. Warm paper-like backgrounds. Soft, warm-tinted borders.
- **Keep:** The notebook-lines on book cards and the paperclip SVG — they feel handcrafted and should be extended, not removed.
- **Avoid:** Purple/indigo gradients, cold glassmorphism, generic SaaS dashboard feel.

### Design Principles
1. **Warmth over polish** — Curated and slightly imperfect beats corporate-slick. Embrace personality details.
2. **Map is the hero** — Every other element should complement the map, not compete with it.
3. **Typography carries personality** — Thoughtful font choices communicate indie/literary quality above all else.
4. **Tinted, never cold** — All neutrals carry a warm tint. No pure black, no unchanged Tailwind cold grays.
5. **Delight in small moments** — Hover states, transitions, and micro-details are where the personality lives.