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
  userEmail: string | null
  isLoggedIn: boolean
  syncBooks: (books: Book[], immediate?: boolean) => void
  remoteBooks: Book[] | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [remoteBooks, setRemoteBooks] = useState<Book[] | null>(null)
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

    // Check if user is logged in; if so, fetch their remote books for cross-device hydration
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(async data => {
        if (data.user?.id) {
          setUserId(data.user.id)
          setUserEmail(data.user.email)
          if (data.sessionUuid) {
            const booksRes = await fetch(`/api/sessions/${data.sessionUuid}/books`)
            const booksData = await booksRes.json()
            if (booksData.sessionExists && Array.isArray(booksData.books)) {
              console.log('[SessionContext] loaded remote books:', booksData.books.length)
              setRemoteBooks(booksData.books)
            }
          }
        }
      })
      .catch(err => console.warn('[SessionContext] auth check failed:', err))
  }, [])

  const syncBooks = useCallback((books: Book[], immediate = false) => {
    if (!sessionId) return

    const doSync = () =>
      fetch(`/api/sessions/${sessionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      }).catch(err => console.warn('[SessionContext] book sync failed:', err))

    if (immediate) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      doSync()
    } else {
      // Debounce interactive mutations at 1s to batch rapid changes
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(doSync, 1000)
    }
  }, [sessionId])

  return (
    <SessionContext.Provider value={{ sessionId, userId, userEmail, isLoggedIn: userId !== null, syncBooks, remoteBooks }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
