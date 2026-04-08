import { describe, it, expect, beforeEach } from 'vitest'
import { saveProcessedBooks, loadProcessedBooks, STORAGE_KEYS } from '../lib/storage'
import { tryAddBook } from '../lib/deduplication'
import { Book } from '../types/book'

// --- addBook logic tests (2.4) ---

describe('tryAddBook', () => {
  it('returns "duplicate" and unchanged array when book already exists (ISBN13 match)', () => {
    const bookA = makeBook({ isbn13: '9780000000001', title: 'Book A' })
    const { result, books } = tryAddBook(bookA, [bookA])
    expect(result).toBe('duplicate')
    expect(books).toHaveLength(1)
  })

  it('returns "added" and prepends book when book is new', () => {
    const bookA = makeBook({ isbn13: '9780000000001', title: 'Book A' })
    const bookB = makeBook({ isbn13: '9780000000002', title: 'Book B' })
    const { result, books } = tryAddBook(bookB, [bookA])
    expect(result).toBe('added')
    expect(books).toHaveLength(2)
    expect(books[0].title).toBe('Book B') // prepended
  })

  it('returns "duplicate" for same title+author when both lack ISBN13', () => {
    const bookA = makeBook({ isbn13: null, title: 'The Title', authors: 'Some Author' })
    const { result } = tryAddBook(bookA, [bookA])
    expect(result).toBe('duplicate')
  })

  it('returns "added" for different book with no ISBN13', () => {
    const bookA = makeBook({ isbn13: null, title: 'Book A', authors: 'Author A' })
    const bookB = makeBook({ isbn13: null, title: 'Book B', authors: 'Author B' })
    const { result, books } = tryAddBook(bookB, [bookA])
    expect(result).toBe('added')
    expect(books).toHaveLength(2)
  })
})

// Minimal valid Book fixture
function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    title: 'Test Book',
    authors: 'Test Author',
    isbn13: '9780000000001',
    yearPublished: 2020,
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

// Mock localStorage for node environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
}

// @ts-ignore
global.window = { localStorage: localStorageMock, sessionStorage: localStorageMock }
// @ts-ignore
global.localStorage = localStorageMock
// @ts-ignore
global.sessionStorage = localStorageMock

beforeEach(() => {
  localStorageMock.clear()
})

describe('saveProcessedBooks', () => {
  it('strips isResolvingCountry before saving to localStorage', () => {
    const book = makeBook({ isResolvingCountry: true })
    saveProcessedBooks([book])

    const raw = store[STORAGE_KEYS.PROCESSED_BOOKS]
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].isResolvingCountry).toBeUndefined()
  })

  it('preserves all other fields when stripping isResolvingCountry', () => {
    const book = makeBook({ isResolvingCountry: false, title: 'Keep Me' })
    saveProcessedBooks([book])

    const raw = store[STORAGE_KEYS.PROCESSED_BOOKS]
    const parsed = JSON.parse(raw)
    expect(parsed[0].title).toBe('Keep Me')
    expect(parsed[0].isResolvingCountry).toBeUndefined()
  })

  it('works normally when isResolvingCountry is not set', () => {
    const book = makeBook()
    saveProcessedBooks([book])

    const raw = store[STORAGE_KEYS.PROCESSED_BOOKS]
    const parsed = JSON.parse(raw)
    expect(parsed[0].title).toBe('Test Book')
  })
})
