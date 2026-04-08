# Map My Reads — Roadmap

## Done
- [x] UI / Style Refresh
- [x] Deploy to production
- [x] Submitting Feedback

---

## Now (Phase 1 — client-side only)

### Book Management
- [ ] Manual book add — title + author required, everything else enriched silently in background
- [ ] Book search with autocomplete — Open Library / Google Books / Anna's Archive, cover thumbnails in results
- [ ] Manual fallback form — when search returns no results, minimal inline form
- [ ] CSV deduplication on re-import — ISBN13 primary key, title+author fallback; toast: "X new, Y already in library"

### Enrichment & Data
- [ ] Single-book enrichment — trigger author country + cover resolution on manual add, not just bulk upload

### UI / Navigation
- [ ] Add book FAB — floating action button, one tap from anywhere, icon-only on mobile
- [ ] Command palette modal — book search UX, fullscreen on mobile, command palette on desktop
- [ ] Overflow menu — collapses theme switcher and feedback into one secondary control
- [ ] Mobile-first layout rethink — FAB + bottom sheet coexistence, viewport-specific behaviour
- [ ] Optimistic UI for book add — book appears on map instantly, shimmer while enrichment runs

---

## Next (Phase 2 — backend + identity)

### Identity & Sessions
- [ ] Anonymous session — UUID token in localStorage, created on first visit, no login required
- [ ] Session recovery via URL — map recoverable via ?token=<uuid>
- [ ] Account creation prompt — surfaced after user adds 2 books manually, plain language benefits
- [ ] Account creation — magic link or OAuth
- [ ] Anonymous → authenticated migration — single DB transaction, zero data loss
- [ ] Cross-device persistence — map available on any device once account exists

### Maps
- [ ] Multiple maps per user — e.g. "My reads", "2024 reads", "Wishlist"
- [ ] Map naming / description — users identify and describe their maps

### Enrichment & Data
- [ ] Shared enrichment cache — first user to add a book enriches it for everyone (author countries, cover)
- [ ] Country override by user — user edits a book's resolved country; stored separately from shared cache
- [ ] Country override isolation — user edits never pollute AuthorCache (shared Wikidata data)

### Book Management
- [ ] Edit book details — change country, read date, rating, etc.

### Sharing
- [ ] Share map via URL — read-only share token, separate from recovery token

### Engineering
- [ ] Backend activation — AnonSession, ReadingMap, MapBook, Book, CountryOverride schema
- [ ] Book search API route — proxy to Open Library / Google Books / Anna's Archive search

### Community
- [ ] Make roadmap public with votes — share the roadmap so users can upvote features

---

## Later (Phase 3+)

### Book Management
- [ ] Book shelves / read status — read, want-to-read, currently-reading
- [ ] Per-book rating — 1–5 stars
- [ ] Per-book notes — personal notes per book

### Maps
- [ ] Map filters — by year, shelf, etc. — possibly chat/RAG-based search instead of dropdowns

### Sharing
- [ ] Share map as image — server-rendered screenshot of the map
- [ ] Share map as carousel — Spotify Wrapped-style, reading insights by country visited

### Monetisation & Community
- [ ] Buy me a coffee
- [ ] Analytics (PostHog)

### Engineering
- [ ] Implement tests
