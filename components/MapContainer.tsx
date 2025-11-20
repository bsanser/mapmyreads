import { MapLibreMap } from './MapLibreMap'
import { MapControls } from './MapControls'
import { Book } from '../types/book'
import { ThemeKey, THEMES } from '../lib/themeManager'

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
    <div className="relative w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)]">
      {/* Map */}
      <div className="w-full h-full relative">
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
      <div className="hidden lg:block absolute top-4 right-20 z-10">
        <MapControls
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
        />
      </div>
    </div>
  )
}
