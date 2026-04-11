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
  const { syncBooks, remoteBooks, sessionId } = useSession()

  // Hydrate from remote books when user is logged in (cross-device load)
  useEffect(() => {
    if (!remoteBooks) return
    const isReadOnlyPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/map/')
    if (isReadOnlyPage) return
    setBooks(prev => {
      if (prev.length === 0 || remoteBooks.length > prev.length) {
        console.log('[BooksContext] hydrating from remote books:', remoteBooks.length)
        return remoteBooks
      }
      return prev
    })
  }, [remoteBooks])

  // Sync books to DB. First non-empty state (localStorage load or CSV upload) syncs
  // immediately so the share URL works right away. Subsequent mutations are debounced.
  const hasBooks = useRef(false)
  const isFirstLoad = useRef(true)
  useEffect(() => {
    const isReadOnlyPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/map/')
    if (isReadOnlyPage) return
    if (!sessionId) return

    const readBooks = books.filter(b => b.readStatus === 'read')
    if (readBooks.length > 0) {
      hasBooks.current = true
      const immediate = isFirstLoad.current
      isFirstLoad.current = false
      syncBooks(readBooks, immediate)
    } else if (hasBooks.current) {
      isFirstLoad.current = false
      syncBooks([])
    }
  }, [books, sessionId])

  const summaryStats = useMemo(() => {
    const readBooksAll = books.filter(b => b.readStatus === 'read')
    const authorSet = new Set<string>()
    const countrySet = new Set<string>()
    let missingAuthorCountry = 0

    readBooksAll.forEach(book => {
      if (book.authors) authorSet.add(book.authors.trim())
      if (book.authorCountries && book.authorCountries.length > 0) {
        book.authorCountries.forEach(code => countrySet.add(code))
      } else if (!book.isResolvingCountry) {
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
