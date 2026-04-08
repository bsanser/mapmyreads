'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
