import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { detectAuthorCountriesByName } from '../../../../lib/countryDetection'
import { normalizeAuthorName } from '../../../../lib/authorUtils'

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

        if (cached) {
          results[authorName] = cached.countries
          console.log(`✅ Cache hit: ${authorName} → ${cached.countries.join(', ')}`)
        } else {
          cacheMisses.push(authorName)
        }
      } catch {
        // DB unavailable — treat as cache miss
        cacheMisses.push(authorName)
      }
    }

    console.log(`📊 Cache hits: ${Object.keys(results).length}, misses: ${cacheMisses.length}`)

    // Step 2: Resolve cache misses from Wikidata (in parallel with limit)
    const resolvePromises = cacheMisses.map(async (authorName) => {
      const normalized = normalizeAuthorName(authorName)
      if (!normalized) return

      try {
        console.log(`🌐 Fetching from Wikidata: ${authorName}`)
        const countries = await detectAuthorCountriesByName(authorName)
        
        // Store in cache (best-effort — ignore DB errors)
        try {
          await prisma.authorCache.create({
            data: {
              name: authorName,
              normalizedName: normalized,
              countries: countries,
              source: 'wikidata'
            }
          })
        } catch { /* cache write failure is non-fatal */ }

        results[authorName] = countries
        console.log(`💾 Cached: ${authorName} → ${countries.join(', ') || 'none'}`)
      } catch (error) {
        console.error(`❌ Failed to resolve ${authorName}:`, error)
        results[authorName] = []
      }
    })

    // Wait for all with a timeout of 25 seconds (Vercel limit is 30s)
    await Promise.race([
      Promise.all(resolvePromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 25000))
    ]).catch(error => {
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
