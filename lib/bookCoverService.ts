import { Book } from '../types/book'

// Open Library API endpoints
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org/b'

// Fallback: longitood.com for additional cover sources
const LONGITOOD_COVERS = 'https://www.longitood.com/cover'

const fetchCoverFromOpenLibrary = async (book: Book): Promise<string | null> => {
  try {
    // Try ISBN first (most reliable)
    if (book.isbn13) {
      // Direct cover URL from ISBN
      const coverUrl = `${OPEN_LIBRARY_COVERS}/isbn/${book.isbn13}-L.jpg`
      
      // Check if cover exists
      const response = await fetch(coverUrl, { method: 'HEAD' })
      if (response.ok) {
        return coverUrl
      }
    }

    // Fallback: Search by title and author
    const query = `${book.title} ${book.authors}`.trim()
    const searchUrl = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query)}&limit=1`
    
    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) return null

    const data = await searchResponse.json()
    if (!data.docs || data.docs.length === 0) return null

    const bookData = data.docs[0]
    
    // Try to get cover from Open Library ID
    if (bookData.cover_i) {
      return `${OPEN_LIBRARY_COVERS}/id/${bookData.cover_i}-L.jpg`
    }

    // Try ISBN from search results
    if (bookData.isbn && bookData.isbn.length > 0) {
      return `${OPEN_LIBRARY_COVERS}/isbn/${bookData.isbn[0]}-L.jpg`
    }

    return null
  } catch (error) {
    console.warn(`Error retrieving cover for "${book.title}":`, error)
    return null
  }
}

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const enrichBooksWithCovers = async (
  books: Book[],
  onProgress?: (current: number, total: number) => void
): Promise<Book[]> => {
  const cache = new Map<string, string | null>()
  const enriched: Book[] = []
  let processed = 0
  let apiCallsMade = 0

  for (const book of books) {
    const key = book.isbn13 || `${book.title}|${book.authors}`

    if (book.coverImage) {
      enriched.push(book)
      processed++
      if (onProgress) onProgress(processed, books.length)
      continue
    }

    if (!cache.has(key)) {
      // Add delay after every 10 API calls to be respectful to Open Library
      if (apiCallsMade > 0 && apiCallsMade % 10 === 0) {
        await delay(500) // Wait 500ms every 10 requests
      }
      
      cache.set(key, await fetchCoverFromOpenLibrary(book))
      apiCallsMade++
    }

    enriched.push({
      ...book,
      coverImage: cache.get(key) || null
    })
    
    processed++
    if (onProgress) onProgress(processed, books.length)
  }

  return enriched
}
