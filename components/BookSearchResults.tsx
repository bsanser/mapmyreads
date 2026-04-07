'use client'

import { SearchBookResult } from '../lib/bookSearchParser'

interface BookSearchResultsProps {
  results: SearchBookResult[]
  query: string
  isLoading: boolean
  onSelect: (result: SearchBookResult) => void
  onManualFallback: () => void
}

export default function BookSearchResults({
  results,
  query,
  isLoading,
  onSelect,
  onManualFallback,
}: BookSearchResultsProps) {
  if (isLoading) return null
  if (results.length === 0 && query.length >= 2) {
    return (
      <div className="book-search-empty">
        <p>No results found.</p>
        <button className="manual-fallback-link" onClick={onManualFallback}>
          Can&apos;t find it? Add it manually →
        </button>
      </div>
    )
  }
  if (results.length === 0) return null

  return (
    <ul className="book-search-results">
      {results.map((result, i) => (
        <li key={result.isbn13 ?? `${result.title}-${i}`} className="book-search-result">
          <button onClick={() => onSelect(result)} className="book-search-result-btn">
            <img
              src={result.coverUrl ?? '/book-placeholder.svg'}
              alt={result.title}
              width={32}
              height={48}
              className="book-search-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = '/book-placeholder.svg'
              }}
            />
            <span className="book-search-result-info">
              <span className="book-search-result-title">{result.title}</span>
              <span className="book-search-result-author">{result.author}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
