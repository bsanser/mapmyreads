import { mapISO2ToDisplayName } from '../lib/mapUtilities'
import { BookList } from './BookList'
import { THEMES } from '../lib/themeManager'
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
  const { books, selectedCountry, setSelectedCountry } = useBooks()
  const { currentTheme } = useTheme()

  // Compute count for "Showing X books" label
  const baseFilteredBooks = selectedCountry
    ? books.filter(book => book.authorCountries.includes(selectedCountry))
    : books
  const filteredBooks = showMissingAuthorCountry
    ? baseFilteredBooks.filter(book => book.readStatus === 'read' && book.authorCountries.length === 0)
    : baseFilteredBooks
  const displayedBookCount = filteredBooks.filter(b => b.readStatus === 'read').length
  const displayedBookLabel = displayedBookCount === 1 ? 'book' : 'books'

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40" style={{ height: '33vh' }}>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-3">
            <div className="text-xs text-gray-600 mb-4 flex items-center justify-between">
              <span>
                Showing <span className="font-semibold text-gray-900">{displayedBookCount}</span> {displayedBookLabel}
                {showMissingAuthorCountry ? ' without country data' : selectedCountry ? ` from ${mapISO2ToDisplayName(selectedCountry)}` : ''}
              </span>
              {(showMissingAuthorCountry || selectedCountry) && (
                <button
                  type="button"
                  className="text-xs underline"
                  style={{ color: THEMES[currentTheme].outline }}
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
