import { MapLibreMap } from './MapLibreMap'
import { MapControls } from './MapControls'
import { Book } from '../types/book'
import { ThemeKey } from '../lib/themeManager'
import { FeedbackButton } from './FeedbackButton'

interface MapContainerProps {
  books: Book[]
  selectedCountry: string | null
  onCountryClick: (country: string) => void
  currentTheme: ThemeKey
  onThemeChange: (theme: ThemeKey) => void
  themes: typeof THEMES
}

export function MapContainer({ 
  books, 
  selectedCountry, 
  onCountryClick,
  currentTheme,
  onThemeChange,
  themes
}: MapContainerProps) {
  const readBooks = books.filter((book) => book.readStatus === 'read')
  const highlightedCountries = new Set<string>(
    readBooks.flatMap((book) => {
      if (book.authorCountries.length > 0) return book.authorCountries
      return book.bookCountries
    })
  )

  return (
    <div className="relative w-full h-[50vh] lg:h-screen bg-white">
      {/* Map */}
      <div className="w-full h-full relative pt-4 lg:pt-0">
        <MapLibreMap
          highlighted={highlightedCountries}
          selectedCountry={selectedCountry}
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
