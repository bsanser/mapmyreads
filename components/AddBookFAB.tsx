'use client'

interface AddBookFABProps {
  onClick: () => void
}

export default function AddBookFAB({ onClick }: AddBookFABProps) {
  return (
    <button className="fab-add-book" onClick={onClick} aria-label="Add book">
      <span className="fab-icon">+</span>
      <span className="fab-label">Add book</span>
    </button>
  )
}
