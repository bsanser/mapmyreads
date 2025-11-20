'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { Book } from '../types/book'
import { HeroScreen } from '../components/HeroScreen'
import { MapContainer } from '../components/MapContainer'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { MobileBottomSheet } from '../components/MobileBottomSheet'
import { DeveloperTools } from '../components/DeveloperTools'
import { THEMES } from '../lib/themeManager'
import { ThemeKey } from '../lib/themeManager'
import { useMemo } from 'react'
import { 
  loadProcessedBooks, 
  saveProcessedBooks, 
  hasShareableData, 
  saveShareableData
} from '../lib/storage'
import { 
  detectCSVFormat, 
  parseCSVData
} from '../lib/csvParser'
import { generateCsvSummary } from '../lib/csvSummary'
import { mapDisplayNameToISO2 } from '../lib/mapUtilities'
import { 
  logMapEvent, 
  startMapLoadTimer, 
  endMapLoadTimer,
  savePerformanceLogs 
} from '../lib/performanceLogger'
import { testCountryDetection } from '../lib/testCountryDetection'
import { resolveAuthorCountries } from '../lib/authorCountryService'
import { enrichBooksWithCovers } from '../lib/bookCoverService'

export default function Home() {
  // State management
  const [books, setBooks] = useState<Book[]>([])
  const [showDeveloperMode, setShowDeveloperMode] = useState(false)
  const [error, setError] = useState<string>('')
  const [booksToShow, setBooksToShow] = useState<number>(10)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('blue')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const booksLoadedRef = useRef(false)
  const uploadStartRef = useRef<number | null>(null)
  
  // Memoize THEMES to prevent unnecessary re-renders
  const memoizedThemes = useMemo(() => THEMES, [])

  const handleThemeChange = (theme: ThemeKey) => {
    setCurrentTheme(theme)
  }

  const handleCountryClick = (country: string) => {
    const iso2Code = mapDisplayNameToISO2(country)
    setSelectedCountry(iso2Code)
  }

  const handleShowAll = () => {
    setSelectedCountry(null)
  }

  const isSameBook = (a: Book, b: Book) => {
    if (a.isbn13 && b.isbn13) return a.isbn13 === b.isbn13
    return a.title === b.title && a.authors === b.authors && a.yearPublished === b.yearPublished
  }

  const handleUpdateBookCountries = (book: Book, countries: string[]) => {
    setBooks(prevBooks => {
      const updatedBooks = prevBooks.map(existing => 
        isSameBook(existing, book) ? { ...existing, authorCountries: countries } : existing
      )
      saveProcessedBooks(updatedBooks)
      return updatedBooks
    })
  }

  const handleLoadMore = () => {
    const readBooksCount = books.filter(b => b.readStatus === 'read').length
    if (booksToShow < readBooksCount) {
      setBooksToShow(prev => Math.min(prev + 10, readBooksCount))
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setIsProcessing(true)
    const file = e.target.files?.[0]
    if (!file) return

    // Start performance timer for map loading
    startMapLoadTimer()
    logMapEvent('file_upload_start', { fileName: file.name, fileSize: file.size })
    uploadStartRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now()

    try {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async ({ data, meta }) => {
          try {
            // Detect CSV format
            const format = detectCSVFormat(meta.fields || [])

            // Parse books
            const parsedBooks = parseCSVData(data, format)
            const csvSummary = generateCsvSummary(parsedBooks)

            const { booksWithCountries, summary: authorSummary } = await resolveAuthorCountries(parsedBooks)
            const booksWithCovers = await enrichBooksWithCovers(booksWithCountries)
            
            // Save to storage
            saveProcessedBooks(booksWithCovers)
            
            // Update state
            setBooks(booksWithCovers)
            setBooksToShow(10)

            const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
            const timeToFirstShowMapSeconds = uploadStartRef.current !== null
              ? Number(((now - uploadStartRef.current) / 1000).toFixed(2))
              : null
            uploadStartRef.current = null

            console.log('📚 CSV Import Summary:', {
              csv: csvSummary,
              authorCountries: authorSummary,
              timeToFirstShowMap: timeToFirstShowMapSeconds
            })
            
            logMapEvent('file_upload_success', { 
              bookCount: booksWithCovers.length,
              readBookCount: authorSummary.readBooks,
              resolvedAuthorCount: authorSummary.readBooksWithResolvedAuthors
            })
            endMapLoadTimer({
              totalBookCount: authorSummary.totalBooks,
              readBookCount: authorSummary.readBooks,
              bookCount: booksWithCovers.length,
              note: 'author_country_map_ready'
            })
          } catch (parseError) {
            console.error('Error parsing CSV:', parseError)
            setError('Error parsing CSV file. Please check the format.')
            logMapEvent('file_parse_error', { error: parseError.message })
            endMapLoadTimer({
              error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              note: 'author_country_map_failed'
            })
          } finally {
            setIsProcessing(false)
            uploadStartRef.current = null
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          setError('Error reading CSV file.')
          setIsProcessing(false)
          uploadStartRef.current = null
          logMapEvent('file_read_error', { error: error.message })
          endMapLoadTimer({
            error: error.message,
            note: 'author_country_map_failed'
          })
        }
      })
    } catch (error) {
      console.error('File handling error:', error)
      setError('Error processing file.')
      setIsProcessing(false)
      uploadStartRef.current = null
      logMapEvent('file_handling_error', { error: error.message })
      endMapLoadTimer({
        error: error instanceof Error ? error.message : 'Unknown file handling error',
        note: 'author_country_map_failed'
      })
    }
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

  // Render logic
  if (books.length === 0) {
    return (
      <HeroScreen 
        onFileUpload={handleFile}
        isProcessing={isProcessing}
        error={error}
        showDeveloperMode={showDeveloperMode}
        onToggleDeveloperMode={() => setShowDeveloperMode(!showDeveloperMode)}
      />
    )
  }

  return (
    <div className="h-screen relative w-full bg-gray-50 overflow-hidden">
      {/* Map Container */}
      <MapContainer 
        books={books}
        selectedCountry={selectedCountry}
        onCountryClick={handleCountryClick}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        themes={memoizedThemes}
      />

      {/* Desktop Sidebar */}
      <DesktopSidebar 
        books={books}
        selectedCountry={selectedCountry}
        onCountryClick={handleCountryClick}
        onShowAll={handleShowAll}
        booksToShow={booksToShow}
        onLoadMore={handleLoadMore}
        currentTheme={currentTheme}
        onUpdateBookCountries={handleUpdateBookCountries}
      />

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet 
        books={books}
        selectedCountry={selectedCountry}
        onCountryClick={handleCountryClick}
        onShowAll={handleShowAll}
        showBottomSheet={showBottomSheet}
        onToggleBottomSheet={() => setShowBottomSheet(!showBottomSheet)}
        currentTheme={currentTheme}
        onUpdateBookCountries={handleUpdateBookCountries}
      />

      {/* Developer Tools */}
      <DeveloperTools 
        isVisible={showDeveloperMode}
        onClose={() => setShowDeveloperMode(false)}
        books={books}
        onTestCountryDetection={testCountryDetection}
        onTestCountryMapping={() => {
          if (typeof window !== 'undefined' && (window as any).testCountryMapping) {
            (window as any).testCountryMapping()
          }
        }}
        onSavePerformanceLogs={savePerformanceLogs}
      />
    </div>
  )
}
