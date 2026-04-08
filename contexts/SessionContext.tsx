'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import type { Book } from '../types/book'

const SESSION_ID_KEY = 'map_my_reads_session_id'

/**
 * Returns the sessionId from localStorage, generating and storing a new UUID if absent.
 * Safe to call on every render — idempotent.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

interface SessionContextValue {
  sessionId: string
  userId: string | null
  isLoggedIn: boolean
  syncBooks: (books: Book[]) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = getOrCreateSessionId()
    setSessionId(id)

    // Register session in DB (no-op if already exists)
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    }).catch(err => console.warn('[SessionContext] session upsert failed:', err))
  }, [])

  const syncBooks = useCallback((books: Book[]) => {
    if (!sessionId) return

    // Clear any pending sync and schedule a new one (debounced 1s)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/sessions/${sessionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      }).catch(err => console.warn('[SessionContext] book sync failed:', err))
    }, 1000)
  }, [sessionId])

  return (
    <SessionContext.Provider value={{ sessionId, userId, isLoggedIn: userId !== null, syncBooks }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
