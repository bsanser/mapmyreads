# Manual QA Checklist: Allow Entry Without CSV

**Feature branch**: `allow-entry-without-csv`
**PRD**: `_plans/prd_entry_without_csv.md`

Run these checks against a local dev server (`npm run dev`) before merging.
Use an incognito window to start each flow from a clean state.

---

## 1. Hero Screen — Secondary CTAs

- [ ] CSV upload zone is still the dominant element on the page (not degraded)
- [ ] Below the upload zone, two secondary links appear:
  - "Sign in to your account"
  - "I'm just looking 👀"
- [ ] Clicking "Sign in to your account" shows an inline email form (does not navigate away)
- [ ] Typing an email and submitting shows a confirmation message
- [ ] Clicking "I'm just looking 👀" enters the app without a CSV (map renders, no crash)
- [ ] Uploading a CSV from the hero screen still works as before


---

## 2. Returning User — New Device Flow

- [ ] Open an incognito window with no cookies/localStorage
- [ ] Hero screen appears (no flash of the map)
- [ ] Click "Sign in to your account", enter your email, submit
- [ ] Check email — magic link received within ~60 seconds
- [ ] Click magic link → redirected to `/` with map loaded and books present
- [ ] No `?auth_error=...` param visible in the URL on success
- [ ] Closing and reopening the tab (same window) keeps you logged in

---

## 3. "I'm Just Looking" Flow

- [ ] From hero screen, click "I'm just looking 👀" → map renders with empty state
- [ ] Desktop sidebar shows "Your map is waiting" empty state with an "Add a book" CTA
- [ ] Mobile bottom sheet shows "Your map is waiting for books" with an "Add a book" button
- [ ] `ReadingAtlasSummary` (stats row) is hidden when no books exist
- [ ] Clicking the "Add a book" CTA opens `AddBookModal`
- [ ] Searching for a book in AddBookModal and adding it updates the map immediately
- [ ] After adding at least 1 read book, the empty state disappears and the map colors a country

---

## 4. Bulk Upload from Inside the App

- [ ] With 0 books (explore mode), open AddBookModal via the "Add a book" CTA
- [ ] Below the search input, "📤 Bulk upload from Goodreads or StoryGraph" link is visible
- [ ] Clicking it closes the modal and opens the file picker
- [ ] Selecting a valid Goodreads CSV imports books and renders the map
- [ ] Selecting a valid StoryGraph CSV imports books and renders the map
- [ ] The bulk upload link is also present when AddBookModal is opened from the "+" button after books exist

---

## 5. Auth Error Page

- [ ] Visit `/?auth_error=invalid_or_expired` — an error message is shown to the user
- [ ] Manually visit `/?auth_error=not_found` — verify it does NOT appear (URL should normalise or be absent)
- [ ] Manually visit `/?auth_error=expired` — verify it does NOT appear
- [ ] Manually visit `/?auth_error=used` — verify it does NOT appear
- [ ] Using an expired magic link redirects to `/?auth_error=invalid_or_expired` (not `expired`)
- [ ] Using an already-used magic link redirects to `/?auth_error=invalid_or_expired` (not `used`)

---

## 6. isAuthChecking — No Hero Screen Flash for Returning Users

- [ ] Log in successfully (magic link flow)
- [ ] Hard-refresh the page (Cmd+Shift+R)
- [ ] The map loads directly — the hero screen / upload gate does NOT flash before the map appears
- [ ] On a slow connection (Chrome DevTools → throttle to Slow 3G), the screen stays blank (or a loading state) rather than showing the hero screen then switching to the map

---

## 7. Empty Map State — Edge Cases

- [ ] Add 1 book with `readStatus: 'read'` → map colors, empty states disappear
- [ ] Add a book with `readStatus: 'to-read'` only → empty states remain (to-read books don't count)
- [ ] Remove all read books → empty states reappear
- [ ] Shared map (`/map/[uuid]`) with 0 books: no crash, graceful empty state shown (read-only, no CTAs)

---

## 8. Cross-Device Session Claim

- [ ] Add 3 books anonymously (no login)
- [ ] Click "Sign in to your account", send magic link, click it
- [ ] After login, all 3 anonymous books are present on the map
- [ ] Opening the same account in another browser/incognito window shows the same books

---

## 9. Security Spot-Checks

- [ ] Submitting the magic-link form 3 times with the same email within 30 minutes → 4th request still returns 200 (no error leak), but no new email is sent (check inbox)
- [ ] Submitting the magic-link form from a browser console with a cross-origin `fetch()` (different origin) → request blocked by CORS
- [ ] Attempting to sync books to a session that belongs to another user (via curl with a wrong `mmr_uid` cookie) → HTTP 403 returned

---

## 10. Regression — Existing CSV Flow

- [ ] Upload a Goodreads CSV from the hero screen — map renders with all books
- [ ] Upload a StoryGraph CSV from the hero screen — map renders with all books
- [ ] Re-uploading a CSV (books already present) does not duplicate books
- [ ] "Save your map" prompt still appears after adding enough books (logged-out state)
- [ ] Logging in via SavePrompt still works (magic link from inside the app)
