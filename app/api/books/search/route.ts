import { NextRequest, NextResponse } from 'next/server'
import {
  parseOpenLibraryResults,
  parseGoogleBooksResults,
  mergeSearchResults,
  SearchBookResult,
} from '../../../../lib/bookSearchParser'

const OL_SEARCH_URL = 'https://openlibrary.org/search.json'
const GB_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  let olResults: SearchBookResult[] = []
  let gbResults: SearchBookResult[] = []
  const warnings: string[] = []

  // Query Open Library
  try {
    const olUrl = `${OL_SEARCH_URL}?q=${encodeURIComponent(q)}&fields=title,author_name,isbn,cover_i,first_publish_year&limit=10`
    const olRes = await fetch(olUrl, { next: { revalidate: 86400 } })
    if (olRes.ok) {
      const olData = await olRes.json()
      olResults = parseOpenLibraryResults(olData)
    } else {
      warnings.push('Open Library returned an error')
    }
  } catch {
    warnings.push('Open Library request failed')
  }

  // Query Google Books if OL returned fewer than 3 results
  if (olResults.length < 3) {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY
      const gbUrl = `${GB_SEARCH_URL}?q=${encodeURIComponent(q)}&maxResults=10${apiKey ? `&key=${apiKey}` : ''}`
      const gbRes = await fetch(gbUrl, { next: { revalidate: 86400 } })
      if (gbRes.ok) {
        const gbData = await gbRes.json()
        gbResults = parseGoogleBooksResults(gbData)
      } else {
        warnings.push('Google Books returned an error')
      }
    } catch {
      warnings.push('Google Books request failed')
    }
  }

  const results = mergeSearchResults(olResults, gbResults)
  const response: Record<string, any> = { results }
  if (warnings.length > 0) response.warning = warnings.join('; ')

  return NextResponse.json(response)
}
