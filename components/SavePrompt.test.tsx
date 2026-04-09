// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import * as jestDomMatchers from '@testing-library/jest-dom/matchers'
import { SavePrompt } from './SavePrompt'

expect.extend(jestDomMatchers)

// ─── Mock contexts ────────────────────────────────────────────────────────────

const mockUseSession = vi.fn()
const mockUseBooks = vi.fn()

vi.mock('../contexts/SessionContext', () => ({
  useSession: () => mockUseSession(),
}))

vi.mock('../contexts/BooksContext', () => ({
  useBooks: () => mockUseBooks(),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBooks(count: number, source: 'manual' | 'goodreads' = 'manual') {
  return Array.from({ length: count }, (_, i) => ({
    title: `Book ${i}`,
    authors: 'Author',
    isbn13: null,
    yearPublished: null,
    bookCountries: [],
    authorCountries: [],
    readStatus: 'read' as const,
    readDate: null,
    avgRating: null,
    myRating: null,
    numberOfPages: null,
    bookshelves: [],
    coverImage: null,
    source,
    originalData: {},
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SavePrompt', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()

    mockUseSession.mockReturnValue({ isLoggedIn: false, sessionId: 'test-session-id' })
  })

  it('does not render when manualBookCount < 2', () => {
    mockUseBooks.mockReturnValue({ books: makeBooks(1, 'manual') })

    const { container } = render(<SavePrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders when manualBookCount >= 2 and user is not logged in', () => {
    mockUseBooks.mockReturnValue({ books: makeBooks(2, 'manual') })

    render(<SavePrompt />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('does not render when user is logged in', () => {
    mockUseSession.mockReturnValue({ isLoggedIn: true, sessionId: 'test-session-id' })
    mockUseBooks.mockReturnValue({ books: makeBooks(3, 'manual') })

    const { container } = render(<SavePrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not render after the user clicks dismiss', () => {
    mockUseBooks.mockReturnValue({ books: makeBooks(2, 'manual') })

    const { container } = render(<SavePrompt />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(container).toBeEmptyDOMElement()
  })

  it('does not render if already dismissed (sessionStorage set)', () => {
    sessionStorage.setItem('save_prompt_dismissed', '1')
    mockUseBooks.mockReturnValue({ books: makeBooks(2, 'manual') })

    const { container } = render(<SavePrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not count non-manual books toward the threshold', () => {
    mockUseBooks.mockReturnValue({ books: makeBooks(3, 'goodreads') })

    const { container } = render(<SavePrompt />)
    expect(container).toBeEmptyDOMElement()
  })
})
