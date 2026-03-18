'use client'

import { useState, useEffect, useRef } from 'react'
import { getStorageStats, clearProcessedBooks } from '../lib/storage'

export const StorageStatus = () => {
  const [stats, setStats] = useState({
    hasBooks: false,
    bookCount: 0,
    lastProcessed: null as Date | null,
    daysSinceProcessed: null as number | null,
    storageType: 'server'
  })
  const statsLoadedRef = useRef(false)

  useEffect(() => {
    if (statsLoadedRef.current) return
    statsLoadedRef.current = true
    setStats(getStorageStats())
  }, [])

  const handleClearData = () => {
    if (confirm('Clear all saved book data? This cannot be undone.')) {
      clearProcessedBooks()
      setStats(getStorageStats())
    }
  }

  if (!stats.hasBooks) return null

  return (
    <div className="storage-status-bar">
      <span className="type-caption" style={{ color: 'oklch(from var(--color-surface) l c h / 0.55)' }}>
        {stats.bookCount} books saved
        {stats.daysSinceProcessed !== null && ` · ${stats.daysSinceProcessed}d ago`}
      </span>
      <button
        onClick={handleClearData}
        className="storage-clear-btn"
      >
        Clear
      </button>
    </div>
  )
}
