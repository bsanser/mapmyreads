import { describe, it, expect } from 'vitest'
import { parseOpenLibraryResults, parseGoogleBooksResults, mergeSearchResults } from '../lib/bookSearchParser'

// --- 1.1 Open Library parser ---

describe('parseOpenLibraryResults', () => {
  it('extracts title, author, coverUrl, year from a standard doc', () => {
    const raw = {
      docs: [
        {
          title: 'The Great Gatsby',
          author_name: ['F. Scott Fitzgerald', 'Second Author'],
          isbn: ['9780743273565', '0743273567'],
          cover_i: 123456,
          first_publish_year: 1925,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('The Great Gatsby')
    expect(results[0].author).toBe('F. Scott Fitzgerald')
    expect(results[0].coverUrl).toBe('https://covers.openlibrary.org/b/id/123456-M.jpg')
    expect(results[0].year).toBe(1925)
  })

  it('extracts isbn13 as first valid 13-digit value starting with 978 or 979', () => {
    const raw = {
      docs: [
        {
          title: 'Test Book',
          author_name: ['Author One'],
          isbn: ['0743273567', '9780743273565', '9791032300123'],
          cover_i: null,
          first_publish_year: 2000,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].isbn13).toBe('9780743273565')
  })

  it('returns null isbn13 when no valid 13-digit ISBN found', () => {
    const raw = {
      docs: [
        {
          title: 'No ISBN Book',
          author_name: ['Author'],
          isbn: ['0743273567'],
          cover_i: null,
          first_publish_year: 2000,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].isbn13).toBeNull()
  })

  it('returns null coverUrl when cover_i is absent', () => {
    const raw = {
      docs: [
        {
          title: 'No Cover Book',
          author_name: ['Author'],
          isbn: [],
          first_publish_year: 2000,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].coverUrl).toBeNull()
  })

  it('uses first entry in author_name as author', () => {
    const raw = {
      docs: [
        {
          title: 'Multi Author',
          author_name: ['Primary Author', 'Secondary Author'],
          isbn: [],
          first_publish_year: 2010,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].author).toBe('Primary Author')
  })

  it('handles missing author_name gracefully', () => {
    const raw = {
      docs: [
        {
          title: 'Unknown Author Book',
          isbn: [],
          first_publish_year: 2010,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].author).toBe('')
  })

  it('returns empty array when docs is empty', () => {
    expect(parseOpenLibraryResults({ docs: [] })).toEqual([])
  })

  it('accepts isbn starting with 979', () => {
    const raw = {
      docs: [
        {
          title: 'Modern Book',
          author_name: ['Author'],
          isbn: ['9791032300123'],
          cover_i: null,
          first_publish_year: 2020,
        },
      ],
    }
    const results = parseOpenLibraryResults(raw)
    expect(results[0].isbn13).toBe('9791032300123')
  })
})

// --- 1.2 Google Books parser ---

describe('parseGoogleBooksResults', () => {
  it('extracts title, author, coverUrl from a standard item', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'The Great Gatsby',
            authors: ['F. Scott Fitzgerald'],
            imageLinks: { thumbnail: 'http://books.google.com/thumbnail.jpg' },
            industryIdentifiers: [
              { type: 'ISBN_10', identifier: '0743273567' },
              { type: 'ISBN_13', identifier: '9780743273565' },
            ],
            publishedDate: '1925',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('The Great Gatsby')
    expect(results[0].author).toBe('F. Scott Fitzgerald')
    expect(results[0].coverUrl).toBe('http://books.google.com/thumbnail.jpg')
    expect(results[0].isbn13).toBe('9780743273565')
  })

  it('returns null coverUrl when imageLinks is missing', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'No Cover',
            authors: ['Author'],
            industryIdentifiers: [],
            publishedDate: '2020',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results[0].coverUrl).toBeNull()
  })

  it('returns null coverUrl when imageLinks.thumbnail is missing', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'No Thumbnail',
            authors: ['Author'],
            imageLinks: {},
            industryIdentifiers: [],
            publishedDate: '2020',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results[0].coverUrl).toBeNull()
  })

  it('finds isbn13 from industryIdentifiers where type is ISBN_13', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'Test',
            authors: ['Author'],
            industryIdentifiers: [
              { type: 'ISBN_10', identifier: '1234567890' },
              { type: 'ISBN_13', identifier: '9781234567890' },
            ],
            publishedDate: '2020',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results[0].isbn13).toBe('9781234567890')
  })

  it('returns null isbn13 when no ISBN_13 identifier present', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'ISBN10 Only',
            authors: ['Author'],
            industryIdentifiers: [{ type: 'ISBN_10', identifier: '1234567890' }],
            publishedDate: '2020',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results[0].isbn13).toBeNull()
  })

  it('returns empty array when items is absent', () => {
    expect(parseGoogleBooksResults({})).toEqual([])
  })

  it('uses first author from authors array', () => {
    const raw = {
      items: [
        {
          volumeInfo: {
            title: 'Multi Author',
            authors: ['First Author', 'Second Author'],
            industryIdentifiers: [],
            publishedDate: '2020',
          },
        },
      ],
    }
    const results = parseGoogleBooksResults(raw)
    expect(results[0].author).toBe('First Author')
  })
})

// --- 1.3 Merge function ---

describe('mergeSearchResults', () => {
  const olBook = { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn13: '9780743273565', coverUrl: 'https://ol.org/cover.jpg', year: 1925 }
  const gbBook = { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn13: '9780743273565', coverUrl: 'https://gb.com/cover.jpg', year: 1925 }

  it('keeps OL item when both share the same ISBN13, drops Google Books item', () => {
    const merged = mergeSearchResults([olBook], [gbBook])
    expect(merged).toHaveLength(1)
    expect(merged[0].coverUrl).toBe('https://ol.org/cover.jpg') // OL item kept
  })

  it('deduplicates by normalised title+author when either lacks ISBN13', () => {
    const olNoISBN = { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn13: null, coverUrl: null, year: 1925 }
    const gbNoISBN = { title: 'the great gatsby', author: 'f scott fitzgerald', isbn13: null, coverUrl: null, year: 1925 }
    const merged = mergeSearchResults([olNoISBN], [gbNoISBN])
    expect(merged).toHaveLength(1)
  })

  it('preserves OL items first in the result order', () => {
    const olA = { title: 'Book A', author: 'Author A', isbn13: '9780000000001', coverUrl: null, year: 2000 }
    const gbB = { title: 'Book B', author: 'Author B', isbn13: '9780000000002', coverUrl: null, year: 2001 }
    const merged = mergeSearchResults([olA], [gbB])
    expect(merged[0].title).toBe('Book A')
    expect(merged[1].title).toBe('Book B')
  })

  it('includes unique Google Books items that are not in OL results', () => {
    const olA = { title: 'Book A', author: 'Author', isbn13: '9780000000001', coverUrl: null, year: 2000 }
    const gbB = { title: 'Book B', author: 'Author', isbn13: '9780000000002', coverUrl: null, year: 2001 }
    const merged = mergeSearchResults([olA], [gbB])
    expect(merged).toHaveLength(2)
  })

  it('deduplicates correctly when one has ISBN13 and the other does not', () => {
    const olWithISBN = { title: 'Unique Book', author: 'Author', isbn13: '9780000000001', coverUrl: null, year: 2000 }
    const gbNoISBN = { title: 'Unique Book', author: 'Author', isbn13: null, coverUrl: null, year: 2000 }
    // GB has no ISBN but same title+author → deduplicated
    const merged = mergeSearchResults([olWithISBN], [gbNoISBN])
    expect(merged).toHaveLength(1)
    expect(merged[0].isbn13).toBe('9780000000001')
  })
})
