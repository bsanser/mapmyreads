'use client'

import { useState } from 'react'
import { useSession } from '../contexts/SessionContext'

interface MagicLinkFormProps {
  label?: string
  description?: string
  onSent?: () => void
}

export function MagicLinkForm({
  label = 'Keep your reading map',
  description = 'Sign in to sync your books across devices. Your map stays with you everywhere.',
  onSent,
}: MagicLinkFormProps) {
  const { sessionId } = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId }),
    })
    setSent(true)
    onSent?.()
  }

  if (sent) {
    return <p className="save-prompt-confirm">Check your email for a sign-in link.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="save-prompt-form">
      <p className="save-prompt-label">{label}</p>
      <p className="save-prompt-desc">{description}</p>
      <input
        type="email"
        className="save-prompt-input"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoFocus
      />
      <button type="submit" className="save-prompt-btn">Send sign-in link</button>
    </form>
  )
}
