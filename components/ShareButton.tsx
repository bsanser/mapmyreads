'use client'

import { useState } from 'react'
import { Book } from '../types/book'
import { createShareableData } from '../lib/storage'

interface ShareButtonProps {
  books: Book[]
  className?: string
}

export const ShareButton = ({ books, className = '' }: ShareButtonProps) => {
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const url = createShareableData(books)
    setShareUrl(url)
    setShowShareModal(true)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        className={`bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        Share Map
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Your Reading Map</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Share this link with friends to show them your reading journey around the world!
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              This link will expire in 24 hours and can be shared with anyone.
            </div>
          </div>
        </div>
      )}
    </>
  )
} 