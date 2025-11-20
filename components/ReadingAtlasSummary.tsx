import { MouseEvent } from 'react'

import { ThemeKey, THEMES } from '../lib/themeManager'

interface ReadingAtlasSummaryProps {
  stats: {
    readBooksCount: number
    distinctAuthors: number
    authorCountriesCovered: number
    booksMissingAuthorCountry: number
  }
  showMissingAuthorCountry: boolean
  onToggleMissingAuthorCountry?: (event?: MouseEvent<HTMLButtonElement>) => void
  currentTheme?: ThemeKey
  className?: string
}

const STAT_CARDS = [
  { label: 'Books', key: 'readBooksCount' },
  { label: 'Authors', key: 'distinctAuthors' },
  { label: 'Countries', key: 'authorCountriesCovered' }
] as const

export function ReadingAtlasSummary({
  stats,
  showMissingAuthorCountry,
  onToggleMissingAuthorCountry,
  currentTheme = 'blue',
  className = ''
}: ReadingAtlasSummaryProps) {
  const handleMissingClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onToggleMissingAuthorCountry?.(event)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Reading Atlas</p>
        <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Your literary journey</h2>
        <p className="text-sm text-gray-500">Track progress through books, voices, and cultures.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-gray-900 text-base pb-1">
        {STAT_CARDS.map(({ label, key }) => (
          <div key={label} className="leading-tight">
            <span className="text-2xl font-semibold tabular-nums block">{stats[key]}</span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {stats.booksMissingAuthorCountry > 0 && (
        <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M12 5a7 7 0 110 14 7 7 0 010-14z" />
              </svg>
            </div>
            <button
              type="button"
              onClick={handleMissingClick}
              className="text-sm font-medium underline underline-offset-4 decoration-dashed"
              style={{ color: THEMES[currentTheme].outline }}
            >
              {stats.booksMissingAuthorCountry} book{stats.booksMissingAuthorCountry === 1 ? '' : 's'} without country data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
