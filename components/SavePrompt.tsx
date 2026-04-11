'use client'

import { useState } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useBooks } from '../contexts/BooksContext'
import { MagicLinkForm } from './MagicLinkForm'

interface SavePromptProps {
  open?: boolean
  onClose?: () => void
}

export function SavePrompt({ open, onClose }: SavePromptProps = {}) {
  const { isLoggedIn } = useSession()
  const { books } = useBooks()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('save_prompt_dismissed') === '1'
  )

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
      <MagicLinkForm />
    </div>
  )
}
