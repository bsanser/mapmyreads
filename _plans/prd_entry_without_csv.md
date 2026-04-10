# PRD: Allow Entry Without CSV

**Status**: Draft
**Date**: 2026-04-10
**Branch**: `allow-entry-without-csv`

---

## Problem

The first screen a new user sees is always the CSV upload gate. There is no way to reach the map, the sign-in form, or the manual book-add flow without first uploading a file.

This blocks three distinct user populations:

1. **Returning authenticated users on a new device** — they created an account specifically for cross-device sync, yet they cannot log in because the sign-in UI is only accessible inside the map view (behind the CSV gate).
2. **Manual builders** — users who don't use Goodreads or StoryGraph, or who want to start with a few books before committing to a full import. The AddBookModal is completely unreachable from the hero screen.
3. **Curious newcomers** — users who want to understand what the product does before investing time in an export task. There is no preview, no demo, no other entry path.

The CSV import persona (Persona C) is well-served by the current design and must not be degraded.

---

## Goal

Add secondary entry paths to the hero screen that let users bypass the CSV requirement, while keeping the CSV upload visually and hierarchically dominant.

**Non-goals**:
- Demo/example map with mock data (deferred — requires demo data infrastructure)
- Social login or password auth
- Changes to the shared map (`/map/[uuid]`) — that flow is already ungated and read-only

---

## User Personas

| Persona | Situation today | Desired outcome |
|---------|----------------|-----------------|
| **A — Curious newcomer** | No CSV, no account. Hits upload wall and leaves. | Can enter the map with 0 books and explore, then add manually. |
| **B — Returning auth user** | Has account + synced books, new device, no localStorage. Sign-in is invisible. | Can sign in from hero screen; remote books load automatically. |
| **C — CSV importer** | Well-served. Uploads CSV, map appears. | No change — primary flow stays identical. |
| **D — Manual builder** | No Goodreads/StoryGraph. AddBookModal is unreachable. | Can bypass gate, open AddBookModal, add first book, see map. |

---

## Solution

### Hero Screen Changes

Keep the upload zone and headline as-is. Add two secondary text links below the upload zone — visually subordinate (smaller type, reduced opacity), not buttons.

**Visual hierarchy (top → bottom)**:
1. Headline + tagline + export links (existing)
2. Upload dropzone with "Choose File" button (existing, primary CTA)
3. `StorageStatus` (existing)
4. ——
5. "Sign in to your account" (new text link) — for Persona B
6. "I'm just looking 👀" (new text link) — for Personas A and D

These are plain text links, not buttons. The visual weight difference (button vs link) establishes that the CSV upload is the primary action.

The "I'm just looking" copy is intentionally light and inviting — it matches the indie/personal tone of the product, signals zero commitment, and doesn't frame the CSV upload as an obstacle. Do not replace it with functional copy like "Skip" or "Add books manually", which either sounds dismissive or sounds tedious.

### App-Level Gate Change (`app/page.tsx`)

Replace the `books.length === 0` binary with a three-condition gate:

```tsx
// New local state (NOT persisted to localStorage)
const [hasEnteredApp, setHasEnteredApp] = useState(false)

// Existing SessionContext
const { isAuthChecking } = useSession() // NEW — see SessionContext changes

// Render gate
if (isAuthChecking) {
  return <LoadingScreen />  // neutral, no flash
}
if (!hasEnteredApp && books.length === 0) {
  return <HeroScreen
    onFileUpload={handleFile}
    onSignIn={() => /* show inline magic-link form */}
    onSkipToManual={() => {
      setHasEnteredApp(true)
      setIsAddBookModalOpen(true)
    }}
    isProcessing={isProcessing}
    error={error}
  />
}
return <MapView ... />
```

`hasEnteredApp` is **session-scoped only** — never written to localStorage. A page reload with 0 books returns the user to HeroScreen (correct behavior).

When a user clicks "I'm just looking 👀", `hasEnteredApp` becomes `true`. The empty map opens — no modal is forced open immediately. The user lands on the map and decides what to do next. On first `addBook()`, `books.length` becomes > 0 so the gate clears cleanly even without `hasEnteredApp`.

When a user completes CSV upload, `books.length > 0` clears the gate — `hasEnteredApp` is not consulted.

### SessionContext Changes

Add `isAuthChecking: boolean` — `true` from mount until the `/api/auth/me` response resolves (success or failure). This eliminates the HeroScreen flash for returning authenticated users (Persona B).

Without this flag, the sequence is:
1. Mount → `books.length === 0` → HeroScreen renders (flash)
2. `/api/auth/me` resolves → remote books load → map renders

With this flag:
1. Mount → `isAuthChecking === true` → neutral loading screen
2. `/api/auth/me` resolves → `isAuthChecking = false` → if books loaded, map renders; if not, HeroScreen renders

### MagicLinkForm Component (refactor)

Extract the email-submission form from `SavePrompt.tsx` into a shared `MagicLinkForm` component:

```tsx
interface MagicLinkFormProps {
  label?: string
  description?: string
  onSent?: () => void
}
```

`SavePrompt` wraps it with its existing dismiss/visibility logic (no behavior change).
`HeroScreen` uses it directly when the user clicks "Sign in to your account" — either inline (expanding below the link) or as a modal.

Do **not** duplicate the form — two callers sharing one component prevents divergence if the magic-link endpoint signature changes.

### Empty Map State

When `hasEnteredApp === true` and `books.length === 0`, the user has said "I'm just looking" and landed on an empty map. This is a conversion surface — the goal is to get them to add books (manually or via CSV), not just to show them a blank map.

**Overall framing**: the empty map should feel like a starting point, not a broken state. The sidebar/bottom sheet becomes the primary onboarding surface. The map itself is gray and world-scale (correct behavior — no code change to MapContainer needed).

**Component requirements:**

| Component | Required behavior |
|-----------|------------------|
| `MapContainer` | Renders normally; all countries in base gray. No code change needed. |
| `DesktopSidebar` | Replace the book list with a focused empty state. Show a short line of copy (e.g. "Your map is waiting for books") and **one** primary CTA button: "Add a book". This opens `AddBookModal`. No stats row — 0 books / 0 countries / 0 authors looks broken. |
| `MobileBottomSheet` | Show the empty state message and "Add a book" CTA above the fold in the collapsed state, without requiring the user to expand the sheet. |
| `ReadingAtlasSummary` | Hide entirely when `books.filter(b => b.readStatus === 'read').length === 0`. |
| `AddBookFAB` | Remains visible as a secondary entry to `AddBookModal`. |
| `SavePrompt` | Does not appear until `readBookCount >= 2` (existing behavior — no change). |
| `EnrichmentProgress` | Does not appear unless `isEnriching` (existing behavior — no change). |

### CSV Upload Entry Point Inside AddBookModal

The `AddBookModal` is the primary action on the empty map. Users who entered via "I'm just looking" may decide they want to import their full library after all. Rather than making them close the modal and find the hero screen again, expose the bulk upload option inside the modal itself.

**Change to `AddBookModal`**: below the book search/title input, add a secondary option:

```
──────── or ────────
📤 Bulk upload from Goodreads or StoryGraph
```

This is a text link or subtle button (not a primary CTA — the manual add is still the main action in the modal). Clicking it:
1. Closes the modal
2. Triggers the hidden CSV file input (same `handleFile` used on the HeroScreen)
3. The file picker opens; the rest of the CSV upload flow is identical to the existing path

**Implementation**: `AddBookModal` receives an optional `onBulkUpload` prop (`() => void`). When provided, it renders the bulk upload option. `page.tsx` passes it in. The prop is also available outside the empty state — it's useful any time a user is in the modal and realises they want to do a bulk import.

This makes the two entry paths (manual add, bulk CSV) feel like natural siblings rather than separate modes of the app.

### First Manual Add → Map Transition

When a user adds their first book via `AddBookModal`:

1. User confirms the book add.
2. `handleManualBookAdd` calls `setIsAddBookModalOpen(false)` first.
3. The modal closes.
4. `books.length` becomes 1; the render condition evaluates and `MapView` stays mounted (it already is — the user was on the empty map).
5. MapLibre GL does not re-initialize — the map was already mounted. Background enrichment starts.

Note: unlike the original CSV flow, the map is already mounted when the first book is added. No transition needed — the map simply updates as enrichment resolves the author country.

---

## User Journeys (After Change)

### Persona B — Returning User, New Device (highest priority fix)

```
Land on app →
isAuthChecking = true → neutral loading state →
/api/auth/me resolves with valid cookie →
remote books fetch from /api/sessions/[uuid]/books →
books > 0 → map renders with existing library
```

If the cookie has expired or does not exist:
```
isAuthChecking = false, books = 0 →
HeroScreen renders with "Sign in to your account" link visible →
User enters email → receives magic link → verifies →
Redirected back → isAuthChecking cycle repeats →
remote books load → map renders
```

### Persona D — Manual Builder

```
Land on HeroScreen →
Click "I'm just looking 👀" →
hasEnteredApp = true → empty map + sidebar empty state →
Click "Add a book" (sidebar CTA or FAB) →
AddBookModal opens →
  Option A: search and add a book manually →
    modal closes → book appears on map → enrichment runs
  Option B: click "Bulk upload from Goodreads or StoryGraph" →
    modal closes → file picker opens → CSV uploads → full library appears
```

### Persona A — Curious Newcomer

```
Land on HeroScreen →
Click "I'm just looking 👀" →
Empty map, gray world, sidebar says "Your map is waiting for books" →
Sidebar CTA and FAB invite them to add a book →
May leave, may add one book to try it, may decide to import full CSV →
Either way: the path forward is clear and never a dead end
```

### Persona C — CSV Importer (unchanged)

```
Land on HeroScreen →
Drop/choose CSV →
Map renders immediately with parsed books →
Background enrichment runs
```

---

## Security Requirements

*Informed by security review. Items marked **must-ship** are acceptance criteria for this feature. Items marked **deferred** go to a hardening sprint.*

### Must-Ship

**1. Rate limiting on `POST /api/auth/magic-link`**
- Per-IP: 5 requests per 15-minute window (middleware layer)
- Per-email: 3 tokens per 30-minute window (DB-side check before `createTokenRecord()` in `lib/magicLink.ts`)
- Both limits: return `{ ok: true }` without sending email (no information leak about whether limit was hit)
- Response timing: add 200–400ms server-side delay on the invalid-email fast-path to equalize timing with the full DB-write path

**2. CORS policy via `middleware.ts`**
Create `middleware.ts` (does not currently exist). Restrict API routes to the app's own origin with `Access-Control-Allow-Origin: https://[production domain]`. This closes cross-origin CSRF on the magic-link form — browsers cannot send `application/json` in a cross-origin request without a CORS preflight, which this policy will reject.

**3. Sync endpoint ownership check**
`POST /api/sessions/[uuid]/sync` must reject writes when `session.userId` is set but does not match the `mmr_uid` cookie. Return 403. This closes the post-login abuse case where an attacker with a known session UUID could write books to a claimed session.

**4. Collapse `auth_error` redirect parameter**
`GET /api/auth/verify` currently reflects raw token failure reasons (`not_found`, `expired`, `used`) into the redirect URL. Replace all three with `invalid_or_expired`. Log the granular reason server-side. Prevents timing-based oracle attacks and email confirmation via token state.

**5. Assert `NEXT_PUBLIC_APP_URL` in production**
The verify route constructs its redirect target from this env var, falling back to `http://localhost:3000`. Add a startup guard (or CI check) that asserts the var is set and begins with `https://` in non-local environments. A missing var in production would redirect verified users to localhost.

### Deferred (Hardening Sprint)

6. Split `GET /api/sessions/[uuid]/books` into public (shared maps) and authenticated (SessionContext hydration) paths — add cookie check for the auth hydration caller
7. Per-IP rate limiting (10 req/min) on `/api/authors/batch-resolve` and `/api/books/batch-covers`
8. Cookie rotation on `GET /api/auth/me` for sessions older than 30 days (sliding window)
9. Post-login `sessionId` rotation — issue new UUID after magic link verification, replace pre-auth anonymous session

---

## Technical Tasks

### Phase 1 — Core Gate + Entry Paths

- [ ] **`SessionContext`**: add `isAuthChecking` boolean (true on mount → false when `/api/auth/me` resolves)
- [ ] **`app/page.tsx`**: replace `books.length === 0` gate with `!hasEnteredApp && books.length === 0`; add `isAuthChecking` loading state; add `hasEnteredApp` local state; add `onSkipToManual` handler
- [ ] **`HeroScreen`**: add `onSignIn` and `onExplore` props; render two secondary text links ("Sign in to your account" and "I'm just looking 👀") below upload zone
- [ ] **`MagicLinkForm`**: extract email form from `SavePrompt.tsx` into standalone component; update `SavePrompt` to use it
- [ ] **`HeroScreen`**: wire up inline `MagicLinkForm` when "Sign in to your account" is clicked
- [ ] **`AddBookModal`**: add optional `onBulkUpload` prop; when provided, render "Bulk upload from Goodreads or StoryGraph" secondary option below the book input
- [ ] **`app/page.tsx`**: pass `onBulkUpload` to `AddBookModal`; handler closes modal then triggers the CSV file input
- [ ] **`handleManualBookAdd`**: ensure modal closes (`setIsAddBookModalOpen(false)`) before `addBook()` state update

### Phase 2 — Empty Map State

- [ ] **`DesktopSidebar`**: add empty state panel (message + AddBookModal CTA) when `readBooks.length === 0`
- [ ] **`MobileBottomSheet`**: add empty state message; ensure CTA is visible without expanding sheet on mobile
- [ ] **`ReadingAtlasSummary`**: hide component when 0 read books
- [ ] **`app/globals.css`**: add any new classes needed for empty state panels

### Phase 3 — Security (Must-Ship Items)

- [ ] **`lib/magicLink.ts`**: add per-email token rate limit check (3 tokens / 30 min) before `createTokenRecord()`
- [ ] **`middleware.ts`** (new file): CORS policy for API routes + per-IP rate limit on magic-link (5 req / 15 min)
- [ ] **`app/api/sessions/[uuid]/sync/route.ts`**: add `session.userId` vs `mmr_uid` cookie ownership check
- [ ] **`app/api/auth/verify/route.ts`**: collapse `auth_error` redirect values to `invalid_or_expired`
- [ ] **CI / startup guard**: assert `NEXT_PUBLIC_APP_URL` is set + HTTPS in non-local environments

---

## Acceptance Criteria

### Persona B (returning user, new device)
- [ ] Visiting the app with a valid `mmr_uid` cookie and no localStorage books never shows the HeroScreen if remote books exist — the map loads directly
- [ ] A neutral loading state (not HeroScreen) shows during the auth check window
- [ ] "Sign in to your account" link is visible on the HeroScreen (for cases where the cookie is expired or absent)
- [ ] After magic-link verification, remote books load and the map renders without requiring a CSV

### Persona A & D (curious newcomer / manual builder)
- [ ] Clicking "I'm just looking 👀" bypasses the CSV gate and shows the empty map (no modal forced open)
- [ ] Sidebar and bottom sheet show an empty state with a visible "Add a book" CTA — no stats row
- [ ] `AddBookModal` shows a "Bulk upload from Goodreads or StoryGraph" secondary option below the book input
- [ ] Clicking that option closes the modal and opens the CSV file picker; the rest of the upload flow is identical to the HeroScreen path
- [ ] Adding the first book manually updates the map in place — no page transition, no flash

### Persona C (CSV importer — regression check)
- [ ] CSV upload flow is unchanged
- [ ] The secondary text links do not visually compete with the upload zone
- [ ] No performance regression on CSV processing

### Security
- [ ] `POST /api/auth/magic-link` returns 200 with `{ ok: true }` regardless of rate limit hit (no information leak)
- [ ] Cross-origin POST to `/api/auth/magic-link` is rejected by CORS preflight
- [ ] `POST /api/sessions/[uuid]/sync` returns 403 when session has a `userId` that does not match the request's `mmr_uid` cookie
- [ ] `/?auth_error=not_found`, `/?auth_error=expired`, `/?auth_error=used` no longer appear in redirects — only `/?auth_error=invalid_or_expired`

---

## Out of Scope

- Demo map with example data (requires mock data infrastructure + demo state management)
- "Explore a sample map" link — deferred until demo infrastructure exists
- Social login (Google, GitHub) — separate initiative
- Changes to `/map/[uuid]` shared view — already ungated, no change needed
- Unit tests for state gate logic — current test suite covers pure utility functions; this is a manual QA surface
