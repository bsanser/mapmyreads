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
    console.log(`✅ Saved ${books.length} processed books to localStorage`)
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error)
    // Fallback to sessionStorage if localStorage is full
    try {
      sessionStorage.setItem(STORAGE_KEYS.PROCESSED_BOOKS, JSON.stringify(books))
      sessionStorage.setItem(STORAGE_KEYS.LAST_PROCESSED, new Date().toISOString())
      console.log(`✅ Saved ${books.length} processed books to sessionStorage`)
    } catch (fallbackError) {
      console.error('❌ Error saving to sessionStorage:', fallbackError)
    }
  }
}

// Load processed books from storage
export const loadProcessedBooks = (): Book[] | null => {
  if (typeof window === 'undefined') return null
  
  try {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS)
    if (stored) {
      const books = JSON.parse(stored)
      return books
    }
    
    // Fallback to sessionStorage
    const sessionStored = sessionStorage.getItem(STORAGE_KEYS.PROCESSED_BOOKS)
    if (sessionStored) {
      const books = JSON.parse(sessionStored)
      return books
    }
    
    return null
  } catch (error) {
    console.error('❌ Error loading processed books:', error)
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
    console.log('✅ Cleared processed books from storage')
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
    
    console.log(`✅ Extracted ${books.length} books from shareable URL`)
    return books
  } catch (error) {
    console.error('❌ Error extracting shareable data:', error)
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
