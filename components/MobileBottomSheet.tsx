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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bottom-sheet shadow-lg z-40" style={{ height: '42vh' }}>
      <div className="h-full flex flex-col">

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
                  className="type-caption link-accent underline"
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
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 space-y-3">
            <div className="type-caption flex items-center justify-between">
              <span>
                Showing <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{displayedBookCount}</span> {displayedBookLabel}
                {showMissingAuthorCountry ? ' without country data' : selectedCountry ? ` from ${mapISO2ToDisplayName(selectedCountry)}` : ''}
              </span>
              {(showMissingAuthorCountry || selectedCountry) && (
                <button
                  type="button"
                  className="type-caption link-accent underline"
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
