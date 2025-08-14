import { MapLibreMap } from './MapLibreMap'
import { MapControls } from './MapControls'
import { Book } from '../types/book'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface MapContainerProps {
  books: Book[]
  selectedCountry: string | null
  countryViewMode: 'author' | 'book'
  onCountryClick: (country: string) => void
  onViewModeChange: (mode: 'author' | 'book') => void
  currentTheme: ThemeKey
  onThemeChange: (theme: ThemeKey) => void
  themes: typeof THEMES
}

export function MapContainer({ 
  books, 
  selectedCountry, 
  countryViewMode,
  onCountryClick,
  onViewModeChange,
  currentTheme,
  onThemeChange,
  themes
}: MapContainerProps) {
  return (
    <div className="relative w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)]">
      {/* Map */}
      <div className="w-full h-full relative">
        <MapLibreMap
          highlighted={new Set<string>(
            books.flatMap((b) => 
              countryViewMode === 'author' ? b.authorCountries : b.bookCountries
            )
          )}
          selectedCountry={selectedCountry}
          onCountryClick={onCountryClick}
          books={books}
          countryViewMode={countryViewMode}
          onViewModeChange={onViewModeChange}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
        />
      </div>

      {/* Map Controls - Desktop overlay */}
      <div className="hidden lg:block absolute top-4 right-20 z-10">
        <MapControls
          countryViewMode={countryViewMode}
          onViewModeChange={onViewModeChange}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
        />
      </div>
    </div>
  )
}
