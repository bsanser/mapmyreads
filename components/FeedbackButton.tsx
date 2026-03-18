'use client'

import { useEffect, useMemo, useState } from 'react'

const feedbackEmail = 'bsanser@gmail.com'
const feedbackSubject = 'Map my reads feedback'

interface FeedbackButtonProps {
  className?: string
}

export const FeedbackButton = ({ className = '' }: FeedbackButtonProps) => {
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
        className={`feedback-btn ${className}`}
        title="Send feedback"
      >
        <svg className="feedback-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="feedback-btn-label">Feedback</span>
      </button>

      {showFeedbackModal && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <div className="feedback-modal-header">
              <h3 className="type-heading" style={{ fontSize: '1.125rem' }}>Add your feedback</h3>
              <button onClick={handleClose} className="map-control-btn" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="feedback-modal-body type-body" style={{ fontSize: '0.875rem' }}>
              Add any suggestions, bugs or improvements you&apos;d like to see. I&apos;m reading 👀
            </p>

            <form onSubmit={handleSubmit}>
              <label className="type-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Your feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="feedback-textarea"
                placeholder="Share what we could improve..."
                required
              />

              <div className="feedback-device-info">
                {deviceInfo}
              </div>

              <div className="feedback-actions">
                <button
                  type="submit"
                  className="feedback-submit-btn"
                  disabled={sending}
                >
                  {sending ? 'Opening email...' : 'Send feedback'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="feedback-cancel-btn"
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
