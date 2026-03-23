# PRD: Sentry Integration — Error Monitoring & Observability

## 1. Introduction / Overview

Map My Reads currently has no visibility into errors or performance issues in production. When something breaks — a Wikidata timeout, a CSV parse failure, a database outage — it fails silently. The only observability in place is a file-based enrichment logger that writes to disk, which does not function on Vercel's read-only filesystem.

This PRD covers the full integration of Sentry into the app: error tracking, performance monitoring, session replay, and a lightweight SLO framework appropriate for a pre-launch, solo-developer project. The goal is production-grade observability before any marketing push, so issues surface in minutes rather than via user complaints.

---

## 2. Goals

- Capture all unhandled errors on the client and server with readable stack traces
- Instrument the enrichment pipeline (author countries + book covers) with custom events and timing
- Replace the broken file-based enrichment logging with Sentry events
- Alert via email on error spikes and SLO budget burn using multi-window rules
- Enable session replay to understand what users were doing when errors occurred
- Define explicit SLOs for the two critical API routes and the client-side map load, so "is this broken?" has a data-driven answer
- Keep implementation within Sentry's free tier limits

---

## 3. User Stories

**As the developer (Barbara):**
- I want to receive an email alert when there is a spike of errors in production so I can investigate before users complain
- I want to see the exact line of code where an error occurred, with the user's actions leading up to it
- I want to know how often Wikidata enrichment times out or fails so I can prioritise fixes
- I want to see cache hit/miss rates for author resolution to know if the cache is working
- I want to know when the database is unavailable, even if the app degrades gracefully
- I want a fast-burn alert that pages me within 5 minutes if something is catastrophically broken, and a slow-burn alert that catches gradual degradation before the error budget is exhausted

---

## 4. SLO Definitions & Error Budgets

### 4.1 Rationale

An SLO is a target reliability level expressed as a percentage of good interactions over a rolling window. For a pre-launch app with no revenue and a free-tier backend, targets should reflect what actually matters to users — not aspirational nines we cannot operationally support.

Each additional nine of availability costs roughly 10x in operational complexity. At this stage, the practical target is **not losing users to broken core flows**, not achieving carrier-grade uptime.

### 4.2 Service Level Indicators (SLIs)

| Signal | Definition |
|--------|-----------|
| Availability | HTTP responses with status < 500 / total HTTP responses |
| Latency | Requests completing within threshold / total requests |
| Enrichment success | Author resolution flows that return at least one country / total flows attempted |
| Map load | Client sessions where MapLibre renders successfully / total sessions |

### 4.3 SLO Targets

```yaml
# SLO definitions — Map My Reads (pre-launch, free tier)

slos:
  - id: author-enrichment-availability
    service: /api/authors/batch-resolve
    description: >
      Successful responses to valid enrichment requests.
      Partial results (timeout with some countries found) count as success.
      Pure 500s or empty responses count as failure.
    sli: count(status < 500) / count(total_requests)
    target: 95%
    window: 30d
    rationale: >
      Wikidata is a third-party API with no SLA. The 5% error budget
      accommodates Wikidata throttling, transient outages, and the
      9-second Vercel function timeout returning partial results.
      Enrichment failure degrades the app but does not break it —
      books still appear on the map, just without country colors.

  - id: author-enrichment-latency
    service: /api/authors/batch-resolve
    description: Batch resolves completing within the Vercel timeout window
    sli: count(duration < 9000ms) / count(total_requests)
    target: 90%
    window: 30d
    rationale: >
      The 9s target matches the hard Vercel Hobby limit. A 10% miss
      budget reflects that large libraries (100+ unique authors) will
      legitimately need multiple batch calls and some will hit the wall.

  - id: cover-fetch-availability
    service: /api/books/batch-covers
    description: Successful responses to cover fetch requests
    sli: count(status < 500) / count(total_requests)
    target: 97%
    window: 30d
    rationale: >
      Open Library is more stable than Wikidata. Covers are pure enhancement
      — a missing cover never blocks the user. Stricter than enrichment
      because failures here indicate a code bug more often than an API issue.

  - id: map-load-client
    service: MapLibre (client-side)
    description: User sessions where the map renders without a JavaScript error
    sli: count(sessions_without_map_error) / count(total_sessions)
    target: 99%
    window: 30d
    rationale: >
      The map is the entire product. A map load failure is a complete
      user-facing outage. 99% (1% error budget) gives room for browser
      compatibility edge cases and MapLibre tile fetch failures on slow
      connections, while treating recurring failures as urgent.
```

### 4.4 Error Budget Framing

| SLO | Target | Monthly error budget (30d window) |
|-----|--------|-----------------------------------|
| Author enrichment availability | 95% | 36 hours of complete outage, or ~2,160 failed requests at 1 req/min |
| Author enrichment latency | 90% | 72 hours of slow responses |
| Cover fetch availability | 97% | 21.6 hours of complete outage |
| Map load | 99% | 7.2 hours of map failures |

**Budget policy for a solo developer:**

- Error budget > 50% remaining: ship features freely, reliability is in good shape
- Error budget 20–50% remaining: prioritise reliability work alongside features; no new third-party integrations that increase failure surface
- Error budget < 20% remaining: reliability-only sprint; no new features until budget recovers
- Error budget exhausted: declare incident, investigate root cause, implement systemic fix before resuming feature work

This policy keeps reliability a first-class concern without requiring a full SRE team to enforce it.

---

## 5. Golden Signals Mapping

The four golden signals (latency, traffic, errors, saturation) applied to each service component:

### 5.1 `/api/authors/batch-resolve` (Wikidata enrichment)

| Signal | Measurement | Sentry mechanism | Alert threshold |
|--------|-------------|------------------|-----------------|
| Latency | Total batch duration; p50/p95 per author | Custom span on enrichment flow | p95 > 9s for 3 consecutive batches |
| Traffic | Batch calls per hour; authors per batch | `enrichment_completed` event count | Informational only |
| Errors | HTTP 5xx rate; Wikidata non-200 rate; timeout rate | `captureException` on each failure type; tagged by failure_type | See burn rate alerts below |
| Saturation | `withConcurrencyLimit` queue depth; Wikidata 429 rate | Log 429 responses as tagged events | >3 throttle events per 10 minutes |

Key instrumentation gap in current code: Wikidata 429 (rate limit) responses are silently swallowed inside `detectAuthorCountriesByName`. These must be captured and tagged separately from other errors — a 429 storm means the concurrency limiter needs tuning, while a 500 means Wikidata is degraded.

### 5.2 `/api/books/batch-covers` (Open Library covers)

| Signal | Measurement | Sentry mechanism | Alert threshold |
|--------|-------------|------------------|-----------------|
| Latency | Per-book cover fetch time; total batch time | Custom span on cover fetch flow | Informational (covers are non-blocking) |
| Traffic | Batch calls per hour; books per batch | `covers_completed` event count | Informational only |
| Errors | HTTP 5xx rate; Open Library non-200 rate; cache write failures | `captureException` on each failure; tagged by failure_type | >5 errors per 5 minutes |
| Saturation | Sequential fetch loop: time to process N books vs 9s budget | Emit `cover_timeout_partial` event when loop hits time limit | Any occurrence |

Key instrumentation gap: the current code logs `console.warn` when a batch fails but does not emit to Sentry. Cover failures are silent.

### 5.3 Prisma / PostgreSQL cache

| Signal | Measurement | Sentry mechanism | Alert threshold |
|--------|-------------|------------------|-----------------|
| Latency | Time to complete cache lookup | Tag on enrichment span | Not alerted separately |
| Traffic | Cache hit rate (hits / total) per enrichment run | Field in `enrichment_completed` event | Informational |
| Errors | Connection failure; query timeout | `captureException` tagged `db_error`; emit `db_unavailable` event | First occurrence |
| Saturation | Not applicable at this scale | — | — |

Key instrumentation gap: both API routes have `catch { /* DB unavailable — treat as cache miss */ }` blocks that eat database errors completely. These must emit a Sentry event (not necessarily an exception — a `captureMessage` at `warning` level is sufficient) so DB degradation is visible even when the app degrades gracefully.

### 5.4 Client-side (MapLibre + CSV parsing + share URL)

| Signal | Measurement | Sentry mechanism | Alert threshold |
|--------|-------------|------------------|-----------------|
| Latency | Map tile load time; CSV parse time | Browser performance API via Sentry | Informational |
| Traffic | Session count; CSV uploads per session | Sentry session tracking | Informational |
| Errors | Map load failure; CSV parse error; share URL decode error | `captureException` with full context | First occurrence of each type |
| Saturation | localStorage quota exceeded; base64 URL too large for browser | `captureException` tagged `storage_error` | First occurrence |

---

## 6. Functional Requirements

### 6.1 Setup & Configuration

1. Install `@sentry/nextjs` package
2. Create a free Sentry account at sentry.io and set up a new project of type **Next.js**
3. Configure two environments: `development` (local) and `production` (Vercel)
4. Store `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` as environment variables (locally in `.env.local`, in Vercel dashboard for production)
5. Create three Sentry config files at the project root:
   - `sentry.client.config.ts` — browser-side SDK init
   - `sentry.server.config.ts` — Node.js / API routes SDK init
   - `sentry.edge.config.ts` — Edge runtime SDK init (for Next.js middleware if used)
6. Wrap `next.config.js` with `withSentryConfig()` to enable source map upload at build time
7. Set `SENTRY_RELEASE` to the git commit SHA at build time (`SENTRY_RELEASE=$(git rev-parse HEAD)`) — this is low-effort and makes it possible to correlate errors with specific deploys

### 6.2 Error Tracking

8. All unhandled exceptions on the client must be captured automatically by the Sentry SDK
9. All unhandled exceptions in API routes (`/api/authors/batch-resolve`, `/api/books/batch-covers`) must be captured automatically
10. The following errors must be captured **explicitly** with `Sentry.captureException()`:
    - CSV parse failure in `lib/csvParser.ts` (unexpected format, missing columns) — tag with `component: csv_parser`, `detected_format`
    - Share URL decode failure in `lib/storage.ts` — tag with `component: share_url`
    - Wikidata API error or non-200 response inside `lib/countryDetection.ts` — tag with `component: wikidata`, `http_status`, `failure_type: api_error | rate_limited | timeout`
    - Open Library API error inside `lib/bookCoverService.ts` — tag with `component: open_library`, `http_status`
    - Prisma database error in all API routes — tag with `component: db`, `operation: cache_read | cache_write`; use `captureMessage` at `warning` level so DB degradation is tracked without creating a noisy error stream
    - MapLibre map load failure (client-side) — tag with `component: map`
    - localStorage quota exceeded or read failure in `lib/storage.ts` — tag with `component: storage`

### 6.3 Performance Monitoring

11. Enable performance tracing with `tracesSampleRate: 1.0` in development and `tracesSampleRate: 0.1` in production
12. Always capture traces for requests that result in errors, regardless of sample rate (configure `tracesSampler` to return `1.0` when an error is present on the transaction)
13. Add a custom performance span wrapping the full enrichment flow in `lib/authorCountryService.ts` — measure total duration, number of authors processed, batches sent, cache hits, cache misses, and authors with zero countries found
14. Add a custom performance span wrapping the full cover fetch flow in `lib/bookCoverService.ts` — measure total duration, books processed, covers found, cache hits, and whether the 9s timeout was hit

### 6.4 Replace File-Based Enrichment Logging

15. Remove the call to `POST /api/logs/enrichment` from `app/page.tsx` — this route writes to the local filesystem and does not work on Vercel
16. Replace it with a `Sentry.captureMessage()` event (level: `info`) named `enrichment_completed` with the same data fields (see analytics events section)
17. Delete `app/api/logs/enrichment/route.ts` — it is fully replaced by the Sentry event; use `console.log` locally for development visibility

### 6.5 Session Replay

18. Enable Sentry Session Replay in `sentry.client.config.ts` with:
    - `replaysSessionSampleRate: 0.1` (record 10% of all sessions, ~5 replays/month at current traffic)
    - `replaysOnErrorSampleRate: 1.0` (always record sessions where an error occurred — this is the high-value use case)
19. Book data and CSV content are not personal data — no additional masking required beyond Sentry's defaults (which mask password fields and form inputs)

### 6.6 Source Maps

20. Enable source map upload in `withSentryConfig()` so production errors show readable file names and line numbers instead of minified code
21. Source maps must be uploaded at build/deploy time only — they must not be included in the public bundle (set `hideSourceMaps: true`)

### 6.7 Alerting — Multi-Window Burn Rate

Standard single-threshold alerts (">5 errors in 5 minutes") fire too late for gradual degradation and fire too often for noisy baselines. Multi-window burn rate alerts are more reliable: they compare a short window (fast burn detection) against a long window (slow burn detection) and only alert when both show elevated consumption. This eliminates most false positives.

**Burn rate factor** = (actual error rate / error budget rate). A factor of 1 means the budget burns at exactly the rate that would exhaust it over the window. A factor of 14.4 means the budget will exhaust in ~2 hours (30d / 14.4 ≈ 2.08d... adjusted: 30d / (14.4) = 2.08 days — or in a 1-hour window, 1/720 of the monthly budget consumed).

Sentry does not natively expose burn rate factor configuration as Prometheus/Alertmanager does, but the equivalent can be approximated using Sentry's metric alert rules with percentage-of-requests conditions.

#### Alert rules to configure in the Sentry dashboard:

**Rule 1 — Fast burn: Author enrichment critical**
```
Trigger: Error rate on /api/authors/batch-resolve > 20% of requests
Short window: 5 minutes
Long window: 1 hour (must also be elevated, not just the short window)
Severity: Critical
Action: Email immediately
Rationale: Equivalent to ~14x burn rate on a 95% SLO.
           If sustained, exhausts the monthly budget in ~2 hours.
           Indicates Wikidata is down or a code regression.
```

**Rule 2 — Slow burn: Author enrichment warning**
```
Trigger: Error rate on /api/authors/batch-resolve > 5% of requests
Short window: 30 minutes
Long window: 6 hours (must also be elevated)
Severity: Warning
Action: Email (non-urgent; can wait for business hours)
Rationale: Equivalent to ~1x burn rate on a 95% SLO.
           Budget is burning at the expected maximum rate.
           Investigate before next deploy.
```

**Rule 3 — Database failure**
```
Trigger: Any event tagged component:db fires
Window: First occurrence
Severity: Warning
Action: Email
Rationale: DB errors are swallowed gracefully but must not be invisible.
           Zero tolerance for unknown DB degradation.
```

**Rule 4 — Map load failure**
```
Trigger: Any event tagged component:map fires
Window: First occurrence, then >2 occurrences per hour
Severity: Critical on first occurrence; warning on recurrence
Action: Email
Rationale: Map failure = complete product outage for that user.
           First occurrence may be a browser edge case.
           Recurrence means a real regression.
```

**Rule 5 — Enrichment hard timeout**
```
Trigger: Enrichment span duration > 9000ms (custom metric from span data)
Window: >3 occurrences in 10 minutes
Severity: Warning
Action: Email
Rationale: Hard timeouts mean users received partial results at best.
           Sustained hard timeouts indicate a Wikidata performance regression
           or an edge case in batch sizing for large libraries.
```

**Rule 6 — New issue type**
```
Trigger: Sentry detects a new error fingerprint for the first time
Severity: Info
Action: Email
Rationale: Default Sentry behavior — keep enabled. Catches regressions
           that don't yet show up in volume.
```

**Rule 7 — Wikidata rate limiting**
```
Trigger: Events tagged failure_type:rate_limited > 5 in 10 minutes
Severity: Warning
Action: Email
Rationale: A rate limit storm means the concurrency limiter (currently
           max 2 concurrent, 150ms delay) is insufficient for the load.
           Action: increase delay or reduce batch size.
```

---

## 7. Non-Goals (Out of Scope)

- Slack integration (out of scope for now; can be added via Sentry webhook later)
- Staging environment (only `development` and `production`)
- Custom Sentry dashboards or reports beyond the default issue list and metric alerts
- User identity tracking (anonymous users only — do not send user IDs to Sentry)
- Logging individual book titles or author names in Sentry events (unnecessary and adds noise)
- Uptime monitoring / external synthetic probing (Sentry's uptime monitor feature can be added in a future iteration)

---

## 8. Technical Considerations

### Package

```
npm install @sentry/nextjs
```

Then run: `npx @sentry/wizard@latest -i nextjs` — this wizard auto-generates the config files and updates `next.config.js`.

### Environment variables

```
SENTRY_DSN=           # from Sentry project settings (also set as NEXT_PUBLIC_SENTRY_DSN for client)
SENTRY_ORG=           # your Sentry org slug
SENTRY_PROJECT=       # your Sentry project slug
SENTRY_AUTH_TOKEN=    # for source map upload at build time
SENTRY_RELEASE=       # set to $(git rev-parse HEAD) in Vercel build settings
```

### Config skeleton (`sentry.client.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
})
```

### Config skeleton (`sentry.server.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
```

### Custom span pattern for enrichment

```typescript
// In lib/authorCountryService.ts — wrap the existing resolveAuthorCountriesBackend
import * as Sentry from '@sentry/nextjs'

return await Sentry.startSpan(
  { name: 'enrichment.author_countries', op: 'enrichment' },
  async (span) => {
    // ... existing logic ...
    span.setAttributes({
      'enrichment.total_authors': totalAuthors,
      'enrichment.cache_hits': totalCacheHits,
      'enrichment.cache_misses': totalCacheMisses,
      'enrichment.duration_ms': Date.now() - startTime,
    })
    return result
  }
)
```

### Free tier limits (as of 2025)

| Resource | Free allowance | Expected usage (pre-launch) |
|----------|----------------|-----------------------------|
| Errors | 5,000 / month | Low — errors should be rare; ~50–200 expected |
| Performance transactions | 10,000 / month | At 10% sample rate, supports ~100k API calls/month |
| Session replays | 50 / month | At 10% session rate + 100% error rate, ~20–50 expected |
| Alerts | Unlimited | — |

Free tier is sufficient for pre-launch. The main constraint is performance transactions — if traffic grows, reduce `tracesSampleRate` to 0.05 before upgrading.

---

## 9. Success Metrics

- Zero silent failures on the critical enrichment path — every Wikidata timeout or DB error appears in Sentry within 60 seconds
- Stack traces in production are readable (file name + line number visible), not minified
- Developer receives an email within 5 minutes of a fast-burn alert trigger (20%+ error rate on batch-resolve)
- Slow-burn degradation (>5% error rate sustained over 6 hours) triggers a warning email before the error budget reaches 50% consumed
- Enrichment duration, cache hit rate, and coverage percentage are visible in Sentry for every production upload event
- Session replay is available for sessions where an error occurred (100% capture rate on error sessions, limited to 50/month on free tier)
- DB degradation events are visible in Sentry even when the app is serving requests successfully (graceful degradation is not the same as invisible degradation)
- Error budget consumption is manually reviewable from Sentry's "Metrics" tab using the tagged error counts

---

## 10. Analytics Events

These are custom events that replace the broken file-based enrichment log and add visibility into key user flows.

### `enrichment_completed`

Fired after author country enrichment finishes (replaces the file log). Emitted as `Sentry.captureMessage('enrichment_completed', 'info')`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `"goodreads" \| "storygraph"` | CSV source format |
| `total_books` | `number` | Total books in the upload |
| `read_books` | `number` | Books with "read" status |
| `books_with_countries` | `number` | Books successfully resolved to a country |
| `unique_authors` | `number` | Distinct authors processed |
| `cache_hits` | `number` | Authors resolved from Prisma cache |
| `cache_misses` | `number` | Authors that required Wikidata lookup |
| `duration_sec` | `number` | Total enrichment duration in seconds |
| `coverage_pct` | `number` | `books_with_countries / read_books * 100` |
| `timeout_hit` | `boolean` | Whether the 9s Vercel timeout was reached |
| `zero_countries_warning` | `boolean` | Whether enrichment completed with 0 countries found (Wikidata may be down) |

### `covers_completed`

Fired after book cover fetching finishes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `total_books` | `number` | Books submitted for cover lookup |
| `covers_found` | `number` | Covers successfully fetched |
| `cache_hits` | `number` | Covers resolved from Prisma cache |
| `duration_sec` | `number` | Total cover fetch duration |
| `timeout_hit` | `boolean` | Whether the 9s timeout was reached before all covers were fetched |

### `csv_parse_error`

Fired when CSV parsing fails.

| Parameter | Type | Description |
|-----------|------|-------------|
| `detected_format` | `"goodreads" \| "storygraph" \| "unknown"` | Format detected before failure |
| `error_message` | `string` | The parse error description |
| `row_count` | `number` | Number of rows parsed before failure |

### `share_url_decode_error`

Fired when a shared map URL cannot be decoded.

| Parameter | Type | Description |
|-----------|------|-------------|
| `error_message` | `string` | Decode error description |

### `db_unavailable`

Fired (as `captureMessage` at `warning` level) when a Prisma operation fails and the app falls back gracefully.

| Parameter | Type | Description |
|-----------|------|-------------|
| `operation` | `"cache_read" \| "cache_write"` | What the app was trying to do |
| `route` | `"/api/authors/batch-resolve" \| "/api/books/batch-covers"` | Which API route was affected |
| `error_message` | `string` | Prisma error message (no PII) |

### `wikidata_rate_limited`

Fired when a Wikidata request returns 429.

| Parameter | Type | Description |
|-----------|------|-------------|
| `author_batch_size` | `number` | How many authors were in the batch when throttling occurred |
| `concurrent_limit` | `number` | The `maxConcurrent` value in effect (currently 2) |
| `delay_ms` | `number` | The delay between requests in effect (currently 150ms) |

---

## 11. Observability Gaps Not Addressed by This PRD

These gaps exist in the current system and are not fixed by Sentry alone. They are documented here so they are not forgotten.

1. **No end-to-end latency measurement from the user's perspective.** Sentry traces the server-side API routes individually, but there is no single measurement of "time from CSV upload to map fully colored." This would require a client-side span that wraps the full enrichment + cover flow and submits it as a transaction.

2. **No cache effectiveness trending.** The `cache_hits` / `cache_misses` in each `enrichment_completed` event are per-session. There is no aggregated view of cache hit rate over time across all users. This is acceptable for pre-launch but should be revisited once traffic grows — a declining cache hit rate indicates poisoned entries or high churn in the author set.

3. **No cover fetch success rate per ISBN vs title+author fallback.** The current cover fetch tries ISBN first and falls back to title+author search. Tracking which path succeeded would reveal whether the ISBN field in Goodreads/StoryGraph exports is reliable enough to skip the fallback for most books.

4. **No alerting on sustained zero-coverage enrichment.** If `coverage_pct` is 0% for three consecutive enrichment runs, Wikidata is likely completely down. This should be a separate alert rule but requires Sentry Metrics (paid feature) or a manual check of `enrichment_completed` events. For now, the `zero_countries_warning: true` field in the event provides manual visibility.

5. **Vercel function cold starts are not instrumented.** Cold starts can add 500ms–2s to the first request in a session. At current traffic levels this is acceptable. At scale it becomes a meaningful fraction of the 9-second budget.

---

## 12. Open Questions

- **Release tracking**: Set `SENTRY_RELEASE` to the git commit SHA in Vercel build settings? Recommended yes — low effort, high value for correlating errors with deploys. Add `NEXT_PUBLIC_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA` to Vercel environment variables (Vercel provides this automatically during builds).

- **Enrichment log route**: Delete `app/api/logs/enrichment/route.ts` immediately after Sentry `captureMessage` is wired up, or keep it temporarily for local dev? Recommendation: delete it. Use `console.log` locally and Sentry in production. The route is already broken on Vercel and keeping it creates a false sense of logging.

- **SLO window length**: 30-day rolling window is standard but hard to review manually in Sentry's free tier. Consider using a 7-day window for the pre-launch period — faster feedback loop, easier to reason about at low traffic volumes. Switch to 30-day once traffic is consistent.

- **Wikidata as external dependency**: Should Wikidata downtime consume the error budget? Currently yes, because the SLI is defined at the API route level. An alternative is to define the SLI as "requests that failed due to causes within our control" and exclude Wikidata 5xx/429 responses from the error count. This is more accurate but more complex to implement in Sentry's alert conditions. For now, include Wikidata failures — they still represent a poor user experience even if the root cause is external.
