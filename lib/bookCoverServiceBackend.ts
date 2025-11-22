import { Book } from '../types/book'

export const enrichBooksWithCoversBackend = async (
  books: Book[],
  onProgress?: (current: number, total: number) => void
): Promise<Book[]> => {
  console.log(`🚀 Calling backend API for ${books.length} book covers...`)

  try {
    // Prepare books data for API
    const booksData = books.map(book => ({
      isbn13: book.isbn13 || undefined,
      title: book.title,
      author: book.authors
    }))

    const response = await fetch('/api/books/batch-covers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: booksData })
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const coverMap = data.results as Record<string, string | null>
    
    console.log(`✅ Backend returned ${Object.keys(coverMap).length} cover results`)
    console.log(`📊 Cache stats: ${data.stats.cacheHits} hits, ${data.stats.cacheMisses} misses`)

    // Map covers to books
    const enrichedBooks = books.map((book, index) => {
      const key = book.isbn13 || `${book.title}|${book.authors}`
      const coverUrl = coverMap[key] || null

      if (onProgress) {
        onProgress(index + 1, books.length)
      }

      return {
        ...book,
        coverImage: coverUrl
      }
    })

    return enrichedBooks
  } catch (error) {
    console.error('❌ Backend API failed for covers, falling back to client-side:', error)
    // Fallback to original client-side implementation
    const { enrichBooksWithCovers } = await import('./bookCoverService')
    return enrichBooksWithCovers(books, onProgress)
  }
}
