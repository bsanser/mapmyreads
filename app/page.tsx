'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { HeroScreen } from '../components/HeroScreen'
import { MapContainer } from '../components/MapContainer'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { MobileBottomSheet } from '../components/MobileBottomSheet'
import { DeveloperTools } from '../components/DeveloperTools'
import { EnrichmentProgress } from '../components/EnrichmentProgress'
import { THEMES } from '../lib/themeManager'
import { ReadingAtlasSummary } from '../components/ReadingAtlasSummary'
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
import { resolveAuthorCountriesBackend } from '../lib/authorCountryServiceBackend'
import { enrichBooksWithCoversBatched } from '../lib/bookCoverServiceBatched'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEnrichment } from '../contexts/EnrichmentContext'

export default function Home() {
  // Context state
  const { books, setBooks, selectedCountry, setSelectedCountry } = useBooks()
  const { currentTheme, setCurrentTheme } = useTheme()
  const {
    setIsEnriching,
    setEnrichmentProgress,
    setIsLoadingCovers,
    setCoverProgress
  } = useEnrichment()

  // UI-only state
  const [showDeveloperMode, setShowDeveloperMode] = useState(false)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [booksToShow, setBooksToShow] = useState<number>(10)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)

  const booksLoadedRef = useRef(false)
  const uploadStartRef = useRef<number | null>(null)

  const handleToggleMissingAuthorCountry = () => {
    setShowMissingAuthorCountry(prev => !prev)
  }

  const handleClearMissingAuthorCountry = () => {
    setShowMissingAuthorCountry(false)
  }

  const handleCountryClick = (country: string) => {
    const iso2Code = mapDisplayNameToISO2(country)
    setSelectedCountry(iso2Code)
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

    uploadStartRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now()

    try {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async ({ data, meta }) => {
          try {
            const format = detectCSVFormat(meta.fields || [])
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

            // NOW enrich data in background
            setIsEnriching(true)
            setEnrichmentProgress({ current: 0, total: 1, stage: 'Discovering author countries...' })

            console.time('⏱️ Author Resolution (Backend API)')
            const authorStartTime = performance.now()

            const { booksWithCountries, summary: authorSummary } = await resolveAuthorCountriesBackend(
              parsedBooks,
              (current, total) => {
                setEnrichmentProgress({ current, total, stage: `Mapping authors: ${current}/${total} resolved` })
              },
              (updatedBooks) => {
                // Incremental update — map re-renders with new countries after each batch
                setBooks(updatedBooks)
                saveProcessedBooks(updatedBooks)
              }
            )

            const authorEndTime = performance.now()
            const authorDuration = ((authorEndTime - authorStartTime) / 1000).toFixed(2)
            console.timeEnd('⏱️ Author Resolution (Backend API)')
            console.log(`📊 Stats: ${authorSummary.uniqueAuthors} authors, ${authorSummary.apiLookups} API calls, ${authorDuration}s total`)

            setBooks(booksWithCountries)
            saveProcessedBooks(booksWithCountries)
            setIsEnriching(false)
            setEnrichmentProgress({ current: 0, total: 0, stage: '' })

            console.log('✅ Author countries resolved:', { csv: csvSummary, authorCountries: authorSummary })

            // Load covers in background with batching (after author resolution)
            const booksNeedingCovers = booksWithCountries.filter(b => b.readStatus === 'read' && !b.coverImage)
            if (booksNeedingCovers.length > 0) {
              console.log(`📷 Loading ${booksNeedingCovers.length} READ book covers in batches...`)
              setIsLoadingCovers(true)
              setCoverProgress({ current: 0, total: booksNeedingCovers.length, stage: 'Downloading book covers...' })

              enrichBooksWithCoversBatched(booksWithCountries, (loaded, total, updatedBooks) => {
                console.log(`📷 Progress: ${loaded}/${total} READ covers loaded`)
                setBooks(updatedBooks)
                saveProcessedBooks(updatedBooks)
                setCoverProgress({ current: loaded, total, stage: `Loading covers: ${loaded}/${total}` })
              }).then(() => {
                console.log('✅ All book covers loaded!')
                setIsLoadingCovers(false)
                setCoverProgress({ current: 0, total: 0, stage: '' })
              }).catch(error => {
                console.warn('⚠️ Failed to load some book covers:', error)
                setIsLoadingCovers(false)
                setCoverProgress({ current: 0, total: 0, stage: '' })
              })
            }

          } catch (parseError) {
            console.error('Error parsing CSV:', parseError)
            setError('Error parsing CSV file. Please check the format.')
            setIsProcessing(false)
            setIsEnriching(false)
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          setError('Error reading CSV file.')
          setIsProcessing(false)
          setIsEnriching(false)
          uploadStartRef.current = null
        }
      })
    } catch (error) {
      console.error('File handling error:', error)
      setError('Error processing file.')
      setIsProcessing(false)
      setIsEnriching(false)
      uploadStartRef.current = null
    }
  }

  // Load processed books on component mount
  useEffect(() => {
    if (booksLoadedRef.current) return
    booksLoadedRef.current = true

    try {
      if (hasShareableData()) {
        saveShareableData()
      }

      const processedBooks = loadProcessedBooks()
      if (processedBooks && processedBooks.length > 0) {
        setBooks(processedBooks)

        const booksNeedingCovers = processedBooks.filter(b => b.readStatus === 'read' && !b.coverImage)
        if (booksNeedingCovers.length > 0) {
          console.log(`📷 Loading ${booksNeedingCovers.length} missing READ book covers in batches...`)
          setIsLoadingCovers(true)
          setCoverProgress({ current: 0, total: booksNeedingCovers.length, stage: 'Downloading book covers...' })

          enrichBooksWithCoversBatched(processedBooks, (loaded, total, updatedBooks) => {
            console.log(`📷 Progress: ${loaded}/${total} READ covers loaded`)
            setBooks(updatedBooks)
            saveProcessedBooks(updatedBooks)
            setCoverProgress({ current: loaded, total, stage: `Loading covers: ${loaded}/${total}` })
          }).then(() => {
            console.log('✅ All book covers loaded!')
            setIsLoadingCovers(false)
            setCoverProgress({ current: 0, total: 0, stage: '' })
          }).catch(error => {
            console.warn('⚠️ Failed to load some book covers:', error)
            setIsLoadingCovers(false)
            setCoverProgress({ current: 0, total: 0, stage: '' })
          })
        }
      }
    } catch (error) {
      console.error('Error loading books:', error)
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
          showMissingAuthorCountry={showMissingAuthorCountry}
          onToggleMissingAuthorCountry={handleToggleMissingAuthorCountry}
          className="mb-4"
        />
      </div>

      <MapContainer
        books={books}
        selectedCountry={selectedCountry}
        onCountryClick={handleCountryClick}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        themes={THEMES}
      />

      <DesktopSidebar
        booksToShow={booksToShow}
        onLoadMore={handleLoadMore}
      />

      <MobileBottomSheet
        showBottomSheet={showBottomSheet}
        onToggleBottomSheet={() => setShowBottomSheet(!showBottomSheet)}
        showMissingAuthorCountry={showMissingAuthorCountry}
        onToggleMissingAuthorCountry={handleToggleMissingAuthorCountry}
        onClearMissingAuthorCountry={handleClearMissingAuthorCountry}
      />

      <DeveloperTools
        isVisible={showDeveloperMode}
        onClose={() => setShowDeveloperMode(false)}
        books={books}
      />

      <EnrichmentProgress />
    </div>
  )
}
