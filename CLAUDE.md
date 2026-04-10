# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run dev:clean    # Clear cache + start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all Vitest unit tests
npx vitest run tests/csvParser.test.ts  # Run a single test file
npx prisma db push   # Apply schema changes to database
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Architecture Overview

**Map My Reads** is a Next.js 14 App Router app that visualizes reading history on an interactive world map. Users upload a Goodreads or StoryGraph CSV, or add books manually. The app enriches books with author countries (Wikidata) and covers (Open Library), then colors the map by author origin.

### Context Stack (load order matters)

```
SessionProvider → BooksProvider → ThemeProvider → EnrichmentProvider → page
```

**SessionContext** (`contexts/SessionContext.tsx`) — foundational. Manages the anonymous `sessionId` (UUID stored in localStorage), auth state (`userId`, `userEmail`, `isLoggedIn`), and book sync to the DB. On mount it: (1) upserts the session in DB, (2) calls `/api/auth/me` to check login state, (3) if logged in, fetches remote books for cross-device hydration. Exposes `syncBooks()` which is debounced except on first load.

**BooksContext** (`contexts/BooksContext.tsx`) — owns the `books[]` array. Hydrates from `remoteBooks` (from SessionContext) when remote has more books than local. Syncs to DB on every books change via `syncBooks()`. Skips sync and remote hydration on `/map/*` pages (read-only shared view).

**ThemeContext** (`contexts/ThemeContext.tsx`) — manages active theme. On change, writes `--color-accent` and related CSS custom properties directly to `document.documentElement`, making all `var(--color-accent)` references update instantly.

### Key Architectural Decisions

**Client-first**: Books load from localStorage immediately on mount. DB sync is background and non-blocking. The app works without a DB.

**Anonymous sessions with optional account**: Every visitor gets a `sessionId` in localStorage. Magic link auth upgrades that session to a named `userId`. Books sync to the session regardless of login state — the account just makes them accessible across devices.

**Only `readStatus === 'read'` books sync to DB**. To-read and currently-reading books stay local only.

**Shared maps** (`/map/[uuid]`) are read-only. The `BooksContext` sync and `remoteBooks` hydration both check `window.location.pathname.startsWith('/map/')` and skip if true.

**Cover URLs** are stored directly on the `Book` DB record (`coverUrl` field). The sync route writes them; the books route reads them. No extra lookup on the shared map.

### Data Flow Summary

```
CSV upload / manual add
  → parse + deduplicate
  → setBooks() [map renders immediately]
  → parallel: resolveAuthorCountriesBackend() + enrichBooksWithCoversBatched()
  → incremental setBooks() updates as batches complete
  → saveProcessedBooks() → localStorage
  → syncBooks() → POST /api/sessions/[uuid]/sync → DB
```

### API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/sessions` | Upsert anonymous session (P2002 conflict handled with findUnique fallback) |
| `GET /api/sessions/[uuid]/books` | Load books for a session (used by shared map + remote hydration) |
| `POST /api/sessions/[uuid]/sync` | Write current book state to DB |
| `POST /api/auth/magic-link` | Create token + send email via Resend |
| `GET /api/auth/verify` | Validate token, create/find user, set `mmr_uid` cookie (30-day), claim session |
| `GET /api/auth/me` | Validate cookie, return user + sessionUuid |
| `POST /api/authors/batch-resolve` | Resolve author names → ISO2 codes via Wikidata (cached in `author_cache`) |
| `POST /api/books/batch-covers` | Fetch cover URLs via Open Library (cached in `book_metadata_cache`) |
| `POST /api/logs/enrichment` | Append enrichment metrics to `logs/enrichment-YYYY-MM-DD.log` |

All routes check Prisma cache first and degrade gracefully if DB is unavailable.

### Key Library Files

| File | Responsibility |
|------|---------------|
| `lib/csvParser.ts` | Goodreads + StoryGraph CSV parsing and format detection |
| `lib/countryDetection.ts` | Wikidata SPARQL queries; fast-path nationality extraction from description |
| `lib/authorCountryService.ts` | Orchestrates batch author resolution with progress callbacks |
| `lib/bookCoverService.ts` | Open Library cover fetching (ISBN first, title+author fallback) |
| `lib/magicLink.ts` | Token generation, expiry/used-at validation, Resend email sending |
| `lib/sessionMigration.ts` | `claimSession()` — links anonymous session to a user after login |
| `lib/storage.ts` | localStorage/sessionStorage persistence |
| `lib/themeManager.ts` | Theme definitions with `accent`, `accentHover`, `accentSoft`, `accentBorder` per theme |
| `lib/heatmapEngine.ts` | Generates MapLibre fill-color expression from book read counts |
| `lib/deduplication.ts` | Deduplicates on ISBN13, falling back to title+author match |

### Database

PostgreSQL via Prisma 7 (driver adapter: `@prisma/adapter-pg`). Neon serverless in production; use a Neon dev branch locally (set `DATABASE_URL` in `.env.local`).

Active tables: `users`, `sessions`, `books`, `session_books`, `magic_tokens`, `author_cache`, `book_metadata_cache`.

The `author_cache.resolved` flag is critical: `false` means the lookup failed and should be retried; `true` means it succeeded. Never permanently cache a failed lookup.

### UI & Styling

**Tailwind**: Prefer custom `@apply` classes in `app/globals.css` over inline utility chains. If an element needs more than one class, it gets a named class.

**Theme-aware UI**: Use `var(--color-accent)` for primary actions. These CSS vars are set dynamically by `ThemeContext` so they always match the active map theme.

**Design language**: Warm, indie, personal — not corporate SaaS. See `.impeccable.md` for full design context. Key: warm tinted neutrals, serif display font, no pure black or cold grays.

### Testing

Vitest with `node` environment. Tests in `tests/` cover pure utility functions only — no component or integration tests. Run a single file with `npx vitest run tests/<file>.test.ts`.

### Git Workflow

- Use `git switch -c <branch>` to create branches
- Use `/commit-message` skill to draft commit messages from diffs
- Stage files manually — never auto-commit
