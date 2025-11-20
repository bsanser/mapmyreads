import { ShareButton } from './ShareButton'
import { FeedbackButton } from './FeedbackButton'
import { BuyMeACoffee } from './BuyMeACoffee'
import { MapControls } from './MapControls'
import { Book } from '../types/book'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface HeaderProps {
  books: Book[]
  currentTheme: ThemeKey
  onThemeChange: (theme: ThemeKey) => void
  themes: typeof THEMES
}

export function Header({ 
  books, 
  currentTheme, 
  onThemeChange, 
  themes 
}: HeaderProps) {
  return (
    <div className="lg:bg-transparent lg:sticky lg:top-0 lg:z-50">
      <div className="ml-4 mr-4 flex items-center justify-between py-4">
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
            <MapControls
              currentTheme={currentTheme}
              onThemeChange={onThemeChange}
              themes={themes}
              layout="inline"
            />
            <FeedbackButton />
            <BuyMeACoffee />
          </div>
        </div>
      </div>

      {/* Map Controls - Below header on mobile/tablet */}
      <div className="lg:hidden px-4 pb-4">
        <MapControls
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          themes={themes}
          layout="stacked"
        />
      </div>
    </div>
  )
}
