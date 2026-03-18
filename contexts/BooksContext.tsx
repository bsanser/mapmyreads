'use client'

import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { Book } from '../types/book'
import { saveProcessedBooks } from '../lib/storage'

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
}

const BooksContext = createContext<BooksContextValue | null>(null)

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

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

  return (
    <BooksContext.Provider value={{ books, setBooks, selectedCountry, setSelectedCountry, summaryStats, updateBookCountries }}>
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error('useBooks must be used within a BooksProvider')
  return ctx
}
