'use client'

import { useEffect, useMemo, useState } from 'react'
import { ThemeKey, THEMES } from '../lib/themeManager'

const feedbackEmail = 'bsanser@gmail.com'
const feedbackSubject = 'Map my reads feedback'

interface FeedbackButtonProps {
  className?: string
  theme?: ThemeKey
}

export const FeedbackButton = ({ className = '', theme = 'blue' }: FeedbackButtonProps) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [deviceDetails, setDeviceDetails] = useState({
    os: 'Unknown',
    browser: 'Unknown',
    viewport: 'Unknown',
    userAgent: 'Unknown'
  })

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return

    const navigatorWithUserAgentData = navigator as Navigator & {
      userAgentData?: {
        platform?: string
        brands?: { brand: string; version: string }[]
      }
    }

    const os = navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? 'Unknown'
    const browser = navigatorWithUserAgentData.userAgentData?.brands
      ? navigatorWithUserAgentData.userAgentData.brands.map((brand) => `${brand.brand} ${brand.version}`).join(', ')
      : navigator.userAgent

    const viewport = `${window.innerWidth}x${window.innerHeight}`
    setDeviceDetails({
      os,
      browser,
      viewport,
      userAgent: navigator.userAgent
    })
  }, [])

  const deviceInfo = useMemo(() => {
    return `Operating system: ${deviceDetails.os}\nBrowser: ${deviceDetails.browser}\nViewport: ${deviceDetails.viewport}\nUser agent: ${deviceDetails.userAgent}`
  }, [deviceDetails])

  const themeColors = THEMES[theme]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return
    setSending(true)

    const body = `${feedback.trim()}\n\n-----\n${deviceInfo}`
    const mailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(
      body
    )}`

    if (typeof window !== 'undefined') {
      const anchor = document.createElement('a')
      anchor.href = mailto
      anchor.style.display = 'none'
      anchor.target = '_blank'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    }

    setShowFeedbackModal(false)
    setSending(false)
    setFeedback('')
  }

  const handleClose = () => {
    setShowFeedbackModal(false)
    setFeedback('')
  }

  return (
    <>
      <button
        onClick={() => setShowFeedbackModal(true)}
        className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 border border-gray-200 ${className}`}
        title="Send feedback"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="hidden lg:inline text-sm font-medium">Feedback</span>
      </button>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add your feedback</h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Add any suggestions, bugs or improvements you&apos;d like to see. I&apos;m reading 👀
            </p>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Share what we could improve..."
                required
              />

              <div className="mt-4 p-3 text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-md whitespace-pre-line">
                {deviceInfo}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md hover:shadow-inner transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={sending}
                  style={{
                    backgroundColor: themeColors.outline,
                    color: '#fff'
                  }}
                >
                  {sending ? 'Opening email...' : 'Send feedback'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
