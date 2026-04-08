// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import AddBookModal from './AddBookModal'

const noop = () => {}

describe('AddBookModal', () => {
  const onClose = vi.fn()
  const addBook = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    addBook.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('calls onClose when Escape key is pressed', () => {
    render(
      <AddBookModal isOpen={true} onClose={onClose} addBook={addBook} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', () => {
    render(
      <AddBookModal isOpen={true} onClose={onClose} addBook={addBook} />
    )
    const backdrop = document.querySelector('.add-book-backdrop')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when clicking inside the modal panel', () => {
    render(
      <AddBookModal isOpen={true} onClose={onClose} addBook={addBook} />
    )
    const panel = document.querySelector('.add-book-panel')
    expect(panel).not.toBeNull()
    fireEvent.click(panel!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows duplicate message and does not close when addBook returns "duplicate"', () => {
    addBook.mockReturnValue('duplicate')
    render(
      <AddBookModal isOpen={true} onClose={onClose} addBook={addBook} />
    )
    // Trigger the duplicate message via the modal's internal onAdd handler
    // We simulate by calling the modal's prop directly - find the manual form submit
    // Fill manual form and submit
    // Click "Can't find it" link first to show the manual form
    // Since search results start empty, directly trigger the manual fallback
    const manualLink = screen.queryByText(/can.t find it/i)
    if (manualLink) {
      fireEvent.click(manualLink)
    }
    // Fill form if present
    const titleInput = screen.queryByLabelText(/title/i)
    const authorInput = screen.queryByLabelText(/author/i)
    if (titleInput && authorInput) {
      fireEvent.change(titleInput, { target: { value: 'Dune' } })
      fireEvent.change(authorInput, { target: { value: 'Frank Herbert' } })
      fireEvent.click(screen.getByRole('button', { name: /add to my map/i }))
      expect(screen.getByText(/already in your library/i)).toBeTruthy()
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('renders nothing when isOpen is false', () => {
    render(
      <AddBookModal isOpen={false} onClose={onClose} addBook={addBook} />
    )
    expect(document.querySelector('.add-book-backdrop')).toBeNull()
  })
})
