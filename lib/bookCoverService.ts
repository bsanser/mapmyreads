import { Book } from '../types/book'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q='

const buildCoverUrl = (imageLinks: any): string | null => {
  if (!imageLinks) return null
  const url = imageLinks.extraLarge || imageLinks.large || imageLinks.medium ||
    imageLinks.small || imageLinks.thumbnail || imageLinks.smallThumbnail
  if (!url) return null
  // Ensure https and add larger size when possible
  const normalized = url.replace(/^http:\/\//, 'https://')
  return normalized.includes('&edge=curl') ? normalized : `${normalized}&fife=w800`
}

const fetchCoverFromGoogleBooks = async (book: Book): Promise<string | null> => {
  const query = book.isbn13
    ? `isbn:${book.isbn13}`
    : `${book.title} ${book.authors}`.trim().replace(/\s+/g, ' ')

  try {
    const response = await fetch(
      `${GOOGLE_BOOKS_API}${encodeURIComponent(query)}&maxResults=1`
    )

    if (!response.ok) {
      console.warn(`Google Books lookup failed for ${book.title}`)
      return null
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) return null

    const volumeInfo = data.items[0].volumeInfo
    return buildCoverUrl(volumeInfo?.imageLinks)
  } catch (error) {
    console.warn(`Error retrieving cover for "${book.title}":`, error)
    return null
  }
}

export const enrichBooksWithCovers = async (books: Book[]): Promise<Book[]> => {
  const cache = new Map<string, string | null>()
  const enriched: Book[] = []

  for (const book of books) {
    const key = book.isbn13 || `${book.title}|${book.authors}`

    if (book.coverImage) {
      enriched.push(book)
      continue
    }

    if (!cache.has(key)) {
      cache.set(key, await fetchCoverFromGoogleBooks(book))
    }

    enriched.push({
      ...book,
      coverImage: cache.get(key) || null
    })
  }

  return enriched
}
