# Tasks: Allow Entry Without CSV

**PRD**: `_plans/prd_entry_without_csv.md`
**Branch**: `allow-entry-without-csv`

> **Model key**
> - 🔴 **Opus** — complex multi-file architecture, security design, deep reasoning
> - 🟡 **Sonnet** — standard feature implementation, component work, writing tests
> - 🟢 **Haiku** — mechanical, well-defined changes with clear inputs/outputs

---

## Relevant Files

- `contexts/SessionContext.tsx` — Add `isAuthChecking` boolean to fix returning-user flash
- `contexts/SessionContext.test.tsx` — Unit tests for `isAuthChecking` behaviour *(new)*
- `app/page.tsx` — Replace `books.length === 0` gate with `hasEnteredApp` + `isAuthChecking` logic
- `components/HeroScreen.tsx` — Add "Sign in" + "I'm just looking 👀" secondary CTAs
- `components/MagicLinkForm.tsx` — Extracted email form component *(new)*
- `components/MagicLinkForm.test.tsx` — Unit tests for MagicLinkForm *(new)*
- `components/SavePrompt.tsx` — Refactored to use `MagicLinkForm` internally
- `components/AddBookModal.tsx` — Add optional `onBulkUpload` prop + bulk upload secondary option
- `components/DesktopSidebar.tsx` — Add empty state panel when 0 read books
- `components/MobileBottomSheet.tsx` — Add empty state + CTA above fold
- `components/ReadingAtlasSummary.tsx` — Hide when 0 read books
- `app/globals.css` — Any new classes for empty state panels
- `middleware.ts` — New file: CORS policy + per-IP rate limiting on magic-link *(new)*
- `lib/magicLink.ts` — Add per-email token rate limit check
- `lib/magicLink.test.ts` — TDD tests for rate limiting logic
- `app/api/sessions/[uuid]/sync/route.ts` — Add `userId` vs `mmr_uid` ownership check
- `app/api/sessions/[uuid]/sync/route.test.ts` — TDD tests for ownership check *(new)*
- `app/api/auth/verify/route.ts` — Collapse `auth_error` redirect values
- `app/api/auth/verify/route.test.ts` — TDD tests for normalised redirect values *(new)*
- `tasks/manual-qa-entry-without-csv.md` — Manual QA checklist *(new)*

### Notes

- Run all tests: `npm run test`
- Run a single file: `npx vitest run tests/<file>.test.ts`
- Existing tests live in `tests/` (utility functions). New test files for API routes and contexts should live alongside the source file they test.
- `middleware.ts` must live at the project root (Next.js convention).
- Do **not** persist `hasEnteredApp` to localStorage — it is session-scoped UI state only.

---

## Tasks

- [ ] 1.0 Add `isAuthChecking` to SessionContext 🟡 **Sonnet**
- [ ] 2.0 Update gate logic and HeroScreen CTAs 🟡 **Sonnet**
- [ ] 3.0 Add bulk upload entry point inside AddBookModal 🟢 **Haiku**
- [ ] 4.0 Build empty map state UI 🟡 **Sonnet**
- [ ] 5.0 Ship must-have security controls 🔴 **Opus**
- [ ] 6.0 TDD test suite + manual QA checklist 🟡 **Sonnet**
