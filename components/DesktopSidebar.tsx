import { useEffect, useMemo, useState } from 'react'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { ReadingAtlasSummary } from './ReadingAtlasSummary'
import { BookList } from './BookList'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'

interface DesktopSidebarProps {
  booksToShow: number
  onLoadMore: () => void
}

export function DesktopSidebar({ booksToShow, onLoadMore }: DesktopSidebarProps) {
  const { books, selectedCountry, setSelectedCountry, summaryStats } = useBooks()
  const { currentTheme } = useTheme()

  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)

  const readBooksAll = useMemo(
    () => books.filter(b => b.readStatus === 'read'),
    [books]
  )

  useEffect(() => {
    if (selectedCountry) {
      setShowMissingAuthorCountry(false)
    }
  }, [selectedCountry])

  const handleMissingAuthorCountryFilter = () => {
    if (summaryStats.booksMissingAuthorCountry === 0) return
    if (!showMissingAuthorCountry && selectedCountry) {
      setSelectedCountry(null)
    }
    setShowMissingAuthorCountry(prev => !prev)
  }

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
      className="hidden lg:block absolute top-20 left-4 sidebar-surface custom-scrollbar"
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
        showMissingAuthorCountry={showMissingAuthorCountry}
        onToggleMissingAuthorCountry={handleMissingAuthorCountryFilter}
        className="mb-4"
      />

      {selectedCountry && (
        <div className="type-caption mb-3">
          Filtering by {getCountryFlag(selectedCountry)} {mapISO2ToDisplayName(selectedCountry)}{' '}
          <button
            onClick={() => setSelectedCountry(null)}
            className="link-accent underline ml-1"
          >
            Show all
          </button>
        </div>
      )}

      <div className="type-caption mb-3">
        Showing {displayedBookCount} {displayedBookLabel}
      </div>

      {showMissingAuthorCountry && (
        <div className="type-caption mb-2">
          <button
            type="button"
            className="link-accent underline"
            onClick={() => {
              setShowMissingAuthorCountry(false)
              setSelectedCountry(null)
            }}
          >
            Show all books
          </button>
        </div>
      )}

      <BookList
        showMissingAuthorCountry={showMissingAuthorCountry}
        booksToShow={booksToShow}
      />
    </div>
  )
}
