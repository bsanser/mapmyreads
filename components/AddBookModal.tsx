'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Book } from '../types/book'
import ManualAddForm from './ManualAddForm'
import BookSearchInput from './BookSearchInput'
import BookSearchResults from './BookSearchResults'
import { SearchBookResult } from '../lib/bookSearchParser'

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  addBook: (book: Book) => 'added' | 'duplicate'
}

export default function AddBookModal({ isOpen, onClose, addBook }: AddBookModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchBookResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState('')

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleEscape])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setShowManual(false)
      setDuplicateMessage('')
    }
  }, [isOpen])

  const handleSearch = async (q: string) => {
    setQuery(q)
    setDuplicateMessage('')
    if (q.length < 2) {
      setResults([])
      setShowManual(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        if ((data.results ?? []).length === 0) setShowManual(false)
      }
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectResult = (result: SearchBookResult) => {
    const book: Book = {
      title: result.title,
      authors: result.author,
      isbn13: result.isbn13,
      yearPublished: result.year,
      bookCountries: [],
      authorCountries: [],
      readStatus: 'read',
      readDate: null,
      avgRating: null,
      myRating: null,
      numberOfPages: null,
      bookshelves: [],
      coverImage: result.coverUrl,
      source: 'manual',
      originalData: {},
      isResolvingCountry: true,
    }
    const outcome = addBook(book)
    if (outcome === 'duplicate') {
      setDuplicateMessage('This book is already in your library.')
    } else {
      onClose()
    }
  }

  const handleManualAdd = (book: Book) => {
    const outcome = addBook(book)
    if (outcome === 'duplicate') {
      setDuplicateMessage('This book is already in your library.')
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const modal = (
    <div className="add-book-backdrop" onClick={onClose}>
      <div className="add-book-panel" onClick={(e) => e.stopPropagation()}>
        <button className="add-book-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="add-book-title">Add a book</h2>

        <BookSearchInput onSearch={handleSearch} isLoading={isLoading} />

        {duplicateMessage && (
          <p className="add-book-duplicate">{duplicateMessage}</p>
        )}

        {!showManual && (
          <BookSearchResults
            results={results}
            query={query}
            isLoading={isLoading}
            onSelect={handleSelectResult}
            onManualFallback={() => setShowManual(true)}
          />
        )}

        {showManual && <ManualAddForm onAdd={handleManualAdd} />}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
