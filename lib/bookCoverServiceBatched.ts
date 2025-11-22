import { Book } from '../types/book'

// Load covers in small batches to avoid overwhelming the API
export const enrichBooksWithCoversBatched = async (
  books: Book[],
  onBatchComplete?: (loadedCount: number, totalCount: number) => void
): Promise<Book[]> => {
  // Only fetch covers for read books
  const booksNeedingCovers = books.filter(b => b.readStatus === 'read' && !b.coverImage)
  
  if (booksNeedingCovers.length === 0) {
    console.log('✅ All read books already have covers')
    return books
  }

  console.log(`📷 Loading covers for ${booksNeedingCovers.length} books in batches...`)

  const BATCH_SIZE = 20 
  let enrichedBooks = [...books]
  let loadedCount = 0

  // Process in batches
  for (let i = 0; i < booksNeedingCovers.length; i += BATCH_SIZE) {
    const batch = booksNeedingCovers.slice(i, i + BATCH_SIZE)
    
    try {
      // Prepare batch data
      const booksData = batch.map(book => ({
        isbn13: book.isbn13 || undefined,
        title: book.title,
        author: book.authors
      }))

      const response = await fetch('/api/books/batch-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: booksData })
      })

      if (response.ok) {
        const data = await response.json()
        const coverMap = data.results as Record<string, string | null>

        // Update books with covers from this batch
        enrichedBooks = enrichedBooks.map(book => {
          const key = book.isbn13 || `${book.title}|${book.authors}`
          if (coverMap.hasOwnProperty(key) && !book.coverImage) {
            return { ...book, coverImage: coverMap[key] }
          }
          return book
        })

        loadedCount += batch.length
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Loaded ${loadedCount}/${booksNeedingCovers.length} covers`)
        
        if (onBatchComplete) {
          onBatchComplete(loadedCount, booksNeedingCovers.length)
        }
      }
    } catch (error) {
      console.warn(`⚠️ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error)
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < booksNeedingCovers.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log(`✅ Cover loading complete: ${loadedCount}/${booksNeedingCovers.length} loaded`)
  return enrichedBooks
}
