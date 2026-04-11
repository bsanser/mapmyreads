# Clerk Authentication Migration PRD

## 1. Introduction/Overview

**Problem**: Map My Reads' magic-link authentication requires users to leave the app to click email links, creating friction in the signup/signin flow. The custom auth system also adds ~400 lines of maintenance burden.

**Solution**: Replace magic-link auth with Clerk, a managed identity platform that provides in-app email OTP verification, automatic email validation, name + email collection, and built-in GDPR-compliant account deletion.

**Goal**: Simplify user onboarding, reduce friction, collect better user contact info, and eliminate custom auth code—all while maintaining the app's existing session-based book sync architecture.

---

## 2. Goals

1. **Reduce signup friction** — Replace email link verification (~30 seconds, multi-step) with in-app OTP (faster, single-step)
2. **Improve user contact** — Collect name + email at signup to enable future messaging and communication
3. **Simplify codebase** — Remove ~400 lines of custom magic-link auth; reuse Clerk's battle-tested implementation
4. **Enable account management** — Support GDPR right-to-erasure via Clerk's account deletion flow
5. **Maintain book sync** — Keep existing localStorage cache + DB sync; link anonymous sessions to user accounts
6. **Migrate existing users** — Preserve books and enable existing magic-link users to sign up via Clerk without duplication

---

## 3. User Stories

1. **As a new user**, I want to sign up with name + email and verify via OTP (not email link) so I can get started faster and stay in the app.

2. **As a returning user**, I want to sign in with email + OTP and immediately see my books from the cloud so I can access my reading history from any device.

3. **As a returning user with an old magic-link account**, I want to sign up with the same email via Clerk and automatically see my old books without duplication so I don't lose my data.

4. **As a privacy-conscious user**, I want to delete my account with one click and have all my data permanently removed (email, name, books) so I can exercise my right to erasure.

5. **As a user**, I want to see a familiar account menu (like Twitter/GitHub) with account settings, profile picture, and sign-out so account management feels standard and trustworthy.

6. **As a multi-device user**, I want to sign in on my phone and desktop and see synced books on both without manual upload so I can read across devices.

---

## 4. Functional Requirements

1. **Sign-up flow**: User enters name + email → receives OTP → enters OTP → automatically logged in → redirect to `/` → privacy disclosure visible
2. **Sign-in flow**: User enters email → receives OTP → enters OTP → automatically logged in → redirect to `/` → remote books hydrate from DB
3. **Webhook integration**: Clerk webhook (`user.created`, `user.deleted`) creates/deletes DB users atomically; handles dedup for existing magic-link users by email
4. **Session migration**: On sign-in, anonymous `sessionId` is migrated to user account via `POST /api/auth/claim-session`; new anonymous `sessionId` is generated for future sessions
5. **Book persistence**: Books remain in localStorage during signup (no flash); BooksContext hydrates remote books when count ≥ local
6. **Logout flow**: On `isSignedIn → false`, localStorage is cleared (sessionId + books); map shows empty; new anonymous session created
7. **Account deletion**: User clicks "Delete account" in Clerk's `<UserButton>` → Clerk deletes user → webhook fires → DB user + all books deleted → user signed out
8. **Privacy page** (`/app/privacy`): Disclose data collection, legal basis, processors, retention, user rights (access, rectification, erasure, portability)
9. **UI components**: New `/sign-in` and `/sign-up` pages with Clerk forms; update `AccountStatus.tsx` to use `<UserButton>`; update `SavePrompt.tsx` to link to `/sign-in`
10. **Email normalization**: All email addresses normalized to lowercase in DB and all lookups to prevent duplication
11. **Ownership checks**: Sync route rejects requests from users who don't own the session; anonymous sessions remain open (protected by UUID)
12. **Error observability**: All webhook/sync failures logged to Sentry with tags; always return 200 to Clerk (never fail webhook)

---

## 5. Non-Goals (Out of Scope)

- Multi-provider auth (Google, GitHub sign-in) — added in future phase
- Account recovery via password reset — Clerk's OTP is sufficient for now
- Email change post-signup — enable in Clerk dashboard later
- Account transfer / data portability API — document in privacy policy, implement later
- Removing old MagicToken schema — deprecate 30 days, remove after tokens expire
- Custom profile pictures / avatar selection — Clerk handles avatars natively
- Two-factor authentication — possible with Clerk TOTP, not in this phase

---

## 6. Design Considerations

### UI / UX Requirements
- **Sign-in/Sign-up pages**: Use Clerk's default forms; style to match app's warm, indie design language (serif display font, warm tinted neutrals, no pure black)
- **Privacy page**: Simple, readable layout; link in signup disclosure below form
- **AccountStatus component**: Replace inline email + sign-out button with Clerk's `<UserButton>` (avatar menu, familiar to users)
- **SavePrompt**: Link to `/sign-in` instead of inline magic-link form
- **Map on logout**: Shows "No books" state (expected behavior); optional future: "Signed out" banner with "Sign back in" button

### Interactions
- **Sign-up → Redirect → Hydration**: After signup, redirect to `/`, books briefly show from localStorage (no flash), then remote books hydrate if count ≥ local
- **Sign-out**: Clear books from localStorage immediately; map shows empty; user can re-sign in to restore books
- **Account deletion**: Smooth confirmation flow via Clerk's UserButton; permanent and irreversible

---

## 7. Technical Considerations

### Architecture & Dependencies
- **Clerk SDK**: `@clerk/nextjs` for Next.js 14 App Router
- **Webhook verification**: `svix` SDK (official Clerk signing library)
- **Database**: Add `clerkId String? @unique` to User model; retain MagicToken model for 30 days (rollback safety)
- **Session model**: Unchanged; anonymous sessions persist on both magic-link and Clerk; only claimed sessions linked to users
- **Middleware**: `clerkMiddleware()` wraps existing CORS logic; public routes: `/`, `/map/(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/privacy`, `/api/webhooks/(.*)`

### API Routes
| Route | Change | Logic |
|-------|--------|-------|
| `POST /api/webhooks/clerk` | NEW | Verify webhook signature → upsert user by email (atomic) → log to Sentry |
| `POST /api/auth/claim-session` | NEW | Verify Clerk auth → find DB user → exponential backoff (1s, 2s, 4s) → call claimSession() |
| `GET /api/auth/me` | UPDATE | Replace cookie → Clerk auth() → return same shape `{ user, sessionUuid }` |
| `POST /api/sessions/[uuid]/sync` | UPDATE | Replace cookie check → Clerk auth() → verify userId matches session |

### Critical Implementation Details
- **Race condition guard**: Webhook and claim-session can race; claim-session retries exponentially (1s, 2s, 4s) before inline upsert fallback
- **Email dedup**: `prisma.user.upsert({ where: { email }, update: { clerkId }, create: { clerkId, email, name } })` — atomic to prevent concurrent webhook duplicates
- **isMigrating flag**: SessionContext blocks BooksContext syncs during claim-session window (100ms) to prevent syncing to old sessionId
- **Hydration logic**: Change `remoteBooks.length > prev.length` to `>=` so remote is preferred on sign-up (counts are equal)
- **isAuthChecking**: Coordinate Clerk's `isLoaded` + `/api/auth/me` completion; only false when both ready (prevents flash)
- **Storage constants**: Use `STORAGE_KEYS` from `lib/storage.ts` instead of hardcoded keys

---

## 8. Acceptance Criteria & Testability

### Criterion 1: Sign-up completes with books intact
**Given** a user uploads 5 books anonymously,
**When** they click "Sign up" and complete OTP verification,
**Then** they are logged in, redirected to `/`, books are visible (no flash), and books are synced to their DB user account within 3 seconds.
**Test**: Mock Clerk auth → verify `claim-session` called → verify `POST /api/sessions/[uuid]/sync` fires → assert books in DB

### Criterion 2: Webhook deduplicates existing users
**Given** a user with email `test@example.com` previously signed up via magic-link and has 3 books in DB,
**When** they sign up via Clerk with the same email,
**Then** the webhook updates their clerkId, does NOT create a duplicate user, and books remain intact.
**Test**: Create existing user → fire `user.created` webhook → verify `prisma.user` count = 1 (not 2) → verify books still exist

### Criterion 3: Logout clears localStorage
**Given** a logged-in user with books visible,
**When** they click "Sign out" via `<UserButton>`,
**Then** localStorage is cleared (`sessionId` gone, `processed_books` gone), map shows empty state, and a new anonymous session is created.
**Test**: Sign in → verify localStorage keys exist → trigger logout → verify localStorage keys deleted → verify map empty

### Criterion 4: Sync ownership is enforced
**Given** User A owns a session with books,
**When** User B (different Clerk user) attempts `POST /api/sessions/{uuidA}/sync` with their Clerk token,
**Then** the request returns 403 Forbidden.
**Test**: Get sessionUuid from User A's localStorage → sign in as User A → sync succeeds → sign in as User B → sync fails with 403

### Criterion 5: Account deletion removes all data
**Given** a user with 10 books and an account,
**When** they click "Delete account" and confirm,
**Then** Clerk fires `user.deleted` webhook → app deletes DB user and all books → user is signed out.
**Test**: Create user + books → trigger `user.deleted` webhook → verify `prisma.user.findUnique` returns null → verify books deleted

### Criterion 6: Cross-device sync works
**Given** User A signs in on Browser A with 5 books,
**When** User A signs in on Browser B,
**Then** Browser B loads the same 5 books from the DB within 2 seconds.
**Test**: Sign in on device A → upload books → sign in on device B → verify books load from `/api/sessions/{uuid}/books`

---

## 9. Success Metrics

- **Signup completion rate** ≥ 85% (measure: starts → completions over 1 week)
- **Signin error rate** < 1% (measure: successful logins / total signin attempts)
- **Webhook reliability** ≥ 99.9% (measure: successful webhooks / total fired)
- **Cross-device sync latency** < 2 seconds (measure: sign-in on device B → books visible)
- **No data loss** — 100% of books preserved after migration (measure: before count = after count)
- **Account deletion** — all user data removed (measure: `prisma.user.findUnique` + `prisma.book.findMany` return empty)
- **End-to-end signup** < 3 seconds (measure: click signup → synced to DB)
- **Zero critical bugs** in production for 1 week post-launch

---

## 10. New Analytics Events

1. **`auth.signup_start`** — User clicks "Create account"
   - Parameters: `source` (string: "SavePrompt", "AccountStatus"), `timestamp` (ISO 8601)

2. **`auth.signup_complete`** — User completes signup and is redirected to `/`
   - Parameters: `time_to_complete_seconds` (number), `device` (string: "web"), `timestamp` (ISO 8601)

3. **`auth.signin_complete`** — User completes signin
   - Parameters: `time_to_complete_seconds` (number), `cross_device_sync_ms` (number), `device` (string: "web"), `timestamp` (ISO 8601)

4. **`auth.logout`** — User clicks sign out
   - Parameters: `session_duration_seconds` (number), `books_count` (number), `timestamp` (ISO 8601)

5. **`auth.account_delete_start`** — User clicks "Delete account"
   - Parameters: `books_count` (number), `account_age_days` (number), `timestamp` (ISO 8601)

6. **`auth.account_delete_complete`** — Webhook confirms deletion
   - Parameters: `data_deleted_bytes` (number), `timestamp` (ISO 8601)

7. **`webhook.clerk_user_created`** — Webhook user.created fired
   - Parameters: `email` (string), `is_new_user` (boolean), `is_dedup` (boolean), `timestamp` (ISO 8601)

8. **`webhook.clerk_user_deleted`** — Webhook user.deleted fired
   - Parameters: `email` (string), `books_deleted` (number), `timestamp` (ISO 8601)

---

## 11. Open Questions

1. **Email from address**: Should OTP emails come from Clerk's default domain or a custom domain? (impacts user perception)
2. **Account recovery**: If a user forgets their email, is re-signup with a new email acceptable or should we support email lookup? (post-launch decision)
3. **Inactive account deletion**: The privacy policy mentions "2+ years inactive"; should we implement auto-deletion or manual? (backend decision, not blocking launch)
4. **Profile picture**: Should users be able to upload custom avatars or use Clerk's defaults? (out of scope for v1)
5. **Webhook retry strategy**: Clerk retries failed webhooks; should we also implement idempotency checks in our webhook handler? (currently: always return 200, rely on Clerk)
6. **Rollback timeline**: After how many days should we remove old magic-link routes from codebase? (recommend: 30 days post-launch)

---

## Appendix: Implementation Plan Reference

Full technical implementation details (phases, file changes, testing checklist, deployment strategy, rollback plan, monitoring) are in `/Users/barbara/Projects/map_my_reads/_plans/clerk_auth_migration.md`.

Specialist agent reviews (security, backend architecture, frontend UX) are in `/Users/barbara/Projects/map_my_reads/_plans/SPECIALIST_REVIEWS_SUMMARY.md`.

Key dependencies:
- Clerk docs: https://clerk.com/docs
- Vercel integration: https://vercel.com/integrations/clerk
- Next.js middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Prisma migrations: https://www.prisma.io/docs/orm/prisma-migrate/getting-started
