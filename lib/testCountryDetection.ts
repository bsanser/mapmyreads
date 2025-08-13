// Test file for country detection
import { Book } from '../types/book'
import { detectCountriesForBook, mapCountryNameForDisplay, mapDisplayNameToCountry } from './countryDetection'

// Sample books for testing
const testBooks: Book[] = [
  {
    title: "The Paris Wife",
    authors: "Paula McLain",
    isbn13: "9780345521309",
    yearPublished: 2011,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read',
    readDate: new Date('2023-01-15'),
    avgRating: 3.8,
    myRating: 4,
    numberOfPages: 336,
    bookshelves: [],
    source: 'goodreads',
    originalData: {}
  },
  {
    title: "One Hundred Years of Solitude",
    authors: "Gabriel García Márquez",
    isbn13: "9780060883287",
    yearPublished: 1967,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read',
    readDate: new Date('2023-02-20'),
    avgRating: 4.1,
    myRating: 5,
    numberOfPages: 417,
    bookshelves: [],
    source: 'goodreads',
    originalData: {}
  },
  {
    title: "The Kite Runner",
    authors: "Khaled Hosseini",
    isbn13: "9781594631931",
    yearPublished: 2003,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read',
    readDate: new Date('2023-03-10'),
    avgRating: 4.3,
    myRating: 4,
    numberOfPages: 371,
    bookshelves: [],
    source: 'goodreads',
    originalData: {}
  },
  {
    title: "Norwegian Wood",
    authors: "Haruki Murakami",
    isbn13: "9780375704024",
    yearPublished: 1987,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read',
    readDate: new Date('2023-04-05'),
    avgRating: 4.0,
    myRating: 4,
    numberOfPages: 296,
    bookshelves: [],
    source: 'goodreads',
    originalData: {}
  }
]

// Test function
export const testCountryDetection = async () => {
  console.log('🧪 Testing Country Detection System...\n')
  
  for (const book of testBooks) {
    console.log(`📖 Testing: "${book.title}" by ${book.authors}`)
    console.log(`   ISBN: ${book.isbn13}`)
    
    try {
      const countries = await detectCountriesForBook(book)
      
      console.log(`   📍 Book Countries: ${countries.bookCountries.length > 0 ? countries.bookCountries.join(', ') : 'None detected'}`)
      console.log(`   👤 Author Countries: ${countries.authorCountries.length > 0 ? countries.authorCountries.join(', ') : 'None detected'}`)
      
      if (countries.bookCountries.length === 0 && countries.authorCountries.length === 0) {
        console.log(`   ⚠️  No countries detected - this might be expected for some books`)
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`)
    }
    
    console.log('') // Empty line for readability
  }
  
  console.log('✅ Country detection test completed!')
}

// Test country name mapping
export const testCountryMapping = () => {
  console.log('🧪 Testing Country Name Mapping...\n')
  
  const testCases = [
    { original: 'United States', expected: 'United States of America' },
    { original: 'Czech Republic', expected: 'Czechia' },
    { original: 'Democratic Republic of the Congo', expected: 'Dem. Rep. Congo' },
    { original: 'France', expected: 'France' }, // No mapping
    { original: 'Germany', expected: 'Germany' } // No mapping
  ]
  
  for (const testCase of testCases) {
    const mapped = mapCountryNameForDisplay(testCase.original)
    const reverseMapped = mapDisplayNameToCountry(mapped)
    
    console.log(`📍 Original: "${testCase.original}"`)
    console.log(`   Mapped: "${mapped}"`)
    console.log(`   Expected: "${testCase.expected}"`)
    console.log(`   Reverse mapped: "${reverseMapped}"`)
    console.log(`   ✅ Mapping correct: ${mapped === testCase.expected}`)
    console.log(`   ✅ Reverse mapping correct: ${reverseMapped === testCase.original}`)
    console.log('')
  }
  
  console.log('✅ Country mapping test completed!')
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - expose function globally
  (window as any).testCountryDetection = testCountryDetection
  ;(window as any).testCountryMapping = testCountryMapping
} 