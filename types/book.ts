export type Book = {
  // Required fields (marked with *)
  title: string
  authors: string
  isbn13: string | null
  yearPublished: number | null
  bookCountries: string[]
  authorCountries: string[]
  
  // Optional fields from CSV
  readStatus: 'read' | 'to_read'
  readDate: Date | null
  avgRating: number | null
  myRating: number | null
  numberOfPages: number | null
  bookshelves: string[]
  
  // Enhanced metadata from Google Books API
  coverImage: string | null
  language: string | null
  subtitle: string | null
  description: string | null
  publisher: string | null
  
  // Metadata
  source: 'goodreads' | 'storygraph'
  originalData: Record<string, any> // Keep original CSV row for debugging
}

export type CSVFormat = 'goodreads' | 'storygraph'

// Simple utility to clean ISBN-13
export const cleanISBN = (isbn: string): string | null => {
  if (!isbn || isbn.trim() === '') return null
  
  // Remove Excel formatting: ="9781234567890" -> 9781234567890
  let cleaned = isbn.replace(/^="?"?|"?$/g, '')
  
  // Remove any non-digit characters
  cleaned = cleaned.replace(/[^\d]/g, '')
  
  // Must be 13 digits and start with 978 or 979
  if (cleaned.length === 13 && (cleaned.startsWith('978') || cleaned.startsWith('979'))) {
    return cleaned
  }
  
  return null
}

// Parse date from various formats
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    // Handle StoryGraph format: "2023/07/04-2023/07/24" -> take last date
    if (dateStr.includes('-')) {
      const lastDate = dateStr.split('-').pop()?.trim()
      if (lastDate) {
        // Convert YYYY/MM/DD to YYYY-MM-DD
        const formattedDate = lastDate.replace(/\//g, '-')
        return new Date(formattedDate)
      }
    }
    
    // Handle Goodreads format: "2023/07/24" or "2023-07-24"
    const normalizedDate = dateStr.replace(/\//g, '-')
    return new Date(normalizedDate)
  } catch (error) {
    console.warn('Failed to parse date:', dateStr)
    return null
  }
}

// Parse read status
export const parseReadStatus = (value: string, source: CSVFormat): 'read' | 'to_read' => {
  const normalized = (value || '').trim().toLowerCase()
  
  if (source === 'goodreads') {
    return normalized === 'read' ? 'read' : 'to_read'
  }
  
  const readValues = new Set(['1', 'read', 'finished', 'complete', 'completed'])
  return readValues.has(normalized) ? 'read' : 'to_read'
}
