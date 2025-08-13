import { THEMES, ThemeKey } from '../lib/themeManager';

export interface MapControlsProps {
  countryViewMode: 'author' | 'book';
  currentTheme: ThemeKey;
  themes: typeof THEMES;
  onViewModeChange?: (mode: 'author' | 'book') => void;
  onThemeChange?: (theme: ThemeKey) => void;
}

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
    border: 1px solid ${countryViewMode === 'book' ? themes[currentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
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

  console.log('Created Book Locations control:', bookLocationsControl);

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
    border: 1px solid ${countryViewMode === 'author' ? themes[currentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
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

  console.log('Created Author Countries control:', authorCountriesControl);

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
    console.log('Book Locations clicked');
    // Get current theme value dynamically
    const currentThemeValue = currentTheme;
    const currentThemeOutline = themes[currentThemeValue].outline;
    
    console.log('🎨 Book Locations clicked, using theme:', currentThemeValue, 'with color:', currentThemeOutline);
    
    // Update the visual state - ONLY change view mode, don't interfere with theme
    bookLocationsControl.style.color = currentThemeOutline;
    bookLocationsControl.style.fontWeight = '600';
    bookLocationsControl.style.border = `1px solid ${currentThemeOutline}`;
    authorCountriesControl.style.color = '#666';
    authorCountriesControl.style.fontWeight = '500';
    authorCountriesControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    
    console.log('🎨 Controls updated - Book Locations active with color:', currentThemeOutline);
    
    // Call the callback AFTER updating the visual state
    onViewModeChange?.('book');
  });

  authorCountriesControl.addEventListener('click', () => {
    console.log('Author Countries clicked');
    // Get current theme value dynamically
    const currentThemeValue = currentTheme;
    const currentThemeOutline = themes[currentThemeValue].outline;
    
    console.log('🎨 Author Countries clicked, using theme:', currentThemeValue, 'with color:', currentThemeOutline);
    
    // Update the visual state - ONLY change view mode, don't interfere with theme
    authorCountriesControl.style.color = currentThemeOutline;
    authorCountriesControl.style.fontWeight = '600';
    authorCountriesControl.style.border = `1px solid ${currentThemeOutline}`;
    bookLocationsControl.style.color = '#666';
    bookLocationsControl.style.fontWeight = '500';
    bookLocationsControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    
    console.log('🎨 Controls updated - Author Countries active with color:', currentThemeOutline);
    
    // Call the callback AFTER updating the visual state
    onViewModeChange?.('author');
  });

  // Create theme selector control
  const themeControl = document.createElement('div');
  themeControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
  themeControl.style.cssText = `
    position: absolute;
    top: 10px;
    right: 50px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    min-width: 40px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  // Add hover effect
  themeControl.addEventListener('mouseenter', () => {
    themeControl.style.background = 'rgba(255, 255, 255, 0.98)';
    themeControl.style.transform = 'translateY(-1px)';
    themeControl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  themeControl.addEventListener('mouseleave', () => {
    themeControl.style.background = 'rgba(255, 255, 255, 0.95)';
    themeControl.style.transform = 'translateY(0)';
    themeControl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  });

  // Create theme icon (using Heroicons style - paint brush icon)
  const themeIcon = document.createElement('div');
  themeIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#666" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
    </svg>
  `;
  themeIcon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;

  // Create theme dropdown (initially hidden)
  const themeDropdown = document.createElement('div');
  themeDropdown.style.cssText = `
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 8px 0;
    min-width: 160px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: all 0.2s ease;
    z-index: 1001;
  `;

  // Add theme options
  Object.entries(themes).forEach(([key, theme]) => {
    const themeOption = document.createElement('div');
    themeOption.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: background-color 0.15s ease;
      font-size: 13px;
      color: #333;
    `;

    // Add color preview
    const colorPreview = document.createElement('div');
    colorPreview.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: ${theme.fill};
      border: 2px solid ${theme.outline};
      flex-shrink: 0;
    `;

    const themeName = document.createElement('span');
    themeName.textContent = theme.name;

    themeOption.appendChild(colorPreview);
    themeOption.appendChild(themeName);

    // Add hover effect
    themeOption.addEventListener('mouseenter', () => {
      themeOption.style.background = 'rgba(0, 0, 0, 0.05)';
    });

    themeOption.addEventListener('mouseleave', () => {
      themeOption.style.background = 'transparent';
    });

    // Add click handler
    themeOption.addEventListener('click', () => {
      console.log('🎨 Theme clicked:', key, 'Current theme before:', currentTheme);
      onThemeChange?.(key as ThemeKey);
      console.log('🎨 Theme change callback called with:', key);
      
      // Hide dropdown
      themeDropdown.style.opacity = '0';
      themeDropdown.style.visibility = 'hidden';
      themeDropdown.style.transform = 'translateY(-8px)';
    });

    themeDropdown.appendChild(themeOption);
  });

  // Show/hide dropdown on click
  themeControl.addEventListener('click', () => {
    const isVisible = themeDropdown.style.visibility === 'visible';
    
    if (isVisible) {
      themeDropdown.style.opacity = '0';
      themeDropdown.style.visibility = 'hidden';
      themeDropdown.style.transform = 'translateY(-8px)';
    } else {
      themeDropdown.style.opacity = '1';
      themeDropdown.style.visibility = 'visible';
      themeDropdown.style.transform = 'translateY(0)';
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!themeControl.contains(e.target as Node)) {
      themeDropdown.style.opacity = '0';
      themeDropdown.style.visibility = 'hidden';
      themeDropdown.style.transform = 'translateY(-8px)';
    }
  });

  // Append theme icon and dropdown to theme control
  themeControl.appendChild(themeIcon);
  themeControl.appendChild(themeDropdown);

  return {
    bookLocationsControl,
    authorCountriesControl,
    themeControl,
    themeDropdown
  };
};

// Function to update control colors based on current theme and view mode
export const updateControlColors = (
  countryViewMode: 'author' | 'book',
  currentTheme: ThemeKey,
  themes: typeof THEMES
) => {
  const bookLocationsControl = document.getElementById('book-locations-control');
  const authorCountriesControl = document.getElementById('author-countries-control');
  
  if (bookLocationsControl && authorCountriesControl) {
    console.log('🎨 updateControlColors called for theme:', currentTheme, 'view mode:', countryViewMode);
    console.log('🎨 Available themes:', Object.keys(themes));
    console.log('🎨 Current theme outline color:', themes[currentTheme]?.outline);
    
    // Only update if we have valid theme data
    if (themes[currentTheme]?.outline) {
      const activeColor = themes[currentTheme].outline;
      
      if (countryViewMode === 'book') {
        bookLocationsControl.style.color = activeColor;
        bookLocationsControl.style.border = `1px solid ${activeColor}`;
        authorCountriesControl.style.color = '#666';
        authorCountriesControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        console.log('🎨 Book Locations control updated with color:', activeColor);
      } else {
        authorCountriesControl.style.color = activeColor;
        authorCountriesControl.style.border = `1px solid ${activeColor}`;
        bookLocationsControl.style.color = '#666';
        bookLocationsControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        console.log('🎨 Author Countries control updated with color:', activeColor);
      }
    } else {
      console.log('🎨 Invalid theme data, skipping control update');
    }
  } else {
    console.log('🎨 Controls not found, cannot update colors');
  }
};
