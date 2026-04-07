'use client'

import { useState } from 'react'
import { Book } from '../types/book'

interface ManualAddFormProps {
  onAdd: (book: Book) => void
}

export default function ManualAddForm({ onAdd }: ManualAddFormProps) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [titleError, setTitleError] = useState('')
  const [authorError, setAuthorError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let valid = true
    if (!title.trim()) {
      setTitleError('Title is required')
      valid = false
    } else {
      setTitleError('')
    }
    if (!author.trim()) {
      setAuthorError('Author is required')
      valid = false
    } else {
      setAuthorError('')
    }
    if (!valid) return

    const book: Book = {
      title: title.trim(),
      authors: author.trim(),
      isbn13: null,
      yearPublished: null,
      bookCountries: [],
      authorCountries: [],
      readStatus: 'read',
      readDate: null,
      avgRating: null,
      myRating: null,
      numberOfPages: null,
      bookshelves: [],
      coverImage: null,
      source: 'manual',
      originalData: {},
      isResolvingCountry: true,
    }
    onAdd(book)
  }

  return (
    <form onSubmit={handleSubmit} className="manual-add-form">
      <div className="form-field">
        <label htmlFor="manual-title">Title</label>
        <input
          id="manual-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Book title"
        />
        {titleError && <span className="field-error">{titleError}</span>}
      </div>
      <div className="form-field">
        <label htmlFor="manual-author">Author</label>
        <input
          id="manual-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author name"
        />
        {authorError && <span className="field-error">{authorError}</span>}
      </div>
      <button type="submit" className="btn-primary">Add to my map</button>
    </form>
  )
}
