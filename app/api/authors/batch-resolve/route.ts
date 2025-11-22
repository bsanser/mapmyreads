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

      const cached = await prisma.authorCache.findUnique({
        where: { normalizedName: normalized }
      })

      if (cached) {
        results[authorName] = cached.countries
        console.log(`✅ Cache hit: ${authorName} → ${cached.countries.join(', ')}`)
      } else {
        cacheMisses.push(authorName)
      }
    }

    console.log(`📊 Cache hits: ${Object.keys(results).length}, misses: ${cacheMisses.length}`)

    // Step 2: Resolve cache misses from Wikidata
    for (const authorName of cacheMisses) {
      const normalized = normalizeAuthorName(authorName)
      if (!normalized) continue

      try {
        console.log(`🌐 Fetching from Wikidata: ${authorName}`)
        const countries = await detectAuthorCountriesByName(authorName)
        
        // Store in cache
        await prisma.authorCache.create({
          data: {
            name: authorName,
            normalizedName: normalized,
            countries: countries,
            source: 'wikidata'
          }
        })

        results[authorName] = countries
        console.log(`💾 Cached: ${authorName} → ${countries.join(', ') || 'none'}`)
      } catch (error) {
        console.error(`❌ Failed to resolve ${authorName}:`, error)
        results[authorName] = []
      }
    }

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
