'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { Book } from '../types/book'
import { saveProcessedBooks } from '../lib/storage'
import { tryAddBook } from '../lib/deduplication'
import { useSession } from './SessionContext'

interface SummaryStats {
  readBooksCount: number
  distinctAuthors: number
  authorCountriesCovered: number
  booksMissingAuthorCountry: number
}

interface BooksContextValue {
  books: Book[]
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void
  selectedCountry: string | null
  setSelectedCountry: (country: string | null) => void
  summaryStats: SummaryStats
  updateBookCountries: (book: Book, countries: string[]) => void
  addBook: (book: Book) => 'added' | 'duplicate'
}

const BooksContext = createContext<BooksContextValue | null>(null)

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const { syncBooks, remoteBooks } = useSession()

  // Hydrate from remote books when user is logged in (cross-device load)
  useEffect(() => {
    if (!remoteBooks) return
    setBooks(prev => {
      if (prev.length === 0 || remoteBooks.length > prev.length) {
        console.log('[BooksContext] hydrating from remote books:', remoteBooks.length)
        return remoteBooks
      }
      return prev
    })
  }, [remoteBooks])

  // Sync to DB whenever books change, but:
  // - Skip initial empty state (avoid wiping DB before localStorage hydration)
  // - Skip on /map/[uuid] pages (read-only views of someone else's session)
  const hasBooks = useRef(false)
  useEffect(() => {
    const isReadOnlyPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/map/')
    if (isReadOnlyPage) return

    if (books.length > 0) {
      hasBooks.current = true
      syncBooks(books)
    } else if (hasBooks.current) {
      syncBooks(books)
    }
  }, [books])

  const summaryStats = useMemo(() => {
    const readBooksAll = books.filter(b => b.readStatus === 'read')
    const authorSet = new Set<string>()
    const countrySet = new Set<string>()
    let missingAuthorCountry = 0

    readBooksAll.forEach(book => {
      if (book.authors) authorSet.add(book.authors.trim())
      if (book.authorCountries && book.authorCountries.length > 0) {
        book.authorCountries.forEach(code => countrySet.add(code))
      } else {
        missingAuthorCountry += 1
      }
    })

    return {
      readBooksCount: readBooksAll.length,
      distinctAuthors: authorSet.size,
      authorCountriesCovered: countrySet.size,
      booksMissingAuthorCountry: missingAuthorCountry
    }
  }, [books])

  const updateBookCountries = (book: Book, countries: string[]) => {
    setBooks(prevBooks => {
      const isSame = (a: Book, b: Book) =>
        a.isbn13 && b.isbn13
          ? a.isbn13 === b.isbn13
          : a.title === b.title && a.authors === b.authors && a.yearPublished === b.yearPublished

      const updated = prevBooks.map(existing =>
        isSame(existing, book) ? { ...existing, authorCountries: countries } : existing
      )
      saveProcessedBooks(updated)
      return updated
    })
  }

  const addBook = (book: Book): 'added' | 'duplicate' => {
    let outcome: 'added' | 'duplicate' = 'duplicate'
    setBooks(prev => {
      const { result, books: updated } = tryAddBook(book, prev)
      outcome = result
      return updated
    })
    return outcome
  }

  return (
    <BooksContext.Provider value={{ books, setBooks, selectedCountry, setSelectedCountry, summaryStats, updateBookCountries, addBook }}>
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used within a BooksProvider')
  return ctx
}
