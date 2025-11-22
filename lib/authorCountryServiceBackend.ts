import { Book } from '../types/book'
import { splitAuthorNames, normalizeAuthorName } from './authorUtils'

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
}

export const resolveAuthorCountriesBackend = async (
  books: Book[],
  onProgress?: (current: number, total: number) => void
): Promise<{ booksWithCountries: Book[]; summary: AuthorCountrySummary }> => {
  const processedBooks: Book[] = []
  let readBooksWithResolvedAuthors = 0
  const resolvedCountriesForReadAuthors = new Set<string>()

  const readBooks = books.filter(book => book.readStatus === 'read')
  const readBooksWithAuthors = readBooks.filter(
    book => Boolean(book.authors && book.authors.trim().length > 0)
  )

  // Collect all unique authors
  const authorLookupTargets = new Map<string, string>()
  for (const book of readBooksWithAuthors) {
    const authorNames = splitAuthorNames(book.authors)
    authorNames.forEach(authorName => {
      const key = normalizeAuthorName(authorName)
      if (key.length === 0 || authorLookupTargets.has(key)) return
      authorLookupTargets.set(key, authorName)
    })
  }

  const uniqueAuthors = Array.from(authorLookupTargets.values())
  
  console.log(`🚀 Calling backend API for ${uniqueAuthors.length} authors...`)
  
  // Call backend API for batch resolution
  try {
    const response = await fetch('/api/authors/batch-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authors: uniqueAuthors })
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const authorCountryMap = data.results as Record<string, string[]>
    
    console.log(`✅ Backend returned results for ${Object.keys(authorCountryMap).length} authors`)
    console.log(`📊 Cache stats: ${data.stats.cacheHits} hits, ${data.stats.cacheMisses} misses`)

    // Map results to books
    for (const book of books) {
      const authorNames = splitAuthorNames(book.authors)
      const authorCountriesSet = new Set<string>()

      authorNames.forEach(authorName => {
        const countries = authorCountryMap[authorName] || []
        countries.forEach(code => authorCountriesSet.add(code))
      })

      const authorCountries = Array.from(authorCountriesSet)

      const updatedBook: Book = {
        ...book,
        bookCountries: [],
        authorCountries
      }

      if (book.readStatus === 'read' && authorCountries.length > 0) {
        readBooksWithResolvedAuthors += 1
        authorCountries.forEach(country => resolvedCountriesForReadAuthors.add(country))
      }

      processedBooks.push(updatedBook)
      
      if (onProgress) {
        onProgress(processedBooks.length, books.length)
      }
    }

    const summary: AuthorCountrySummary = {
      totalBooks: books.length,
      readBooks: readBooks.length,
      readBooksWithAuthors: readBooksWithAuthors.length,
      readBooksWithResolvedAuthors,
      uniqueAuthors: authorLookupTargets.size,
      uniqueAuthorsWithCountries: Object.values(authorCountryMap).filter(
        countries => countries.length > 0
      ).length,
      uniqueCountriesWithReadAuthors: resolvedCountriesForReadAuthors.size,
      apiLookups: data.stats.cacheMisses, // Only cache misses hit external APIs
      authorsWithMoreThanOneCountry: Object.values(authorCountryMap).filter(
        countries => new Set(countries.filter(Boolean)).size > 1
      ).length
    }

    return {
      booksWithCountries: processedBooks,
      summary
    }
  } catch (error) {
    console.error('❌ Backend API failed, falling back to client-side:', error)
    // Fallback to original client-side implementation
    const { resolveAuthorCountries } = await import('./authorCountryService')
    return resolveAuthorCountries(books, onProgress)
  }
}
