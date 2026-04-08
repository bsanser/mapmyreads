// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ManualAddForm from './ManualAddForm'
import { Book } from '../types/book'

describe('ManualAddForm', () => {
  const onAdd = vi.fn()

  beforeEach(() => {
    onAdd.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows validation errors and does not call onAdd when both fields are empty', () => {
    render(<ManualAddForm onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /add to my map/i }))
    expect(screen.getByText(/title is required/i)).toBeTruthy()
    expect(screen.getByText(/author is required/i)).toBeTruthy()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('shows only author error when title is filled but author is empty', () => {
    render(<ManualAddForm onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Book' } })
    fireEvent.click(screen.getByRole('button', { name: /add to my map/i }))
    expect(screen.queryByText(/title is required/i)).toBeNull()
    expect(screen.getByText(/author is required/i)).toBeTruthy()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onAdd with correct Book shape when both fields are filled', () => {
    render(<ManualAddForm onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Dune' } })
    fireEvent.change(screen.getByLabelText(/author/i), { target: { value: 'Frank Herbert' } })
    fireEvent.click(screen.getByRole('button', { name: /add to my map/i }))
    expect(onAdd).toHaveBeenCalledOnce()
    const book: Book = onAdd.mock.calls[0][0]
    expect(book.title).toBe('Dune')
    expect(book.authors).toBe('Frank Herbert')
    expect(book.source).toBe('manual')
    expect(book.isResolvingCountry).toBe(true)
    expect(book.readStatus).toBe('read')
  })
})
