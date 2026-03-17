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
import { resolveAuthorCountriesBackend, applyAuthorCountriesToBooks } from '../lib/authorCountryServiceBackend'
import { enrichBooksWithCoversBatched, applyCoverResultsToBooks } from '../lib/bookCoverServiceBatched'
import { enrichmentMetrics } from '../lib/enrichmentMetrics'
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

    enrichmentMetrics.startUpload()

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
            enrichmentMetrics.mapShown()

            // Enrich data in background — authors and covers run in parallel
            setIsEnriching(true)
            setEnrichmentProgress({ current: 0, total: 1, stage: 'Discovering author countries...' })

            // Start cover loading immediately — covers don't depend on author countries
            const booksNeedingCovers = parsedBooks.filter(b => b.readStatus === 'read' && !b.coverImage)
            if (booksNeedingCovers.length > 0) {
              setIsLoadingCovers(true)
              setCoverProgress({ current: 0, total: booksNeedingCovers.length, stage: 'Downloading book covers...' })

              enrichBooksWithCoversBatched(parsedBooks, (loaded, total, coverMap) => {
                enrichmentMetrics.firstCoverBatch()
                setBooks(prev => {
                  const updated = applyCoverResultsToBooks(prev, coverMap)
                  saveProcessedBooks(updated)
                  return updated
                })
                setCoverProgress({ current: loaded, total, stage: `Loading covers: ${loaded}/${total}` })
              }).then(() => {
                enrichmentMetrics.coversComplete(booksNeedingCovers.length)
                setIsLoadingCovers(false)
                setCoverProgress({ current: 0, total: 0, stage: '' })
              }).catch(error => {
                console.warn('⚠️ Failed to load some book covers:', error)
                setIsLoadingCovers(false)
                setCoverProgress({ current: 0, total: 0, stage: '' })
              })
            }

            // Resolve author countries incrementally (runs concurrently with covers)
            const { summary: authorSummary } = await resolveAuthorCountriesBackend(
              parsedBooks,
              (current, total) => {
                setEnrichmentProgress({ current, total, stage: `Mapping authors: ${current}/${total} resolved` })
              },
              (batchResults) => {
                enrichmentMetrics.firstCountryBatch()
                // Incremental update — merge this batch's countries onto latest state
                setBooks(prev => {
                  const updated = applyAuthorCountriesToBooks(prev, batchResults)
                  saveProcessedBooks(updated)
                  return updated
                })
              }
            )

            enrichmentMetrics.authorsComplete(authorSummary.uniqueAuthors, authorSummary.apiLookups)
            enrichmentMetrics.logSummary()

            setIsEnriching(false)
            setEnrichmentProgress({ current: 0, total: 0, stage: '' })

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

          enrichBooksWithCoversBatched(processedBooks, (loaded, total, coverMap) => {
            console.log(`📷 Progress: ${loaded}/${total} READ covers loaded`)
            setBooks(prev => {
              const updated = applyCoverResultsToBooks(prev, coverMap)
              saveProcessedBooks(updated)
              return updated
            })
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
