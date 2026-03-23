import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { detectAuthorCountriesByName } from '../../../../lib/countryDetection'
import { normalizeAuthorName } from '../../../../lib/authorUtils'

export const dynamic = 'force-dynamic'

// Concurrency limiter with optional delay between requests
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  delayMs: number = 100
): Promise<T[]> {
  const results: T[] = []
  let running = 0
  let completed = 0

  return new Promise((resolve, reject) => {
    const execute = async (index: number) => {
      running++
      try {
        results[index] = await tasks[index]()
        completed++
      } catch (error) {
        reject(error)
      }
      running--

      // Add delay between requests to be polite to external APIs
      if (completed < tasks.length) {
        await new Promise(r => setTimeout(r, delayMs))
      }

      // Start next task if available and under limit
      if (completed < tasks.length && running < maxConcurrent) {
        execute(completed)
      }

      // Resolve when all tasks complete
      if (completed === tasks.length && running === 0) {
        resolve(results)
      }
    }

    // Start initial batch
    const initialTasks = Math.min(maxConcurrent, tasks.length)
    for (let i = 0; i < initialTasks; i++) {
      execute(i)
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { authors }: { authors: string[] } = await request.json()

    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: authors array required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Resolving ${authors.length} authors...`)

    const results: Record<string, string[]> = {}
    const cacheMisses: string[] = []

    // Step 1: Check cache for all authors
    for (const authorName of authors) {
      const normalized = normalizeAuthorName(authorName)
      if (!normalized) continue

      try {
        const cached = await prisma.authorCache.findUnique({
          where: { normalizedName: normalized }
        })

        if (cached && cached.resolved) {
          results[authorName] = cached.countries
          console.log(`✅ Cache hit: ${authorName} → ${cached.countries.join(', ')}`)
        } else {
          cacheMisses.push(authorName)
        }
      } catch (dbError) {
        // DB unavailable — treat as cache miss
        Sentry.captureMessage('db_unavailable', 'warning' as any, {
          tags: { component: 'db', operation: 'cache_read' },
          extra: { route: '/api/authors/batch-resolve', error_message: String(dbError) }
        })
        cacheMisses.push(authorName)
      }
    }

    console.log(`📊 Cache hits: ${Object.keys(results).length}, misses: ${cacheMisses.length}`)

    // Step 2: Resolve cache misses from Wikidata (with concurrency limit of 2, 150ms delay between requests)
    const tasks = cacheMisses.map(authorName => async () => {
      const normalized = normalizeAuthorName(authorName)
      if (!normalized) return

      try {
        console.log(`🌐 Fetching from Wikidata: ${authorName}`)
        const countries = await detectAuthorCountriesByName(authorName)

        // Store in cache (best-effort — ignore DB errors)
        try {
          await prisma.authorCache.upsert({
            where: { normalizedName: normalized },
            update: {
              countries: countries,
              resolved: countries.length > 0
            },
            create: {
              name: authorName,
              normalizedName: normalized,
              countries: countries,
              resolved: countries.length > 0,
              source: 'wikidata'
            }
          })
        } catch (dbError) {
          Sentry.captureMessage('db_unavailable', 'warning' as any, {
            tags: { component: 'db', operation: 'cache_write' },
            extra: { route: '/api/authors/batch-resolve', error_message: String(dbError) }
          })
        }

        results[authorName] = countries
        console.log(`💾 Cached: ${authorName} → ${countries.join(', ') || 'none'}`)
      } catch (error) {
        console.error(`❌ Failed to resolve ${authorName}:`, error)
        results[authorName] = []
      }
    })

    // Execute with concurrency limit (max 2 parallel, 150ms delay between requests)
    // Timeout is 9 seconds (Vercel Hobby hard limit is 10s)
    await Promise.race([
      withConcurrencyLimit(tasks, 2, 150),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 9000))
    ]).catch(() => {
      console.warn('⚠️ Some authors timed out, returning partial results')
    })

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: authors.length,
        cacheHits: authors.length - cacheMisses.length,
        cacheMisses: cacheMisses.length
      }
    })
  } catch (error) {
    console.error('Error in batch-resolve:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
