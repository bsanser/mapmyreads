import { Book } from '../types/book'
import { detectAuthorCountriesByName } from './countryDetection'
import { normalizeAuthorName, splitAuthorNames } from './authorUtils'

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

export const resolveAuthorCountries = async (
  books: Book[]
): Promise<{ booksWithCountries: Book[]; summary: AuthorCountrySummary }> => {
  const authorCountryCache = new Map<string, string[]>()
  const processedBooks: Book[] = []
  let readBooksWithResolvedAuthors = 0
  const resolvedCountriesForReadAuthors = new Set<string>()

  const readBooks = books.filter(book => book.readStatus === 'read')
  const readBooksWithAuthors = readBooks.filter(
    book => Boolean(book.authors && book.authors.trim().length > 0)
  )

  const authorLookupTargets = new Map<string, string>()
  for (const book of readBooksWithAuthors) {
    const authorNames = splitAuthorNames(book.authors)
    authorNames.forEach(authorName => {
      const key = normalizeAuthorName(authorName)
      if (key.length === 0 || authorLookupTargets.has(key)) return
      authorLookupTargets.set(key, authorName)
    })
  }

  for (const [authorKey, authorName] of authorLookupTargets.entries()) {
    try {
      const isoCountries = await detectAuthorCountriesByName(authorName)
      authorCountryCache.set(authorKey, isoCountries)
    } catch (error) {
      console.warn(`Failed to resolve author country for "${authorName}":`, error)
      authorCountryCache.set(authorKey, [])
    }
  }

  for (const book of books) {
    const authorNames = splitAuthorNames(book.authors)
    const authorCountriesSet = new Set<string>()

    authorNames.forEach(authorName => {
      const key = normalizeAuthorName(authorName)
      if (!key) return
      const cachedCountries = authorCountryCache.get(key) || []
      cachedCountries.forEach(code => authorCountriesSet.add(code))
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
  }

  const summary: AuthorCountrySummary = {
    totalBooks: books.length,
    readBooks: readBooks.length,
    readBooksWithAuthors: readBooksWithAuthors.length,
    readBooksWithResolvedAuthors,
    uniqueAuthors: authorLookupTargets.size,
    uniqueAuthorsWithCountries: Array.from(authorCountryCache.values()).filter(
      countries => countries.length > 0
    ).length,
    uniqueCountriesWithReadAuthors: resolvedCountriesForReadAuthors.size,
    apiLookups: authorLookupTargets.size,
    authorsWithMoreThanOneCountry: Array.from(authorCountryCache.entries()).filter(
      ([, countries]) => new Set(countries.filter(Boolean)).size > 1
    ).length
  }

  return {
    booksWithCountries: processedBooks,
    summary
  }
}
