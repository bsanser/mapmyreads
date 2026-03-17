import { describe, it, expect } from 'vitest'
import { applyAuthorCountriesToBooks } from '../lib/authorCountryService'
import { Book } from '../types/book'

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    title: 'Test Book',
    authors: 'Test Author',
    isbn13: null,
    yearPublished: null,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read',
    readDate: null,
    avgRating: null,
    myRating: null,
    numberOfPages: null,
    bookshelves: [],
    coverImage: null,
    source: 'goodreads',
    originalData: {},
    ...overrides,
  }
}

describe('applyAuthorCountriesToBooks', () => {
  it('adds countries to books whose authors appear in the map', () => {
    const books = [makeBook({ authors: 'J.K. Rowling' })]
    const result = applyAuthorCountriesToBooks(books, { 'J.K. Rowling': ['GB'] })
    expect(result[0].authorCountries).toContain('GB')
  })

  it('does not modify books whose authors are not in the map', () => {
    const books = [makeBook({ authors: 'Unknown Author' })]
    const result = applyAuthorCountriesToBooks(books, { 'Someone Else': ['US'] })
    expect(result[0]).toBe(books[0]) // same reference — not cloned
  })

  it('deduplicates countries already present on the book', () => {
    const books = [makeBook({ authors: 'Author A', authorCountries: ['FR'] })]
    const result = applyAuthorCountriesToBooks(books, { 'Author A': ['FR', 'DE'] })
    expect(result[0].authorCountries).toEqual(['FR', 'DE'])
    expect(result[0].authorCountries.filter(c => c === 'FR')).toHaveLength(1)
  })

  it('handles multiple authors separated by comma', () => {
    const books = [makeBook({ authors: 'Alice Smith, Bob Jones' })]
    const result = applyAuthorCountriesToBooks(books, {
      'Alice Smith': ['US'],
      'Bob Jones': ['AU'],
    })
    expect(result[0].authorCountries).toContain('US')
    expect(result[0].authorCountries).toContain('AU')
  })
})
