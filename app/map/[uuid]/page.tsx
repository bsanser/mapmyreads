'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapContainer } from '../../../components/MapContainer'
import { DesktopSidebar } from '../../../components/DesktopSidebar'
import { MobileBottomSheet } from '../../../components/MobileBottomSheet'
import { THEMES } from '../../../lib/themeManager'
import { useBooks } from '../../../contexts/BooksContext'
import { useTheme } from '../../../contexts/ThemeContext'
import type { Book } from '../../../types/book'

export default function SharedMapPage() {
  const params = useParams()
  const router = useRouter()
  const uuid = params.uuid as string

  const { setBooks, books, selectedCountry, setSelectedCountry } = useBooks()
  const { currentTheme, setCurrentTheme } = useTheme()

  const [status, setStatus] = useState<'loading' | 'found' | 'not_found' | 'error'>('loading')
  const [booksToShow, setBooksToShow] = useState(10)
  const [isSheetExpanded, setIsSheetExpanded] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${uuid}/books`)
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()

        if (!data.sessionExists) {
          setStatus('not_found')
          return
        }

        setBooks(data.books as Book[])
        setStatus('found')
      } catch {
        setStatus('error')
      }
    }
    load()
  }, [uuid])

  const readCount = books.filter(b => b.readStatus === 'read').length

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="type-body" style={{ color: 'var(--color-ink-3)' }}>Loading map…</p>
      </div>
    )
  }

  if (status === 'not_found' || status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="type-heading">This map doesn&apos;t exist or has been removed.</p>
        <a href="/" className="btn-accent">Build your own reading map →</a>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* Read-only banner */}
      <div className="read-only-banner">
        <span className="type-caption">
          You&apos;re viewing {readCount} {readCount === 1 ? 'book' : 'books'} on this reading map.
        </span>
        <a href="/" className="link-accent ml-2 type-caption">
          Build your own →
        </a>
      </div>

      {/* Map */}
      <MapContainer
        onCountryClick={(country) => setSelectedCountry(selectedCountry === country ? null : country)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        themes={THEMES}
      />

      {/* Desktop sidebar — read-only: no add button */}
      <DesktopSidebar
        booksToShow={booksToShow}
        onLoadMore={() => setBooksToShow(n => n + 10)}
        isReadOnly
      />

      {/* Mobile bottom sheet — read-only */}
      <MobileBottomSheet
        isExpanded={isSheetExpanded}
        onToggleExpanded={() => setIsSheetExpanded(e => !e)}
        showMissingAuthorCountry={false}
        onToggleMissingAuthorCountry={() => {}}
        onClearMissingAuthorCountry={() => {}}
        isReadOnly
      />
    </div>
  )
}
