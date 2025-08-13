'use client'

import { useState, useEffect, useRef } from 'react'
import { getStorageStats, clearProcessedBooks, hasProcessedBooks } from '../lib/storage'

export const StorageStatus = () => {
  const [stats, setStats] = useState({
    hasBooks: false,
    bookCount: 0,
    lastProcessed: null,
    daysSinceProcessed: null,
    storageType: 'server'
  })
  const [showDetails, setShowDetails] = useState(false)
  const statsLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate loading
    if (statsLoadedRef.current) return
    statsLoadedRef.current = true
    
    // Update stats when component mounts
    setStats(getStorageStats())
  }, [])

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all processed book data? This cannot be undone.')) {
      clearProcessedBooks()
      setStats(getStorageStats())
    }
  }

  if (!stats.hasBooks) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div>
            <h3 className="font-medium text-blue-900">
              Processed Books Available
            </h3>
            <p className="text-sm text-blue-700">
              {stats.bookCount} books • Stored in {stats.storageType}
              {stats.daysSinceProcessed !== null && (
                <span> • Processed {stats.daysSinceProcessed} days ago</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          <button
            onClick={handleClearData}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Clear Data
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Storage Type:</span>
              <span className="ml-2 text-blue-700">{stats.storageType}</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Book Count:</span>
              <span className="ml-2 text-blue-700">{stats.bookCount}</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Last Processed:</span>
              <span className="ml-2 text-blue-700">
                {stats.lastProcessed ? stats.lastProcessed.toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Days Since:</span>
              <span className="ml-2 text-blue-700">
                {stats.daysSinceProcessed !== null ? stats.daysSinceProcessed : 'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
                          <p className="text-xs text-blue-800">
                <strong>Note:</strong> Your processed book data is stored locally in your browser. 
                It will persist until you clear your browser data or use the &quot;Clear Data&quot; button above. 
                This data is not stored on our servers.
              </p>
          </div>
        </div>
      )}
    </div>
  )
} 