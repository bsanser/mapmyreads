import { Book } from '../types/book'
import { detectAuthorCountries } from './countryDetection'
import { mapDisplayNameToISO2 } from './mapUtilities'

export type AuthorCountrySummary = {
  totalBooks: number
  readBooks: number
  readBooksWithAuthors: number
  readBooksWithResolvedAuthors: number
  uniqueAuthors: number
  uniqueAuthorsWithCountries: number
  uniqueCountriesWithReadAuthors: number
  apiLookups: number
}

const normalizeAuthorKey = (authors: string): string => {
  return authors.trim().toLowerCase()
}

const toISO2List = (countries: string[]): string[] => {
  return countries
    .map(country => mapDisplayNameToISO2(country))
    .map(iso => iso.trim())
    .filter(Boolean)
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

  const authorLookupTargets = new Map<string, Book>()
  for (const book of readBooksWithAuthors) {
    const authorKey = normalizeAuthorKey(book.authors)
    if (authorKey.length === 0 || authorLookupTargets.has(authorKey)) continue
    authorLookupTargets.set(authorKey, book)
  }

  for (const [authorKey, sampleBook] of authorLookupTargets.entries()) {
    try {
      const detected = await detectAuthorCountries(sampleBook)
      const isoCountries = toISO2List(detected)
      authorCountryCache.set(authorKey, isoCountries)
    } catch (error) {
      console.warn(`Failed to resolve author country for "${sampleBook.authors}":`, error)
      authorCountryCache.set(authorKey, [])
    }
  }

  for (const book of books) {
    const authorKey = book.authors ? normalizeAuthorKey(book.authors) : ''
    const cachedCountries = authorKey ? authorCountryCache.get(authorKey) || [] : []

    const updatedBook: Book = {
      ...book,
      bookCountries: [],
      authorCountries: cachedCountries
    }

    if (book.readStatus === 'read' && cachedCountries.length > 0) {
      readBooksWithResolvedAuthors += 1
      cachedCountries.forEach(country => resolvedCountriesForReadAuthors.add(country))
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
    apiLookups: authorLookupTargets.size
  }

  console.table(summary)

  return {
    booksWithCountries: processedBooks,
    summary
  }
}
