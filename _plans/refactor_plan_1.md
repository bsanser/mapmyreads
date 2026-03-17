# Refactor Plan 1: Foundation Cleanup & Performance

## Problem Statement

The codebase was built as an MVP and has accumulated significant technical debt that makes it slow, hard to reason about, and difficult to extend with new features. Specifically:

1. **Performance bottleneck**: After CSV upload, the map renders quickly but books take a long time to appear because the entire author country resolution must complete (single batch API call to Wikidata for ALL authors) before any books show countries on the map. The user stares at a progress bar with no incremental feedback.

2. **God component**: `page.tsx` manages 16 useState hooks covering books, theme, UI state, enrichment progress, and cover loading. Any state change triggers re-renders of the map, both sidebars, and all progress indicators.

3. **Massive duplication**: `DesktopSidebar` and `MobileBottomSheet` share ~150 lines of identical code — book card rendering, country editing UI, filtering logic, and utility functions.

4. **Dead code**: ~400 lines of unused functions and 3 entire service files that were superseded but never deleted, creating confusion about which code path is actually active.

5. **No shared state mechanism**: Theme, books, and selected country are prop-drilled 3-4 levels deep. Adding any new feature requires modifying `page.tsx` AND every intermediate component in the chain.

6. **MapLibreMap has 5 useEffect hooks** with overlapping dependencies that cascade — a theme change triggers multiple sequential style updates instead of one coordinated update.

7. **The project is untestable in its current form** — everything is coupled to the god component and there are no clear module boundaries to test against.

## Solution

A systematic refactor in tiny, safe commits that:

1. **Deletes all dead code first** — removes noise so every remaining line has a clear purpose.
2. **Extracts shared components** — consolidates the DesktopSidebar/MobileBottomSheet duplication into a reusable `BookCard` and `BookList`.
3. **Introduces React Context** — for books, theme, and enrichment state, eliminating prop drilling and enabling any component to access shared state directly.
4. **Restructures the enrichment pipeline** — switches from "resolve all authors then update" to "resolve in small batches and update the map incrementally after each batch", so users see books appearing on the map within seconds of upload.
5. **Consolidates MapLibreMap effects** — merges 5 useEffect hooks into 2 (initialization + coordinated style update).
6. **Consolidates service files** — merges the 3 book cover services into 1 and the 2 author country services into 1.
7. **Structures the codebase for testability** — pure functions separated from side effects, clear module interfaces that can be tested independently.

## Commits

### Phase 1: Delete Dead Code (safe, zero-risk changes)

**Commit 1: Remove unused mapUtilities functions**
Delete from `lib/mapUtilities.ts`:
- `assignMockCountriesToBooks()` — mock data generator, never called
- `getUniqueCountriesFromBooks()` — never imported
- `getBooksByCountry()` — only called by other dead functions in same file
- `getCountryDisplayName()` — redundant with `mapISO2ToDisplayName()`
- `countryHasBooks()` — never called
- `getBookCountForCountry()` — never called
- `AVAILABLE_COUNTRIES` re-export — redundant, callers can import COUNTRIES directly

Keep: `mapDisplayNameToISO2()`, `mapISO2ToDisplayName()`, `getCountryFlag()`.

**Commit 2: Remove unused legacy country detection functions**
Delete from `lib/countryDetection.ts`:
- `detectCountriesFromText()` — text-heuristic fallback, superseded by Wikidata
- `detectAuthorNationality()` — text-heuristic fallback, superseded by Wikidata
- `COUNTRY_KEYWORDS` constant (~106 lines) — only used by `detectCountriesFromText()`
- `AUTHOR_NATIONALITY_KEYWORDS` constant (~106 lines) — only used by `detectAuthorNationality()`
- `COUNTRY_NAME_MAPPING`, `mapCountryNameForDisplay()`, `mapDisplayNameToCountry()` — verify if used; if not, remove

Keep: `detectAuthorCountriesByName()`, `detectAuthorCountries()`, and all Wikidata helper functions.

**Commit 3: Remove unused service files**
- Delete `lib/bookCoverService.ts` entirely — client-side sequential cover loading, superseded by `bookCoverServiceBatched.ts`
- Delete `lib/bookCoverServiceBackend.ts` entirely — unused wrapper, `enrichBooksWithCoversBackend()` is never imported
- Remove the dynamic `import('./bookCoverService')` fallback from `authorCountryServiceBackend.ts` line 138 — if the backend fails, fail cleanly rather than silently switching to an entirely different code path
- Delete `lib/authorCountryService.ts` entirely — client-side sequential author resolution, superseded by backend batch API
- Remove the dynamic `import('./authorCountryService')` fallback from `authorCountryServiceBackend.ts` line 138

**Commit 4: Remove other dead code**
- Delete `app/api/hello/route.ts` — test endpoint, no client reference
- Delete `components/Header.tsx` — component never imported anywhere
- Delete `getBooksNeedingData()` from `lib/csvParser.ts` — defined but never called
- Remove the no-op `useEffect` in `MobileBottomSheet.tsx` (lines 43-47) — placeholder that does nothing
- Remove `AVAILABLE_COUNTRIES` re-assignment in `heatmapEngine.ts` — use `COUNTRIES` directly
- Remove the useless `useMemo(() => THEMES, [])` in `page.tsx` — memoizing a module-level constant has zero effect

**Commit 5: Remove unused `testCountryDetection` and `performanceLogger` debug tooling**
- Check if `lib/testCountryDetection.ts` is used outside of DeveloperTools. If DeveloperTools is a debug-only panel and the functions are only called there, remove both the test file and the DeveloperTools component import/render from `page.tsx`. If you want to keep DeveloperTools, leave this for now but note it for a future cleanup pass.
- Evaluate `lib/performanceLogger.ts` — the logging functions (`logMapEvent`, `startMapLoadTimer`, `endMapLoadTimer`, `savePerformanceLogs`) write to an in-memory array and expose a download function via DeveloperTools. If DeveloperTools is removed, these become dead code too. Otherwise, keep.

### Phase 2: Extract Shared Components (eliminate duplication)

**Commit 6: Extract `BookCard` component**
Create `components/BookCard.tsx` containing:
- The book card layout (cover image, paperclip, title, author, year, country display)
- The `backgroundImage` notebook-line style as a constant (not recreated per render)
- The country editing interface (search input, dropdown, add/remove)
- Props: `book`, `isEditing`, `onToggleEdit`, `onCountryClick`, `onAddCountry`, `onRemoveCountry`, `countrySearch`, `onCountrySearchChange`, `showCountryDropdown`, `onShowCountryDropdown`

Verify DesktopSidebar and MobileBottomSheet still render identically after extraction.

**Commit 7: Extract `BookList` component**
Create `components/BookList.tsx` containing:
- The shared filtering logic (`baseFilteredBooks` → `filteredBooks` → `readBooks`)
- Book editing state (`editingBookId`, `countrySearch`, `showCountryDropdown`)
- The `getBookIdentifier()` helper
- `closeEditing()`, `handleToggleEdit()`, `handleRemoveCountry()`, `handleAddCountry()`
- Renders a list of `BookCard` components

Props: `books`, `selectedCountry`, `onCountryClick`, `onShowAll`, `onUpdateBookCountries`, `currentTheme`, `showMissingAuthorCountry`, `booksToShow?` (optional, for desktop pagination), `onLoadMore?`

**Commit 8: Refactor DesktopSidebar to use BookList**
Replace the duplicated book rendering and editing logic in DesktopSidebar with `<BookList />`. DesktopSidebar becomes a thin wrapper that handles:
- The sidebar container styling and scroll-to-load-more
- Rendering `ReadingAtlasSummary`
- The "filtering by X" / "show all" UI
- Passing props to `BookList`

**Commit 9: Refactor MobileBottomSheet to use BookList**
Replace the duplicated book rendering and editing logic in MobileBottomSheet with `<BookList />`. MobileBottomSheet becomes a thin wrapper that handles:
- The fixed-bottom mobile container styling
- The "showing X books" header with clear filter button
- Passing props to `BookList`

### Phase 3: Introduce React Context (eliminate prop drilling)

**Commit 10: Create BooksContext**
Create `contexts/BooksContext.tsx`:
- Holds `books`, `setBooks`, `selectedCountry`, `setSelectedCountry`
- Provides `summaryStats` as a derived value (computed once via `useMemo`, not duplicated)
- Provides helper: `updateBookCountries(book, countries)` — replaces the current prop-drilled callback
- Provides helper: `getFilteredBooks(selectedCountry, showMissing)` or just the filtering logic as a hook

Wire it into `app/layout.tsx` or a new wrapper component that wraps the page content.

**Commit 11: Create ThemeContext**
Create `contexts/ThemeContext.tsx`:
- Holds `currentTheme`, `setCurrentTheme`
- Provides the resolved theme object (`THEMES[currentTheme]`) so consumers don't import THEMES directly

**Commit 12: Create EnrichmentContext**
Create `contexts/EnrichmentContext.tsx`:
- Holds enrichment progress state: `isEnriching`, `enrichmentProgress`, `isLoadingCovers`, `coverProgress`
- Provides setters
- This isolates progress state changes from triggering re-renders in components that don't care about progress

**Commit 13: Migrate page.tsx to use Contexts**
- Remove the 16 useState hooks from page.tsx that are now managed by contexts
- Remove prop drilling of books, theme, selectedCountry, and enrichment state
- page.tsx becomes a thin orchestrator that:
  - Renders HeroScreen or the map view
  - Triggers the enrichment pipeline on file upload
  - Coordinates the upload → parse → enrich flow

**Commit 14: Migrate child components to consume Contexts**
Update `MapContainer`, `MapLibreMap`, `DesktopSidebar`, `MobileBottomSheet`, `BookList`, `ReadingAtlasSummary`, `EnrichmentProgress`, `MapControls` to use `useContext()` instead of receiving props for books/theme/selection.

Remove now-unnecessary props from component interfaces. Components that only need theme can call `useTheme()` directly instead of receiving it as a prop.

### Phase 4: Restructure the Enrichment Pipeline (the big performance win)

**Commit 15: Restructure the batch-resolve API to support smaller batches**
Currently `/api/authors/batch-resolve` receives ALL authors at once and resolves them all in parallel with a 25s timeout. Change to:
- Accept a batch of authors (the client decides batch size)
- Return results for that batch only
- The API route itself stays simple — it already handles the cache-check → Wikidata → write-cache flow

The key change is on the **client side** (next commit).

**Commit 16: Implement incremental author resolution with streaming map updates**
Rewrite `authorCountryServiceBackend.ts` to:
- Split the unique author list into small batches (e.g. 5-10 authors per batch)
- After each batch resolves, immediately update the books that belong to those authors with their country codes
- Call an `onBatchComplete(updatedBooks)` callback after each batch, which updates the BooksContext
- This means the map updates incrementally — users see countries lighting up within 1-2 seconds of upload, rather than waiting for all 50+ authors to resolve

The flow becomes:
1. Parse CSV → show empty map immediately (already works)
2. Start resolving authors in batches of ~8
3. After each batch, update books in context → map re-renders with new countries → user sees countries appearing one by one
4. Show a progress indicator ("Discovering countries: 12/47 authors resolved") that updates after each batch
5. Start loading covers in parallel once the first author batch returns (don't wait for all authors)

**Commit 17: Run cover loading in parallel with author resolution**
Currently covers only start loading AFTER all author countries are resolved. Change to:
- Start cover loading as soon as CSV is parsed (covers don't depend on countries)
- Run cover batches concurrently with author resolution batches
- Both update the BooksContext independently
- The map only cares about countries; the sidebar cares about both

This alone could halve the perceived wait time.

**Commit 18: Add clear UX for incremental loading**
- Show a compact progress bar that says "Mapping your books: 23/47 authors found" during resolution
- When incremental updates arrive, briefly highlight or animate newly-appeared countries on the map (subtle pulse)
- When all authors are resolved, show a brief "All done" confirmation then hide the progress
- Cover loading shows separately: "Loading covers: 35/120"

### Phase 5: Consolidate MapLibreMap (fix cascading effects)

**Commit 19: Merge MapLibreMap's 5 useEffect hooks into 2**
Currently there are:
1. `useEffect` to sync `currentThemeRef` (unnecessary — just use the prop directly)
2. `useEffect` to force initial theme on map ready (duplicates work done in init)
3. `useEffect` for map initialization (keep, but clean up)
4. `useEffect` to update heatmap when books change (merge with #5)
5. `useEffect` for theme changes (merge with #4)

Consolidate to:
1. **Init effect** (runs once) — creates map, sets up event handlers, applies initial style
2. **Update effect** (runs on `[books, propCurrentTheme]`) — single coordinated function that updates ALL map styles: background, outlines, labels, heatmap fill, wave pattern. No more ref tracking, no more skip-if-same-theme guards.

Remove `currentThemeRef` entirely.

**Commit 20: Memoize heatmap style generation**
`generateHeatmapStyle()` iterates all books and all countries on every call. Add memoization:
- Cache the result keyed on `books.length + theme key` (or a hash)
- Or use `useMemo` in the component with `[books, currentTheme]` as deps
- Also remove the redundant `AVAILABLE_COUNTRIES` alias in `heatmapEngine.ts`

**Commit 21: Add React.memo to expensive components**
- Wrap `MapLibreMap` in `React.memo` — it should only re-render when books or theme actually change
- Wrap `BookCard` in `React.memo` — individual cards shouldn't re-render when other cards' data changes
- Wrap `ReadingAtlasSummary` in `React.memo`

### Phase 6: Consolidate Service Files

**Commit 22: Consolidate author country resolution into single service**
Rename `lib/authorCountryServiceBackend.ts` to `lib/authorCountryService.ts` (since the old one was deleted in Phase 1). Clean up the module:
- Remove the `AuthorCountrySummary` type duplication (it was defined in both old files identically)
- The `setInterval` heartbeat progress simulation (lines 49-55) should be replaced with real progress from the batch-by-batch approach (Phase 4)
- Export a clean interface: `resolveAuthorCountries(books, onBatchComplete)` that handles batching internally

**Commit 23: Consolidate book cover service**
Rename `lib/bookCoverServiceBatched.ts` to `lib/bookCoverService.ts` (since the old one was deleted in Phase 1). It's already the only cover service in use. Just rename for clarity.

### Phase 7: Structural Cleanup

**Commit 24: Extract the notebook-line background style to CSS**
The identical `backgroundImage` with linear gradients for the notebook-line effect is currently an inline style object created per render in both `DesktopSidebar` (line 189-200) and `MobileBottomSheet` (line 98-109). Extract to a CSS class in `globals.css` or a Tailwind utility.

**Commit 25: Clean up MapContainer**
`MapContainer` currently filters `readBooks` and computes `highlightedCountries` on every render. With BooksContext, it can consume the pre-computed data directly. Also, the `highlighted` prop is passed to `MapLibreMap` but `MapLibreMap` never actually uses it — remove the prop if confirmed unused.

**Commit 26: Clean up page.tsx final state**
After all context migrations, `page.tsx` should be ~80-100 lines:
- Renders `<BooksProvider>` → `<ThemeProvider>` → `<EnrichmentProvider>`
- Contains the file upload handler (which triggers the enrichment pipeline)
- Conditionally renders `HeroScreen` or the map view
- No more prop drilling, no more 16 useState hooks

### Phase 8: Testability Foundation

**Commit 27: Ensure pure functions are cleanly separated from side effects**
Review and ensure the following modules export pure, testable functions:
- `csvParser.ts` — `detectCSVFormat()`, `parseCSVData()` are already pure
- `heatmapEngine.ts` — `getCountryBookCounts()`, `generateHeatmapStyle()` are already pure
- `mapUtilities.ts` — all remaining functions are pure
- `countryDetection.ts` — Wikidata functions have side effects (fetch), but the ISO2 mapping logic is pure. Ensure the pure parts are independently importable.
- `types/book.ts` — `cleanISBN()`, `parseDate()`, `parseReadStatus()` are already pure

No code changes needed if they're already separated — this commit is a verification pass. If any pure logic is entangled with side effects, extract it.

**Commit 28: Add a lightweight performance measurement utility**
Add a simple timing utility that wraps the enrichment pipeline:
- Measure time-to-first-country-on-map (from CSV upload to first batch returning)
- Measure total enrichment time
- Log these to console in dev mode
- This replaces the heavyweight `performanceLogger.ts` if it was removed in Phase 1, or complements it if kept

## Decision Document

### Modules to be built/modified
- **New**: `BookCard` component, `BookList` component, `BooksContext`, `ThemeContext`, `EnrichmentContext`
- **Modified**: `page.tsx` (dramatically simplified), `DesktopSidebar` (thin wrapper), `MobileBottomSheet` (thin wrapper), `MapLibreMap` (effects consolidated), `MapContainer` (cleanup), `authorCountryServiceBackend` (renamed + batch support), `bookCoverServiceBatched` (renamed)
- **Deleted**: `bookCoverService.ts`, `bookCoverServiceBackend.ts`, `authorCountryService.ts`, `Header.tsx`, `hello/route.ts`, ~400 lines of dead functions

### Context architecture
- `BooksContext` is the single source of truth for book data, selected country, and summary stats
- `ThemeContext` is the single source of truth for the active theme
- `EnrichmentContext` isolates progress state so progress updates don't trigger re-renders in components that don't display progress
- Contexts are composed at the layout level: `BooksProvider > ThemeProvider > EnrichmentProvider > children`

### Enrichment pipeline redesign
- Client splits authors into batches of ~8 and sends sequential requests to `/api/authors/batch-resolve`
- After each batch response, the client immediately updates BooksContext with the newly resolved countries
- Cover loading starts in parallel with author resolution (not sequentially after)
- The API route itself doesn't change — it already handles arbitrary-size author arrays
- The `setInterval` heartbeat progress simulation is replaced with real progress from actual batch completions

### MapLibreMap effect consolidation
- A single update function handles ALL style properties (background, outlines, labels, heatmap, wave pattern)
- Called once on init and once per `[books, theme]` change
- `currentThemeRef` is removed — no more manual theme tracking

### Component hierarchy after refactor
```
page.tsx (orchestrator)
  BooksProvider
    ThemeProvider
      EnrichmentProvider
        HeroScreen (if no books)
        -- or --
        MapContainer
          MapLibreMap
          MapControls
          FeedbackButton
        DesktopSidebar
          ReadingAtlasSummary
          BookList > BookCard[]
          ShareButton
        MobileBottomSheet
          BookList > BookCard[]
        EnrichmentProgress (if enriching)
```

## Testing Decisions

### What makes a good test
- Tests should verify **external behavior** (given these inputs, expect these outputs / these side effects) not implementation details (which internal function was called, what intermediate state was set)
- Tests should be resilient to refactoring — if you rename an internal variable, no test should break
- Each test should have a clear "arrange, act, assert" structure
- Tests should be fast — mock external APIs (Wikidata, Open Library) but don't mock internal modules

### Modules worth testing (priority order)

1. **CSV parsing** (`csvParser.ts`) — pure functions, easy to test, high value because incorrect parsing breaks everything downstream. Test: Goodreads format detection, StoryGraph format detection, edge cases (missing fields, malformed dates, Excel-formatted ISBNs)

2. **Country detection** (`countryDetection.ts`) — the Wikidata integration is the most fragile part of the system. Test: entity search, claim extraction, country name → ISO2 mapping. Mock the fetch calls to Wikidata.

3. **Heatmap generation** (`heatmapEngine.ts`) — pure function, easy to test. Test: correct country counts from a known book array, correct color mapping at 0/1/2/3+ books.

4. **Book type utilities** (`types/book.ts`) — pure functions. Test: `cleanISBN()` with various formats, `parseDate()` with Goodreads/StoryGraph date formats, `parseReadStatus()` with various values.

5. **Contexts** — test that BooksContext correctly computes `summaryStats`, that `updateBookCountries` merges correctly, that filtering works as expected.

6. **BookCard / BookList** — component tests verifying that the country editing flow works (click edit → search → select → verify country added). Use React Testing Library.

### Prior art
There are no existing tests in the codebase. The test framework should be set up from scratch. Recommended: Vitest (fast, native ESM, works well with Next.js) + React Testing Library for component tests.

## Out of Scope

- **User accounts / authentication** — planned for the future but not part of this refactor
- **Manual book adding** — requires new UI and API work, builds on the clean foundation this refactor creates
- **Location-based maps** (books mapped by setting locations) — requires a new data pipeline, builds on the clean foundation
- **Save/share maps** (persistent, server-side) — requires backend storage, out of scope
- **Upgrading Next.js** to v15 — not necessary for this refactor, can be done separately
- **Adding actual test files** — this refactor makes the code testable but doesn't write the tests. The testing decisions section above provides the blueprint.
- **Prisma schema changes** — the schema has User/Book/Session models that aren't actively used yet; leaving as-is
- **Visual/UI changes** — this refactor preserves the exact same visual output. No design changes.
- **The `countries.ts` auto-generated file** — leave as-is, it's generated by a script and not the source of any issues

## Further Notes

### Commit ordering rationale
The phases are ordered by risk:
1. **Phase 1 (delete dead code)** is zero-risk — removing code that isn't called can't break anything
2. **Phase 2 (extract components)** is low-risk — mechanical extraction, visual output must remain identical
3. **Phase 3 (contexts)** is medium-risk — changes the data flow but not the behavior
4. **Phase 4 (enrichment pipeline)** is the highest-risk, highest-reward change — it changes the user-visible behavior (incremental loading) so it comes after the foundation is clean
5. **Phases 5-8** are independent cleanups that can happen in any order

### Verification approach
Since there are no automated tests, each commit should be verified by:
1. Upload a Goodreads CSV and confirm the map renders correctly
2. Upload a StoryGraph CSV and confirm the same
3. Switch themes and verify all map colors update
4. Click a country and verify filtering works in both desktop and mobile views
5. Edit a book's author countries and verify it persists
6. Refresh the page and verify books load from localStorage
7. For Phase 4 specifically: verify that countries appear incrementally on the map as batches resolve

### Performance baseline
Before starting Phase 4, measure:
- Time from CSV upload to first country appearing on map (current: requires all authors to resolve first)
- Total time for all authors to resolve
- Total time for all covers to load

After Phase 4, the first metric should drop from "all authors resolved" (~10-25s) to "first batch of ~8 authors resolved" (~1-3s).
