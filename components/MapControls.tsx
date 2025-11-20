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

  // Close dropdown when clicking outside of it
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

  const containerClasses = 'flex items-center gap-3'
  const buttonClasses = layout === 'inline'
    ? 'w-8 h-8 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 flex items-center justify-center hover:bg-white/98 hover:shadow-md transition-all duration-200'
    : 'w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-sm'

  return (
    <div className={containerClasses}>
      <div className="relative" ref={themeDropdownRef}>
        <button
          onClick={() => setIsThemeDropdownOpen(prev => !prev)}
          className={buttonClasses}
          title="Select theme"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </button>

        {isThemeDropdownOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white/98 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-2">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  onThemeChange?.(key as ThemeKey)
                  setIsThemeDropdownOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-3"
              >
                <div
                  className="w-4 h-4 rounded border-2 flex-shrink-0"
                  style={{
                    backgroundColor: theme.fill,
                    borderColor: theme.outline
                  }}
                />
                <span className={key === currentTheme ? 'font-medium text-blue-700' : 'text-gray-700'}>
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
