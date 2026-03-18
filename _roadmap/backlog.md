# Map My Reads — Roadmap

## Prioritisation rationale
UI and hosting come first because nothing else matters until real users can access a good-looking product. Analytics goes in early so data collection starts from day one. User-facing features (feedback, editing, adding books) follow once there's an audience to learn from.

---

## Priority 1 — UI / Style Refresh
**Why first:** First impressions determine whether anyone stays. Shipping a rough UI publicly would undermine trust before the product has a chance. Do this before going live.

---

## Priority 2 — Hosting
**Why second:** Everything downstream (analytics, feedback, real usage) requires the app to be publicly accessible.

---

## Priority 3 — Analytics (PostHog)
**Why third:** Set up immediately after going live so data is captured from the first real user. Replaces the idea of a manual upload log — PostHog gives richer, queryable event data without building infrastructure.

---

## Priority 4 — Submit Feedback
**Why fourth:** Once there are real users, feedback is the fastest way to learn what to fix next. Low implementation cost, high signal value.

---

## Priority 5 — Edit Book Details
**Why fifth:** The enrichment pipeline will inevitably get some author countries and covers wrong. Letting users correct mistakes builds trust and improves the experience without requiring a full manual-entry feature.

---

## Priority 6 — Add Books Manually
**Why sixth:** Useful for books outside Goodreads/StoryGraph, but not critical until core flows are polished. Shares a book-form component with #5, so build together.
