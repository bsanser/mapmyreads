import { describe, it, expect } from 'vitest'
import { detectCSVFormat, parseCSVData } from '../lib/csvParser'

const GOODREADS_HEADERS = ['Title', 'Author', 'Exclusive Shelf', 'ISBN13', 'Original Publication Year', 'Date Read', 'Average Rating', 'My Rating', 'Number of Pages', 'Bookshelves']
const STORYGRAPH_HEADERS = ['Title', 'Authors', 'Read Status', 'ISBN/UID', 'Dates Read', 'Star Rating']

describe('detectCSVFormat', () => {
  it('detects Goodreads format', () => {
    expect(detectCSVFormat(GOODREADS_HEADERS)).toBe('goodreads')
  })

  it('detects StoryGraph format', () => {
    expect(detectCSVFormat(STORYGRAPH_HEADERS)).toBe('storygraph')
  })

  it('throws on unknown headers', () => {
    expect(() => detectCSVFormat(['foo', 'bar', 'baz'])).toThrow()
  })
})

describe('parseCSVData', () => {
  it('parses a Goodreads row into correct Book shape', () => {
    const row = {
      'Title': 'The Hobbit',
      'Author': 'J.R.R. Tolkien',
      'Exclusive Shelf': 'read',
      'ISBN13': '="9780547928227"',
      'Original Publication Year': '1937',
      'Date Read': '2023/06/15',
      'Average Rating': '4.27',
      'My Rating': '5',
      'Number of Pages': '310',
      'Bookshelves': 'fantasy'
    }
    const [book] = parseCSVData([row], 'goodreads')
    expect(book.title).toBe('The Hobbit')
    expect(book.authors).toBe('J.R.R. Tolkien')
    expect(book.readStatus).toBe('read')
    expect(book.isbn13).toBe('9780547928227')
    expect(book.yearPublished).toBe(1937)
    expect(book.source).toBe('goodreads')
    expect(book.authorCountries).toEqual([])
  })

  it('filters out rows with no title or author', () => {
    const rows = [
      { 'Title': '', 'Author': 'Someone', 'Exclusive Shelf': 'read' },
      { 'Title': 'A Book', 'Author': '', 'Exclusive Shelf': 'read' },
      { 'Title': 'Valid', 'Author': 'Valid Author', 'Exclusive Shelf': 'read' },
    ]
    const books = parseCSVData(rows, 'goodreads')
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('Valid')
  })
})
