import { useEffect, useMemo, useState } from 'react'
import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { ReadingAtlasSummary } from './ReadingAtlasSummary'
import { BookList } from './BookList'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface DesktopSidebarProps {
  books: Book[]
  selectedCountry: string | null
  onCountryClick: (country: string) => void
  onShowAll: () => void
  booksToShow: number
  onLoadMore: () => void
  currentTheme: ThemeKey
  onUpdateBookCountries: (book: Book, countries: string[]) => void
}

export function DesktopSidebar({
  books,
  selectedCountry,
  onCountryClick,
  onShowAll,
  booksToShow,
  onLoadMore,
  currentTheme,
  onUpdateBookCountries
}: DesktopSidebarProps) {
  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)

  const readBooksAll = useMemo(
    () => books.filter(b => b.readStatus === 'read'),
    [books]
  )

  const summaryStats = useMemo(() => {
    const authorSet = new Set<string>()
    const countrySet = new Set<string>()
    let missingAuthorCountry = 0

    readBooksAll.forEach(book => {
      if (book.authors) authorSet.add(book.authors.trim())
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
  }, [readBooksAll])

  useEffect(() => {
    if (selectedCountry) {
      setShowMissingAuthorCountry(false)
    }
  }, [selectedCountry])

  const handleMissingAuthorCountryFilter = () => {
    if (summaryStats.booksMissingAuthorCountry === 0) return
    if (!showMissingAuthorCountry && selectedCountry) {
      onShowAll()
    }
    setShowMissingAuthorCountry(prev => !prev)
  }

  // Compute count for "Showing X books" label
  const baseFiltered = selectedCountry
    ? books.filter(book => book.authorCountries.includes(selectedCountry))
    : books
  const filtered = showMissingAuthorCountry
    ? baseFiltered.filter(book => book.readStatus === 'read' && book.authorCountries.length === 0)
    : baseFiltered
  const displayedBookCount = filtered.filter(b => b.readStatus === 'read').length
  const displayedBookLabel = displayedBookCount === 1 ? 'book' : 'books'

  return (
    <div
      className="hidden lg:block absolute top-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 p-6 w-80 max-h-[calc(100vh-120px)] overflow-auto z-50"
      style={{ zIndex: 50 }}
      onScroll={(e) => {
        const target = e.target as HTMLDivElement
        const { scrollTop, scrollHeight, clientHeight } = target
        if (scrollHeight - scrollTop - clientHeight < 100) {
          onLoadMore()
        }
      }}
    >
      <ReadingAtlasSummary
        stats={summaryStats}
        showMissingAuthorCountry={showMissingAuthorCountry}
        onToggleMissingAuthorCountry={handleMissingAuthorCountryFilter}
        currentTheme={currentTheme}
        className="mb-4"
      />

      {selectedCountry && (
        <div className="text-xs text-gray-600 mb-3">
          Filtering by {getCountryFlag(selectedCountry)} {mapISO2ToDisplayName(selectedCountry)}{' '}
          <button
            onClick={onShowAll}
            className="underline ml-1"
            style={{ color: THEMES[currentTheme].outline }}
          >
            Show all
          </button>
        </div>
      )}

      <div className="text-xs text-gray-600 mb-3">
        Showing {displayedBookCount} {displayedBookLabel}
      </div>

      {showMissingAuthorCountry && (
        <div className="text-xs mb-2">
          <button
            type="button"
            className="underline"
            style={{ color: THEMES[currentTheme].outline }}
            onClick={() => {
              setShowMissingAuthorCountry(false)
              onShowAll()
            }}
          >
            Show all books
          </button>
        </div>
      )}

      <BookList
        books={books}
        selectedCountry={selectedCountry}
        onCountryClick={onCountryClick}
        onUpdateBookCountries={onUpdateBookCountries}
        showMissingAuthorCountry={showMissingAuthorCountry}
        booksToShow={booksToShow}
      />
    </div>
  )
}
