import { memo } from 'react'
import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { COUNTRIES } from '../lib/countries'


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
              className={isEditing ? 'book-edit-btn-active' : 'book-edit-btn'}
              title="Edit author countries"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 3.487l3.651 3.65m-2.906-4.395L9.208 11.14c-.27.27-.46.61-.55.98l-.89 3.788a.75.75 0 00.914.914l3.788-.89c.37-.09.71-.28.98-.55l8.399-8.398a1.5 1.5 0 000-2.122l-1.95-1.95a1.5 1.5 0 00-2.122 0zM6 19.5h12" />
              </svg>
            </button>
          </div>

          {isEditing ? (
            <div className="book-country-edit-area">
              <div className="book-country-badges">
                {b.authorCountries.length === 0 && (
                  <span className="type-meta">No countries yet</span>
                )}
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
                  onChange={e => onCountrySearchChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (suggestions.length > 0) {
                        onAddCountry(suggestions[0].iso2)
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
                    {suggestions.map(country => (
                      <button
                        key={country.iso2}
                        type="button"
                        onClick={() => onAddCountry(country.iso2)}
                        className="country-dropdown-item"
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
          ) : (
            <div className="book-country-tags">
              {b.authorCountries.map((country) => (
                <button
                  key={country}
                  onClick={() => onCountryClick(country)}
                  className="country-tag"
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
