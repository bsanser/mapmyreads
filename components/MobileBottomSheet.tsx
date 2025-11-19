import { useEffect, useMemo, useState } from 'react'
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
      if (book.authors) {
        authorSet.add(book.authors.trim())
      }

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

  useEffect(() => {
    if (countryViewMode !== 'author') {
      setShowMissingAuthorCountry(false)
    }
  }, [countryViewMode])

  const baseFilteredBooks = selectedCountry
    ? books.filter((book) => {
        const countries = countryViewMode === 'author' ? book.authorCountries : book.bookCountries
        return countries.includes(selectedCountry)
      })
    : books

  const filteredBooks = baseFilteredBooks.filter(book => {
    if (showMissingAuthorCountry) {
      return book.readStatus === 'read' && book.authorCountries.length === 0
    }
    return true
  })

  const readBooks = filteredBooks.filter(b => b.readStatus === 'read')
  const displayedBookCount = readBooks.length
  const displayedBookLabel = displayedBookCount === 1 ? 'book' : 'books'

  const handleMissingAuthorCountryFilter = () => {
    if (summaryStats.booksMissingAuthorCountry === 0) return
    if (!showMissingAuthorCountry && selectedCountry) {
      onShowAll()
    }
    setShowMissingAuthorCountry(prev => !prev)
  }

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
                {countryViewMode === 'author' ? 'Your Reading Summary' : 'Your Read Books'}
              </h2>
              {countryViewMode === 'author' ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex items-center justify-between space-x-2">
                    <span className="truncate">Books read</span>
                    <span className="font-semibold tabular-nums">{summaryStats.readBooksCount}</span>
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <span className="truncate">Distinct authors</span>
                    <span className="font-semibold tabular-nums">{summaryStats.distinctAuthors}</span>
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <span className="truncate">Author countries covered</span>
                    <span className="font-semibold tabular-nums">{summaryStats.authorCountriesCovered}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMissingAuthorCountryFilter}
                    className={`flex w-full items-center justify-between rounded text-sm transition-colors ${
                      summaryStats.booksMissingAuthorCountry === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : showMissingAuthorCountry
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                    }`}
                    disabled={summaryStats.booksMissingAuthorCountry === 0}
                  >
                    <span className="flex-1 text-left truncate">Books without author country</span>
                    <span className="font-semibold tabular-nums">{summaryStats.booksMissingAuthorCountry}</span>
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-700">
                  {selectedCountry
                    ? `${readBooks.length} ${countryViewMode === 'author' ? 'authors from' : 'books from'} ${getCountryFlag(selectedCountry)} ${mapCountryNameForDisplay(selectedCountry)}`
                    : `${books.filter(b => b.readStatus === 'read').length} ${countryViewMode === 'author' ? 'read authors' : 'read books'}`}
                </div>
              )}
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
            <div className="text-xs text-gray-600 mb-2">
              Showing {displayedBookCount} {displayedBookLabel}
            </div>

            {countryViewMode === 'author' && showMissingAuthorCountry && (
              <div className="text-xs text-blue-700 text-center mb-2">
                Showing books without author country
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => setShowMissingAuthorCountry(false)}
                >
                  Clear
                </button>
              </div>
            )}
            {readBooks.map((b, i) => (
              <div
                key={`${b.isbn13}-${i}`}
                className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex items-start gap-4"
              >
                {/* Book cover with paper clip - proper clipping effect */}
                {b.coverImage && (
                  <div className="relative flex-shrink-0">
                    {/* Book cover as the "card" */}
                    <img 
                      src={b.coverImage} 
                      alt={`Cover of ${b.title}`}
                      className="block w-20 h-24 object-cover rounded shadow-md border border-gray-200 relative z-10"
                    />
                    
                    {/* Paper clip - positioned to go over the top edge of the card */}
                    <img 
                      src="/paperclip.svg" 
                      alt=""
                      className="absolute -top-10 -left-4 w-14 h-28 z-30 pointer-events-none"
                      style={{
                        transform: 'rotate(-20deg)'
                      }}
                    />
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
