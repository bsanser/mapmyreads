import { useRef } from 'react'
import { mapISO2ToDisplayName } from '../lib/mapUtilities'
import { BookList } from './BookList'
import { useBooks } from '../contexts/BooksContext'

interface MobileBottomSheetProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  showMissingAuthorCountry: boolean
  onToggleMissingAuthorCountry: () => void
  onClearMissingAuthorCountry: () => void
  onAddBook?: () => void
  isReadOnly?: boolean
}

export function MobileBottomSheet({
  isExpanded,
  onToggleExpanded,
  showMissingAuthorCountry,
  onToggleMissingAuthorCountry,
  onClearMissingAuthorCountry,
  onAddBook,
  isReadOnly = false,
}: MobileBottomSheetProps) {
  const { books, selectedCountry, setSelectedCountry, summaryStats } = useBooks()
  const touchStartY = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 40 && isExpanded) onToggleExpanded()
    else if (delta < -40 && !isExpanded) onToggleExpanded()
  }

  const baseFilteredBooks = selectedCountry
    ? books.filter(book => book.authorCountries.includes(selectedCountry))
    : books
  const filteredBooks = showMissingAuthorCountry
    ? baseFilteredBooks.filter(book => book.readStatus === 'read' && book.authorCountries.length === 0)
    : baseFilteredBooks
  const displayedBookCount = filteredBooks.filter(b => b.readStatus === 'read').length
  const displayedBookLabel = displayedBookCount === 1 ? 'book' : 'books'

  return (
    <div className={`mobile-bottom-sheet-wrapper${isExpanded ? '' : ' bottom-sheet-collapsed'}`}>
      <div className="bottom-sheet-inner">

        {/* Drag handle */}
        <div
          className="bottom-sheet-handle"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bottom-sheet-handle-bar" />
        </div>

        {summaryStats.readBooksCount === 0 ? (
          /* Empty state — visible in collapsed position, no expansion needed */
          <div className="bottom-sheet-empty-bar">
            <span className="type-caption" style={{ color: 'var(--color-ink-2)' }}>
              Your map is waiting for books
            </span>
            {onAddBook && !isReadOnly && (
              <button
                type="button"
                className="sidebar-add-book-btn"
                onClick={onAddBook}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add a book
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Compact stats + caret — swipe or tap to toggle */}
            <div
              className="bottom-sheet-stats"
              onClick={onToggleExpanded}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: 'pointer' }}
            >
              <div className="bottom-sheet-stat-group">
                <span className="type-stat">{summaryStats.readBooksCount}</span>
                <span className="type-stat-label">books</span>
                <span className="bottom-sheet-stat-divider">·</span>
                <span className="type-stat">{summaryStats.authorCountriesCovered}</span>
                <span className="type-stat-label">countries</span>
              </div>
              <svg
                className="bottom-sheet-caret"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
                }}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Anchored count row */}
            <div className="bottom-sheet-count-row">
              <div className="bottom-sheet-count-main">
                <div className="bottom-sheet-count-lines">
                  <span>
                    Showing <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{displayedBookCount}</span> {displayedBookLabel}
                    {showMissingAuthorCountry ? ' without country data' : selectedCountry ? ` from ${mapISO2ToDisplayName(selectedCountry)}` : ''}
                  </span>
                  {(showMissingAuthorCountry || selectedCountry) && (
                    <button
                      type="button"
                      className="bottom-sheet-link"
                      onClick={() => {
                        setSelectedCountry(null)
                        if (showMissingAuthorCountry) onClearMissingAuthorCountry()
                      }}
                    >
                      All books
                    </button>
                  )}
                  {summaryStats.booksMissingAuthorCountry > 0 && !showMissingAuthorCountry && (
                    <button
                      type="button"
                      onClick={onToggleMissingAuthorCountry}
                      className="bottom-sheet-link bottom-sheet-missing-link"
                    >
                      {summaryStats.booksMissingAuthorCountry} books without country
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable book list */}
            <div className="bottom-sheet-scroll">
              <div className="bottom-sheet-book-list">
                <BookList showMissingAuthorCountry={showMissingAuthorCountry} />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
