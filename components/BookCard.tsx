import { memo, useState, useEffect } from 'react'
import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { COUNTRIES } from '../lib/countries'

const VALID_ISO2 = new Set(COUNTRIES.map(c => c.iso2))


interface BookCardProps {
  book: Book
  isEditing: boolean
  onToggleEdit: () => void
  onCountryClick: (country: string) => void
  onAddCountry: (country: string) => void
  onRemoveCountry: (country: string) => void
  countrySearch: string
  onCountrySearchChange: (value: string) => void
  showCountryDropdown: boolean
  onShowCountryDropdown: (show: boolean) => void
  onBlur: () => void
}

export const BookCard = memo(function BookCard({
  book: b,
  isEditing,
  onToggleEdit,
  onCountryClick,
  onAddCountry,
  onRemoveCountry,
  countrySearch,
  onCountrySearchChange,
  showCountryDropdown,
  onShowCountryDropdown,
  onBlur,
}: BookCardProps) {
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1)

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!showCountryDropdown) {
      setFocusedSuggestionIndex(-1)
    }
  }, [showCountryDropdown])

  const searchTerm = countrySearch.trim().toLowerCase()
  const suggestions = COUNTRIES.filter(country => {
    if (b.authorCountries.includes(country.iso2)) return false
    if (searchTerm === '') return true
    return (
      country.name.toLowerCase().includes(searchTerm) ||
      country.alternatives.some(alt => alt.toLowerCase().includes(searchTerm))
    )
  }).slice(0, 8)

  return (
    <div className="book-card">
      <div className="book-card-cover">
        <img
          src={b.coverImage ?? '/book-placeholder.png'}
          alt={`Cover of ${b.title}`}
          className="book-cover-img"
        />
        <img
          src="/paperclip.svg"
          alt=""
          className="book-paperclip"
        />
      </div>

      <div className="book-card-content">
        <p className="book-title">{b.title}</p>
        <p className="book-author">by {b.authors}</p>
        {b.yearPublished && (
          <p className="type-meta mb-2" style={{ textShadow: '0 1px 2px oklch(98% 0.008 75 / 0.8)' }}>{b.yearPublished}</p>
        )}

        <div className="type-caption" style={{ textShadow: '0 1px 2px oklch(98% 0.008 75 / 0.8)' }}>
          <div className="book-country-header">
            <span className="type-label">Author Countries:</span>
            <button
              type="button"
              onClick={onToggleEdit}
              className="book-edit-btn"
              title="Edit author countries"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isEditing
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                }
              </svg>
            </button>
          </div>

          {isEditing ? (
            <div className="book-country-edit-area">
              <div className="book-country-badges">
                {b.authorCountries.map(country => (
                  <span key={country} className="country-badge">
                    {mapISO2ToDisplayName(country)}
                    <button
                      type="button"
                      onClick={() => onRemoveCountry(country)}
                      aria-label="Remove country"
                      className="country-badge-remove"
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
                  onChange={e => {
                    onCountrySearchChange(e.target.value)
                    setFocusedSuggestionIndex(-1)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setFocusedSuggestionIndex(prev =>
                        prev < suggestions.length - 1 ? prev + 1 : 0
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setFocusedSuggestionIndex(prev =>
                        prev > 0 ? prev - 1 : suggestions.length - 1
                      )
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
                        onAddCountry(suggestions[focusedSuggestionIndex].iso2)
                        setFocusedSuggestionIndex(-1)
                      } else if (suggestions.length > 0) {
                        onAddCountry(suggestions[0].iso2)
                        setFocusedSuggestionIndex(-1)
                      }
                    }
                  }}
                  onFocus={() => onShowCountryDropdown(true)}
                  onBlur={onBlur}
                  placeholder="Search country..."
                  className="country-input"
                />
                {(showCountryDropdown && (countrySearch || suggestions.length > 0)) && (
                  <div className="country-dropdown">
                    {suggestions.map((country, index) => (
                      <button
                        key={country.iso2}
                        type="button"
                        onMouseDown={() => {
                          onAddCountry(country.iso2)
                          setFocusedSuggestionIndex(-1)
                        }}
                        className={`country-dropdown-item ${index === focusedSuggestionIndex ? 'country-dropdown-item-focused' : ''}`}
                      >
                        <span>{country.name}</span>
                        <span>{getCountryFlag(country.iso2)}</span>
                      </button>
                    ))}
                    {suggestions.length === 0 && (
                      <div className="country-dropdown-empty">No matches</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : b.isResolvingCountry ? (
            <div className="book-country-tags">
              <div className="shimmer" style={{ width: '80px', height: '20px' }} />
            </div>
          ) : (
            <div className="book-country-tags">
              {b.authorCountries.filter(c => VALID_ISO2.has(c)).map((country) => (
                <button
                  key={country}
                  onClick={() => onCountryClick(country)}
                  className={`country-tag animate-slide-up`}
                >
                  <span className="country-tag-name">{mapISO2ToDisplayName(country)}</span>
                  <span>{getCountryFlag(country)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
