# PRD: Phase 2 — Persistence, Sharing & Accounts

**Status:** Draft
**Phase:** 2 (backend activation + identity)
**Last updated:** 2026-04-08

---

## 1. Overview

Map My Reads currently lives entirely in the browser. Books vanish if localStorage is cleared, sharing a map means encoding the entire payload in a URL, and there is no way to access your map from a second device. Phase 2 fixes all three problems while keeping the zero-friction, no-login-required experience that makes the app approachable.

**What Phase 2 delivers:**

- **Anonymous sessions.** On first visit a UUID is generated and stored in localStorage. The user's books are synced to Postgres under that UUID. No account required.
- **Clean share URLs.** `mapmyreads.com/map/<uuid>` replaces the current base64-payload approach. Anyone with the link gets a read-only view of that session's map.
- **Magic link auth.** When a user wants a permanent account they enter their email and click a link. No passwords, no OAuth.
- **Anonymous → authenticated migration.** Signing up links the existing session UUID to the new User row. Zero data loss, single transaction.
- **Cross-device access.** Once logged in, books load from the DB on any device — localStorage becomes a cache, not the source of truth.

**Why now:** Users are actively adding books manually (Phase 1 feature). The moment someone has 5–10 books pinned to their map, losing them to a browser clear is a real pain. Phase 2 makes those books permanent with minimal friction added to the existing flow.

---

## 2. User Stories

**US-1 — Anonymous user shares their map**
> I've uploaded my Goodreads CSV and want to show a friend my reading map. I click Share, get a clean URL (`/map/<uuid>`), send it. My friend opens it and sees my map in read-only mode — no account, no confusion.

**US-2 — User recovers their map on a new browser**
> I cleared my browser data and my map is gone. I remember I had a share link saved. I open `/map/<uuid>` and my books are all there. I click "Make this mine" and they're back in my editable map.

**US-3 — User creates an account after adding books**
> I've added 3 books manually. A subtle prompt appears: "Save your map permanently." I enter my email, click the magic link, and I'm logged in. My existing books are still there — nothing was lost.

**US-4 — Returning logged-in user on a new device**
> I log into Map My Reads on my work laptop. My map loads from the DB with all my books. I add a new book, it saves immediately. When I get home my home computer shows the same book next time I visit.

**US-5 — Someone views a shared map**
> I receive a link to a friend's reading map. I open it. I see their map in read-only mode — no editing, no controls to modify books. There's a CTA: "Build your own reading map."

---

## 3. Architecture Decisions

### 3.1 Session model

Every browser gets a UUID (`sessionId`) on first load, stored in localStorage under the key `map_my_reads_session_id`. This UUID is the primary identifier until the user signs up. It maps to a `Session` row in Postgres, with `SessionBook` rows linking to `Book` rows.

The UUID also doubles as the share token. No separate share token is introduced — simpler is better for an indie project. If a user wants to "revoke" sharing, that's a Phase 3 problem.

### 3.2 Data flow

**Anonymous user:**
```
localStorage (sessionId) → POST /api/sessions/sync → Session + SessionBook rows in DB
```

**Viewing a shared map:**
```
/map/[uuid] → GET /api/sessions/[uuid]/books → read-only map render
```

**Sign up / login:**
```
POST /api/auth/magic-link (send email) →
GET /api/auth/verify?token=<token> (verify) →
PATCH /api/sessions/[uuid]/claim (link sessionId to userId) →
set httpOnly cookie (userId or sessionId)
```

**Logged-in user, new device:**
```
Cookie present → GET /api/sessions/me/books → load books → hydrate BooksContext
```

### 3.3 Auth approach

Magic link only. Flow:
1. User submits email via `SavePrompt` component.
2. Server generates a short-lived (15-min) signed token, stores it in a new `MagicToken` table, sends email via Resend.
3. User clicks link: `/api/auth/verify?token=<token>`.
4. Server validates token (not expired, not used), marks `usedAt`, creates or finds `User`, links the current `sessionId` to that user (migration step), sets an httpOnly session cookie, redirects to `/`.

No third-party auth libraries needed at this scale. Hand-rolled.

### 3.4 Session cookie vs. localStorage

- `userId` stored in an httpOnly cookie (not accessible to JS) — set on magic link verification.
- `sessionId` stays in localStorage — used for anonymous sync and as the share token.
- On page load: if cookie present, load books from DB by userId. If not, load from DB by sessionId (falling back to localStorage if DB unreachable).

### 3.5 Book storage model

The existing `Book` table is coupled to `userId` (non-nullable FK), which conflicts with anonymous sessions.

**Decision:** Make `Book.userId` nullable. Anonymous books have `userId = null`. On account creation, update `userId` for all books in that session. This keeps queries simple and avoids duplicating the schema.

### 3.6 localStorage as write-through cache

After Phase 2, localStorage is still written on every book change (existing behavior unchanged). The DB sync happens in parallel — it's not blocking. If sync fails, books are still in localStorage. This makes the app resilient to DB downtime.

---

## 4. DB Schema Changes

All changes are additive. No existing tables are dropped or renamed.

### 4.1 `Book` — make `userId` nullable

```prisma
model Book {
  userId  String?       // was non-nullable
  user    User?  @relation(...)
}
```

### 4.2 `Session` — add `lastSyncedAt`, make `expiresAt` nullable

```prisma
model Session {
  lastSyncedAt DateTime?   // add — track last sync
  expiresAt    DateTime?   // make nullable — anonymous sessions don't expire
}
```

### 4.3 New model: `MagicToken`

```prisma
model MagicToken {
  id        String    @id @default(cuid())
  token     String    @unique
  email     String
  sessionId String?
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@map("magic_tokens")
}
```

### 4.4 `User` — add `emailVerified`

```prisma
model User {
  emailVerified DateTime?
}
```

### Summary

| Model | Change |
|---|---|
| `Book` | `userId` nullable |
| `Session` | Add `lastSyncedAt DateTime?`, `expiresAt` nullable |
| `MagicToken` | New model |
| `User` | Add `emailVerified DateTime?` |

---

## 5. API Routes

### Session routes

**`POST /api/sessions`**
Creates or upserts a session row. Safe to call on every page load.
- Input: `{ sessionId: string }`
- Output: `{ sessionId: string, createdAt: string }`

**`POST /api/sessions/[uuid]/sync`**
Syncs the full book list from client to DB. Replaces all `SessionBook` rows for this session.
- Input: `{ books: Book[] }`
- Output: `{ synced: number }`
- Called after any book add/remove.

**`GET /api/sessions/[uuid]/books`**
Returns all books for a session. Public — no auth required (UUID is the access token).
- Output: `{ books: Book[], sessionExists: boolean }`

**`PATCH /api/sessions/[uuid]/claim`**
Links a session to the authenticated user. Called during magic link verification.
- Auth: httpOnly cookie
- Output: `{ ok: true }`
- Behavior: sets `Session.userId`, updates `Book.userId` for all session books. Single transaction.

### Auth routes

**`POST /api/auth/magic-link`**
Sends a magic link email.
- Input: `{ email: string, sessionId?: string }`
- Output: `{ ok: true }` (always — don't leak whether email exists)

**`GET /api/auth/verify`**
Verifies token and logs user in.
- Input: `?token=<string>`
- Output: redirect to `/` with httpOnly cookie set
- Behavior: validate token, mark `usedAt`, set `emailVerified`, claim session, set cookie.

**`POST /api/auth/logout`**
Clears the session cookie.
- Output: `{ ok: true }`

**`GET /api/auth/me`**
Returns current user if logged in.
- Output: `{ user: { id, email } | null }`

---

## 6. Pages & Components

### New page: `/map/[uuid]`

**File:** `app/map/[uuid]/page.tsx`

- Fetches books via `GET /api/sessions/[uuid]/books`.
- Renders the map in read-only mode: no FAB, no upload, no book mutation controls.
- Banner: "You're viewing [N] books on this reading map. [Build your own →]"
- If `sessionExists: false`: shows "This map doesn't exist or has been removed."
- Reuses `MapLibreMap`, `DesktopSidebar`, `MobileBottomSheet` with an `isReadOnly` prop.

### New component: `SavePrompt`

**File:** `components/SavePrompt.tsx`

Shown when: user has 2+ manually-added books AND is not logged in AND hasn't dismissed this session.

Appearance: a small non-blocking card at the bottom of the sidebar. Not a modal.

```
Your map is saved in this browser. Save it permanently so you can access it anywhere.
[email input] [Send magic link]
```

Dismissed state in `sessionStorage` — reappears next session if still not signed up.

### New component: `AccountStatus`

**File:** `components/AccountStatus.tsx`

- Logged out: nothing visible (or a very subtle "Sign in" text link).
- Logged in: email + "Sign out" link.

Placed in the sidebar header.

### New context: `SessionContext`

**File:** `contexts/SessionContext.tsx`

Manages:
- `sessionId` — read from localStorage, generate UUID if absent, upsert to DB.
- `userId` — fetched from `GET /api/auth/me` on mount.
- `isLoggedIn` — derived from userId.
- `syncBooks(books)` — debounced call to `POST /api/sessions/[uuid]/sync`.

Added to `layout.tsx` alongside existing providers. `BooksContext` calls `syncBooks` after every book mutation.

### Updated: `ShareButton`

Replace `generateShareableLink()` to return `${origin}/map/${sessionId}`. Remove all base64 encoding logic from `storage.ts` once live.

### Updated: `BooksContext`

Call `SessionContext.syncBooks(books)` inside `setBooks`, `addBook`, and `updateBookCountries`.

---

## 7. Implementation Sequence

Build in this order — each step is independently shippable.

1. **Schema migration** — nullable userId, lastSyncedAt, MagicToken, emailVerified. Run `prisma migrate dev`.

2. **Session init + sync** — `POST /api/sessions`, `POST /api/sessions/[uuid]/sync`, `SessionContext` with debounced sync. Wire into `BooksContext`. Books now sync to DB silently.

3. **Share URL via UUID** — `GET /api/sessions/[uuid]/books`, `/map/[uuid]` read-only page, update `ShareButton`. Test: add books → copy link → open incognito → see read-only map.

4. **Magic link auth** — Add Resend. `POST /api/auth/magic-link`, `GET /api/auth/verify`, `GET /api/auth/me`. Set httpOnly cookie. Test full email → click → cookie flow.

5. **Session migration on login** — `PATCH /api/sessions/[uuid]/claim`. Call inside verify when sessionId present. Test: add books anonymously → sign up → books still present and linked to userId.

6. **Cross-device load** — In `SessionContext`, if logged in, fetch books from DB on mount and hydrate `BooksContext`. Test on two devices.

7. **SavePrompt + AccountStatus UI** — Build both components, wire trigger condition, test full sign-up funnel.

8. **Clean up legacy share code** — Remove `createShareableData`, `extractShareableData`, `hasShareableData`, `saveShareableData` from `storage.ts`. Remove `?data=` URL param handling from `app/page.tsx`.

---

## 8. Out of Scope

- OAuth / social login
- Multiple maps per user
- Map naming or descriptions
- Share link revocation
- Session expiry / cleanup jobs
- Country overrides
- Email preferences / unsubscribe
- Profile or settings pages
- Book editing
- Public map discovery / browse page
