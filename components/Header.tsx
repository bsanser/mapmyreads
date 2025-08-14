import { ShareButton } from './ShareButton'
import { FeedbackButton } from './FeedbackButton'
import { BuyMeACoffee } from './BuyMeACoffee'
import { MapControls } from './MapControls'
import { Book } from '../types/book'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface HeaderProps {
  books: Book[]
  countryViewMode: 'author' | 'book'
  onViewModeChange: (mode: 'author' | 'book') => void
  currentTheme: ThemeKey
  onThemeChange: (theme: ThemeKey) => void
  themes: typeof THEMES
}

export function Header({ 
  books, 
  countryViewMode, 
  onViewModeChange, 
  currentTheme, 
  onThemeChange, 
  themes 
}: HeaderProps) {
  return (
    <div className="lg:bg-white lg:border-b lg:border-gray-200 lg:sticky lg:top-0 lg:z-50 lg:shadow-sm">
      <div className="ml-4 mr-4 flex items-center justify-between">
        {/* Left side - Logo and Title */}
        <div className="pl-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Your Reading Map Logo" className="h-16 w-auto" />
            <h1 className="text-xl font-bold text-gray-700">Your Reading Map</h1>
          </div>
        </div>

        {/* Right side - Action Buttons */}
        <div className="pr-3">
          <div className="flex items-center gap-4">
            <ShareButton books={books} />
            <FeedbackButton />
            <BuyMeACoffee />
          </div>
        </div>
      </div>

      {/* Map Controls - Below header on mobile/tablet */}
      <div className="lg:hidden">
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
