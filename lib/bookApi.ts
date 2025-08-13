import { Book } from '../types/book'
import { detectCountriesForBook } from './countryDetection'

// Simple Google Books API wrapper
export const searchBookByISBN = async (isbn: string): Promise<Partial<Book> | null> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) return null
    
    const book = data.items[0].volumeInfo
    
    return {
      yearPublished: book.publishedDate ? 
        parseInt(book.publishedDate.split('-')[0]) : null,
      numberOfPages: book.pageCount || null,
      coverImage: book.imageLinks?.thumbnail ? `${book.imageLinks.thumbnail}&fife=w800` : null,
      language: book.language || null,
      subtitle: book.subtitle || null,
      description: book.description || null,
      publisher: book.publisher || null
    }
  } catch (error) {
    console.error('Error fetching book data:', error)
    return null
  }
}

export const searchBookByTitle = async (title: string, authors: string): Promise<Partial<Book> | null> => {
  try {
    const query = `${title} ${authors}`.replace(/\s+/g, ' ')
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) return null
    
    const book = data.items[0].volumeInfo
    
    return {
      isbn13: book.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || null,
      yearPublished: book.publishedDate ? 
        parseInt(book.publishedDate.split('-')[0]) : null,
      numberOfPages: book.pageCount || null,
      coverImage: book.imageLinks?.thumbnail ? `${book.imageLinks.thumbnail}&fife=w800` : null,
      language: book.language || null,
      subtitle: book.subtitle || null,
      description: book.description || null,
      publisher: book.publisher || null
    }
  } catch (error) {
    console.error('Error searching book:', error)
    return null
  }
}

// Fill missing data for a book
export const fillMissingBookData = async (book: Book): Promise<Book> => {
  const updatedBook = { ...book }
  
  // If we have ISBN, try to get data by ISBN first
  if (book.isbn13) {
    const isbnData = await searchBookByISBN(book.isbn13)
    if (isbnData) {
      Object.assign(updatedBook, isbnData)
    }
  }
  
  // If we still need data, try searching by title
  if (!updatedBook.isbn13 || !updatedBook.yearPublished) {
    const titleData = await searchBookByTitle(book.title, book.authors)
    if (titleData) {
      Object.assign(updatedBook, titleData)
    }
  }
  
  // Detect countries for the book
  try {
    const countries = await detectCountriesForBook(updatedBook)
    updatedBook.bookCountries = countries.bookCountries
    updatedBook.authorCountries = countries.authorCountries
    
    if (countries.bookCountries.length > 0 || countries.authorCountries.length > 0) {
      console.log(`🌍 Detected countries for "${updatedBook.title}":`, {
        bookCountries: countries.bookCountries,
        authorCountries: countries.authorCountries
      })
    }
  } catch (error) {
    console.warn(`Error detecting countries for "${updatedBook.title}":`, error)
  }
  
  return updatedBook
}

// Fill missing data for multiple books (with rate limiting)
export const fillMissingDataForBooks = async (books: Book[]): Promise<Book[]> => {
  const booksNeedingData = books.filter(book => 
    !book.isbn13 || !book.yearPublished || 
    book.bookCountries.length === 0 || book.authorCountries.length === 0
  )
  
  console.log(`Found ${booksNeedingData.length} books needing data`)
  
  const updatedBooks = [...books]
  
  for (let i = 0; i < booksNeedingData.length; i++) {
    const book = booksNeedingData[i]
    console.log(`[${i + 1}/${booksNeedingData.length}] Filling data for: "${book.title}"`)
    
    try {
      const filledBook = await fillMissingBookData(book)
      
      // Update the book in our array
      const index = updatedBooks.findIndex(b => 
        b.title === book.title && b.authors === book.authors
      )
      if (index !== -1) {
        updatedBooks[index] = filledBook
      }
      
      // Rate limiting - wait 1 second between requests
      if (i < booksNeedingData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`Error filling data for "${book.title}":`, error)
    }
  }
  
  return updatedBooks
} 