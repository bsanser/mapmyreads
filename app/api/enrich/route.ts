// app/api/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'

// Helper: given an ISBN13 or title, return an array of country codes.
async function lookupCountries(isbn13?: string, title?: string): Promise<string[]> {
  let data: any

  if (isbn13) {
    // 1) Try OpenLibrary ISBN endpoint
    const res = await fetch(`https://openlibrary.org/isbn/${isbn13}.json`)
    if (res.ok) {
      data = await res.json()
      // subjects might include “Nigeria—Fiction” ⇒ extract country
      const places = (data.subject_people || data.subject_places || []).filter(
        (s: string) => s.match(/—/) && !s.includes('Fiction')
      )
      // e.g. “United States—Fiction” ⇒ “United States”
      return places.map((s: string) => s.split('—')[0]).map(normalizeToISO2)
    }
  }

  if (title) {
    // 2) Fall back to Search API by title
    const q = encodeURIComponent(title)
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=1`)
    if (res.ok) {
      const docs = (await res.json()).docs
      if (docs.length) {
        const doc = docs[0]
        // doc.subject_places is array of place names
        const places = doc.subject_places || []
        return places.map(normalizeToISO2)
      }
    }
  }

  return []
}

// Stub: map country names => ISO Alpha-2 codes (you’d use a proper library)
function normalizeToISO2(place: string): string {
  const map: Record<string,string> = {
    'United States': 'US',
    'Great Britain': 'GB',
    'England': 'GB',
    'Nigeria': 'NG',
    'Spain': 'ES',
    // …add more or use iana's country-list npm package
  }
  return map[place] || ''
}

export async function POST(req: NextRequest) {
  const { isbn13, title } = await req.json()
  const countries = await lookupCountries(isbn13, title)
  return NextResponse.json({ countries })
}
