import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org/b'
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

interface BookRequest {
  isbn13?: string
  title: string
  author: string
}

async function fetchCoverUrl(book: BookRequest): Promise<string | null> {
  try {
    // Try ISBN first (most reliable)
    if (book.isbn13) {
      const coverUrl = `${OPEN_LIBRARY_COVERS}/isbn/${book.isbn13}-L.jpg`
      const response = await fetch(coverUrl, { method: 'HEAD' })
      if (response.ok) {
        return coverUrl
      }
    }

    // Fallback: Search by title and author
    const query = `${book.title} ${book.author}`.trim()
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
    Sentry.captureException(error, {
      tags: { component: 'open_library' }
    })
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { books }: { books: BookRequest[] } = await request.json()

    if (!books || !Array.isArray(books) || books.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: books array required' },
        { status: 400 }
      )
    }

    console.log(`📚 Fetching covers for ${books.length} books...`)

    const results: Record<string, string | null> = {}
    const cacheMisses: BookRequest[] = []

    // Step 1: Check cache for all books
    for (const book of books) {
      const key = book.isbn13 || `${book.title}|${book.author}`

      try {
        // Try to find by ISBN first
        let cached = book.isbn13
          ? await prisma.bookMetadataCache.findUnique({
              where: { isbn13: book.isbn13 }
            })
          : null

        // If not found by ISBN, try by title+author
        if (!cached) {
          cached = await prisma.bookMetadataCache.findFirst({
            where: {
              title: book.title,
              author: book.author
            }
          })
        }

        if (cached) {
          results[key] = cached.coverUrl
          console.log(`✅ Cache hit: ${book.title}`)
        } else {
          cacheMisses.push(book)
        }
      } catch (dbError) {
        // DB unavailable — treat as cache miss
        Sentry.captureMessage('db_unavailable', 'warning' as any, {
          tags: { component: 'db', operation: 'cache_read' },
          extra: { route: '/api/books/batch-covers', error_message: String(dbError) }
        })
        cacheMisses.push(book)
      }
    }

    console.log(`📊 Cache hits: ${Object.keys(results).length}, misses: ${cacheMisses.length}`)

    // Step 2: Fetch cache misses from Open Library
    // Process sequentially with rate limiting ONLY between actual API calls
    // Stop at 9s to return partial results before Vercel Hobby's 10s hard limit
    const startTime = Date.now()
    for (let i = 0; i < cacheMisses.length; i++) {
      if (Date.now() - startTime > 9000) {
        console.warn('⚠️ Timeout reached, returning partial results')
        break
      }
      const book = cacheMisses[i]
      const key = book.isbn13 || `${book.title}|${book.author}`
      
      try {
        console.log(`🌐 Fetching from Open Library: ${book.title}`)
        const coverUrl = await fetchCoverUrl(book)
        
        // Store in cache (best-effort — ignore DB errors)
        try {
          await prisma.bookMetadataCache.create({
            data: {
              isbn13: book.isbn13 || null,
              title: book.title,
              author: book.author,
              coverUrl: coverUrl,
              source: 'openlibrary'
            }
          })
        } catch (dbError) {
          Sentry.captureMessage('db_unavailable', 'warning' as any, {
            tags: { component: 'db', operation: 'cache_write' },
            extra: { route: '/api/books/batch-covers', error_message: String(dbError) }
          })
        }

        results[key] = coverUrl
        console.log(`💾 Cached: ${book.title} → ${coverUrl ? 'found' : 'not found'}`)
        
        // Rate limiting: wait 100ms between API requests (not after the last one)
        if (i < cacheMisses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`❌ Failed to fetch cover for ${book.title}:`, error)
        results[key] = null
      }
    }

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: books.length,
        cacheHits: books.length - cacheMisses.length,
        cacheMisses: cacheMisses.length
      }
    })
  } catch (error) {
    console.error('Error in batch-covers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
