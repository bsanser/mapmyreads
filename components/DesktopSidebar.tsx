import { useEffect, useMemo, useState } from 'react'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { ReadingAtlasSummary } from './ReadingAtlasSummary'
import { BookList } from './BookList'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEnrichment } from '../contexts/EnrichmentContext'

interface DesktopSidebarProps {
  booksToShow: number
  onLoadMore: () => void
  onAddBook?: () => void
  isReadOnly?: boolean
}

export function DesktopSidebar({ booksToShow, onLoadMore, onAddBook, isReadOnly = false }: DesktopSidebarProps) {
  const { books, selectedCountry, setSelectedCountry, summaryStats } = useBooks()
  const { currentTheme } = useTheme()
  const { isEnriching } = useEnrichment()

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

  useEffect(() => {
    if (showMissingAuthorCountry && summaryStats.booksMissingAuthorCountry === 0) {
      setShowMissingAuthorCountry(false)
    }
  }, [summaryStats.booksMissingAuthorCountry, showMissingAuthorCountry])

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
      className="desktop-sidebar sidebar-surface custom-scrollbar"
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
        isEnriching={isEnriching}
        className="mb-4"
      />

      {selectedCountry && (
        <div className="type-caption mb-3">
          Filtering by {getCountryFlag(selectedCountry)} {mapISO2ToDisplayName(selectedCountry)}{' '}
          <button
            onClick={() => setSelectedCountry(null)}
            className="link-accent"
            style={{ marginLeft: '0.25rem' }}
          >
            Show all
          </button>
        </div>
      )}

      <div className="type-caption mb-3 flex items-center justify-between gap-2">
        <span>
          Showing {displayedBookCount} {displayedBookLabel}
        </span>
        <div className="flex items-center gap-2">
          {showMissingAuthorCountry && (
            <button
              type="button"
              className="link-accent"
              onClick={() => {
                setShowMissingAuthorCountry(false)
                setSelectedCountry(null)
              }}
            >
              Show all
            </button>
          )}
          {onAddBook && !isReadOnly && (
            <button
              type="button"
              className="sidebar-add-book-btn"
              onClick={onAddBook}
              aria-label="Add book"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add book
            </button>
          )}
        </div>
      </div>

      <BookList
        showMissingAuthorCountry={showMissingAuthorCountry}
        booksToShow={booksToShow}
      />
    </div>
  )
}
