import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'

interface DesktopSidebarProps {
  books: Book[]
  selectedCountry: string | null
  countryViewMode: 'author' | 'book'
  onCountryClick: (country: string) => void
  onShowAll: () => void
  booksToShow: number
  onLoadMore: () => void
}

export function DesktopSidebar({ 
  books, 
  selectedCountry, 
  countryViewMode,
  onCountryClick,
  onShowAll,
  booksToShow,
  onLoadMore
}: DesktopSidebarProps) {
  console.log('DesktopSidebar props:', { selectedCountry, countryViewMode, booksCount: books.length });
  
  // Filter books based on selected country and view mode
  const filteredBooks = selectedCountry
    ? books.filter((book) => {
        const countries = countryViewMode === 'author' ? book.authorCountries : book.bookCountries
        const hasCountry = countries.includes(selectedCountry);
        console.log(`Book "${book.title}": countries=${countries}, selectedCountry=${selectedCountry}, hasCountry=${hasCountry}`);
        return hasCountry;
      })
    : books

  const readBooks = filteredBooks.filter(b => b.readStatus === 'read')
  console.log('Filtered books count:', readBooks.length);

  return (
    <div 
      className="hidden lg:block absolute top-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 p-6 w-80 max-h-[calc(100vh-120px)] overflow-auto z-50"
      style={{ zIndex: 50 }}
      onScroll={(e) => {
        const target = e.target as HTMLDivElement
        const { scrollTop, scrollHeight, clientHeight } = target
        
        // Load more when user is near bottom (within 100px)
        if (scrollHeight - scrollTop - clientHeight < 100) {
          onLoadMore()
        }
      }}
    >
      <h2 className="text-lg font-bold mb-4 text-gray-700">
        {countryViewMode === 'author' ? 'Your Read Authors' : 'Your Read Books'}
      </h2>
      
      <div className="text-sm text-gray-700 mb-4">
        {selectedCountry
          ? `${readBooks.length} ${countryViewMode === 'author' ? 'authors from' : 'books from'} ${getCountryFlag(selectedCountry)} ${mapISO2ToDisplayName(selectedCountry)}`
          : `${books.filter(b => b.readStatus === 'read').length} ${countryViewMode === 'author' ? 'read authors' : 'read books'}`}
        {selectedCountry && (
          <button
            onClick={onShowAll}
            className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
          >
            Show all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {readBooks.slice(0, booksToShow).map((b, i) => (
          <div
            key={`${b.isbn13}-${i}`}
            className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex"
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
        
        {/* Loading indicator for infinite scroll */}
        {booksToShow < readBooks.length && (
          <div className="text-center py-4">
            <div className="inline-flex items-center text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
              Loading more books...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
