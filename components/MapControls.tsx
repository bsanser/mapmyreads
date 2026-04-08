import { useState, useRef, useEffect } from 'react'
import { THEMES, ThemeKey } from '../lib/themeManager'
import { FeedbackButton } from './FeedbackButton'

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
        {/* Three-dot ellipsis icon */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
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

          {/* Feedback row */}
          <div className="overflow-menu-item" onClick={() => setIsOverflowOpen(false)}>
            <FeedbackButton />
          </div>
        </div>
      )}
    </div>
  )
}
