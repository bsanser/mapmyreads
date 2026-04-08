import { describe, it, expect } from 'vitest'
import { normalizeString, isDuplicate, deduplicateBooks, tryAddBook } from '../lib/deduplication'
import { Book } from '../types/book'

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

// --- 3.1 normalizeString ---

describe('normalizeString', () => {
  it('lowercases the string', () => {
    expect(normalizeString('The Great Gatsby')).toBe('the great gatsby')
  })

  it('strips punctuation', () => {
    expect(normalizeString("Harry Potter's Wand!")).toBe('harry potters wand')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeString('  hello world  ')).toBe('hello world')
  })

  it('collapses multiple spaces into one', () => {
    expect(normalizeString('too   many   spaces')).toBe('too many spaces')
  })

  it('handles empty string', () => {
    expect(normalizeString('')).toBe('')
  })
})

// --- isDuplicate ---

describe('isDuplicate', () => {
  it('returns true when both books have the same ISBN13', () => {
    const bookA = makeBook({ isbn13: '9780000000001' })
    const bookB = makeBook({ isbn13: '9780000000001', title: 'Different Title' })
    expect(isDuplicate(bookA, [bookB])).toBe(true)
  })

  it('returns false when ISBN13s differ', () => {
    const bookA = makeBook({ isbn13: '9780000000001' })
    const bookB = makeBook({ isbn13: '9780000000002' })
    expect(isDuplicate(bookA, [bookB])).toBe(false)
  })

  it('falls back to normalised title+author when either book lacks ISBN13', () => {
    const bookA = makeBook({ isbn13: null, title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald' })
    const bookB = makeBook({ isbn13: null, title: 'the great gatsby', authors: 'F Scott Fitzgerald' })
    expect(isDuplicate(bookA, [bookB])).toBe(true)
  })

  it('returns false when title+author differ and no ISBN13', () => {
    const bookA = makeBook({ isbn13: null, title: 'Book A', authors: 'Author A' })
    const bookB = makeBook({ isbn13: null, title: 'Book B', authors: 'Author B' })
    expect(isDuplicate(bookA, [bookB])).toBe(false)
  })

  it('falls back to title+author when incoming book has no ISBN13 even if existing does', () => {
    const incoming = makeBook({ isbn13: null, title: 'Matching Title', authors: 'Same Author' })
    const existing = makeBook({ isbn13: '9780000000001', title: 'Matching Title', authors: 'Same Author' })
    expect(isDuplicate(incoming, [existing])).toBe(true)
  })

  it('returns false for empty existing array', () => {
    const book = makeBook()
    expect(isDuplicate(book, [])).toBe(false)
  })
})

// --- 3.3 deduplicateBooks ---

describe('deduplicateBooks', () => {
  it('returns all incoming books as new when existing is empty', () => {
    const books = [makeBook({ isbn13: '9780000000001' }), makeBook({ isbn13: '9780000000002' })]
    const { newBooks, skipped } = deduplicateBooks(books, [])
    expect(newBooks).toHaveLength(2)
    expect(skipped).toBe(0)
  })

  it('identifies duplicates by ISBN13 path', () => {
    const existingA = makeBook({ isbn13: '9780000000001', title: 'Book A' })
    const existingB = makeBook({ isbn13: '9780000000002', title: 'Book B' })
    const incomingA = makeBook({ isbn13: '9780000000001', title: 'Book A' }) // duplicate
    const incomingC = makeBook({ isbn13: '9780000000003', title: 'Book C' }) // new

    const { newBooks, skipped } = deduplicateBooks([incomingA, incomingC], [existingA, existingB])
    expect(newBooks).toHaveLength(1)
    expect(newBooks[0].title).toBe('Book C')
    expect(skipped).toBe(1)
  })

  it('identifies duplicates by title+author fallback when ISBN13 missing', () => {
    const existing = makeBook({ isbn13: null, title: 'Known Book', authors: 'Known Author' })
    const incoming = makeBook({ isbn13: null, title: 'known book!', authors: 'Known Author' }) // normalized match
    const newOne = makeBook({ isbn13: null, title: 'Fresh Book', authors: 'New Author' })

    const { newBooks, skipped } = deduplicateBooks([incoming, newOne], [existing])
    expect(newBooks).toHaveLength(1)
    expect(newBooks[0].title).toBe('Fresh Book')
    expect(skipped).toBe(1)
  })

  it('given 3 incoming where 2 exist, returns 1 new and 2 skipped', () => {
    const existing1 = makeBook({ isbn13: '9780000000001', title: 'A' })
    const existing2 = makeBook({ isbn13: '9780000000002', title: 'B' })
    const dup1 = makeBook({ isbn13: '9780000000001', title: 'A' })
    const dup2 = makeBook({ isbn13: '9780000000002', title: 'B' })
    const fresh = makeBook({ isbn13: '9780000000003', title: 'C' })

    const { newBooks, skipped } = deduplicateBooks([dup1, dup2, fresh], [existing1, existing2])
    expect(newBooks).toHaveLength(1)
    expect(skipped).toBe(2)
  })
})

// --- tryAddBook (used by BooksContext) ---

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
    expect(books[0].title).toBe('Book B')
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
