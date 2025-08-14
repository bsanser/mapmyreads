import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { mapCountryNameForDisplay } from '../lib/countryDetection'

interface MobileBottomSheetProps {
  books: Book[]
  selectedCountry: string | null
  countryViewMode: 'author' | 'book'
  onCountryClick: (country: string) => void
  onShowAll: () => void
  showBottomSheet: boolean
  onToggleBottomSheet: () => void
}

export function MobileBottomSheet({ 
  books, 
  selectedCountry, 
  countryViewMode,
  onCountryClick,
  onShowAll,
  showBottomSheet,
  onToggleBottomSheet
}: MobileBottomSheetProps) {
  // Filter books based on selected country and view mode
  const filteredBooks = selectedCountry
    ? books.filter((book) => {
        const countries = countryViewMode === 'author' ? book.authorCountries : book.bookCountries
        return countries.includes(selectedCountry)
      })
    : books

  const readBooks = filteredBooks.filter(b => b.readStatus === 'read')

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className={`h-48 transition-all duration-300 ease-out ${
        showBottomSheet ? 'h-[70vh]' : 'h-48'
      }`}>
        {/* Header - Always Fixed (Outside Scrollable Container) */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white cursor-pointer" onClick={onToggleBottomSheet}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                {countryViewMode === 'author' ? 'Your Read Authors' : 'Your Read Books'}
              </h2>
              <div className="text-sm text-gray-700">
                {selectedCountry
                  ? `${readBooks.length} ${countryViewMode === 'author' ? 'authors from' : 'books from'} ${getCountryFlag(selectedCountry)} ${mapCountryNameForDisplay(selectedCountry)}`
                  : `${books.filter(b => b.readStatus === 'read').length} ${countryViewMode === 'author' ? 'read authors' : 'read books'}`}
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showBottomSheet ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Scrollable Book List Container */}
        <div className={`flex-1 transition-all duration-300 ease-out ${
          showBottomSheet ? 'overflow-y-auto' : 'overflow-hidden'
        }`}>
          <div 
            className="px-6 py-4 space-y-3"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
                repeating-linear-gradient(
                  transparent, transparent 24px,
                  rgba(59, 130, 246, 0.2) 24px, rgba(59, 130, 246, 0.2) 25px,
                  transparent 25px, transparent 49px,
                  rgba(220, 38, 38, 0.2) 49px, rgba(220, 38, 38, 0.2) 50px
                )
              `,
              backgroundSize: '100% 100%, 100% 50px',
              backgroundPosition: '0 0, 0 8px',
            }}
          >
            {readBooks.map((b, i) => (
              <div
                key={`${b.isbn13}-${i}`}
                className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex"
              >
                {/* Book cover with paper clip - proper clipping effect */}
                {b.coverImage && (
                  <div className="relative mr-4 flex-shrink-0">
                    <img 
                      src={b.coverImage} 
                      alt={`Cover of ${b.title}`}
                      className="w-16 h-24 object-cover rounded border border-gray-200 shadow-sm"
                    />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Book details */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-gray-900 text-sm leading-tight mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.title}</p>
                  <p className="font-mono text-gray-700 text-xs mb-1" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                    by {b.authors}
                    {b.authorCountries.length > 0 && (
                      <span className="ml-1">{b.authorCountries.map(getCountryFlag).join(' ')}</span>
                    )}
                  </p>
                  {b.yearPublished && <p className="font-mono text-gray-600 text-xs mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.yearPublished}</p>}
                  {(countryViewMode === 'author' ? b.authorCountries : b.bookCountries).length > 0 && (
                    <div className="font-mono text-gray-600 text-xs" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                      <span className="font-medium">{countryViewMode === 'author' ? 'Author Countries:' : 'Countries:'}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(countryViewMode === 'author' ? b.authorCountries : b.bookCountries).map((country) => (
                          <button
                            key={country}
                            onClick={() => onCountryClick(country)}
                            className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors text-xs px-1 py-0.5 rounded hover:bg-blue-50"
                          >
                            {mapISO2ToDisplayName(country)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
