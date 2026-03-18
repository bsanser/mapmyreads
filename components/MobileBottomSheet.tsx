import { mapISO2ToDisplayName } from '../lib/mapUtilities'
import { THEMES } from '../lib/themeManager'
import { BookList } from './BookList'
import { MapControls } from './MapControls'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'

interface MobileBottomSheetProps {
  showMissingAuthorCountry: boolean
  onToggleMissingAuthorCountry: () => void
  onClearMissingAuthorCountry: () => void
}

export function MobileBottomSheet({
  showMissingAuthorCountry,
  onToggleMissingAuthorCountry,
  onClearMissingAuthorCountry
}: MobileBottomSheetProps) {
  const { books, selectedCountry, setSelectedCountry, summaryStats } = useBooks()
  const { currentTheme, setCurrentTheme } = useTheme()

  const baseFilteredBooks = selectedCountry
    ? books.filter(book => book.authorCountries.includes(selectedCountry))
    : books
  const filteredBooks = showMissingAuthorCountry
    ? baseFilteredBooks.filter(book => book.readStatus === 'read' && book.authorCountries.length === 0)
    : baseFilteredBooks
  const displayedBookCount = filteredBooks.filter(b => b.readStatus === 'read').length
  const displayedBookLabel = displayedBookCount === 1 ? 'book' : 'books'

  return (
    <div className="mobile-bottom-sheet-wrapper">
      <div className="bottom-sheet-inner">

        {/* Drag handle */}
        <div className="bottom-sheet-handle">
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Compact stats + theme control */}
        <div className="bottom-sheet-stats">
          <div className="bottom-sheet-stat-group">
            <span className="type-stat">{summaryStats.readBooksCount}</span>
            <span className="type-stat-label">books</span>
            <span className="bottom-sheet-stat-divider">·</span>
            <span className="type-stat">{summaryStats.authorCountriesCovered}</span>
            <span className="type-stat-label">countries</span>
            {summaryStats.booksMissingAuthorCountry > 0 && !showMissingAuthorCountry && (
              <>
                <span className="bottom-sheet-stat-divider">·</span>
                <button
                  type="button"
                  onClick={onToggleMissingAuthorCountry}
                  className="bottom-sheet-link"
                >
                  {summaryStats.booksMissingAuthorCountry} missing
                </button>
              </>
            )}
          </div>
          <MapControls
            currentTheme={currentTheme}
            themes={THEMES}
            onThemeChange={setCurrentTheme}
            layout="inline"
          />
        </div>

        {/* Book list */}
        <div className="bottom-sheet-scroll">
          <div className="bottom-sheet-book-list">
            <div className="bottom-sheet-count-row">
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
                    if (showMissingAuthorCountry) {
                      onClearMissingAuthorCountry()
                    }
                  }}
                >
                  All books
                </button>
              )}
            </div>

            <BookList
              showMissingAuthorCountry={showMissingAuthorCountry}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
