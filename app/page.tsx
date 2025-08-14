'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { Book } from '../types/book'
import { Header } from '../components/Header'
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
import { assignMockCountriesToBooks, mapISO2ToDisplayName, mapDisplayNameToISO2 } from '../lib/mapUtilities'
import { 
  logMapEvent, 
  startMapLoadTimer, 
  savePerformanceLogs 
} from '../lib/performanceLogger'
import { testCountryDetection } from '../lib/testCountryDetection'

export default function Home() {
  // State management
  const [books, setBooks] = useState<Book[]>([])
  const [showDeveloperMode, setShowDeveloperMode] = useState(false)
  const [error, setError] = useState<string>('')
  const [booksToShow, setBooksToShow] = useState<number>(10)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [countryViewMode, setCountryViewMode] = useState<'author' | 'book'>('book')
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('blue')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const booksLoadedRef = useRef(false)
  
  // Memoize THEMES to prevent unnecessary re-renders
  const memoizedThemes = useMemo(() => THEMES, [])

  // Event handlers
  const handleViewModeChange = (mode: 'author' | 'book') => {
    setCountryViewMode(mode)
    setSelectedCountry(null) // Clear selected country when view mode changes
  }

  const handleThemeChange = (theme: ThemeKey) => {
    setCurrentTheme(theme)
  }

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country)
  }

  const handleShowAll = () => {
    setSelectedCountry(null)
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
            
            // Save to storage
            saveProcessedBooks(parsedBooks)
            
            // Update state
            setBooks(parsedBooks)
            setBooksToShow(10)
            
            logMapEvent('file_upload_success', { 
              bookCount: parsedBooks.length
            })
          } catch (parseError) {
            console.error('Error parsing CSV:', parseError)
            setError('Error parsing CSV file. Please check the format.')
            logMapEvent('file_parse_error', { error: parseError.message })
          } finally {
            setIsProcessing(false)
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          setError('Error reading CSV file.')
          setIsProcessing(false)
          logMapEvent('file_read_error', { error: error.message })
        }
      })
    } catch (error) {
      console.error('File handling error:', error)
      setError('Error processing file.')
      setIsProcessing(false)
      logMapEvent('file_handling_error', { error: error.message })
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
      {/* Header */}
      <Header 
        books={books}
        countryViewMode={countryViewMode}
        onViewModeChange={handleViewModeChange}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        themes={memoizedThemes}
      />
      
      {/* Map Container */}
      <MapContainer 
        books={books}
        selectedCountry={selectedCountry}
        countryViewMode={countryViewMode}
        onCountryClick={handleCountryClick}
        onViewModeChange={handleViewModeChange}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        themes={memoizedThemes}
      />

      {/* Desktop Sidebar */}
      <DesktopSidebar 
        books={books}
        selectedCountry={selectedCountry}
        countryViewMode={countryViewMode}
        onCountryClick={handleCountryClick}
        onShowAll={handleShowAll}
        booksToShow={booksToShow}
        onLoadMore={handleLoadMore}
      />

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet 
        books={books}
        selectedCountry={selectedCountry}
        countryViewMode={countryViewMode}
        onCountryClick={handleCountryClick}
        onShowAll={handleShowAll}
        showBottomSheet={showBottomSheet}
        onToggleBottomSheet={() => setShowBottomSheet(!showBottomSheet)}
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