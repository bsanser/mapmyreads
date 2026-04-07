'use client'

import { useRef, useEffect } from 'react'

interface BookSearchInputProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function BookSearchInput({ onSearch, isLoading }: BookSearchInputProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  return (
    <div className="book-search-input-wrapper">
      <input
        ref={inputRef}
        type="text"
        className="book-search-input"
        placeholder="Search by title or author…"
        onChange={handleChange}
        aria-label="Search books"
      />
      {isLoading && <span className="book-search-spinner" aria-label="Loading" />}
    </div>
  )
}
