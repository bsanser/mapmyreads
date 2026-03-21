import { Book } from '../types/book'
import { splitAuthorNames, normalizeAuthorName } from './authorUtils'

const BATCH_SIZE = 8

export type AuthorCountrySummary = {
  totalBooks: number
  readBooks: number
  readBooksWithAuthors: number
  readBooksWithResolvedAuthors: number
  uniqueAuthors: number
  uniqueAuthorsWithCountries: number
  uniqueCountriesWithReadAuthors: number
  apiLookups: number
  authorsWithMoreThanOneCountry: number
  cacheHits: number
  cacheMisses: number
}

/**
 * Apply a partial author→countries map to a books array, returning updated books.
 * Only mutates authorCountries for books whose authors appear in the map.
 */
export function applyAuthorCountriesToBooks(
  books: Book[],
  authorCountryMap: Record<string, string[]>
): Book[] {
  return books.map(book => {
    const authorNames = splitAuthorNames(book.authors)
    const authorCountriesSet = new Set<string>(book.authorCountries || [])

    let changed = false
    for (const authorName of authorNames) {
      const countries = authorCountryMap[authorName]
      if (countries) {
        for (const code of countries) {
          if (!authorCountriesSet.has(code)) {
            authorCountriesSet.add(code)
            changed = true
          }
        }
      }
    }

    if (!changed) return book

    return {
      ...book,
      bookCountries: [],
      authorCountries: Array.from(authorCountriesSet)
    }
  })
}

export const resolveAuthorCountriesBackend = async (
  books: Book[],
  onProgress?: (current: number, total: number) => void,
  onBatchComplete?: (batchResults: Record<string, string[]>) => void
): Promise<{ booksWithCountries: Book[]; summary: AuthorCountrySummary }> => {
  const readBooks = books.filter(book => book.readStatus === 'read')
  const readBooksWithAuthors = readBooks.filter(
    book => Boolean(book.authors && book.authors.trim().length > 0)
  )

  // Collect all unique authors
  const authorLookupTargets = new Map<string, string>()
  for (const book of readBooksWithAuthors) {
    const authorNames = splitAuthorNames(book.authors)
    for (const authorName of authorNames) {
      const key = normalizeAuthorName(authorName)
      if (key.length === 0 || authorLookupTargets.has(key)) continue
      authorLookupTargets.set(key, authorName)
    }
  }

  const uniqueAuthors = Array.from(authorLookupTargets.values())
  const totalAuthors = uniqueAuthors.length

  console.log(`🚀 Resolving ${totalAuthors} authors in batches of ${BATCH_SIZE}...`)

  if (onProgress) {
    onProgress(0, totalAuthors)
  }

  // Split into batches
  const batches: string[][] = []
  for (let i = 0; i < uniqueAuthors.length; i += BATCH_SIZE) {
    batches.push(uniqueAuthors.slice(i, i + BATCH_SIZE))
  }

  // Accumulate all author→countries results across batches
  const fullAuthorCountryMap: Record<string, string[]> = {}
  let totalApiLookups = 0
  let totalCacheHits = 0
  let totalCacheMisses = 0
  let resolvedCount = 0
  let currentBooks = books

  // Process batches sequentially so the map updates incrementally
  for (const batch of batches) {
    try {
      const response = await fetch('/api/authors/batch-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authors: batch })
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()
      const batchResults = data.results as Record<string, string[]>

      // Merge batch results into full map
      Object.assign(fullAuthorCountryMap, batchResults)
      totalApiLookups += data.stats.cacheMisses
      totalCacheHits += data.stats.cacheHits
      totalCacheMisses += data.stats.cacheMisses

      resolvedCount += batch.length
      console.log(`📊 Batch done: ${resolvedCount}/${totalAuthors} authors resolved`)

      if (onProgress) {
        onProgress(resolvedCount, totalAuthors)
      }

      // Apply this batch's results to internal tracking and notify caller with delta
      currentBooks = applyAuthorCountriesToBooks(currentBooks, batchResults)
      if (onBatchComplete) {
        onBatchComplete(batchResults)
      }
    } catch (error) {
      console.error(`❌ Batch failed for authors: ${batch.join(', ')}`, error)
      // Fill failed authors with empty results
      for (const author of batch) {
        fullAuthorCountryMap[author] = []
      }
      resolvedCount += batch.length
      if (onProgress) {
        onProgress(resolvedCount, totalAuthors)
      }
    }
  }

  // Compute summary stats
  let readBooksWithResolvedAuthors = 0
  const resolvedCountriesForReadAuthors = new Set<string>()

  for (const book of currentBooks) {
    if (book.readStatus === 'read' && book.authorCountries.length > 0) {
      readBooksWithResolvedAuthors += 1
      book.authorCountries.forEach(c => resolvedCountriesForReadAuthors.add(c))
    }
  }

  const summary: AuthorCountrySummary = {
    totalBooks: books.length,
    readBooks: readBooks.length,
    readBooksWithAuthors: readBooksWithAuthors.length,
    readBooksWithResolvedAuthors,
    uniqueAuthors: authorLookupTargets.size,
    uniqueAuthorsWithCountries: Object.values(fullAuthorCountryMap).filter(
      countries => countries.length > 0
    ).length,
    uniqueCountriesWithReadAuthors: resolvedCountriesForReadAuthors.size,
    apiLookups: totalApiLookups,
    authorsWithMoreThanOneCountry: Object.values(fullAuthorCountryMap).filter(
      countries => new Set(countries.filter(Boolean)).size > 1
    ).length,
    cacheHits: totalCacheHits,
    cacheMisses: totalCacheMisses
  }

  if (onProgress) {
    onProgress(totalAuthors, totalAuthors)
  }

  if (summary.uniqueAuthors > 0 && summary.uniqueAuthorsWithCountries === 0) {
    console.warn('⚠️ Author resolution complete but zero countries found — Wikidata API may be unavailable')
  }

  return {
    booksWithCountries: currentBooks,
    summary
  }
}
