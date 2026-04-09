import { useState, useRef, useEffect } from 'react'
import { THEMES, ThemeKey } from '../lib/themeManager'
import { FeedbackButton } from './FeedbackButton'
import { ShareButton } from './ShareButton'

interface MapControlsProps {
  currentTheme: ThemeKey
  themes: typeof THEMES
  onThemeChange?: (theme: ThemeKey) => void
  layout?: 'inline' | 'stacked'
}

export function MapControls({
  currentTheme,
  themes,
  onThemeChange,
}: MapControlsProps) {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  // Close on click-outside and Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setIsOverflowOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOverflowOpen(false)
    }

    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOverflowOpen])

  return (
    <div className="relative" ref={overflowRef}>
      {/* Overflow trigger button */}
      <button
        onClick={() => setIsOverflowOpen(prev => !prev)}
        className="map-control-btn w-10 h-10 rounded-2xl"
        title="More options"
        aria-label="More options"
        aria-expanded={isOverflowOpen}
      >
        {/* Settings icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="6" r="2" fill="var(--color-surface)" />
          <circle cx="15" cy="12" r="2" fill="var(--color-surface)" />
          <circle cx="9" cy="18" r="2" fill="var(--color-surface)" />
        </svg>
      </button>

      {isOverflowOpen && (
        <div className="overflow-menu">
          {/* Theme section */}
          <div className="overflow-menu-section">
            <div className="overflow-menu-label">Map theme</div>
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  onThemeChange?.(key as ThemeKey)
                  setIsOverflowOpen(false)
                }}
                className="overflow-menu-item"
                style={key === currentTheme ? { color: 'var(--color-accent)', fontWeight: 600 } : {}}
              >
                <div
                  className="w-4 h-4 rounded border-2 flex-shrink-0"
                  style={{
                    backgroundColor: theme.fill,
                    borderColor: theme.outline
                  }}
                />
                <span className="type-ui">{theme.name}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="overflow-menu-divider" />

          {/* Share row */}
          <button
            className="overflow-menu-item"
            onClick={() => {
              setIsOverflowOpen(false)
              setShareOpen(true)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="type-ui">Share map</span>
          </button>

          {/* Feedback row */}
          <button
            className="overflow-menu-item"
            onClick={() => {
              setIsOverflowOpen(false)
              setFeedbackOpen(true)
            }}
          >
            <svg className="feedback-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="type-ui">Send feedback</span>
          </button>
        </div>
      )}

      {/* Always mounted so modals survive overflow close */}
      <ShareButton
        externalOpen={shareOpen}
        onExternalClose={() => setShareOpen(false)}
        className="sr-only"
      />
      <FeedbackButton
        externalOpen={feedbackOpen}
        onExternalClose={() => setFeedbackOpen(false)}
        className="sr-only"
      />
    </div>
  )
}
