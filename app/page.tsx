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
import { resolveAuthorCountriesBackend, applyAuthorCountriesToBooks } from '../lib/authorCountryService'
import { enrichBooksWithCoversBatched, applyCoverResultsToBooks } from '../lib/bookCoverService'
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
  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)
  const [isSheetExpanded, setIsSheetExpanded] = useState(true)

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

            // Log enrichment results
            const coveragePct = authorSummary.readBooks > 0
              ? ((authorSummary.readBooksWithResolvedAuthors / authorSummary.readBooks) * 100).toFixed(1)
              : '0.0'

            const enrichmentReport = {
              source: format,
              total_books: authorSummary.totalBooks,
              read_books: authorSummary.readBooks,
              books_with_countries: authorSummary.readBooksWithResolvedAuthors,
              books_coverage_pct: coveragePct,
              unique_authors: authorSummary.uniqueAuthors,
              cache_hits: authorSummary.cacheHits,
              cache_misses: authorSummary.cacheMisses,
              duration_sec: enrichmentMetrics.getAuthorsDuration()
            }

            // Log to console
            console.log('\n📚 Enrichment Report')
            console.table({
              'Source': enrichmentReport.source,
              'Total books': enrichmentReport.total_books,
              'Read books': enrichmentReport.read_books,
              'Books with countries': enrichmentReport.books_with_countries,
              'Coverage %': enrichmentReport.books_coverage_pct + '%',
              'Unique authors': enrichmentReport.unique_authors,
              'Cache hits': enrichmentReport.cache_hits,
              'Cache misses': enrichmentReport.cache_misses,
              'Duration (s)': enrichmentReport.duration_sec
            })

            // Send to logging endpoint
            fetch('/api/logs/enrichment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(enrichmentReport)
            }).catch(err => console.warn('⚠️ Failed to log enrichment metrics:', err))

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
        }
      })
    } catch (error) {
      console.error('File handling error:', error)
      setError('Error processing file.')
      setIsProcessing(false)
      setIsEnriching(false)
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
          setIsLoadingCovers(true)
          setCoverProgress({ current: 0, total: booksNeedingCovers.length, stage: 'Downloading book covers...' })

          enrichBooksWithCoversBatched(processedBooks, (loaded, total, coverMap) => {
            setBooks(prev => {
              const updated = applyCoverResultsToBooks(prev, coverMap)
              saveProcessedBooks(updated)
              return updated
            })
            setCoverProgress({ current: loaded, total, stage: `Loading covers: ${loaded}/${total}` })
          }).then(() => {
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
      />
    )
  }

  return (
    <div className={`map-page-layout${isSheetExpanded ? '' : ' sheet-collapsed'}`}>
      <MapContainer
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
        isExpanded={isSheetExpanded}
        onToggleExpanded={() => setIsSheetExpanded(prev => !prev)}
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
