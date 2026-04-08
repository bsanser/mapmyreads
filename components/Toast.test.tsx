// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  const onDismiss = vi.fn()

  beforeEach(() => {
    onDismiss.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the message string', () => {
    render(<Toast message="5 books added." onDismiss={onDismiss} />)
    expect(screen.getByText('5 books added.')).toBeTruthy()
  })

  it('calls onDismiss after 5 seconds', () => {
    render(<Toast message="Hello" onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss immediately when × button is clicked', () => {
    render(<Toast message="Hello" onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
