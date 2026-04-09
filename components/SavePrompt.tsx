'use client'

import { useState } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useBooks } from '../contexts/BooksContext'

export function SavePrompt() {
  const { isLoggedIn, sessionId } = useSession()
  const { books } = useBooks()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('save_prompt_dismissed') === '1'
  )
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const manualBookCount = books.filter(b => b.source === 'manual').length

  if (isLoggedIn || dismissed || manualBookCount < 2) return null

  const handleDismiss = () => {
    sessionStorage.setItem('save_prompt_dismissed', '1')
    setDismissed(true)
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
          <p className="save-prompt-label">Save your map across devices</p>
          <input
            type="email"
            className="save-prompt-input"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="save-prompt-btn">Send magic link</button>
        </form>
      )}
    </div>
  )
}
