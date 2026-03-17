import { describe, it, expect } from 'vitest'
import { applyCoverResultsToBooks } from '../lib/bookCoverService'
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

describe('applyCoverResultsToBooks', () => {
  it('adds cover by ISBN13 key', () => {
    const books = [makeBook({ isbn13: '9780547928227' })]
    const result = applyCoverResultsToBooks(books, { '9780547928227': 'https://covers.example.com/1.jpg' })
    expect(result[0].coverImage).toBe('https://covers.example.com/1.jpg')
  })

  it('adds cover by title|authors key when no ISBN', () => {
    const books = [makeBook({ title: 'Dune', authors: 'Frank Herbert' })]
    const result = applyCoverResultsToBooks(books, { 'Dune|Frank Herbert': 'https://covers.example.com/2.jpg' })
    expect(result[0].coverImage).toBe('https://covers.example.com/2.jpg')
  })

  it('does not overwrite an existing coverImage', () => {
    const books = [makeBook({ isbn13: '9780547928227', coverImage: 'https://existing.com/cover.jpg' })]
    const result = applyCoverResultsToBooks(books, { '9780547928227': 'https://new.com/cover.jpg' })
    expect(result[0].coverImage).toBe('https://existing.com/cover.jpg')
  })

  it('ignores null values in the coverMap', () => {
    const books = [makeBook({ isbn13: '9780547928227' })]
    const result = applyCoverResultsToBooks(books, { '9780547928227': null })
    expect(result[0].coverImage).toBeNull()
    expect(result[0]).toBe(books[0]) // same reference — not cloned
  })
})
