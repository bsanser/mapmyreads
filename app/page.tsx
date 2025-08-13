'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { MapLibreMap, assignMockCountriesToBooks } from '../components/MapLibreMap';
import { ShareButton } from '../components/ShareButton'
import { FeedbackButton } from '../components/FeedbackButton'
import { BuyMeACoffee } from '../components/BuyMeACoffee'
import { StorageStatus } from '../components/StorageStatus'
import { Book } from '../types/book'
import { detectCSVFormat, parseCSVData } from '../lib/csvParser'
import { fillMissingDataForBooks } from '../lib/bookApi'
import { saveProcessedBooks, loadProcessedBooks, hasShareableData, saveShareableData } from '../lib/storage'
import { startMapLoadTimer, endMapLoadTimer, logMapEvent, savePerformanceLogs } from '../lib/performanceLogger'
import { testCountryDetection } from '../lib/testCountryDetection'
import { mapCountryNameForDisplay, mapDisplayNameToCountry } from '../lib/countryDetection'

const ISBN_COUNTRY_TEST_DATA: Record<string, string[]> = {
  '9789681311889': ['ES'], // e.g. Los renglones torcidos de Dios
}

const TEST_COUNTRIES = ['Egypt', 'Spain', 'Brazil']

// TEST: pick one mock country per book
function getMockCountries(): string[] {
  const rand =
    TEST_COUNTRIES[Math.floor(Math.random() * TEST_COUNTRIES.length)]
  return [rand]
}

// Add country to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  'Spain': '🇪🇸',
  'Brazil': '🇧🇷',
  'Egypt': '🇪🇬',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Italy': '🇮🇹',
  'Japan': '🇯🇵',
  'China': '🇨🇳',
  'India': '🇮🇳',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'Mexico': '🇲🇽',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'Colombia': '🇨🇴',
  'Peru': '🇵🇪',
  'Venezuela': '🇻🇪',
  'Uruguay': '🇺🇾',
  'Paraguay': '🇵🇾',
  'Bolivia': '🇧🇴',
  'Ecuador': '🇪🇨',
  'Guyana': '🇬🇾',
  'Suriname': '🇸🇷',
  'French Guiana': '🇬🇫',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Iceland': '🇮🇸',
  'Ireland': '🇮🇪',
  'Poland': '🇵🇱',
  'Czech Republic': '🇨🇿',
  'Slovakia': '🇸🇰',
  'Hungary': '🇭🇺',
  'Romania': '🇷🇴',
  'Bulgaria': '🇧🇬',
  'Greece': '🇬🇷',
  'Croatia': '🇭🇷',
  'Slovenia': '🇸🇮',
  'Serbia': '🇷🇸',
  'Bosnia and Herzegovina': '🇧🇦',
  'Montenegro': '🇲🇪',
  'Albania': '🇦🇱',
  'North Macedonia': '🇲🇰',
  'Kosovo': '🇽🇰',
  'Moldova': '🇲🇩',
  'Ukraine': '🇺🇦',
  'Belarus': '🇧🇾',
  'Lithuania': '🇱🇹',
  'Latvia': '🇱🇻',
  'Estonia': '🇪🇪',
  'Russia': '🇷🇺',
  'Turkey': '🇹🇷',
  'Georgia': '🇬🇪',
  'Armenia': '🇦🇲',
  'Azerbaijan': '🇦🇿',
  'Iran': '🇮🇷',
  'Iraq': '🇮🇶',
  'Syria': '🇸🇾',
  'Lebanon': '🇱🇧',
  'Israel': '🇮🇱',
  'Palestine': '🇵🇸',
  'Jordan': '🇯🇴',
  'Saudi Arabia': '🇸🇦',
  'Yemen': '🇾🇪',
  'Oman': '🇴🇲',
  'United Arab Emirates': '🇦🇪',
  'Qatar': '🇶🇦',
  'Kuwait': '🇰🇼',
  'Bahrain': '🇧🇭',
  'Kazakhstan': '🇰🇿',
  'Uzbekistan': '🇺🇿',
  'Turkmenistan': '🇹🇲',
  'Kyrgyzstan': '🇰🇬',
  'Tajikistan': '🇹🇯',
  'Afghanistan': '🇦🇫',
  'Pakistan': '🇵🇰',
  'Bangladesh': '🇧🇩',
  'Sri Lanka': '🇱🇰',
  'Nepal': '🇳🇵',
  'Bhutan': '🇧🇹',
  'Myanmar': '🇲🇲',
  'Thailand': '🇹🇭',
  'Laos': '🇱🇦',
  'Cambodia': '🇰🇭',
  'Vietnam': '🇻🇳',
  'Malaysia': '🇲🇾',
  'Singapore': '🇸🇬',
  'Indonesia': '🇮🇩',
  'Philippines': '🇵🇭',
  'Brunei': '🇧🇳',
  'East Timor': '🇹🇱',
  'Papua New Guinea': '🇵🇬',
  'Fiji': '🇫🇯',
  'New Zealand': '🇳🇿',
  'South Africa': '🇿🇦',
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'Ethiopia': '🇪🇹',
  'Tanzania': '🇹🇿',
  'Uganda': '🇺🇬',
  'Ghana': '🇬🇭',
  'Morocco': '🇲🇦',
  'Algeria': '🇩🇿',
  'Tunisia': '🇹🇳',
  'Libya': '🇱🇾',
  'Sudan': '🇸🇩',
  'South Sudan': '🇸🇸',
  'Chad': '🇹🇩',
  'Niger': '🇳🇪',
  'Mali': '🇲🇱',
  'Burkina Faso': '🇧🇫',
  'Senegal': '🇸🇳',
  'Guinea': '🇬🇳',
  'Sierra Leone': '🇸🇱',
  'Liberia': '🇱🇷',
  'Ivory Coast': '🇨🇮',
  'Togo': '🇹🇬',
  'Benin': '🇧🇯',
  'Cameroon': '🇨🇲',
  'Central African Republic': '🇨🇫',
  'Gabon': '🇬🇦',
  'Congo': '🇨🇬',
  'Democratic Republic of the Congo': '🇨🇩',
  'Angola': '🇦🇴',
  'Zambia': '🇿🇲',
  'Zimbabwe': '🇿🇼',
  'Botswana': '🇧🇼',
  'Namibia': '🇳🇦',
  'Lesotho': '🇱🇸',
  'Eswatini': '🇸🇿',
  'Madagascar': '🇲🇬',
  'Mauritius': '🇲🇺',
  'Seychelles': '🇸🇨',
  'Comoros': '🇰🇲',
  'Cape Verde': '🇨🇻',
  'São Tomé and Príncipe': '🇸🇹',
  'Equatorial Guinea': '🇬🇶',
  'Guinea-Bissau': '🇬🇼',
  'The Gambia': '🇬🇲',
  'Mauritania': '🇲🇷',
  'Djibouti': '🇩🇯',
  'Eritrea': '🇪🇷',
  'Somalia': '🇸🇴',
  'Burundi': '🇧🇮',
  'Rwanda': '🇷🇼',
  'Malawi': '🇲🇼',
  'Mozambique': '🇲🇿',
  'Cuba': '🇨🇺',
  'Jamaica': '🇯🇲',
  'Haiti': '🇭🇹',
  'Dominican Republic': '🇩🇴',
  'Puerto Rico': '🇵🇷',
  'Trinidad and Tobago': '🇹🇹',
  'Barbados': '🇧🇧',
  'Grenada': '🇬🇩',
  'Saint Vincent and the Grenadines': '🇻🇨',
  'Saint Lucia': '🇱🇨',
  'Dominica': '🇩🇲',
  'Antigua and Barbuda': '🇦🇬',
  'Saint Kitts and Nevis': '🇰🇳',
  'Bahamas': '🇧🇸',
  'Belize': '🇧🇿',
  'Guatemala': '🇬🇹',
  'El Salvador': '🇸🇻',
  'Honduras': '🇭🇳',
  'Nicaragua': '🇳🇮',
  'Costa Rica': '🇨🇷',
  'Panama': '🇵🇦',
  'Greenland': '🇬🇱',
  'Faroe Islands': '🇫🇴',
  'Andorra': '🇦🇩',
  'Liechtenstein': '🇱🇮',
  'Monaco': '🇲🇨',
  'San Marino': '🇸🇲',
  'Vatican City': '🇻��',
  'Malta': '🇲🇹',
  'Cyprus': '🇨🇾',
  'Luxembourg': '🇱🇺',
}

function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country] || '🏳️'
}





export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [showDeveloperMode, setShowDeveloperMode] = useState(false)
  const [error, setError] = useState<string>('')
  const [booksToShow, setBooksToShow] = useState<number>(10)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [countryViewMode, setCountryViewMode] = useState<'author' | 'book'>('book')
  const [isProcessing, setIsProcessing] = useState(false)
  const booksLoadedRef = useRef(false)

  // Temporary function for country clicks while testing MapLibre
  const onCountryClick = (country: string) => {
    setSelectedCountry(country)
  }

  // Load processed books on component mount
  useEffect(() => {
    // Prevent duplicate loading
    if (booksLoadedRef.current) return
    booksLoadedRef.current = true

    try {
      // Check for shareable data first
      if (hasShareableData()) {
        logMapEvent('loading_shareable_data')
        saveShareableData()
      }

      // Load from localStorage
      const processedBooks = loadProcessedBooks()
      if (processedBooks && processedBooks.length > 0) {
        logMapEvent('books_loaded_from_storage', { 
          bookCount: processedBooks.length,
          hasCountries: processedBooks.some(book => book.bookCountries.length > 0)
        })
        setBooks(processedBooks)
      }
    } catch (error) {
      console.error('Error loading books:', error)
      logMapEvent('storage_load_error', { error: error.message })
    }
  }, [])

  // ❶ Build a Set of all countries from your books based on view mode
  const highlighted = new Set<string>(
    books.flatMap((b) => 
      countryViewMode === 'author' ? b.authorCountries : b.bookCountries
    ).map(mapCountryNameForDisplay)
  )

  // Filter books based on selected country and view mode
  const filteredBooks = selectedCountry
    ? books.filter((book) => {
        const countries = countryViewMode === 'author' ? book.authorCountries : book.bookCountries
        return countries.includes(selectedCountry)
      })
    : books

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setIsProcessing(true)
    const file = e.target.files?.[0]
    if (!file) return

    // Start performance timer for map loading
    startMapLoadTimer()
    logMapEvent('file_upload_start', { fileName: file.name, fileSize: file.size })

    try {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async ({ data, meta }) => {
          try {
            // Detect CSV format
            const format = detectCSVFormat(meta.fields || [])

            // Parse books
            let parsedBooks = parseCSVData(data, format)

            // Assign mock countries to all books
            parsedBooks = assignMockCountriesToBooks(parsedBooks)
            
            // Separate read and unread books
            const readBooks = parsedBooks.filter(book => book.readStatus === 'read')
            const unreadBooks = parsedBooks.filter(book => book.readStatus === 'to_read')
            
            // IMPORTANT: Only read books are processed for the map
            // Unread books are ignored as they don't represent your reading journey

            // Process read books first to get countries for the map
            if (readBooks.length > 0) {
              logMapEvent('read_books_processing_start', { readBookCount: readBooks.length })
              
              const enrichedReadBooks = await fillMissingDataForBooks(readBooks)
              setBooks(enrichedReadBooks)
              saveProcessedBooks(enrichedReadBooks)
              setIsProcessing(false)
              
              // End timer and log map ready
              endMapLoadTimer({ 
                bookCount: enrichedReadBooks.length,
                readBookCount: readBooks.length,
                unreadBookCount: 0, // No unread books processed
                hasCountries: enrichedReadBooks.some(book => book.bookCountries.length > 0)
              })
              logMapEvent('map_ready', { 
                bookCount: enrichedReadBooks.length,
                readBookCount: readBooks.length,
                note: 'Only read books included in map'
              })
              
            }

            // Note: Only processing read books for the map
            // Unread books are not included as they don't represent your reading journey
          } catch (err) {
            console.error('Processing error:', err)
            setError('Could not process CSV—please check its format.')
            setIsProcessing(false)
          }
        },
        error: (err) => {
          console.error('Parse error:', err)
          setError('Failed to read file. Make sure it\'s a valid CSV.')
          setIsProcessing(false)
        },
      })
    } catch (error) {
      console.error('File handling error:', error)
      setError('Failed to read file.')
      setIsProcessing(false)
    }
  }

  // If no books yet, show hero/upload screen
  if (books.length === 0) {
    return (
      <div
        className="relative min-h-screen font-mono overflow-hidden"
        style={{
          backgroundImage: "url('/vintage_world_map.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="text-center max-w-2xl">
            {/* Icon */}
            <div className="w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-8 border border-gray-300 shadow-lg">
              <svg
                className="w-16 h-16 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Map Your Reading Journey</h1>
                          <p className="text-xl text-gray-600 mb-8">
                Upload your reading list to visualize the countries and cultures you&apos;ve explored through literature
              </p>

            {/* Export Instructions */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 px-6 py-4 rounded-lg mb-8 shadow-sm">
              <h3 className="font-semibold mb-3 text-gray-900">How to export your reading list:</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Goodreads:</strong> Go to your <a href="https://www.goodreads.com/review/import" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 transition-colors">Goodreads Import/Export page</a> and download your library</p>
                <p><strong>StoryGraph:</strong> Visit <a href="https://app.thestorygraph.com/user-export" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 transition-colors">The StoryGraph Export page</a> to download your data</p>
              </div>
            </div>

            <StorageStatus />
            
            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4">
                <span className="font-medium">{error}</span>
              </div>
            )}

                          {isProcessing && (
                <div className="bg-gray-50/90 backdrop-blur-sm border border-gray-200 text-gray-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="font-medium">Processing your books and enriching your data...</span>
                </div>
              )}



            <label className="block cursor-pointer">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-10 hover:bg-white/95 transition-all">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-16 px-8 hover:border-gray-400 transition-colors group">
                  <svg className="w-8 h-8 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3-3m3 3l3-3" />
                  </svg>
                  <p className="text-xl font-semibold text-gray-800 mb-3">Upload your reading list</p>
                  <p className="text-gray-600 mb-8 text-center max-w-md">CSV files from Goodreads or StoryGraph</p>
                  <div className="bg-gray-900 text-white px-8 py-3 rounded font-medium hover:bg-gray-800 transition-colors">
                    Choose File
                  </div>
                </div>
                <input type="file" accept=".csv" onChange={handleFile} className="sr-only" />
              </div>
            </label>
                  </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-600 text-sm">
                Made with ❤️ for book lovers around the world
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Upload your reading list • Share your journey • Explore the world through books
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowDeveloperMode(!showDeveloperMode)}
                className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                title="Toggle developer mode"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Dev
              </button>
              <BuyMeACoffee />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

    // Books loaded layout
    return (
      <div className="h-screen relative w-full bg-gray-50 overflow-hidden">
        {/* Header - Overlay on mobile, normal on desktop */}
        <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:sticky lg:top-0 lg:z-50 lg:shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Your Reading Map</h1>
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={() => setCountryViewMode('book')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    countryViewMode === 'book'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Book Settings
                </button>
                <button
                  onClick={() => setCountryViewMode('author')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    countryViewMode === 'author'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Author Origins
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton books={books} />
              <FeedbackButton />
              <BuyMeACoffee />
            </div>
          </div>
        </div>

        {/* Map Container - Full viewport height */}
        <div className="relative w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)]">
          {/* Map takes full space */}
          <div className="w-full h-full relative z-0">
            <MapLibreMap
              highlighted={highlighted}
              selectedCountry={selectedCountry ? mapCountryNameForDisplay(selectedCountry) : null}
              onCountryClick={(countryName) => setSelectedCountry(mapDisplayNameToCountry(countryName))}
              books={books}
            />
          </div>

          {/* Desktop: Reading List Overlay - Left side, overlaying map */}
          <div 
            className="hidden lg:block absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 p-6 w-80 max-h-[calc(100vh-120px)] overflow-auto z-50"
            style={{ zIndex: 50 }}
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const { scrollTop, scrollHeight, clientHeight } = target;
              
              // Load more when user is near bottom (within 100px)
              if (scrollHeight - scrollTop - clientHeight < 100) {
                const readBooksCount = filteredBooks.filter(b => b.readStatus === 'read').length;
                if (booksToShow < readBooksCount) {
                  setBooksToShow(prev => Math.min(prev + 10, readBooksCount));
                }
              }
            }}
          >
            <h2 className="text-lg font-bold mb-4 text-gray-900">Your Read Books</h2>
            <div className="text-sm text-gray-600 mb-4">
              {selectedCountry
                ? `${filteredBooks.filter(b => b.readStatus === 'read').length} books from ${getCountryFlag(selectedCountry)} ${mapCountryNameForDisplay(selectedCountry)}`
                : `${books.filter(b => b.readStatus === 'read').length} read books`}
              {selectedCountry && (
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Show all
                </button>
              )}
            </div>
            <div className="space-y-4">
              {filteredBooks
                .filter(b => b.readStatus === 'read')
                .slice(0, booksToShow)
                .map((b, i) => (
                <div
                  key={`${b.isbn13}-${i}`}
                  className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
                      repeating-linear-gradient(
                        transparent, transparent 24px,
                        rgba(59, 130, 246, 0.2) 24px, rgba(59, 130, 246, 0.2) 25px,
                        transparent 25px, transparent 49px,
                        rgba(220, 38, 38, 0.2) 49px, rgba(220, 38, 38, 0.2) 50px
                      )
                    `,
                    backgroundSize: '100% 100%, 100% 50px',
                    backgroundPosition: '0 0, 0 8px',
                  }}
                >
                  {/* Book cover with paper clip - proper clipping effect */}
                  {b.coverImage && (
                    <div className="absolute top-3 left-3 z-20">
                      <div className="relative">
                        {/* Book cover as the "card" */}
                        <img 
                          src={b.coverImage} 
                          alt={`Cover of ${b.title}`}
                          className="block w-20 h-24 object-cover rounded shadow-md border border-gray-200 relative z-10"
                        />
                        
                        {/* Paper clip - positioned to go over the top edge of the card */}
                        <img 
                          src="/paperclip.svg" 
                          alt=""
                          className="absolute -top-10 -left-4 w-14 h-28 z-30 pointer-events-none"
                          style={{
                            transform: 'rotate(-20deg)'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-red-400"></div>
                  <div className="ml-6 relative z-10 flex-1 min-w-0" style={{ marginLeft: b.coverImage ? '6rem' : '1.5rem' }}>
                    <p className="font-mono text-gray-900 text-sm leading-tight mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.title}</p>
                    <p className="font-mono text-gray-700 text-xs mb-1" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                      by {b.authors}
                      {b.authorCountries.length > 0 && (
                        <span className="ml-1">{b.authorCountries.map(getCountryFlag).join(' ')}</span>
                      )}
                    </p>
                    {b.yearPublished && <p className="font-mono text-gray-600 text-xs mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.yearPublished}</p>}
                    {b.bookCountries.length > 0 && (
                      <div className="font-mono text-gray-600 text-xs" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                        <span className="font-medium">Countries:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {b.bookCountries.map((country) => (
                            <button
                              key={country}
                              onClick={() => onCountryClick(country)}
                              className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors text-xs px-1 py-0.5 rounded hover:bg-blue-50"
                            >
                              {country}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator for infinite scroll */}
              {booksToShow < filteredBooks.filter(b => b.readStatus === 'read').length && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center text-gray-500 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                    Loading more books...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Floating Header Overlay */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Your Reading Map</h1>
            <div className="flex items-center gap-2">
              <ShareButton books={books} className="text-gray-900 bg-white/80 hover:bg-white" />
              <FeedbackButton className="text-gray-900 bg-white/80 hover:bg-white" />
            </div>
          </div>
          
          {/* Mobile: Floating Navigation Toggle */}
          <div className="px-4 pb-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-1 flex border border-gray-200/50">
              <button
                onClick={() => setCountryViewMode('book')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  countryViewMode === 'book'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Book Settings
              </button>
              <button
                onClick={() => setCountryViewMode('author')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  countryViewMode === 'author'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Author Origins
              </button>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: Bottom Sheet for Book List */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30">
          <div className={`bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 transition-all duration-300 ease-out ${
            showBottomSheet ? 'h-[60vh]' : 'h-16'
          }`}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Single Scrollable Container */}
            <div className={`h-full transition-all duration-300 ease-out ${
              showBottomSheet ? 'overflow-y-auto' : 'overflow-hidden'
            }`}>
              {/* Header - Always Visible */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10 cursor-pointer" onClick={() => setShowBottomSheet(!showBottomSheet)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Your Read Books</h2>
                    <div className="text-sm text-gray-600">
                      {selectedCountry
                        ? `${filteredBooks.filter(b => b.readStatus === 'read').length} books from ${getCountryFlag(selectedCountry)} ${mapCountryNameForDisplay(selectedCountry)}`
                        : `${books.filter(b => b.readStatus === 'read').length} read books`}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showBottomSheet ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Book List - Scrollable when expanded */}
              <div 
                className="px-6 py-4 space-y-3"
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  const { scrollTop, scrollHeight, clientHeight } = target;
                  
                  // Load more when user is near bottom (within 100px)
                  if (scrollHeight - scrollTop - clientHeight < 100) {
                    const readBooksCount = filteredBooks.filter(b => b.readStatus === 'read').length;
                    if (booksToShow < readBooksCount) {
                      setBooksToShow(prev => Math.min(prev + 10, readBooksCount));
                    }
                  }
                }}
              >
                <div className="space-y-4">
                  {filteredBooks
                    .filter(b => b.readStatus === 'read')
                    .slice(0, booksToShow)
                    .map((b, i) => (
                    <div
                      key={`${b.isbn13}-${i}`}
                      className="relative bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md transition-all min-h-[120px] flex"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
                          repeating-linear-gradient(
                            transparent, transparent 24px,
                            rgba(59, 130, 246, 0.2) 24px, rgba(59, 130, 246, 0.2) 25px,
                            transparent 25px, transparent 49px,
                            rgba(220, 38, 38, 0.2) 49px, rgba(220, 38, 38, 0.2) 50px
                          )
                        `,
                        backgroundSize: '100% 100%, 100% 50px',
                        backgroundPosition: '0 0, 0 8px',
                      }}
                    >
                      {/* Book cover with paper clip - proper clipping effect */}
                      {b.coverImage && (
                        <div className="absolute top-3 left-3 z-20">
                          <div className="relative">
                            {/* Book cover as the "card" */}
                            <img 
                              src={b.coverImage} 
                              alt={`Cover of ${b.title}`}
                              className="block w-20 h-24 object-cover rounded shadow-md border border-gray-200 relative z-10"
                            />
                            
                            {/* Paper clip - positioned to go over the top edge of the card */}
                            <img 
                              src="/paperclip.svg" 
                              alt=""
                              className="absolute -top-10 -left-4 w-14 h-28 z-30 pointer-events-none"
                              style={{
                                transform: 'rotate(-20deg)'
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-red-400"></div>
                      <div className="ml-6 relative z-10 flex-1 min-w-0" style={{ marginLeft: b.coverImage ? '6rem' : '1.5rem' }}>
                        <p className="font-mono text-gray-900 text-sm leading-tight mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.title}</p>
                        <p className="font-mono text-gray-700 text-xs mb-1" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                          by {b.authors}
                          {b.authorCountries.length > 0 && (
                            <span className="ml-1">{b.authorCountries.map(getCountryFlag).join(' ')}</span>
                          )}
                        </p>
                        {b.yearPublished && <p className="font-mono text-gray-600 text-xs mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.yearPublished}</p>}
                        {b.bookCountries.length > 0 && (
                          <div className="font-mono text-gray-600 text-xs" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                            <span className="font-medium">Countries:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {b.bookCountries.map((country) => (
                                <button
                                  key={country}
                                  onClick={() => onCountryClick(country)}
                                  className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors text-xs px-1 py-0.5 rounded hover:bg-blue-50"
                                >
                                  {country}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator for infinite scroll */}
                  {booksToShow < filteredBooks.filter(b => b.readStatus === 'read').length && (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center text-gray-500 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                        Loading more books...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Developer Tools Panel */}
      {showDeveloperMode && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Developer Tools</h3>
            <button 
              onClick={() => setShowDeveloperMode(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <button 
              onClick={testCountryDetection}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Test Country Detection
            </button>
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).testCountryMapping) {
                  (window as any).testCountryMapping()
                }
              }}
              className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              Test Country Mapping
            </button>
            <button 
              onClick={savePerformanceLogs}
              className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Performance Logs
            </button>
            <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
              <p>Books loaded: {books.length}</p>
              <p>Countries detected: {books.filter(b => b.bookCountries.length > 0 || b.authorCountries.length > 0).length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
