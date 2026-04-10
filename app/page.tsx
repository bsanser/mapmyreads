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
import {
  loadProcessedBooks,
  saveProcessedBooks
} from '../lib/storage'
import {
  detectCSVFormat,
  parseCSVData
} from '../lib/csvParser'
import { generateCsvSummary } from '../lib/csvSummary'
import { mapDisplayNameToISO2 } from '../lib/mapUtilities'
import { deduplicateBooks } from '../lib/deduplication'
import { resolveAuthorCountriesBackend, applyAuthorCountriesToBooks } from '../lib/authorCountryService'
import { enrichBooksWithCoversBatched, applyCoverResultsToBooks } from '../lib/bookCoverService'
import { enrichmentMetrics } from '../lib/enrichmentMetrics'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEnrichment } from '../contexts/EnrichmentContext'
import { useSession } from '../contexts/SessionContext'
import AddBookFAB from '../components/AddBookFAB'
import AddBookModal from '../components/AddBookModal'
import Toast from '../components/Toast'

export default function Home() {
  // Context state
  const { isAuthChecking } = useSession()
  const { books, setBooks, selectedCountry, setSelectedCountry, addBook } = useBooks()
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
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [hasEnteredApp, setHasEnteredApp] = useState(false)

  const booksLoadedRef = useRef(false)
  const csvFileInputRef = useRef<HTMLInputElement>(null)

  // Task 4.1-4.3: Optimistic book add with background enrichment
  const handleManualBookAdd = async (book: Book) => {
    // Book is already in state via addBook() called from AddBookModal
    // Save immediately (isResolvingCountry will be stripped by saveProcessedBooks)
    setBooks(prev => {
      saveProcessedBooks(prev)
      return prev
    })

    // 10-second timeout: if enrichment doesn't resolve, clear the resolving flag
    const timeoutId = setTimeout(() => {
      setBooks(prev =>
        prev.map(b =>
          (b.isbn13 && book.isbn13 ? b.isbn13 === book.isbn13 : b.title === book.title && b.authors === book.authors)
            ? { ...b, isResolvingCountry: false }
            : b
        )
      )
    }, 10000)

    // Background: resolve author country
    resolveAuthorCountriesBackend(
      [book],
      undefined,
      (batchResults) => {
        clearTimeout(timeoutId)
        setBooks(prev => {
          const updated = applyAuthorCountriesToBooks(prev, batchResults)
          return updated.map(b =>
            (b.isbn13 && book.isbn13 ? b.isbn13 === book.isbn13 : b.title === book.title && b.authors === book.authors)
              ? { ...b, isResolvingCountry: false }
              : b
          )
        })
      }
    ).catch(() => {
      clearTimeout(timeoutId)
      setBooks(prev =>
        prev.map(b =>
          (b.isbn13 && book.isbn13 ? b.isbn13 === book.isbn13 : b.title === book.title && b.authors === book.authors)
            ? { ...b, isResolvingCountry: false }
            : b
        )
      )
    })

    // Background: fetch cover if not already present
    if (!book.coverImage) {
      enrichBooksWithCoversBatched([book], (_loaded, _total, coverMap) => {
        setBooks(prev => applyCoverResultsToBooks(prev, coverMap))
      }).catch(() => {})
    }
  }

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

  // Auto-disable missing author country filter when all books have countries
  useEffect(() => {
    const booksWithoutCountries = books.filter(b => b.readStatus === 'read' && b.authorCountries.length === 0)
    if (showMissingAuthorCountry && booksWithoutCountries.length === 0) {
      setShowMissingAuthorCountry(false)
    }
  }, [books, showMissingAuthorCountry])

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

            // Deduplicate against existing library
            const existingBooks = loadProcessedBooks() ?? []
            const { newBooks, skipped } = deduplicateBooks(parsedBooks, existingBooks)
            const mergedBooks = [...existingBooks, ...newBooks]

            // Show toast
            if (skipped > 0) {
              setToastMessage(`${newBooks.length} new books added. ${skipped} already in your library.`)
            } else {
              setToastMessage(`${newBooks.length} books added.`)
            }

            // SHOW MAP IMMEDIATELY with merged books (no countries yet for new ones)
            setBooks(mergedBooks)
            setBooksToShow(10)
            setIsProcessing(false)
            enrichmentMetrics.mapShown()

            // Enrich data in background — authors and covers run in parallel
            setIsEnriching(true)
            setEnrichmentProgress({ current: 0, total: 1, stage: 'Discovering author countries...' })

            // Start cover loading immediately — covers don't depend on author countries
            const booksNeedingCovers = newBooks.filter(b => b.readStatus === 'read' && !b.coverImage)
            if (booksNeedingCovers.length > 0) {
              setIsLoadingCovers(true)
              setCoverProgress({ current: 0, total: booksNeedingCovers.length, stage: 'Downloading book covers...' })

              enrichBooksWithCoversBatched(mergedBooks, (loaded, total, coverMap) => {
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

            // Resolve author countries incrementally (only new books)
            const { summary: authorSummary } = await resolveAuthorCountriesBackend(
              newBooks,
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
  if (isAuthChecking) {
    return (
      <div className="hero-screen">
        <div className="hero-overlay" />
      </div>
    )
  }

  if (!hasEnteredApp && books.length === 0) {
    return (
      <HeroScreen
        onFileUpload={handleFile}
        onExplore={() => setHasEnteredApp(true)}
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
        onAddBook={() => setIsAddBookModalOpen(true)}
      />

      <MobileBottomSheet
        isExpanded={isSheetExpanded}
        onToggleExpanded={() => setIsSheetExpanded(prev => !prev)}
        showMissingAuthorCountry={showMissingAuthorCountry}
        onToggleMissingAuthorCountry={handleToggleMissingAuthorCountry}
        onClearMissingAuthorCountry={handleClearMissingAuthorCountry}
        onAddBook={() => setIsAddBookModalOpen(true)}
      />

      <DeveloperTools
        isVisible={showDeveloperMode}
        onClose={() => setShowDeveloperMode(false)}
        books={books}
      />

      <EnrichmentProgress />

      <AddBookFAB
        onClick={() => {
          setIsSheetExpanded(false)
          setIsAddBookModalOpen(true)
        }}
        themeColor={THEMES[currentTheme].outline}
      />

      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        addBook={addBook}
        onBookAdded={handleManualBookAdd}
        onBulkUpload={() => csvFileInputRef.current?.click()}
      />

      {/* Hidden CSV file input for bulk upload flow */}
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="sr-only"
      />

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  )
}
