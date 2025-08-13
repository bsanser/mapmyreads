import { Book, CSVFormat, cleanISBN, parseDate, parseReadStatus } from '../types/book'

// Detect CSV format based on headers
export const detectCSVFormat = (headers: string[]): CSVFormat => {
  const headerStr = headers.join(',').toLowerCase()
  
  if (headerStr.includes('exclusive shelf') && headerStr.includes('author')) {
    return 'goodreads'
  }
  
  if (headerStr.includes('read status') && headerStr.includes('authors')) {
    return 'storygraph'
  }
  
  throw new Error('Unknown CSV format. Please upload a Goodreads or StoryGraph export.')
}

// Parse Goodreads CSV row
const parseGoodreadsRow = (row: Record<string, string>): Book => {
  const isbn13 = cleanISBN(row['ISBN13'] || '')
  const yearPublished = row['Original Publication Year'] ? 
    parseInt(row['Original Publication Year']) : null
  
  return {
    // Required fields
    title: row['Title']?.trim() || 'Untitled',
    authors: row['Author']?.trim() || 'Unknown',
    isbn13,
    yearPublished,
    bookCountries: [], // Will be filled later
    authorCountries: [], // Will be filled later
    
    // Optional fields
    readStatus: parseReadStatus(row['Exclusive Shelf'] || '', 'goodreads'),
    readDate: parseDate(row['Date Read'] || ''),
    avgRating: row['Average Rating'] ? parseFloat(row['Average Rating']) : null,
    myRating: row['My Rating'] ? parseInt(row['My Rating']) : null,
    numberOfPages: row['Number of Pages'] ? parseInt(row['Number of Pages']) : null,
    bookshelves: row['Bookshelves'] ? row['Bookshelves'].split(',').map(s => s.trim()) : [],
    
    // Enhanced metadata (will be filled by Google Books API)
    coverImage: null,
    language: null,
    subtitle: null,
    description: null,
    publisher: null,
    
    // Metadata
    source: 'goodreads',
    originalData: row
  }
}

// Parse StoryGraph CSV row
const parseStoryGraphRow = (row: Record<string, string>): Book => {
  const isbn13 = cleanISBN(row['ISBN/UID'] || '')
  const yearPublished = null // StoryGraph doesn't have this field
  
  return {
    // Required fields
    title: row['Title']?.trim() || 'Untitled',
    authors: row['Authors']?.trim() || 'Unknown',
    isbn13,
    yearPublished,
    bookCountries: [], // Will be filled later
    authorCountries: [], // Will be filled later
    
    // Optional fields
    readStatus: parseReadStatus(row['Read Status'] || '', 'storygraph'),
    readDate: parseDate(row['Dates Read'] || ''),
    avgRating: null, // StoryGraph doesn't have this
    myRating: row['Star Rating'] ? parseInt(row['Star Rating']) : null,
    numberOfPages: null, // StoryGraph doesn't have this
    bookshelves: [],
    
    // Metadata
    source: 'storygraph',
    originalData: row
  }
}

// Main parser function
export const parseCSVRow = (row: Record<string, string>, format: CSVFormat): Book => {
  switch (format) {
    case 'goodreads':
      return parseGoodreadsRow(row)
    case 'storygraph':
      return parseStoryGraphRow(row)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

// Parse entire CSV data
export const parseCSVData = (data: Record<string, string>[], format: CSVFormat): Book[] => {
  return data
    .map(row => parseCSVRow(row, format))
    .filter(book => book.title !== 'Untitled' && book.authors !== 'Unknown') // Filter out invalid rows
}

// Get books that need missing data (required fields that are null/empty)
export const getBooksNeedingData = (books: Book[]): Book[] => {
  return books.filter(book => 
    !book.isbn13 || 
    !book.yearPublished || 
    book.bookCountries.length === 0 || 
    book.authorCountries.length === 0
  )
} 