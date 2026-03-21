import { MapLibreMap } from './MapLibreMap'
import { MapControls } from './MapControls'
import { ThemeKey, THEMES } from '../lib/themeManager'
import { useBooks } from '../contexts/BooksContext'

interface MapContainerProps {
  onCountryClick: (country: string) => void
  currentTheme: ThemeKey
  onThemeChange: (theme: ThemeKey) => void
  themes: typeof THEMES
}

export function MapContainer({
  onCountryClick,
  currentTheme,
  onThemeChange,
  themes
}: MapContainerProps) {
  const { books } = useBooks()
  const readBooks = books.filter((book) => book.readStatus === 'read')

  return (
    <div className="map-container-root">
      <div className="map-canvas-wrapper">
        <MapLibreMap
          onCountryClick={onCountryClick}
          books={readBooks}
          currentTheme={currentTheme}
          themes={themes}
        />
      </div>

      <div className="map-controls-bar">
        <MapControls
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
        />
      </div>

    </div>
  )
}
