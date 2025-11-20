import { useEffect, useMemo, useState } from 'react'
import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { COUNTRIES } from '../lib/countries'

interface MobileBottomSheetProps {
  books: Book[]
  selectedCountry: string | null
  onCountryClick: (country: string) => void
  onShowAll: () => void
  showBottomSheet: boolean
  onToggleBottomSheet: () => void
  onUpdateBookCountries: (book: Book, countries: string[]) => void
}

export function MobileBottomSheet({ 
  books, 
  selectedCountry, 
  onCountryClick,
  onShowAll,
  showBottomSheet,
  onToggleBottomSheet,
  onUpdateBookCountries
}: MobileBottomSheetProps) {
  const [showMissingAuthorCountry, setShowMissingAuthorCountry] = useState(false)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

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

  const baseFilteredBooks = selectedCountry
    ? books.filter((book) => book.authorCountries.includes(selectedCountry))
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

  const getBookIdentifier = (book: Book) => book.isbn13 || `${book.title}-${book.authors}-${book.yearPublished ?? 'unknown'}`

  const closeEditing = () => {
    setEditingBookId(null)
    setCountrySearch('')
    setShowCountryDropdown(false)
  }

  const handleToggleEdit = (bookId: string) => {
    if (editingBookId === bookId) {
      closeEditing()
    } else {
      setCountrySearch('')
      setShowCountryDropdown(false)
      setEditingBookId(bookId)
    }
  }

  const handleRemoveCountry = (book: Book, country: string) => {
    const updated = book.authorCountries.filter(code => code !== country)
    onUpdateBookCountries(book, updated)
  }

  const handleAddCountry = (book: Book, country: string) => {
    if (book.authorCountries.includes(country)) return
    const updated = [...book.authorCountries, country]
    onUpdateBookCountries(book, updated)
    closeEditing()
  }

  const handleMissingAuthorCountryFilter = () => {
    if (summaryStats.booksMissingAuthorCountry === 0) return
    if (!showMissingAuthorCountry && selectedCountry) {
      onShowAll()
    }
    setShowMissingAuthorCountry(prev => !prev)
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className={`transition-all duration-300 ease-out ${showBottomSheet ? 'h-[70vh]' : 'h-48'}`}>
        <div className="px-4 py-3 border-b border-gray-200 bg-white cursor-pointer" onClick={onToggleBottomSheet}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Your Reading Summary</h2>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
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
                {summaryStats.booksMissingAuthorCountry > 0 && (
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
                )}
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showBottomSheet ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {selectedCountry && (
            <div className="mt-2 text-xs text-gray-600">
              Filtering by {getCountryFlag(selectedCountry)} {mapISO2ToDisplayName(selectedCountry)}{' '}
              <button
                onClick={onShowAll}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                Show all
              </button>
            </div>
          )}
        </div>

        <div className={`flex-1 transition-all duration-300 ease-out ${showBottomSheet ? 'overflow-y-auto' : 'overflow-hidden'}`}>
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

            {showMissingAuthorCountry && (
              <div className="text-xs text-blue-700 text-center mb-2">
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setShowMissingAuthorCountry(false)
                    onShowAll()
                  }}
                >
                  All books
                </button>
              </div>
            )}

            {readBooks.map((b, i) => {
              const bookIdentifier = getBookIdentifier(b)
              const isEditing = editingBookId === bookIdentifier

              return (
                <div
                  key={`${b.isbn13}-${i}`}
                  className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex items-start gap-4"
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={b.coverImage ?? '/book-placeholder.png'} 
                      alt={`Cover of ${b.title}`}
                      className="block w-20 h-24 object-cover rounded shadow-md border border-gray-200 relative z-10"
                    />
                    <img 
                      src="/paperclip.svg" 
                      alt=""
                      className="absolute -top-10 -left-4 w-14 h-28 z-30 pointer-events-none"
                      style={{ transform: 'rotate(-20deg)' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-gray-900 text-sm leading-tight mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.title}</p>
                    <p className="font-mono text-gray-700 text-xs mb-1" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                      by {b.authors}
                    </p>
                    {b.yearPublished && <p className="font-mono text-gray-600 text-xs mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.yearPublished}</p>}

                    <div className="font-mono text-gray-600 text-xs" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Author Countries:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleEdit(bookIdentifier)}
                          className={`text-gray-500 hover:text-gray-700 border rounded p-0.5 ${isEditing ? 'bg-blue-50 text-blue-700' : ''}`}
                          title="Edit author countries"
                        >
                          ✏️
                        </button>
                      </div>
                      {isEditing ? (() => {
                        const searchTerm = countrySearch.trim().toLowerCase()
                        const availableSuggestions = COUNTRIES.filter(country => {
                          const notSelected = !b.authorCountries.includes(country.iso2)
                          if (!notSelected) return false
                          if (searchTerm === '') return true
                          const nameMatch = country.name.toLowerCase().includes(searchTerm)
                          const altMatch = country.alternatives.some(alt => alt.toLowerCase().includes(searchTerm))
                          return nameMatch || altMatch
                        })
                        const suggestions = availableSuggestions.slice(0, 8)
                        return (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {b.authorCountries.length === 0 && (
                                <span className="text-gray-400 text-xs">No countries yet</span>
                              )}
                              {b.authorCountries.map(country => (
                                <span
                                  key={country}
                                  className="inline-flex items-center gap-1 border border-gray-200 rounded px-2 py-0.5 text-xs bg-white"
                                >
                                  {mapISO2ToDisplayName(country)}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCountry(b, country)}
                                    className="text-gray-400 hover:text-gray-600"
                                    aria-label="Remove country"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={e => setCountrySearch(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (suggestions.length > 0) {
                                      handleAddCountry(b, suggestions[0].iso2)
                                    }
                                  }
                                }}
                                onFocus={() => setShowCountryDropdown(true)}
                                onBlur={() => {
                                  const currentId = bookIdentifier
                                  setTimeout(() => {
                                    setShowCountryDropdown(false)
                                    if (editingBookId === currentId) {
                                      closeEditing()
                                    }
                                  }, 120)
                                }}
                                placeholder="Search country..."
                                className="w-full border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                              {(showCountryDropdown && (countrySearch || suggestions.length > 0)) && (
                                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg">
                                  {suggestions.map(country => (
                                    <button
                                      key={country.iso2}
                                      type="button"
                                      onClick={() => handleAddCountry(b, country.iso2)}
                                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50"
                                    >
                                      <span>{country.name}</span>
                                      <span>{getCountryFlag(country.iso2)}</span>
                                    </button>
                                  ))}
                                  {suggestions.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })() : (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {b.authorCountries.map((country) => (
                            <button
                              key={country}
                              onClick={() => onCountryClick(country)}
                              className="text-blue-600 hover:text-blue-800 transition-colors text-xs px-1 py-0.5 rounded hover:bg-blue-50 flex items-center gap-1"
                            >
                              <span className="underline hover:no-underline">{mapISO2ToDisplayName(country)}</span>
                              <span className="no-underline">{getCountryFlag(country)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
