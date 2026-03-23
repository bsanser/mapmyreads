import * as Sentry from '@sentry/nextjs'
import { Book } from '../types/book'

// Updated storage strategy for Replit + no-login users

// Client-side storage keys
export const STORAGE_KEYS = {
  PROCESSED_BOOKS: 'map_my_reads_processed_books',
  LAST_PROCESSED: 'map_my_reads_last_processed',
  SESSION_DATA: 'map_my_reads_session_',
  SHARED_DATA: 'map_my_reads_shared_'
}

// Save processed books to localStorage
export const saveProcessedBooks = (books: Book[]): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEYS.PROCESSED_BOOKS, JSON.stringify(books))
    localStorage.setItem(STORAGE_KEYS.LAST_PROCESSED, new Date().toISOString())
  } catch (error) {
    Sentry.captureException(error, { tags: { component: 'storage', operation: 'localStorage_write' } })
    // Fallback to sessionStorage if localStorage is full
    try {
      sessionStorage.setItem(STORAGE_KEYS.PROCESSED_BOOKS, JSON.stringify(books))
      sessionStorage.setItem(STORAGE_KEYS.LAST_PROCESSED, new Date().toISOString())
    } catch (fallbackError) {
      Sentry.captureException(fallbackError, { tags: { component: 'storage', operation: 'sessionStorage_write' } })
    }
  }
}

const REQUIRED_BOOK_FIELDS = ['title', 'authors', 'readStatus', 'authorCountries', 'bookCountries'] as const

function isValidBooksArray(data: unknown): data is Book[] {
  if (!Array.isArray(data) || data.length === 0) return false
  const sample = data[0]
  return REQUIRED_BOOK_FIELDS.every(field => field in sample)
}

// Load processed books from storage
export const loadProcessedBooks = (): Book[] | null => {
  if (typeof window === 'undefined') return null

  try {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS)
    if (stored) {
      const books = JSON.parse(stored)
      if (!isValidBooksArray(books)) {
        console.warn('⚠️ Stored books failed shape validation — clearing stale data')
        localStorage.removeItem(STORAGE_KEYS.PROCESSED_BOOKS)
        return null
      }
      return books
    }

    // Fallback to sessionStorage
    const sessionStored = sessionStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS)
    if (sessionStored) {
      const books = JSON.parse(sessionStored)
      if (!isValidBooksArray(books)) {
        console.warn('⚠️ Stored books failed shape validation — clearing stale data')
        sessionStorage.removeItem(STORAGE_KEYS.PROCESSED_BOOKS)
        return null
      }
      return books
    }

    return null
  } catch (error) {
    Sentry.captureException(error, { tags: { component: 'storage', operation: 'localStorage_read' } })
    return null
  }
}

// Check if we have processed books
export const hasProcessedBooks = (): boolean => {
  return loadProcessedBooks() !== null
}

// Get last processing date
export const getLastProcessedDate = (): Date | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_PROCESSED) || 
                   sessionStorage.getItem(STORAGE_KEYS.LAST_PROCESSED)
    return stored ? new Date(stored) : null
  } catch (error) {
    return null
  }
}

// Clear processed books
export const clearProcessedBooks = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEYS.PROCESSED_BOOKS)
    localStorage.removeItem(STORAGE_KEYS.LAST_PROCESSED)
    sessionStorage.removeItem(STORAGE_KEYS.PROCESSED_BOOKS)
    sessionStorage.removeItem(STORAGE_KEYS.LAST_PROCESSED)
  } catch (error) {
    console.error('❌ Error clearing processed books:', error)
  }
}

// Shareable URL utilities (for data transfer without storage)
export const createShareableData = (books: Book[]): string => {
  if (typeof window === 'undefined') return ''
  
  try {
    // Compress data to fit in URL
    const dataString = JSON.stringify(books)
    
    // Simple compression (for production, use lz-string library)
    const compressed = btoa(encodeURIComponent(dataString))
    
    const url = new URL(window.location.href)
    url.searchParams.set('data', compressed)
    url.searchParams.set('shared', 'true')
    
    return url.toString()
  } catch (error) {
    console.error('❌ Error creating shareable data:', error)
    return window.location.href
  }
}

// Extract data from shareable URL
export const extractShareableData = (): Book[] | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const compressed = urlParams.get('data')
    
    if (!compressed) return null
    
    // Decompress data
    const dataString = decodeURIComponent(atob(compressed))
    const books = JSON.parse(dataString)
    
    return books
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'share_url' },
      extra: { error_message: String(error) }
    })
    return null
  }
}

// Check if current URL has shareable data
export const hasShareableData = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.has('data')
}

// Save shareable data to local storage
export const saveShareableData = (): void => {
  if (typeof window === 'undefined') return
  
  const books = extractShareableData()
  if (books) {
    saveProcessedBooks(books)
    // Clean up URL
    const url = new URL(window.location.href)
    url.searchParams.delete('data')
    url.searchParams.delete('shared')
    window.history.replaceState({}, '', url.toString())
  }
}

// Clear all caches (for testing)
export const clearAllCaches = () => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.clear()
    sessionStorage.clear()
    console.log('✅ All browser caches cleared!')
    return true
  } catch (error) {
    console.error('❌ Error clearing caches:', error)
    return false
  }
}

// Expose to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).clearAllCaches = clearAllCaches
}

// Storage statistics
export const getStorageStats = () => {
  if (typeof window === 'undefined') {
    return {
      hasBooks: false,
      bookCount: 0,
      lastProcessed: null,
      daysSinceProcessed: null,
      storageType: 'server'
    }
  }
  
  try {
    const books = loadProcessedBooks()
    const lastProcessed = getLastProcessedDate()
    
    return {
      hasBooks: books !== null,
      bookCount: books?.length || 0,
      lastProcessed,
      daysSinceProcessed: lastProcessed ? 
        Math.floor((Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)) : null,
      storageType: localStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS) ? 'localStorage' : 
                   sessionStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS) ? 'sessionStorage' : 'none'
    }
  } catch (error) {
    return {
      hasBooks: false,
      bookCount: 0,
      lastProcessed: null,
      daysSinceProcessed: null,
      storageType: 'error'
    }
  }
} 
