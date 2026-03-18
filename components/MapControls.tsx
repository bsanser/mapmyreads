import { useState, useRef, useEffect } from 'react'
import { THEMES, ThemeKey } from '../lib/themeManager'

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
  layout = 'stacked'
}: MapControlsProps) {
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)
  const themeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!themeDropdownRef.current?.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false)
      }
    }

    if (isThemeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isThemeDropdownOpen])

  const size = layout === 'inline' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-2xl'

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={themeDropdownRef}>
        <button
          onClick={() => setIsThemeDropdownOpen(prev => !prev)}
          className={`map-control-btn ${size}`}
          title="Select theme"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: 'var(--color-ink-2)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </button>

        {isThemeDropdownOpen && (
          <div className="map-dropdown absolute top-full right-0 mt-1 z-50 min-w-[160px]">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  onThemeChange?.(key as ThemeKey)
                  setIsThemeDropdownOpen(false)
                }}
                className="map-dropdown-item"
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
        )}
      </div>
    </div>
  )
}
