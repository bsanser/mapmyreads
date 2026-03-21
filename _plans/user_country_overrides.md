# Plan: Persistent User Country Overrides

## Status
Postponed — context captured for future implementation.

---

## The Problem

Users can currently edit book countries via the pen icon in the UI. However these edits are not persistent:

- React state updates immediately (looks correct on screen)
- `localStorage` is updated (survives page refresh in same browser)
- **Prisma `author_cache` is NOT updated** — it still has the original Wikidata country
- On the next CSV upload, enrichment re-reads from Prisma and **the edit is lost**

---

## Context

### The shared cache constraint
`author_cache` is a **shared Wikidata cache** — one entry per author, used by all users. Allowing users to edit it directly would affect everyone else who has the same author in their library. This is not acceptable.

### No login system (yet)
The app currently has no authentication. Users are anonymous. The Prisma schema has `User`, `Session`, `SessionBook` models defined but not yet active (planned for future).

### The anonymous → authenticated migration problem
If we store edits against an anonymous session ID, and the user later creates an account, we want their edits to carry over. The Prisma `Session` model already has `userId String?` (optional), suggesting this was anticipated.

---

## Proposed Solution: User Overrides Table

### New Prisma table: `author_country_overrides`

```prisma
model AuthorCountryOverride {
  id             String   @id @default(cuid())
  sessionId      String                          // always set (anonymous or logged-in)
  userId         String?                         // null for anonymous; set after account creation
  authorName     String
  normalizedName String
  countries      String[]                        // user's chosen countries (replaces Wikidata result)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([sessionId, normalizedName])
  @@map("author_country_overrides")
}
```

### Session ID strategy
- Generate a UUID on first visit → store in `localStorage` as `map_my_reads_session_id`
- All edits are stored against this session ID in the DB
- Same browser = same session = edits persist across uploads
- Clear browser cache = session ID lost = edits gone (acceptable for anonymous users)

### Enrichment merge logic
When resolving an author's country, the lookup order becomes:
```
1. Check author_country_overrides for this session_id  → use if found (user wins)
2. Check author_cache (Wikidata)                        → use if found
3. Call Wikidata API                                    → cache result, return
```

### Anonymous → account migration
When a user creates an account:
```sql
UPDATE author_country_overrides
SET user_id = 'newUserId'
WHERE session_id = 'abc123';
```
All edits transfer to the account automatically. No data is lost.

---

## What Needs Building

1. **New Prisma migration** — add `author_country_overrides` table
2. **Session ID generation** — generate UUID on first visit, persist in localStorage
3. **API endpoint** — `PATCH /api/authors/override` to create/update overrides
4. **Enrichment update** — merge overrides into the resolution pipeline
5. **UI connection** — wire the pen icon edit to the new API endpoint
6. **Migration hook** — on account creation, link session overrides to user ID

---

## Design Decisions Already Made

- Keep `author_cache` as a read-only shared Wikidata cache — never write user edits to it
- Overrides win over cache — user intent always takes priority
- Both `session_id` and `user_id` on the overrides table — future-proofs the account migration
- Anonymous session is fine for now — same pattern used by Amazon cart, Spotify, etc.
