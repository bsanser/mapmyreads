'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { Book } from '../types/book'
import { HeroScreen } from '../components/HeroScreen'
import { MapContainer } from '../components/MapContainer'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { MobileBottomSheet } from '../components/MobileBottomSheet'
import { DeveloperTools } from '../components/DeveloperTools'
import { EnrichmentProgress } from '../components/EnrichmentProgress'
import { THEMES } from '../lib/themeManager'
import { ThemeKey } from '../lib/themeManager'
import { ReadingAtlasSummary } from '../components/ReadingAtlasSummary'
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
  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0, stage: '' })
  const [isEnriching, setIsEnriching] = useState(false)
  
  const booksLoadedRef = useRef(false)
  const uploadStartRef = useRef<number | null>(null)
  
  // Memoize THEMES to prevent unnecessary re-renders
  const memoizedThemes = useMemo(() => THEMES, [])

  const summaryStats = useMemo(() => {
    const readBooksAll = books.filter(b => b.readStatus === 'read')
    const authorSet = new Set<string>()
    const countrySet = new Set<string>()
    let missingAuthorCountry = 0

    readBooksAll.forEach(book => {
      if (book.authors) {
        authorSet.add(book.authors.trim())
      }

      if (book.authorCountries && book.authorCountries.length > 0) {
        book.authorCountries.forEach(code => countrySet.add(code))
      } else {
        missingAuthorCountry += 1
      }
    })

    return {
      readBooksCount: readBooksAll.length,
      distinctAuthors: authorSet.size,
      authorCountriesCovered: countrySet.size,
      booksMissingAuthorCountry: missingAuthorCountry
    }
  }, [books])

  const handleToggleMissingAuthorCountry = () => {
    setShowMissingAuthorCountry(prev => !prev)
  }

  const handleClearMissingAuthorCountry = () => {
    setShowMissingAuthorCountry(false)
  }

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

            // Parse books - this is fast
            const parsedBooks = parseCSVData(data, format)
            const csvSummary = generateCsvSummary(parsedBooks)

            console.log('📚 CSV Parsed:', csvSummary)
            
            // SHOW MAP IMMEDIATELY with parsed books (no countries yet)
            setBooks(parsedBooks)
            setBooksToShow(10)
            setIsProcessing(false)
            
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
            const timeToFirstShowMapSeconds = uploadStartRef.current !== null
              ? Number(((now - uploadStartRef.current) / 1000).toFixed(2))
              : null
            
            console.log(`⚡ Map shown in ${timeToFirstShowMapSeconds}s`)
            logMapEvent('map_displayed', { timeToFirstShowMap: timeToFirstShowMapSeconds })

            // NOW enrich data in background
            setIsEnriching(true)
            const readBooks = parsedBooks.filter(b => b.readStatus === 'read')
            setEnrichmentProgress({ current: 0, total: 1, stage: 'Discovering author countries...' })
            
            const { booksWithCountries, summary: authorSummary } = await resolveAuthorCountries(
              parsedBooks,
              (current, total) => {
                setEnrichmentProgress({ current, total, stage: `Resolving authors... ${current}/${total}` })
              }
            )
            
            setBooks(booksWithCountries)
            saveProcessedBooks(booksWithCountries)
            setIsEnriching(false)
            setEnrichmentProgress({ current: 0, total: 0, stage: '' })

            console.log('✅ Author countries resolved:', {
              csv: csvSummary,
              authorCountries: authorSummary
            })
            
            logMapEvent('author_enrichment_complete', { 
              bookCount: booksWithCountries.length,
              readBookCount: authorSummary.readBooks,
              resolvedAuthorCount: authorSummary.readBooksWithResolvedAuthors
            })
            endMapLoadTimer({
              totalBookCount: authorSummary.totalBooks,
              readBookCount: authorSummary.readBooks,
              bookCount: booksWithCountries.length,
              note: 'author_enrichment_complete'
            })

            // Load covers in background (non-blocking, no progress indicator)
            console.log('📷 Loading book covers in background...')
            enrichBooksWithCovers(booksWithCountries).then(booksWithCovers => {
              setBooks(booksWithCovers)
              saveProcessedBooks(booksWithCovers)
              console.log('✅ Book covers loaded')
            }).catch(error => {
              console.warn('⚠️ Failed to load some book covers:', error)
            })
          } catch (parseError) {
            console.error('Error parsing CSV:', parseError)
            setError('Error parsing CSV file. Please check the format.')
            setIsProcessing(false)
            setIsEnriching(false)
            logMapEvent('file_parse_error', { error: parseError.message })
            endMapLoadTimer({
              error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              note: 'author_country_map_failed'
            })
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          setError('Error reading CSV file.')
          setIsProcessing(false)
          setIsEnriching(false)
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
      setIsEnriching(false)
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
        
        // Load any missing covers in background
        const booksNeedingCovers = processedBooks.filter(b => !b.coverImage)
        if (booksNeedingCovers.length > 0) {
          console.log(`📷 Loading ${booksNeedingCovers.length} missing book covers...`)
          enrichBooksWithCovers(processedBooks).then(booksWithCovers => {
            setBooks(booksWithCovers)
            saveProcessedBooks(booksWithCovers)
            console.log('✅ Book covers loaded')
          }).catch(error => {
            console.warn('⚠️ Failed to load some book covers:', error)
          })
        }
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
      <div className="lg:hidden px-4 pt-6">
        <ReadingAtlasSummary
          stats={summaryStats}
          showMissingAuthorCountry={showMissingAuthorCountry}
          onToggleMissingAuthorCountry={handleToggleMissingAuthorCountry}
          currentTheme={currentTheme}
          className="mb-4"
        />
      </div>
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
        showMissingAuthorCountry={showMissingAuthorCountry}
        onToggleMissingAuthorCountry={handleToggleMissingAuthorCountry}
        onClearMissingAuthorCountry={handleClearMissingAuthorCountry}
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

      {/* Enrichment Progress */}
      {isEnriching && (
        <EnrichmentProgress 
          current={enrichmentProgress.current}
          total={enrichmentProgress.total}
          stage={enrichmentProgress.stage}
        />
      )}
    </div>
  )
}
