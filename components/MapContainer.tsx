import { MapLibreMap } from './MapLibreMap'
import { MapControls } from './MapControls'
import { ThemeKey, THEMES } from '../lib/themeManager'
import { FeedbackButton } from './FeedbackButton'
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
    <div className="relative w-full h-[50vh] lg:h-screen bg-white">
      <div className="w-full h-full relative pt-4 lg:pt-0">
        <MapLibreMap
          onCountryClick={onCountryClick}
          books={readBooks}
          currentTheme={currentTheme}
          themes={themes}
        />
      </div>

      {/* Map Controls - Desktop overlay */}
      <div className="hidden lg:flex absolute top-4 right-16 z-10 items-center gap-2">
        <MapControls
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
        />
        <FeedbackButton theme={currentTheme} />
      </div>
    </div>
  )
}
