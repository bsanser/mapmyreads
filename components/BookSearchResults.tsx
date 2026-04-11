'use client'

import { useState } from 'react'
import { SearchBookResult } from '../lib/bookSearchParser'

const PLACEHOLDER = '/book-placeholder.svg'

interface BookSearchResultsProps {
  results: SearchBookResult[]
  query: string
  isLoading: boolean
  onSelect: (result: SearchBookResult) => void
  onManualFallback: () => void
}

function BookCover({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER)

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={32}
      height={48}
      className="book-search-cover"
      onError={() => setImgSrc(PLACEHOLDER)}
    />
  )
}

export default function BookSearchResults({
  results,
  query,
  isLoading,
  onSelect,
  onManualFallback,
}: BookSearchResultsProps) {
  // Show empty state only when not loading and no results for a real query
  if (!isLoading && results.length === 0 && query.length >= 2) {
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

  // Keep results visible while a new search is in-flight (no unmount → no cover blink)
  return (
    <ul className={`book-search-results${isLoading ? ' book-search-results--loading' : ''}`}>
      {results.map((result, i) => (
        <li key={result.isbn13 ?? `${result.title}-${i}`} className="book-search-result">
          <button onClick={() => onSelect(result)} className="book-search-result-btn">
            <BookCover src={result.coverUrl} alt={result.title} />
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
