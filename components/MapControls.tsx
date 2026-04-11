import { useState, useRef, useEffect } from 'react'
import { THEMES, ThemeKey } from '../lib/themeManager'
import { FeedbackButton } from './FeedbackButton'
import { ShareButton } from './ShareButton'
import { useSession } from '../contexts/SessionContext'
import { useBooks } from '../contexts/BooksContext'

interface MapControlsProps {
  currentTheme: ThemeKey
  themes: typeof THEMES
  onThemeChange?: (theme: ThemeKey) => void
}

export function MapControls({
  currentTheme,
  themes,
  onThemeChange,
}: MapControlsProps) {
  const { isLoggedIn, userEmail, sessionId } = useSession()
  const { books } = useBooks()

  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const overflowRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  const readBookCount = books.filter(b => b.readStatus === 'read').length

  const closeAll = (except?: 'overflow' | 'account') => {
    if (except !== 'overflow') setIsOverflowOpen(false)
    if (except !== 'account') setIsAccountOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!overflowRef.current?.contains(e.target as Node)) setIsOverflowOpen(false)
      if (!accountRef.current?.contains(e.target as Node)) setIsAccountOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId }),
    })
    setSent(true)
    setTimeout(() => setIsAccountOpen(false), 2000)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2">

      {/* Account button */}
      <div className="relative" ref={accountRef}>
        <button
          onClick={() => { closeAll('account'); setIsAccountOpen(prev => !prev) }}
          className="map-control-btn w-10 h-10 rounded-2xl relative"
          title={isLoggedIn ? 'Account' : 'Sign in'}
          aria-label={isLoggedIn ? 'Account' : 'Sign in'}
        >
          {isLoggedIn ? (
            // Exit/logout icon when signed in
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
              style={{ color: 'var(--color-accent)' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ) : (
            // Person icon when signed out
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
              style={{ color: 'var(--color-ink-2)' }}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </button>

        {isAccountOpen && (
          <div className="overflow-menu" style={{ minWidth: '240px' }}>
            {isLoggedIn ? (
              <div className="px-4 py-3 space-y-3">
                <p className="type-caption" style={{ color: 'var(--color-ink-2)' }}>Signed in as</p>
                <p className="type-ui font-semibold" style={{ color: 'var(--color-ink)', wordBreak: 'break-all' }}>{userEmail}</p>
                <button
                  onClick={handleLogout}
                  className="overflow-menu-item w-full rounded-lg"
                  style={{ padding: '0.4rem 0' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="type-ui">Sign out</span>
                </button>
              </div>
            ) : sent ? (
              <div className="px-4 py-3">
                <p className="type-ui" style={{ color: 'var(--color-ink)' }}>Check your email for a sign-in link.</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="type-ui font-semibold" style={{ color: 'var(--color-ink)' }}>Sign in to your account</p>
                  <p className="type-caption mt-1" style={{ color: 'var(--color-ink-2)', lineHeight: 1.4 }}>
                    New or returning — enter your email and we&apos;ll send you a link. Your map syncs across all your devices.
                  </p>
                </div>
                <form onSubmit={handleSignIn} className="space-y-2">
                  <input
                    type="email"
                    className="save-prompt-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <button type="submit" className="save-prompt-btn">Send sign-in link</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings button */}
      <div className="relative" ref={overflowRef}>
        <button
          onClick={() => { closeAll('overflow'); setIsOverflowOpen(prev => !prev) }}
          className="map-control-btn w-10 h-10 rounded-2xl"
          title="More options"
          aria-label="More options"
          aria-expanded={isOverflowOpen}
        >
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
            <div className="overflow-menu-section">
              <div className="overflow-menu-label">Map theme</div>
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => { onThemeChange?.(key as ThemeKey); setIsOverflowOpen(false) }}
                  className="overflow-menu-item"
                  style={key === currentTheme ? { color: 'var(--color-accent)', fontWeight: 600 } : {}}
                >
                  <div className="w-4 h-4 rounded border-2 flex-shrink-0"
                    style={{ backgroundColor: theme.fill, borderColor: theme.outline }} />
                  <span className="type-ui">{theme.name}</span>
                </button>
              ))}
            </div>
            <div className="overflow-menu-divider" />
            <button className="overflow-menu-item" onClick={() => { setIsOverflowOpen(false); setShareOpen(true) }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="type-ui">Share map</span>
            </button>
            <button className="overflow-menu-item" onClick={() => { setIsOverflowOpen(false); setFeedbackOpen(true) }}>
              <svg className="feedback-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-2)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="type-ui">Send feedback</span>
            </button>
          </div>
        )}

        <ShareButton externalOpen={shareOpen} onExternalClose={() => setShareOpen(false)} className="sr-only" />
        <FeedbackButton externalOpen={feedbackOpen} onExternalClose={() => setFeedbackOpen(false)} className="sr-only" />
      </div>
    </div>
  )
}
