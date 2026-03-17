import { Book } from '../types/book'
import { getCountryFlag, mapISO2ToDisplayName } from '../lib/mapUtilities'
import { COUNTRIES } from '../lib/countries'

const NOTEBOOK_STYLE = {
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
}

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

export function BookCard({
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
    <div
      className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all min-h-[120px] flex items-start gap-4"
      style={NOTEBOOK_STYLE}
    >
      <div className="relative flex-shrink-0" style={{ paddingTop: '10px' }}>
        <img
          src={b.coverImage ?? '/book-placeholder.png'}
          alt={`Cover of ${b.title}`}
          className="block w-20 h-32 object-contain rounded shadow-md border border-gray-200 relative z-10 bg-white"
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
        {b.yearPublished && (
          <p className="font-mono text-gray-600 text-xs mb-2" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>{b.yearPublished}</p>
        )}

        <div className="font-mono text-gray-600 text-xs" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
          <div className="flex items-center gap-2">
            <span className="font-medium">Author Countries:</span>
            <button
              type="button"
              onClick={onToggleEdit}
              className={`text-gray-500 hover:text-gray-700 border rounded p-1 ${isEditing ? 'bg-gray-100 text-gray-900' : ''}`}
              title="Edit author countries"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 3.487l3.651 3.65m-2.906-4.395L9.208 11.14c-.27.27-.46.61-.55.98l-.89 3.788a.75.75 0 00.914.914l3.788-.89c.37-.09.71-.28.98-.55l8.399-8.398a1.5 1.5 0 000-2.122l-1.95-1.95a1.5 1.5 0 00-2.122 0zM6 19.5h12" />
              </svg>
            </button>
          </div>

          {isEditing ? (
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
                      onClick={() => onRemoveCountry(country)}
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
                  className="w-full border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {(showCountryDropdown && (countrySearch || suggestions.length > 0)) && (
                  <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg">
                    {suggestions.map(country => (
                      <button
                        key={country.iso2}
                        type="button"
                        onClick={() => onAddCountry(country.iso2)}
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
          ) : (
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
}
