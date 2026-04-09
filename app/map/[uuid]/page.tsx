'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapContainer } from '../../../components/MapContainer'
import { DesktopSidebar } from '../../../components/DesktopSidebar'
import { MobileBottomSheet } from '../../../components/MobileBottomSheet'
import { THEMES } from '../../../lib/themeManager'
import { mapDisplayNameToISO2 } from '../../../lib/mapUtilities'
import { useBooks } from '../../../contexts/BooksContext'
import { useTheme } from '../../../contexts/ThemeContext'
import type { Book } from '../../../types/book'


export default function SharedMapPage() {
  const params = useParams()
  const uuid = params.uuid as string

  const { setBooks, selectedCountry, setSelectedCountry } = useBooks()
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
    <div className="map-page-layout">
      {/* Map */}
      <MapContainer
        onCountryClick={(countryName) => {
          const iso2 = mapDisplayNameToISO2(countryName)
          setSelectedCountry(selectedCountry === iso2 ? null : iso2)
        }}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        themes={THEMES}
        cta={<a href="/" className="btn-accent whitespace-nowrap">Create your own maps of books</a>}
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
