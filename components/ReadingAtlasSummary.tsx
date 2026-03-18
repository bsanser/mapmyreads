import { memo, MouseEvent } from 'react'
import { THEMES } from '../lib/themeManager'
import { useBooks } from '../contexts/BooksContext'
import { useTheme } from '../contexts/ThemeContext'

interface ReadingAtlasSummaryProps {
  showMissingAuthorCountry: boolean
  onToggleMissingAuthorCountry?: (event?: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

const STAT_CARDS = [
  { label: 'Books', key: 'readBooksCount' },
  { label: 'Authors', key: 'distinctAuthors' },
  { label: 'Countries', key: 'authorCountriesCovered' }
] as const

export const ReadingAtlasSummary = memo(function ReadingAtlasSummary({
  showMissingAuthorCountry,
  onToggleMissingAuthorCountry,
  className = ''
}: ReadingAtlasSummaryProps) {
  const { summaryStats: stats } = useBooks()
  const { currentTheme } = useTheme()
  const handleMissingClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onToggleMissingAuthorCountry?.(event)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1">
        <p className="type-eyebrow">Reading Atlas</p>
        <h2 className="type-heading">Your literary journey</h2>
        <p className="type-caption">Track progress through books, voices, and cultures.</p>
      </div>

      <div className="stats-grid">
        {STAT_CARDS.map(({ label, key }) => (
          <div key={label} className="leading-tight">
            <span className="type-stat" style={{ display: 'block' }}>{stats[key]}</span>
            <span className="type-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {stats.booksMissingAuthorCountry > 0 && (
        <div className="badge-info">
          <div className="badge-info-row">
            <div style={{ color: 'var(--color-ink-3)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M12 5a7 7 0 110 14 7 7 0 010-14z" />
              </svg>
            </div>
            <button
              type="button"
              onClick={handleMissingClick}
              className="missing-books-link"
            >
              {stats.booksMissingAuthorCountry} book{stats.booksMissingAuthorCountry === 1 ? '' : 's'} without country data
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
