import { useState } from 'react'
import { Book } from '../types/book'
import { BookCard } from './BookCard'
import { useBooks } from '../contexts/BooksContext'

interface BookListProps {
  showMissingAuthorCountry: boolean
  booksToShow?: number
}

export function BookList({ showMissingAuthorCountry, booksToShow }: BookListProps) {
  const { books, selectedCountry, setSelectedCountry, updateBookCountries } = useBooks()

  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const getBookIdentifier = (book: Book) =>
    book.isbn13 || `${book.title}-${book.authors}-${book.yearPublished ?? 'unknown'}`

  const closeEditing = () => {
    setEditingBookId(null)
    setCountrySearch('')
    setShowCountryDropdown(false)
  }

  const handleToggleEdit = (bookId: string) => {
    if (editingBookId === bookId) {
      closeEditing()
    } else {
      setCountrySearch('')
      setShowCountryDropdown(false)
      setEditingBookId(bookId)
    }
  }

  const handleRemoveCountry = (book: Book, country: string) => {
    const updated = book.authorCountries.filter(code => code !== country)
    updateBookCountries(book, updated)
  }

  const handleAddCountry = (book: Book, country: string) => {
    if (book.authorCountries.includes(country)) return
    const updated = [...book.authorCountries, country]
    updateBookCountries(book, updated)
    closeEditing()
  }

  const baseFilteredBooks = selectedCountry
    ? books.filter(book => book.authorCountries.includes(selectedCountry))
    : books

  const filteredBooks = showMissingAuthorCountry
    ? baseFilteredBooks.filter(book => book.readStatus === 'read' && book.authorCountries.length === 0)
    : baseFilteredBooks

  const readBooks = filteredBooks.filter(b => b.readStatus === 'read')
  const visibleBooks = booksToShow !== undefined ? readBooks.slice(0, booksToShow) : readBooks

  return (
    <div className="space-y-4">
      {visibleBooks.map((b, i) => {
        const bookIdentifier = getBookIdentifier(b)
        const isEditing = editingBookId === bookIdentifier

        return (
          <BookCard
            key={`${b.isbn13}-${i}`}
            book={b}
            isEditing={isEditing}
            onToggleEdit={() => handleToggleEdit(bookIdentifier)}
            onCountryClick={country => setSelectedCountry(country)}
            onAddCountry={country => handleAddCountry(b, country)}
            onRemoveCountry={country => handleRemoveCountry(b, country)}
            countrySearch={countrySearch}
            onCountrySearchChange={setCountrySearch}
            showCountryDropdown={showCountryDropdown}
            onShowCountryDropdown={setShowCountryDropdown}
            onBlur={() => {
              const currentId = bookIdentifier
              setTimeout(() => {
                setShowCountryDropdown(false)
                if (editingBookId === currentId) {
                  closeEditing()
                }
              }, 120)
            }}
          />
        )
      })}
    </div>
  )
}
