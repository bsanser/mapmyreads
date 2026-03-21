/**
 * Lightweight enrichment pipeline metrics.
 * Tracks key timings during CSV upload → enrich flow and logs a summary table.
 */

interface PipelineMetrics {
  uploadStart: number | null
  mapShown: number | null
  firstCountryBatch: number | null
  authorsComplete: number | null
  firstCoverBatch: number | null
  coversComplete: number | null
  totalAuthors: number
  totalCovers: number
  apiLookups: number
}

let metrics: PipelineMetrics = createEmpty()

function createEmpty(): PipelineMetrics {
  return {
    uploadStart: null,
    mapShown: null,
    firstCountryBatch: null,
    authorsComplete: null,
    firstCoverBatch: null,
    coversComplete: null,
    totalAuthors: 0,
    totalCovers: 0,
    apiLookups: 0,
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function elapsed(from: number | null): string {
  if (from === null || metrics.uploadStart === null) return '—'
  return `${((from - metrics.uploadStart) / 1000).toFixed(2)}s`
}

export const enrichmentMetrics = {
  /** Call when the user selects a CSV file */
  startUpload() {
    metrics = createEmpty()
    metrics.uploadStart = now()
  },

  /** Call when the map first renders (before enrichment) */
  mapShown() {
    metrics.mapShown = now()
  },

  /** Call after the first author batch returns */
  firstCountryBatch() {
    if (!metrics.firstCountryBatch) {
      metrics.firstCountryBatch = now()
    }
  },

  /** Call when all author resolution is done */
  authorsComplete(totalAuthors: number, apiLookups: number) {
    metrics.authorsComplete = now()
    metrics.totalAuthors = totalAuthors
    metrics.apiLookups = apiLookups
  },

  /** Call after the first cover batch returns */
  firstCoverBatch() {
    if (!metrics.firstCoverBatch) {
      metrics.firstCoverBatch = now()
    }
  },

  /** Call when all covers are loaded */
  coversComplete(totalCovers: number) {
    metrics.coversComplete = now()
    metrics.totalCovers = totalCovers
  },

  /** Get author enrichment duration in seconds */
  getAuthorsDuration(): string {
    if (metrics.uploadStart === null || metrics.authorsComplete === null) return '0.00'
    const ms = metrics.authorsComplete - metrics.uploadStart
    return (ms / 1000).toFixed(2)
  },

  /** Log a summary table to the console, with budget warnings */
  logSummary() {
    const rows = [
      ['Map visible', elapsed(metrics.mapShown)],
      ['First country on map', elapsed(metrics.firstCountryBatch)],
      ['All authors resolved', elapsed(metrics.authorsComplete)],
      ['First cover loaded', elapsed(metrics.firstCoverBatch)],
      ['All covers loaded', elapsed(metrics.coversComplete)],
    ]

    console.log('\n📊 Enrichment Pipeline Metrics')
    console.table(
      Object.fromEntries(rows.map(([label, time]) => [label, { time }]))
    )
    console.log(
      `   Authors: ${metrics.totalAuthors} (${metrics.apiLookups} API lookups) | Covers: ${metrics.totalCovers}`
    )

    // Performance budget warnings
    if (metrics.uploadStart !== null && metrics.mapShown !== null) {
      const mapDelay = (metrics.mapShown - metrics.uploadStart) / 1000
      if (mapDelay > 3) {
        console.warn(`⚠️ Slow map render: ${mapDelay.toFixed(2)}s (budget: 3s)`)
      }
    }
    if (metrics.uploadStart !== null && metrics.authorsComplete !== null) {
      const authorDelay = (metrics.authorsComplete - metrics.uploadStart) / 1000
      if (authorDelay > 30) {
        console.warn(`⚠️ Slow author resolution: ${authorDelay.toFixed(2)}s (budget: 30s)`)
      }
    }
    if (metrics.firstCountryBatch === null && metrics.totalAuthors > 0) {
      console.warn('⚠️ No country data resolved — author API may be failing')
    }
  },
}
