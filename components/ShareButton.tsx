'use client'

import { useState } from 'react'

export const ShareButton = ({ books, className = '' }: { books: any[], className?: string }) => {
  const [showShareModal, setShowShareModal] = useState(false)

  const handleShare = () => {
    setShowShareModal(true)
  }

  const generateShareableLink = () => {
    // Create a shareable link with the current book data
    const shareableData = {
      books: books.filter(book => book.readStatus === 'read'),
      timestamp: new Date().toISOString()
    }
    
    const encodedData = btoa(JSON.stringify(shareableData))
    const shareableUrl = `${window.location.origin}?data=${encodedData}`
    
    return shareableUrl
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
      alert('Link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 hover:bg-gray-50 border border-gray-200 ${className}`}
        title="Share Map"

      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        <span className="hidden lg:inline text-sm font-medium">Share Map</span>
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
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Share your reading journey with friends! This link will show your personalized reading map.
              </p>
              
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-700 mb-2">Shareable Link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generateShareableLink()}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                  />
                  <button
                    onClick={() => copyToClipboard(generateShareableLink())}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 