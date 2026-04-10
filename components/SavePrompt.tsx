'use client'

import { useState } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useBooks } from '../contexts/BooksContext'

interface SavePromptProps {
  open?: boolean
  onClose?: () => void
}

export function SavePrompt({ open, onClose }: SavePromptProps = {}) {
  const { isLoggedIn, sessionId } = useSession()
  const { books } = useBooks()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('save_prompt_dismissed') === '1'
  )
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const readBookCount = books.filter(b => b.readStatus === 'read').length
  const autoShow = !isLoggedIn && !dismissed && readBookCount >= 2

  const isVisible = open ?? autoShow

  if (isLoggedIn || !isVisible) return null

  const handleDismiss = () => {
    if (onClose) {
      onClose()
    } else {
      sessionStorage.setItem('save_prompt_dismissed', '1')
      setDismissed(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId }),
    })
    setSent(true)
  }

  return (
    <div className="save-prompt">
      <button
        className="save-prompt-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss"
        type="button"
      >
        ×
      </button>
      {sent ? (
        <p className="save-prompt-confirm">Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={handleSubmit} className="save-prompt-form">
          <p className="save-prompt-label">Keep your reading map</p>
          <p className="save-prompt-desc">Sign in to sync your books across devices. Your map stays with you everywhere.</p>
          <input
            type="email"
            className="save-prompt-input"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="save-prompt-btn">Send sign-in link</button>
        </form>
      )}
    </div>
  )
}
