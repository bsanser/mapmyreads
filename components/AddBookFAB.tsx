'use client'

interface AddBookFABProps {
  onClick: () => void
  themeColor?: string
}

export default function AddBookFAB({ onClick, themeColor }: AddBookFABProps) {
  return (
    <button
      className="fab-add-book"
      onClick={onClick}
      aria-label="Add book"
      style={themeColor ? { backgroundColor: themeColor } : undefined}
    >
      <svg
        className="fab-icon"
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Book */}
        <g stroke="currentColor" strokeWidth={1.4}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H14" />
          <path d="M20 10v12H6.5a2.5 2.5 0 0 1 0-5H20" />
        </g>

        {/* Bigger, clearer plus */}
        <g stroke="currentColor" strokeWidth={2.6}>
          <line x1="14.5" y1="5" x2="21.5" y2="5" />
          <line x1="18" y1="1.5" x2="18" y2="8.5" />
        </g>
      </svg>
      <span className="fab-label">Add book</span>
    </button>
  )
}
