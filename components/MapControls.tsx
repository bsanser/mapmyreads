import { useState, useRef, useEffect } from 'react'
import { THEMES, ThemeKey } from '../lib/themeManager'

interface MapControlsProps {
  countryViewMode: 'author' | 'book'
  currentTheme: ThemeKey
  themes: typeof THEMES
  onViewModeChange?: (mode: 'author' | 'book') => void
  onThemeChange?: (theme: ThemeKey) => void
  layout?: 'inline' | 'stacked'
}

export function MapControls({ 
  countryViewMode, 
  currentTheme, 
  themes, 
  onViewModeChange, 
  onThemeChange,
  layout = 'stacked'
}: MapControlsProps) {
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };

    if (isThemeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeDropdownOpen]);
  
  const containerClasses = layout === 'inline' 
    ? 'flex items-center gap-3' 
    : 'flex items-center gap-3';

  const buttonClasses = layout === 'inline'
    ? 'w-8 h-8 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 flex items-center justify-center hover:bg-white/98 hover:shadow-md transition-all duration-200'
    : 'w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-sm';

  return (
    <div className={containerClasses}>
      {/* Theme Selector - Custom Dropdown with Color Previews */}
      <div className="relative" ref={themeDropdownRef}>
        <button
          onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
          className={buttonClasses}
          title="Select theme"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </button>
        
        {/* Custom Dropdown with Color Previews */}
        {isThemeDropdownOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white/98 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-2">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  onThemeChange?.(key as ThemeKey);
                  setIsThemeDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-black/5 transition-colors flex items-center gap-3"
              >
                {/* Color Preview */}
                <div 
                  className="w-4 h-4 rounded border-2 flex-shrink-0"
                  style={{
                    backgroundColor: theme.fill,
                    borderColor: theme.outline
                  }}
                />
                {/* Theme Name */}
                <span className={key === currentTheme ? 'font-medium text-blue-700' : 'text-gray-700'}>
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Keep the old function for backward compatibility
export const createMapControls = (props: MapControlsProps) => {
  const { countryViewMode, currentTheme, themes, onViewModeChange, onThemeChange } = props;

  // Create Book Locations control
  const bookLocationsControl = document.createElement('div');
  bookLocationsControl.id = 'book-locations-control';
  bookLocationsControl.style.cssText = `
    position: absolute;
    top: 10px;
    right: 245px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 3px solid ${countryViewMode === 'book' ? themes[currentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 8px 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 90px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    color: ${countryViewMode === 'book' ? themes[currentTheme].outline : '#666'};
    font-weight: ${countryViewMode === 'book' ? '600' : '500'};
  `;
  bookLocationsControl.textContent = 'Book Locations';
  bookLocationsControl.title = 'Show countries where books are set';

  // Add hover effect for Book Locations
  bookLocationsControl.addEventListener('mouseenter', () => {
    bookLocationsControl.style.background = 'rgba(255, 255, 255, 0.98)';
    bookLocationsControl.style.transform = 'translateY(-1px)';
    bookLocationsControl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  bookLocationsControl.addEventListener('mouseleave', () => {
    bookLocationsControl.style.background = 'rgba(255, 255, 255, 0.95)';
    bookLocationsControl.style.transform = 'translateY(0)';
    bookLocationsControl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  });

  // Create Author Countries control
  const authorCountriesControl = document.createElement('div');
  authorCountriesControl.id = 'author-countries-control';
  authorCountriesControl.style.cssText = `
    position: absolute;
    top: 10px;
    right: 100px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 3px solid ${countryViewMode === 'author' ? themes[currentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 8px 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 90px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    color: ${countryViewMode === 'author' ? themes[currentTheme].outline : '#666'};
    font-weight: ${countryViewMode === 'author' ? '600' : '500'};
  `;
  authorCountriesControl.textContent = 'Author Countries';
  authorCountriesControl.title = 'Show countries where authors are from';

  // Add hover effect for Author Countries
  authorCountriesControl.addEventListener('mouseenter', () => {
    authorCountriesControl.style.background = 'rgba(255, 255, 255, 0.98)';
    authorCountriesControl.style.transform = 'translateY(-1px)';
    authorCountriesControl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  authorCountriesControl.addEventListener('mouseleave', () => {
    authorCountriesControl.style.background = 'rgba(255, 255, 255, 0.95)';
    authorCountriesControl.style.transform = 'translateY(0)';
    authorCountriesControl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  });

  // Add click handlers for view mode controls
  bookLocationsControl.addEventListener('click', () => {
    // Get current theme value dynamically
    const currentThemeValue = currentTheme;
    const currentThemeOutline = themes[currentThemeValue].outline;
    
    // Update Book Locations control styling
    bookLocationsControl.style.borderColor = currentThemeOutline;
    bookLocationsControl.style.color = currentThemeOutline;
    bookLocationsControl.style.fontWeight = '600';
    
    // Reset Author Countries control styling
    authorCountriesControl.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    authorCountriesControl.style.color = '#666';
    authorCountriesControl.style.fontWeight = '500';
    
    // Call the callback if provided
    if (onViewModeChange) {
      onViewModeChange('book');
    }
  });

  authorCountriesControl.addEventListener('click', () => {
    // Get current theme value dynamically
    const currentThemeValue = currentTheme;
    const currentThemeOutline = themes[currentThemeValue].outline;
    
    // Update Author Countries control styling
    authorCountriesControl.style.borderColor = currentThemeOutline;
    authorCountriesControl.style.color = currentThemeOutline;
    authorCountriesControl.style.fontWeight = '600';
    
    // Reset Book Locations control styling
    bookLocationsControl.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    bookLocationsControl.style.color = '#666';
    bookLocationsControl.style.fontWeight = '500';
    
    // Call the callback if provided
    if (onViewModeChange) {
      onViewModeChange('author');
    }
  });

  // Create theme selector
  const themeSelector = document.createElement('select');
  themeSelector.id = 'theme-selector';
  themeSelector.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 8px 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 120px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  // Add theme options
  Object.entries(themes).forEach(([key, theme]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = theme.name;
    if (key === currentTheme) {
      option.selected = true;
    }
    themeSelector.appendChild(option);
  });

  // Add change handler for theme selector
  themeSelector.addEventListener('change', (e) => {
    const selectedTheme = (e.target as HTMLSelectElement).value as ThemeKey;
    if (onThemeChange) {
      onThemeChange(selectedTheme);
    }
  });

  // Add hover effect for theme selector
  themeSelector.addEventListener('mouseenter', () => {
    themeSelector.style.background = 'rgba(255, 255, 255, 0.98)';
    themeSelector.style.transform = 'translateY(-1px)';
    themeSelector.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  themeSelector.addEventListener('mouseleave', () => {
    themeSelector.style.background = 'rgba(255, 255, 255, 0.95)';
    themeSelector.style.transform = 'translateY(0)';
    themeSelector.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  });

  return {
    bookLocationsControl,
    authorCountriesControl,
    themeSelector
  };
};
