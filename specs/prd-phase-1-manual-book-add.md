# PRD: Phase 1 — Manual Book Add & UI Rethink

**Status:** Draft
**Phase:** 1 (client-side only — no backend changes)
**Last updated:** 2026-04-08

---

## 1. Introduction / Overview

Map My Reads currently has one way to populate a reading map: bulk CSV upload from Goodreads or StoryGraph. Once uploaded, there is nothing to bring a user back. The app has no ongoing value.

Phase 1 fixes the retention problem by making the map a living document. Users can add books one at a time as they finish reading them — the primary day-to-day interaction with the app going forward. We also improve the navigation structure to make "Add book" the single most prominent action, and handle CSV re-imports without creating duplicates.

All changes in this phase are client-side only. No backend or database changes are required.

---

## 2. Goals

1. Allow users to add a book to their map in under 10 seconds, from anywhere in the app.
2. Make book search effortless — we fetch the metadata, users just pick from results.
3. Ensure re-uploading a CSV never duplicates books already in the library.
4. Restructure the navigation so the primary action (add book) is always one tap away and secondary controls (theme, feedback) are out of the way.
5. Work well on both mobile and desktop without separate code paths.

---

## 3. User Stories

**US-1 — Add a book just finished reading**
> As a reader who just finished a book, I want to add it to my map in a few taps so that my map stays up to date without me having to go to Goodreads and export a CSV.

**US-2 — Search finds the right book quickly**
> As a user adding a book manually, I want to type the title or author and see matching results with covers so that I can confirm I'm adding the right edition.

**US-3 — Book not in search results**
> As a user whose book doesn't appear in search results, I want to add it manually with just a title and author so that I'm never blocked from updating my map.

**US-4 — Book appears immediately**
> As a user who just added a book, I want to see it on the map right away — even before the country is resolved — so that the app feels fast and responsive.

**US-5 — Re-uploading a CSV doesn't create duplicates**
> As a user who previously uploaded a Goodreads CSV and now uploads a new export, I want to be told how many new books were added and how many were skipped so that I know the import worked correctly without polluting my map.

**US-6 — Secondary controls are out of the way**
> As a user on a small screen, I want theme and feedback controls collapsed into a single menu so that they don't compete with the map or the add book button for visual attention.

---

## 4. Functional Requirements

### 4.1 Add Book FAB

**FR-1** The app must display a floating action button (FAB) labelled "+ Add book" that is visible at all times on the map screen.

**FR-2** On desktop (≥ 1024px), the FAB must be positioned at the bottom-left of the viewport, below the book list sidebar, showing the label "+ Add book".

**FR-3** On mobile (< 640px), the FAB must be an icon-only circle positioned at the bottom-right of the map, above the bottom sheet. The label is hidden.

**FR-4** On tablet (640–1023px), the FAB must show the label "+ Add book" and be positioned at the bottom-right of the map, above the bottom sheet.

**FR-5** Tapping the FAB must collapse the mobile bottom sheet (if open) and open the Add Book modal.

### 4.2 Add Book Modal — Search

**FR-6** The modal must open as a centered overlay on desktop and as a fullscreen panel on mobile (< 640px).

**FR-7** The modal must contain a text input that is auto-focused when the modal opens.

**FR-8** As the user types (after 2 characters), the app must query the book search API and display results in a list below the input. Each result shows: cover thumbnail, title, author.

**FR-9** Search must first query Open Library. If Open Library returns fewer than 3 results for a query, the app must also query Google Books and merge the results (deduplicating by ISBN13, then by normalised title+author).

**FR-10** Each result in the list must be tappable. Tapping a result adds the book to the library and closes the modal.

**FR-11** The modal must be dismissible by pressing Escape (desktop) or tapping the backdrop.

### 4.3 Add Book Modal — Manual Fallback

**FR-12** When a search returns zero results, the modal must show a "Can't find it? Add it manually" link below the empty results state.

**FR-13** Tapping that link must reveal a minimal inline form within the same modal (no navigation away):
  - Title (required)
  - Author (required)
  - A submit button labelled "Add to my map"

**FR-14** Submitting the manual form with both fields filled must add the book and close the modal.

**FR-15** Submitting the manual form with a required field empty must show an inline validation error on that field. The form must not submit.

### 4.4 Optimistic UI & Background Enrichment

**FR-16** When a book is added (via search result or manual form), it must appear in the book list sidebar and on the map immediately — before enrichment completes.

**FR-17** While the author's country is being resolved, the book's country tag area must display a subtle shimmer/loading state instead of a flag.

**FR-18** When enrichment completes, the country flag and name must animate in (fade or slide). No toast or notification is shown.

**FR-19** If enrichment fails or times out (~10 seconds), the country tag area must show the same "unknown" placeholder styling used for unresolved books in the existing sidebar.

**FR-20** The single-book enrichment must reuse the existing `/api/authors/batch-resolve` and `/api/books/batch-covers` routes, called with a single-element array.

**FR-21** The newly added book must be saved to localStorage immediately on add (not after enrichment).

### 4.5 CSV Deduplication

**FR-22** When a user uploads a CSV, the app must compare incoming books against books already in localStorage before processing.

**FR-23** Deduplication must use ISBN13 as the primary key. If both books have an ISBN13 and they match, the incoming book is a duplicate and must be skipped.

**FR-24** If either book lacks an ISBN13, deduplication must fall back to normalised title + author (lowercase, stripped punctuation, trimmed whitespace).

**FR-25** After import, the app must display a toast notification: `"{N} new books added. {M} already in your library."` If there are no duplicates, the M count is omitted: `"{N} books added."`

**FR-26** The toast must be dismissible and auto-dismiss after 5 seconds.

### 4.6 Overflow Menu (Secondary Controls)

**FR-27** The existing standalone theme button and feedback button must be removed from their current fixed positions.

**FR-28** A single overflow icon button must be added to the top-right controls area. Tapping it opens a floating dropdown menu.

**FR-29** The dropdown menu must contain, in order:
  1. Map theme selector (same colour swatches as the existing theme picker)
  2. Send feedback (existing feedback form behaviour)

**FR-30** The overflow menu must close when the user clicks/taps outside it, or presses Escape.

---

## 5. Non-Goals (Out of Scope for Phase 1)

- **No backend / database changes.** All data stays in localStorage.
- **No user accounts or sessions.** The account creation prompt is deferred to Phase 2.
- **No read date field at add time.** Read date is a future enhancement.
- **No "want to read" shelf.** Shelves and read status beyond "read" are deferred.
- **No per-book rating or notes.** Deferred to Phase 2.
- **No share functionality.** Sharing is Phase 3.
- **No Anna's Archive integration.** No stable API exists; it is legally grey. Open Library + Google Books covers the use case.
- **No multiple maps.** One map per user is the Phase 1 scope.

---

## 6. Design Considerations

### Principles (from `.impeccable.md`)
- Map is the hero — the FAB and modal must not cover the map any more than necessary.
- Warmth over polish — inputs and results should feel handcrafted, not sterile.
- Tinted, never cold — use existing design tokens; no pure black or cold grays.

### Component map
| New component | Description |
|---|---|
| `AddBookFAB` | The floating button. Manages open/close state of the modal. |
| `AddBookModal` | The search + fallback form. Receives an `onAdd(book)` callback. |
| `BookSearchInput` | Debounced input that fires search queries. |
| `BookSearchResults` | List of result rows (cover + title + author). |
| `ManualAddForm` | Minimal fallback form shown when search has no results. |

### Existing components to modify
| Component | Change |
|---|---|
| `MapControls.tsx` | Refactor into overflow menu; absorb theme picker and feedback button |
| `FeedbackButton.tsx` | Remove as standalone fixed element; render inside overflow menu |
| `BooksContext.tsx` | Add `addBook(book: Book)` method for optimistic insert |
| `app/globals.css` | Add `.fab-add-book`, `.add-book-modal`, `.book-search-result` classes |
| `app/page.tsx` | Mount `AddBookFAB` and `AddBookModal`; wire CSV deduplication on upload |

### Token usage
The FAB must use `var(--color-ink)` as background, `var(--color-surface)` as text, and `var(--color-accent)` as hover state — matching the existing button token system.

---

## 7. Technical Considerations

### Book search API
- **Open Library search:** `https://openlibrary.org/search.json?q=<query>&fields=title,author_name,isbn,cover_i,first_publish_year&limit=10`
- **Open Library covers:** `https://covers.openlibrary.org/b/id/<cover_i>-M.jpg` (no auth needed)
- **Google Books fallback:** `https://www.googleapis.com/books/v1/volumes?q=<query>&maxResults=10` (free tier, no key needed for basic requests but rate-limited)
- A new API route `app/api/books/search/route.ts` should proxy both calls server-side to avoid CORS issues and to allow caching response at the edge.

### Deduplication
- Run deduplication in `lib/csvParser.ts` or a new `lib/deduplication.ts` utility.
- Normalisation function: `str.toLowerCase().replace(/[^\w\s]/g, '').trim()`
- Compare against `loadProcessedBooks()` from `lib/storage.ts`.

### Single-book enrichment
- `authorCountryService.ts` already accepts an array. Pass `[book]` directly.
- After enrichment resolves, call `updateBookCountries(bookIndex, countries)` from `BooksContext`.
- `bookCoverService.ts` similarly accepts an array — same pattern.

### Search debounce
- Debounce the search input at 300ms to avoid firing on every keystroke.
- Show a loading spinner inside the results area while the query is in flight.

### localStorage timing
- Add the book to localStorage immediately via `saveProcessedBooks` when it is added, before enrichment. After enrichment completes, save again with the enriched data.

---

## 8. Success Metrics

| Metric | Target | How to measure |
|---|---|---|
| Manual adds per session | > 0 on return visits | PostHog event `book_added_manually` |
| Search success rate | ≥ 80% of searches return ≥ 1 result | `book_search_completed` event, `results_count` param |
| Manual fallback rate | < 20% of add attempts reach the manual form | `manual_fallback_shown` event |
| CSV deduplication accuracy | 0 duplicate books after re-import | Validate in QA with known CSV |
| Time to add a book | < 10 seconds from FAB tap to book visible on map | Measure in usability test |

---

## 9. Analytics Events

These events should be added when PostHog is integrated (Phase Later), but the event names and shapes should be agreed now so implementation is consistent.

| Event name | Trigger | Parameters |
|---|---|---|
| `book_added_manually` | User adds a book via search result or manual form | `method: 'search' \| 'manual_form'`, `had_isbn: boolean` |
| `book_search_started` | User types 2+ characters in the search input | `query_length: number` |
| `book_search_completed` | Search API returns | `source: 'openlibrary' \| 'googlebooks' \| 'merged'`, `results_count: number`, `duration_ms: number` |
| `manual_fallback_shown` | Zero results — manual form link appears | — |
| `csv_import_completed` | CSV upload processed | `total_in_csv: number`, `new_books: number`, `duplicates_skipped: number`, `source: 'goodreads' \| 'storygraph'` |
| `add_book_modal_opened` | FAB tapped | `viewport: 'mobile' \| 'tablet' \| 'desktop'` |
| `add_book_modal_dismissed` | Modal closed without adding a book | `reason: 'escape' \| 'backdrop' \| 'back_button'` |

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Should the search proxy route cache results (e.g. edge cache for 24h)? Would reduce API calls significantly for popular books. | Engineering | Open |
| 2 | What is the cover placeholder image when a book has no cover? | Design | **Resolved** — new on-brand SVG created at `public/book-placeholder.svg` (warm cream, terracotta accent, logo, "MAP MY READS" wordmark). |
| 3 | Google Books API key needed? | Engineering | **Resolved** — yes, add `GOOGLE_BOOKS_API_KEY` to `.env`. See section 11 for setup steps. |
| 4 | When the user adds a book already in their library, silent skip or message? | Product | **Resolved** — show inline message: "This book is already in your library." |

---

## 11. Setup: Google Books API Key

Steps to get the key:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project — e.g. `map-my-reads`
3. In the sidebar go to **APIs & Services → Library**
4. Search for **"Books API"** and click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API Key** — copy the key
7. Click **Edit** on the key and add an **HTTP referrer restriction**:
   - `https://mapmyreads.com/*` (your production domain)
   - `http://localhost:3000/*` (local dev)
8. Add to `.env`:
   ```
   GOOGLE_BOOKS_API_KEY=your_key_here
   ```
9. Add to `.env.example`:
   ```
   GOOGLE_BOOKS_API_KEY=
   ```

The free tier allows 1,000 requests/day unauthenticated. With an API key that limit is much higher (it's tied to the project quota). For an indie app this is plenty.

## 12. Cover Fetch Strategy

Cover images are fetched in this order, stopping at the first success:

1. **Open Library Covers API** — `https://covers.openlibrary.org/b/isbn/<isbn13>-M.jpg` (no auth, fast)
2. **Longitood API** — `https://bookcover.longitood.com/bookcover/<isbn13>` (generated cover, good fallback)
3. **Google Books thumbnail** — returned in the search result payload (`volumeInfo.imageLinks.thumbnail`)
4. **`/book-placeholder.svg`** — shown immediately on add; replaced when any of the above resolves

Steps 1–3 happen silently in the background. The placeholder is shown from the moment the book is added until a real cover loads.
