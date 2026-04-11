# Plan: Replace Magic-Link Auth with Clerk

## Context

The current magic-link system is confusing to users (they have to leave the app to check email and click a link). Replacing it with Clerk gives users a familiar sign-in/sign-up form with email OTP verification built in. Clerk also collects name + email at sign-up, enforces email verification, handles GDPR-compliant user management, and eliminates ~400 lines of custom auth code.

Additional UX fixes bundled in:
- On **sign-up**: books migrate from localStorage to the DB account; localStorage is cleared after server confirms
- On **logout**: localStorage (books + sessionId) is cleared so the map shows empty, not stale data

---

## Phase 1 — Install and Configure Clerk

**File: `package.json`**
```
npm install @clerk/nextjs
```

**New env vars** (`.env.local` + Vercel dashboard):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

**File: `app/layout.tsx`** — wrap body contents with `<ClerkProvider>` as outermost (outside `SessionProvider`):
```tsx
import { ClerkProvider } from '@clerk/nextjs'
// <ClerkProvider> wraps <SessionProvider> and all other providers
// CSP in metadata is already broad enough (connect-src: https:) — no change needed
```

**File: `middleware.ts`** — replace CORS-only logic with `clerkMiddleware` wrapping existing CORS:
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/', '/map/(.*)', '/sign-in(.*)', '/sign-up(.*)', '/privacy',
  '/api/webhooks/(.*)',
  '/api/sessions',              // anonymous session upsert
  '/api/sessions/(.*)/books',   // shared map reads
])
// Run CORS preflight first, then clerkMiddleware
// Do NOT protect sync routes in middleware — ownership check stays inside the route handler
```

---

## Phase 2 — Database Schema

**File: `prisma/schema.prisma`** — add one field to `User`:
```prisma
clerkId  String?  @unique   // links Clerk user → DB user
```
Run: `npx prisma migrate dev --name add_clerkId_to_users`

**Do NOT drop `MagicToken` yet** — remove it in a follow-up migration after old tokens expire (15-min TTL) and old auth routes are confirmed dead in prod.

---

## Phase 3 — New / Updated API Routes

### 3a. Clerk Webhook: `POST /api/webhooks/clerk` (NEW)
Creates a DB user row on every Clerk `user.created` event — the backstop so every Clerk user has a DB row.

Key logic:
- Verify with `verifyWebhook(req)` using `CLERK_WEBHOOK_SIGNING_SECRET`
- On `user.created`: `prisma.user.upsert` by `clerkId`
- **Edge case**: if a user with the same email already exists (old magic-link user), update that row's `clerkId` instead of creating a duplicate

### 3b. Session claim: `POST /api/auth/claim-session` (NEW, replaces old PATCH claim route)
Called by the client after sign-in/sign-up to migrate the anonymous session.

Key logic:
- `const { userId: clerkId } = await auth()` from `@clerk/nextjs/server`
- Look up DB user by `clerkId`
- Call `claimSession(sessionId, user.id)` from `lib/sessionMigration.ts` (unchanged)
- Return `{ ok: true }` — idempotent (`session_already_claimed` is also a success)
- **Race condition guard**: if DB user not found (webhook not yet processed), retry once after 500ms delay, then upsert user inline as fallback

### 3c. `GET /api/auth/me` (UPDATE)
Replace `mmr_uid` cookie read with Clerk's `auth()`:
- `const { userId: clerkId } = await auth()`
- Look up `prisma.user.findUnique({ where: { clerkId } })`
- Return same shape as before: `{ user: { id, email, name }, sessionUuid }`
- This keeps `SessionContext` changes minimal during migration

### 3d. `POST /api/sessions/[uuid]/sync` (UPDATE)
Replace `validateSessionOwnership` + `mmr_uid` cookie with Clerk auth:
```ts
if (session.userId) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return 403
  const dbUser = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
  if (!dbUser || dbUser.id !== session.userId) return 403
}
// Anonymous sessions (userId null) — still open, unchanged
```
Delete the import of `validateSessionOwnership` from `lib/security.ts`.

---

## Phase 4 — Delete Old Auth Files

Once Phase 3 is verified locally, delete:

| File | Reason |
|------|--------|
| `app/api/auth/magic-link/route.ts` | Replaced by Clerk |
| `app/api/auth/verify/route.ts` | Replaced by Clerk |
| `app/api/auth/logout/route.ts` | Clerk's UserButton handles sign-out |
| `app/api/sessions/[uuid]/claim/route.ts` | Replaced by `/api/auth/claim-session` |
| `lib/magicLink.ts` | Gone |
| `lib/security.ts` | `validateSessionOwnership` replaced; `normalizeAuthError` dead code |
| `components/MagicLinkForm.tsx` | Replaced by Clerk's `<SignIn>` |
| Tests for all of the above | Dead code |

**Keep:** `lib/sessionMigration.ts` (provider-agnostic, reused in new claim route)

---

## Phase 5 — Rewrite SessionContext

**File: `contexts/SessionContext.tsx`**

Key changes:
- Import `useUser` from `@clerk/nextjs`
- `isAuthChecking` → maps to `!isLoaded` from Clerk
- `isLoggedIn` → `isLoaded && isSignedIn === true`
- `userEmail` → `user?.primaryEmailAddress?.emailAddress ?? null`
- Keep `getOrCreateSessionId()`, `syncBooks()`, and all localStorage logic unchanged
- Keep the `/api/auth/me` fetch for `userId` (DB cuid) and `remoteBooks` — this is transitional and can be removed in a follow-up

**New: sign-in migration effect** (fires when `isSignedIn` becomes `true`):
```tsx
useEffect(() => {
  if (!isLoaded || !isSignedIn || !sessionId || migrationDone) return
  fetch('/api/auth/claim-session', { method: 'POST', body: JSON.stringify({ sessionId }) })
    .then(res => res.json())
    .then(data => {
      if (data.ok || data.error === 'session_already_claimed') {
        setMigrationDone(true)
        // Only clear the sessionId — books stay in localStorage as cache (no visible flash)
        // BooksContext hydration handles drift: remote wins if it has >= local books
        localStorage.removeItem('map_my_reads_session_id')
        // Fresh anonymous sessionId for this device going forward
        const newId = crypto.randomUUID()
        localStorage.setItem('map_my_reads_session_id', newId)
        setSessionId(newId)
      }
    })
}, [isLoaded, isSignedIn, sessionId, migrationDone])
```

Books are **kept in localStorage as a cache** after sign-up — no visible flash. Only the `sessionId` key is replaced. Clear books only on logout (below).

**New: sign-out detection effect** (fires when `isSignedIn` transitions from `true` → `false`):
```tsx
const prevSignedIn = useRef<boolean | undefined>(undefined)
useEffect(() => {
  if (!isLoaded) return
  if (prevSignedIn.current === true && isSignedIn === false) {
    localStorage.removeItem('map_my_reads_session_id')
    localStorage.removeItem('map_my_reads_processed_books')
    localStorage.removeItem('map_my_reads_last_processed')
    const newId = crypto.randomUUID()
    localStorage.setItem('map_my_reads_session_id', newId)
    setSessionId(newId)
    setRemoteBooks(null)
  }
  prevSignedIn.current = isSignedIn
}, [isLoaded, isSignedIn])
```

Note on localStorage clearing on sign-up: books are cleared after the server confirms migration. The map will briefly show empty until `BooksContext` re-hydrates from `remoteBooks`. This is the correct behavior — the user's books now live in their account, not in the browser.

---

## Phase 6 — UI Components

### 6a. Sign-in page (NEW): `app/sign-in/[[...sign-in]]/page.tsx`
```tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <main><SignIn /></main>
}
```

### 6b. Sign-up page (NEW): `app/sign-up/[[...sign-up]]/page.tsx`
```tsx
import { SignUp } from '@clerk/nextjs'
export default function SignUpPage() {
  return (
    <main>
      <SignUp />
      <p>We use your email to sign you in and sync your books across devices.
         By creating an account, you agree to our <a href="/privacy">Privacy Policy</a>.</p>
    </main>
  )
}
```
Style the privacy text to match the app's warm/indie design language.

### 6c. Rewrite `SavePrompt.tsx`
Replace inline `<MagicLinkForm>` with a link to `/sign-in`:
```tsx
<Link href="/sign-in">Sign in / Create account</Link>
```
All existing dismissed/sessionStorage logic is unchanged.

### 6d. Rewrite `AccountStatus.tsx`
Replace email + sign-out button with Clerk's `<UserButton>`:
```tsx
import { UserButton } from '@clerk/nextjs'
// <UserButton afterSignOutUrl="/" />
// afterSignOutUrl="/" triggers the sign-out detection useEffect in SessionContext
```
`UserButton` also provides an "Account management" menu — enable "Delete account" in Clerk dashboard for GDPR right-to-erasure compliance.

---

## Phase 7 — Clerk Dashboard (Manual Config)

1. **User fields**: Enable "First name" + "Last name" as required at sign-up (User & Authentication → Email, Phone, Username)
2. **Email verification**: Confirm OTP is enabled (default — no change needed)
3. **Webhook**: Create endpoint at `https://yourdomain.com/api/webhooks/clerk`, subscribe to `user.created`, paste signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`
4. **Paths**: Confirm sign-in/sign-up URLs match env vars
5. **Account deletion**: Enable in UserButton settings (supports GDPR right to erasure)

---

## Phase 8 — Privacy Page

**File: `app/privacy/page.tsx`** (NEW, simple server component)

Minimum content:
- Data collected: email, name, anonymous session ID, book reading history
- Legal basis: contractual necessity (authentication + sync)
- Data processors: Clerk (auth), Neon (database), Vercel (hosting)
- Retention: accounts inactive for 2+ years will be deleted
- User rights: access, rectification, erasure (via account deletion in-app), portability
- Contact email for rights requests

---

## Phase 9 — Test Updates

Delete test files for deleted libs/routes. Add:
- `app/api/webhooks/clerk/route.test.ts` — mock `verifyWebhook`, assert upsert on `user.created`; assert email deduplication for existing magic-link users
- `app/api/auth/claim-session/route.test.ts` — mock `auth()`, assert `claimSession` is called with DB userId

Vitest mock pattern:
```ts
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'clerk_test_id' }),
}))
```

---

## Verification Checklist

1. **Anonymous flow**: open incognito, upload CSV, books appear, sync fires, SavePrompt shows after 2 books
2. **Sign-up**: click link → `/sign-up` loads with privacy disclosure → enter name + email → OTP arrives → enter code → redirect to `/`
3. **Post-sign-up**: webhook fired (DB `users.clerkId` set); claim-session called; localStorage cleared; map briefly empty then hydrates from remoteBooks
4. **Cross-device**: sign in on second browser → remote books load
5. **Sign-out**: click UserButton → sign out → `/` → localStorage cleared → map shows empty state
6. **Returning user sign-in**: sign back in → DB user found by clerkId → remote books hydrate
7. **Sync ownership**: try POST `/api/sessions/[uuid]/sync` with wrong Clerk user → 403
8. **Webhook idempotency**: resend `user.created` → no duplicate DB row
9. **Old magic-link user**: sign up with same email that previously used magic link → DB row updated with clerkId, no duplicate

---

## Gotchas

- **Race: webhook vs claim-session** — the `user.created` webhook and the client's `POST /api/auth/claim-session` race. Guard: if DB user not found in claim-session, retry once after 500ms, then upsert inline.
- **Existing magic-link users** — webhook must check `prisma.user.findUnique({ where: { email } })` before creating, to update (not duplicate) existing rows.
- **UserButton triggers Clerk sign-out** → `isSignedIn` flips to `false` → `SessionContext` useEffect clears localStorage. This works only because `SessionProvider` is nested inside `ClerkProvider`.
- **`CLERK_SECRET_KEY`** must never have `NEXT_PUBLIC_` prefix.
- **`map_my_reads_processed_books`** is in `lib/storage.ts` — use `clearProcessedBooks()` or `STORAGE_KEYS` constants there rather than hardcoding the key string in `SessionContext`.

---

## Files Modified/Created/Deleted

| Action | File |
|--------|------|
| MODIFY | `app/layout.tsx` |
| MODIFY | `middleware.ts` |
| MODIFY | `prisma/schema.prisma` |
| MODIFY | `contexts/SessionContext.tsx` |
| MODIFY | `app/api/auth/me/route.ts` |
| MODIFY | `app/api/sessions/[uuid]/sync/route.ts` |
| MODIFY | `components/SavePrompt.tsx` |
| MODIFY | `components/AccountStatus.tsx` |
| CREATE | `app/sign-in/[[...sign-in]]/page.tsx` |
| CREATE | `app/sign-up/[[...sign-up]]/page.tsx` |
| CREATE | `app/privacy/page.tsx` |
| CREATE | `app/api/webhooks/clerk/route.ts` |
| CREATE | `app/api/auth/claim-session/route.ts` |
| DELETE | `app/api/auth/magic-link/route.ts` |
| DELETE | `app/api/auth/verify/route.ts` |
| DELETE | `app/api/auth/logout/route.ts` |
| DELETE | `app/api/sessions/[uuid]/claim/route.ts` |
| DELETE | `lib/magicLink.ts` |
| DELETE | `lib/security.ts` |
| DELETE | `components/MagicLinkForm.tsx` |
| DELETE (later) | `MagicToken` model from schema |
