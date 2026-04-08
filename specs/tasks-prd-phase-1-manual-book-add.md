# Tasks: Phase 1 — Manual Book Add & UI Rethink

Based on: `specs/prd-phase-1-manual-book-add.md`
Approach: **Red/Green TDD** — write a failing test first, then implement the minimum code to pass it.

---

## Relevant Files

### Source files
- `app/api/books/search/route.ts` - **New.** Server-side proxy for Open Library + Google Books search.
- `app/page.tsx` - Mount AddBookFAB/AddBookModal; wire CSV deduplication; control bottom sheet collapse.
- `types/book.ts` - Add `'manual'` to `source` union; add optional `isResolvingCountry` flag.
- `contexts/BooksContext.tsx` - Add `addBook(book: Book)` method for optimistic insert.
- `lib/deduplication.ts` - **New.** Normalisation + deduplication logic.
- `lib/storage.ts` - Strip `isResolvingCountry` before saving to localStorage.
- `components/AddBookFAB.tsx` - **New.** Floating action button, viewport-aware.
- `components/AddBookModal.tsx` - **New.** Modal shell with backdrop and Escape handling.
- `components/BookSearchInput.tsx` - **New.** Debounced search input (300ms).
- `components/BookSearchResults.tsx` - **New.** Result rows (cover + title + author).
- `components/ManualAddForm.tsx` - **New.** Minimal fallback form (title + author required).
- `components/Toast.tsx` - **New.** Auto-dismissing notification bar.
- `components/MapControls.tsx` - Refactor into overflow menu absorbing theme + feedback.
- `components/FeedbackButton.tsx` - Remove fixed positioning; render from inside overflow menu.
- `app/globals.css` - Add `.fab-add-book`, `.add-book-modal`, `.book-search-result`, `.overflow-menu`, `.toast`, shimmer animation.

### Test files
- `tests/deduplication.test.ts` - Unit tests for `normalizeString`, `isDuplicate`, `deduplicateBooks`.
- `tests/bookSearchParser.test.ts` - Unit tests for Open Library + Google Books result parsing and merge logic.
- `tests/storage.test.ts` - Unit tests for `isResolvingCountry` stripping in `saveProcessedBooks`.
- `components/ManualAddForm.test.tsx` - Component tests for form validation and submission (jsdom).
- `components/Toast.test.tsx` - Component tests for auto-dismiss and manual dismiss (jsdom).
- `components/AddBookModal.test.tsx` - Component tests for duplicate message and Escape handling (jsdom).

### Notes

- **Pure function tests** (`tests/`) run in the existing `node` environment — no config change needed.
- **Component tests** (`components/*.test.tsx`) need `jsdom`. Add `// @vitest-environment jsdom` as the first line of each component test file — Vitest will pick it up automatically per file without changing the global config.
- Run all tests: `npx vitest run`. Run one file: `npx vitest run tests/deduplication.test.ts`.
- TypeScript strict mode is **off** — no need to type exhaustively.
- Existing enrichment routes (`/api/authors/batch-resolve`, `/api/books/batch-covers`) accept arrays — pass `[book]` for single-book enrichment. No route changes needed.

---

## Tasks

- [ ] 1.0 Create book search API route
  - [ ] 1.1 [RED] Create `tests/bookSearchParser.test.ts`. Write tests for an Open Library result parser function: given a raw OL search response, it returns an array of `{ title, author, isbn13, coverUrl, year }`. Test: ISBN13 is extracted from the `isbn` array (first valid 13-digit value starting with 978 or 979). Test: `coverUrl` is built as `https://covers.openlibrary.org/b/id/<cover_i>-M.jpg` when `cover_i` exists, otherwise `null`. Test: `author` is the first entry in `author_name`. All tests should fail at this point.
  - [ ] 1.2 [RED] In the same file, write tests for a Google Books result parser: given a raw Google Books response, returns the same normalised shape. Test: `coverUrl` comes from `volumeInfo.imageLinks.thumbnail`, `null` if missing. Test: `isbn13` is found from `volumeInfo.industryIdentifiers` where `type === 'ISBN_13'`.
  - [ ] 1.3 [RED] Write tests for the merge function: given OL results and Google Books results, it returns a deduplicated array. Test: if two items share an ISBN13, the OL item is kept and the Google Books item dropped. Test: if no ISBN13, deduplicate by normalised title+author. Test: order preserves OL items first.
  - [ ] 1.4 [GREEN] Create `app/api/books/search/route.ts`. Extract the parser functions into the same file (or a local helper). Implement the parsers and merge function to pass all tests from 1.1–1.3.
  - [ ] 1.5 [GREEN] Complete the route handler: accept `GET` with `q` param, return 400 if `q` is missing or fewer than 2 characters. Query Open Library first. If fewer than 3 results, also query Google Books. Merge and return. Wrap each fetch in try/catch — if one API fails, return what is available with an optional `warning` field. Never return 500.

- [ ] 2.0 Update Book type and BooksContext with addBook support
  - [ ] 2.1 Update `types/book.ts`: add `'manual'` to the `source` union (`'goodreads' | 'storygraph' | 'manual'`). Add optional `isResolvingCountry?: boolean` field. This flag is transient UI state — it must never be persisted.
  - [ ] 2.2 [RED] Create `tests/storage.test.ts`. Write a test: when `saveProcessedBooks` is called with a book that has `isResolvingCountry: true`, the value stored in localStorage must not contain `isResolvingCountry` (or it must be `undefined`). Test should fail because the stripping doesn't exist yet.
  - [ ] 2.3 [GREEN] In `lib/storage.ts`, update `saveProcessedBooks()` to strip `isResolvingCountry` from each book before serialising: `const clean = books.map(({ isResolvingCountry, ...rest }) => rest)`. Run tests — they should pass.
  - [ ] 2.4 [RED] Add tests to `tests/storage.test.ts` (or a new `tests/booksContext.test.ts`) for the `addBook` logic: given an existing library with Book A, calling `addBook(Book A)` returns `'duplicate'` and the library length stays the same. Calling `addBook(Book B)` returns `'added'` and the library grows by 1. Tests fail because `addBook` doesn't exist yet.
  - [ ] 2.5 [GREEN] In `contexts/BooksContext.tsx`, add `addBook: (book: Book) => 'added' | 'duplicate'` to the context interface and implement it: call `isDuplicate(book, books)` from `lib/deduplication.ts`; if duplicate return `'duplicate'`; if new, call `setBooks([book, ...prev])` and return `'added'`. Run tests — they should pass.

- [ ] 3.0 Build AddBookFAB and AddBookModal components
  - [ ] 3.1 [RED] Create `tests/deduplication.test.ts`. Write tests for `normalizeString`: `"The Great Gatsby"` → `"the great gatsby"`, punctuation stripped, extra spaces collapsed. Write tests for `isDuplicate`: match by ISBN13 when both books have one; fall back to normalised title+author when either lacks ISBN13; return false when neither matches. All tests fail — file doesn't exist yet.
  - [ ] 3.2 [GREEN] Create `lib/deduplication.ts`. Implement `normalizeString(str)`: `str.toLowerCase().replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, ' ')`. Implement `isDuplicate(incoming, existing[])`. Run tests — they should pass.
  - [ ] 3.3 [RED] Add tests to `tests/deduplication.test.ts` for `deduplicateBooks(incoming, existing)`: given 3 incoming books where 2 already exist, returns `{ newBooks: [1 book], skipped: 2 }`. Test ISBN13 path and title+author fallback path separately.
  - [ ] 3.4 [GREEN] Add `deduplicateBooks` to `lib/deduplication.ts` and run tests.
  - [ ] 3.5 [RED] Create `components/ManualAddForm.test.tsx` (first line: `// @vitest-environment jsdom`). Write tests: submitting the form with both fields empty shows validation errors and does not call `onAdd`. Submitting with title only shows author error. Submitting with both fields filled calls `onAdd` with a Book object where `source === 'manual'` and `isResolvingCountry === true`. Tests fail — component doesn't exist.
  - [ ] 3.6 [GREEN] Create `components/ManualAddForm.tsx`. Two inputs (Title, Author), a submit button "Add to my map". On submit, validate both fields — if empty show inline error. On valid submit, construct Book and call `onAdd(book)`. Run tests.
  - [ ] 3.7 [RED] Create `components/AddBookModal.test.tsx` (first line: `// @vitest-environment jsdom`). Write tests: pressing Escape calls `onClose`. Clicking the backdrop calls `onClose`. When `addBook` returns `'duplicate'`, the modal shows "This book is already in your library." and does not close. Tests fail.
  - [ ] 3.8 [GREEN] Create `components/AddBookModal.tsx` as the modal shell. Use `createPortal` (same pattern as `FeedbackButton`). Fullscreen on mobile, centred card on desktop. Escape key listener on mount/unmount. Backdrop click calls `onClose`. Inline duplicate message state. Run tests.
  - [ ] 3.9 [GREEN] Create `components/BookSearchInput.tsx`: debounced input (300ms, `useRef` for timeout), auto-focus on mount, calls `onSearch(query)` after debounce, shows spinner when `isLoading` prop is true.
  - [ ] 3.10 [GREEN] Create `components/BookSearchResults.tsx`: scrollable list of result rows (cover 32×48, title, author). On row tap calls `onSelect(book)`. Cover `onError` falls back to `/book-placeholder.svg`. When results are empty and query has 2+ chars and not loading, show "No results" state and "Can't find it? Add it manually →" link.
  - [ ] 3.11 [GREEN] Create `components/AddBookFAB.tsx`. Fixed positioned. Desktop (≥1024px): `bottom: 1.5rem; left: 1rem`, label visible. Tablet (640–1023px): `bottom: 5rem; right: 1rem`, label visible. Mobile (<640px): `bottom: 5rem; right: 1rem`, icon-only circle. Accepts `onClick` prop.
  - [ ] 3.12 [GREEN] Compose `AddBookModal` to wire together `BookSearchInput` → `BookSearchResults` (or `ManualAddForm`). On search, call `GET /api/books/search?q=<query>`, set loading, set results. On result select or manual form submit, call `addBook()` from context — show duplicate message or close and trigger enrichment.
  - [ ] 3.13 [GREEN] In `app/page.tsx`, add `isAddBookModalOpen` state. Mount `<AddBookFAB>` and `<AddBookModal>`. FAB click: `setIsSheetExpanded(false)` + `setIsAddBookModalOpen(true)`. Modal `onClose`: `setIsAddBookModalOpen(false)`. Pass `handleManualBookAdd` as `onAdd`.

- [ ] 4.0 Wire optimistic UI and single-book background enrichment
  - [ ] 4.1 [GREEN] In `app/page.tsx`, implement `handleManualBookAdd(book: Book)`. After `addBook()` returns `'added'`, call `saveProcessedBooks` with the updated books array (book already in state via context).
  - [ ] 4.2 [GREEN] In `handleManualBookAdd`, call `resolveAuthorCountriesBackend([book], onProgress, onBatchComplete)`. In `onBatchComplete`, call `updateBookCountries(book, resolvedCountries)`. Set a 10-second `setTimeout` — if enrichment hasn't resolved by then, call `setBooks` to set `isResolvingCountry: false` on the book (leaving `authorCountries: []`).
  - [ ] 4.3 [GREEN] In `handleManualBookAdd`, call `enrichBooksWithCoversBatched([book], onBatchComplete)`. In `onBatchComplete`, update the book's `coverImage` via `setBooks` updater function.
  - [ ] 4.4 Find where the country flag/tag is rendered (likely `BookCard` or `BookList`). When `book.isResolvingCountry === true`, render a `.shimmer` placeholder div instead of the flag area.
  - [ ] 4.5 Add shimmer styles to `globals.css`: `.shimmer { background: linear-gradient(90deg, var(--color-border-light) 25%, var(--color-border) 50%, var(--color-border-light) 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 4px; }` and `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`.
  - [ ] 4.6 When enrichment completes and `isResolvingCountry` becomes false, the country flag element should use the existing `animate-slide-up` class so it animates in rather than appearing abruptly.

- [ ] 5.0 Implement CSV deduplication and import toast
  - [ ] 5.1 `deduplicateBooks` was already built and tested in task 3.3–3.4. In `app/page.tsx`, integrate it into the CSV upload handler: after `parseCSVData()`, load existing books via `loadProcessedBooks()`, call `deduplicateBooks(parsedBooks, existing ?? [])`, merge `[...existing ?? [], ...newBooks]` into state, and pass only `newBooks` to the enrichment pipeline.
  - [ ] 5.2 [RED] Create `components/Toast.test.tsx` (first line: `// @vitest-environment jsdom`). Write tests: the toast renders the message string. After 5 seconds it calls `onDismiss`. Clicking the `×` button calls `onDismiss` immediately. Tests fail.
  - [ ] 5.3 [GREEN] Create `components/Toast.tsx`. Fixed bar at bottom-centre. Styled with `var(--color-ink)` background, `var(--color-surface)` text. `×` dismiss button. Auto-dismiss via `useEffect` with a 5-second `setTimeout` that calls `onDismiss`. Run tests.
  - [ ] 5.4 [GREEN] In `app/page.tsx`, add `toastMessage: string | null` state. After the CSV dedup step, set the message: `skipped > 0` → `"{n} new books added. {skipped} already in your library."`, otherwise `"{n} books added."`. Render `<Toast>` conditionally. Clear on dismiss.
  - [ ] 5.5 Add `.toast` to `globals.css`: `position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 100;` plus warm token colours and a slide-up entrance animation.

- [ ] 6.0 Refactor MapControls into overflow menu
  - [ ] 6.1 In `components/MapControls.tsx`, add `isOverflowOpen` state and an overflow trigger button (three-dot or ellipsis icon). The button toggles `isOverflowOpen`.
  - [ ] 6.2 Move the theme picker to render inside the overflow menu panel. The swatches stay visually identical — only the container changes. Remove the old standalone theme dropdown trigger.
  - [ ] 6.3 Add a "Send feedback" row inside the overflow menu panel below the theme section. Render `<FeedbackButton>` here (without fixed positioning). Close the overflow menu when feedback is clicked.
  - [ ] 6.4 Add click-outside and Escape key handling for the overflow menu (replace or extend the existing `useEffect` for the old theme dropdown).
  - [ ] 6.5 In `app/page.tsx`, remove any standalone `<FeedbackButton>` rendered at the page level. Verify the feedback modal still appears correctly (it uses a Portal so it will).
  - [ ] 6.6 Add `.overflow-menu` and `.overflow-menu-item` to `globals.css`, matching the existing `.map-dropdown` and `.map-dropdown-item` styles for visual consistency.
