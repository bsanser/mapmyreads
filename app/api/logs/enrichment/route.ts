import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Format the log entry
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      source: data.source,
      total_books: data.total_books,
      read_books: data.read_books,
      books_with_countries: data.books_with_countries,
      books_coverage_pct: data.books_coverage_pct,
      unique_authors: data.unique_authors,
      cache_hits: data.cache_hits,
      cache_misses: data.cache_misses,
      duration_ms: data.duration_ms
    }

    // Get today's date for filename
    const today = new Date().toISOString().split('T')[0]
    const logDir = join(process.cwd(), 'logs')
    const logFile = join(logDir, `enrichment-${today}.log`)

    // Create logs directory if it doesn't exist
    try {
      await mkdir(logDir, { recursive: true })
    } catch {
      // Directory might already exist
    }

    // Append log entry as JSON line
    const logLine = JSON.stringify(logEntry) + '\n'
    await writeFile(logFile, logLine, { flag: 'a' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error writing enrichment log:', error)
    return NextResponse.json(
      { error: 'Failed to write log' },
      { status: 500 }
    )
  }
}
