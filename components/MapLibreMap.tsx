"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { COUNTRIES, toISO2, toDisplayName } from "../lib/countries";

// Apple-inspired theme system with carefully balanced colors
const THEMES = {
  blue: {
    name: "Ocean Blue",
    fill: "#B3D9E5",      // Light blue (your current)
    outline: "#0A6A89",   // Dark blue (your current)
    hover: "#7FB3C7",     // Medium blue
    selected: "#E8F4F8",  // Very light blue with subtle glow
    background: "#eef3f5" // Light blue-gray background
  },
  yellow: {
    name: "Golden Hour",
    fill: "#F4E4BC",      // Light warm yellow
    outline: "#D4A574",   // Rich golden brown
    hover: "#E8D4A8",     // Medium warm yellow
    selected: "#FDF8E8",  // Very light cream with subtle glow
    background: "#fefbf3" // Warm off-white background
  },
  purple: {
    name: "Royal Purple",
    fill: "#E8D4F0",      // Light lavender
    outline: "#8B5A96",   // Rich purple
    hover: "#D4B8E0",     // Medium lavender
    selected: "#F8F0FC",  // Very light lavender with subtle glow
    background: "#f9f6fc" // Light purple-tinted background
  },
  pink: {
    name: "Rose Garden",
    fill: "#F4D4E0",      // Light rose pink
    outline: "#C85A7B",   // Rich rose
    hover: "#E8B8CC",     // Medium rose pink
    selected: "#FDF0F5",  // Very light rose with subtle glow
    background: "#fef8fa" // Light pink-tinted background
  }
};

// Available countries for mock data (ISO2 codes)
const AVAILABLE_COUNTRIES = COUNTRIES;

// Function to map display names back to ISO2 codes
export const mapDisplayNameToISO2 = (displayName: string): string => {
  return toISO2(displayName) || displayName;
};

// Function to map ISO2 codes to display names
export const mapISO2ToDisplayName = (iso2: string): string => {
  return toDisplayName(iso2) || iso2;
};

// Function to automatically assign mock countries to books
export const assignMockCountriesToBooks = (books: any[]) => {
  const countryCodes = Object.keys(AVAILABLE_COUNTRIES);
  
  return books.map(book => {
    // Assign 1-2 book countries (where the book is set) - always ISO2 codes
    const bookCountryCount = Math.random() > 0.6 ? 1 : 2;
    const bookCountries = [];
    for (let i = 0; i < bookCountryCount; i++) {
      const randomCountry = countryCodes[Math.floor(Math.random() * countryCodes.length)];
      if (!bookCountries.includes(randomCountry)) {
        bookCountries.push(randomCountry);
      }
    }
    
    // Assign 1-2 author countries (where authors are from) - always ISO2 codes
    const authorCountryCount = Math.random() > 0.6 ? 1 : 2;
    const authorCountries = [];
    for (let i = 0; i < authorCountryCount; i++) {
      const randomCountry = countryCodes[Math.floor(Math.random() * countryCodes.length)];
      if (!authorCountries.includes(randomCountry)) {
        authorCountries.push(randomCountry);
      }
    }
    
    return {
      ...book,
      bookCountries: bookCountries, // ISO2 codes
      authorCountries: authorCountries // ISO2 codes
    };
  });
};

export type MapLibreMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
  books?: any[]; // Add books prop for heatmap logic
  countryViewMode?: 'author' | 'book'; // Add view mode prop for correct counting
  onViewModeChange?: (mode: 'author' | 'book') => void; // Add callback for view mode changes
  currentTheme?: keyof typeof THEMES; // Theme from parent component
  onThemeChange?: (theme: keyof typeof THEMES) => void; // Theme change callback
  themes?: typeof THEMES; // Themes object from parent component
};

export const MapLibreMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick,
  books = [],
  countryViewMode = 'book',
  onViewModeChange,
  currentTheme: propCurrentTheme = 'blue', // Destructure prop with default
  onThemeChange, // Destructure prop
  themes: propThemes = THEMES // Destructure prop with default
}: MapLibreMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Debug theme props
  console.log('🗺️ MapLibreMap: Received theme props:', {
    currentTheme: propCurrentTheme,
    hasOnThemeChange: !!onThemeChange,
    themesKeys: Object.keys(propThemes),
    themes: propThemes
  });

  // Function to update control colors based on current theme and view mode
  const updateControlColors = () => {
    const bookLocationsControl = document.getElementById('book-locations-control');
    const authorCountriesControl = document.getElementById('author-countries-control');
    
    if (bookLocationsControl && authorCountriesControl) {
      console.log('🎨 updateControlColors called for theme:', propCurrentTheme, 'view mode:', countryViewMode);
      console.log('🎨 Available themes:', Object.keys(propThemes));
      console.log('🎨 Current theme outline color:', propThemes[propCurrentTheme]?.outline);
      
      // Only update if we have valid theme data
      if (propThemes[propCurrentTheme]?.outline) {
        const activeColor = propThemes[propCurrentTheme].outline;
        
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

  // Function to get current theme dynamically (avoids closure issues)
  const getCurrentTheme = () => propCurrentTheme;

  // Calculate country book counts for heatmap
  const getCountryBookCounts = () => {
    const countryCounts: Record<string, number> = {};
    
    // Initialize all available countries with 0
    Object.keys(AVAILABLE_COUNTRIES).forEach(countryCode => {
      countryCounts[countryCode] = 0;
    });
    
    // Count books for each country based on current view mode
    // Default to 'book' countries (where books are set), not author countries
    const viewMode = countryViewMode || 'book';
    
    books.forEach(book => {
      // Only count countries based on the current view mode
      const countriesToCount = viewMode === 'author' ? book.authorCountries : book.bookCountries;
      
      countriesToCount?.forEach((countryCode: string) => {
        if (countryCounts.hasOwnProperty(countryCode)) {
          countryCounts[countryCode]++;
        }
      });
    });
    
    return countryCounts;
  };

  // Generate the complete heatmap style based on current data
  const generateHeatmapStyle = () => {
    const countryCounts = getCountryBookCounts();
    const baseColor = propThemes[propCurrentTheme].fill;
    const outlineColor = propThemes[propCurrentTheme].outline;
    
    console.log('🔍 DEBUG: Country counts:', countryCounts);
    console.log('🔍 DEBUG: Current theme:', propCurrentTheme);
    console.log('🔍 DEBUG: Base color:', baseColor);
    console.log('🔍 DEBUG: Outline color:', outlineColor);
    console.log('🔍 DEBUG: Available themes:', Object.keys(propThemes));
    
    // Create a simpler approach: use case expression with specific country codes
    // This is more reliable than the complex match expression
    const heatmapStyle = [
      "case",
      // For each country with books, define its color based on count
      ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
        if (count === 0) return []; // Skip countries with 0 books (they'll be white by default)
        
        let color;
        if (count === 1) {
          color = baseColor;
        } else if (count === 2) {
          color = darkenColor(baseColor, 0.15);
        } else {
          color = outlineColor;
        }
        
        console.log(`🔍 DEBUG: Country ${iso2} with ${count} books gets color:`, color);
        
        return [
          ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
          color
        ];
      }),
      "#ffffff" // Default white for all other countries
    ];
    
    console.log('🔍 DEBUG: Generated heatmap style:', heatmapStyle);
    return heatmapStyle;
  };

  // Helper function to darken a color
  const darkenColor = (color: string, factor: number) => {
    // Simple color darkening for hex colors
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * (1 - factor))));
    const g = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * (1 - factor))));
    const b = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * (1 - factor))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Calculate appropriate zoom level based on screen size
  const getOptimalZoom = () => {
    if (typeof window === 'undefined') return 1.6;
    const screenWidth = window.innerWidth;
    // Zoom to show complete populated world horizontally (Japan to America) without Antarctica
    if (screenWidth >= 1024) { // Desktop
      return 1.8; // Shows complete world width without cutting off Japan or America
    } else if (screenWidth >= 768) { // Tablet
      return 1.6; // Balanced view for tablet
    } else { // Mobile
      return 1.4; // Good mobile view of complete world width
    }
  };



  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    if (!mapContainer.current) {
      setMapStatus('error');
      return;
    }
    
    // Create custom wave pattern SVG for ocean background
    const wavePatternSVG = `
      <svg width="16" height="8" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="waves" width="16" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4 Q2 0 4 4 T8 4 T12 4 T16 4"
                  fill="none"
                  stroke="${propThemes[propCurrentTheme].outline}"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.3"
                  vector-effect="non-scaling-stroke"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)" />
      </svg>
    `;
    
    
    

    
    // Convert SVG to data URL
    const wavePatternDataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wavePatternSVG)}`;
    
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          countries: {
            type: "geojson",
            data: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
          }
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { 
              "background-color": propThemes[propCurrentTheme].background,
              "background-pattern": "waves"
            }
          },
          {
            id: "countries-fill",
            type: "fill",
            source: "countries",
            paint: { 
              "fill-color": "#ffffff" // Start with white, will be updated after map loads
            }
          },
          {
            id: "countries-outline",
            type: "line",
            source: "countries",
            paint: { "line-color": propThemes[propCurrentTheme].outline, "line-width": 2 }
          },
          {
            id: "country-labels",
            type: "symbol",
            source: "countries",
            layout: {
              "text-field": ["get", "ADMIN"],              // change to your name field if needed
              "text-font": ["Open Sans Regular","Arial Unicode MS Regular"],
              "text-size": 12,
              "text-allow-overlap": false
            },
            paint: {
              "text-color": "#2a4450",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.2
            }
          }
        ]
      },
      center: [0, 19],
      zoom: getOptimalZoom(),
      attributionControl: { compact: false }
    });

    // Store map reference
    mapRef.current = map;

    // Add the wave pattern image to the map
    map.on('load', () => {
      setMapStatus('ready');
      
      // Add custom wave pattern
      const img = new Image();
      img.onload = () => {
        mapRef.current?.addImage('waves', img);
      };
      img.src = wavePatternDataURL;
      
      // Update heatmap colors after map loads
      updateHeatmapColors();
    });
    
    // Function to update heatmap colors
    const updateHeatmapColors = () => {
      if (mapRef.current?.isStyleLoaded()) {
        // Generate the complete heatmap style
        const heatmapStyle = generateHeatmapStyle();
        
        mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
        
        // Force a repaint
        mapRef.current.triggerRepaint();
      }
    };



    // Add basic controls
    mapRef.current?.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add Book Locations control
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
      border: 1px solid ${countryViewMode === 'book' ? propThemes[propCurrentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 8px 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      min-width: 90px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      color: ${countryViewMode === 'book' ? propThemes[propCurrentTheme].outline : '#666'};
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

    // Add Author Countries control
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
      border: 1px solid ${countryViewMode === 'author' ? propThemes[propCurrentTheme].outline : 'rgba(0, 0, 0, 0.1)'};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 8px 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      min-width: 90px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      color: ${countryViewMode === 'author' ? propThemes[propCurrentTheme].outline : '#666'};
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
      const currentThemeValue = getCurrentTheme();
      const currentThemeOutline = propThemes[currentThemeValue].outline;
      
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
      const currentThemeValue = getCurrentTheme();
      const currentThemeOutline = propThemes[currentThemeValue].outline;
      
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

    // Add custom theme selector control
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
    Object.entries(propThemes).forEach(([key, theme]) => {
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
        console.log('🎨 Theme clicked:', key, 'Current theme before:', propCurrentTheme);
        onThemeChange?.(key as keyof typeof propThemes);
        console.log('🎨 Theme change callback called with:', key);
        
        // Update map colors immediately
        if (mapRef.current?.isStyleLoaded()) {
          console.log('🎨 Updating map colors for theme:', key);
          
          // 1. Update background color
          mapRef.current.setPaintProperty('background', 'background-color', propThemes[key].background);
          
          // 2. Update country outline colors
          mapRef.current.setPaintProperty('countries-outline', 'line-color', propThemes[key].outline);
          
          // 3. Update country fill colors (heatmap) with new theme
          const newTheme = key as keyof typeof propThemes;
          const baseColor = propThemes[newTheme].fill;
          const outlineColor = propThemes[newTheme].outline;
          
          // Generate new heatmap style with new theme colors
          const countryCounts = getCountryBookCounts();
          const newHeatmapStyle = [
            "case",
            ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
              if (count === 0) return [];
              
              let color;
              if (count === 1) {
                color = baseColor;
              } else if (count === 2) {
                color = darkenColor(baseColor, 0.15);
              } else {
                color = outlineColor;
              }
              
              return [
                ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
                color
              ];
            }),
            "#ffffff"
          ];
          
          console.log('🎨 Setting new heatmap colors:', newHeatmapStyle);
          mapRef.current.setPaintProperty('countries-fill', 'fill-color', newHeatmapStyle);
          
          // Force repaint
          mapRef.current.triggerRepaint();
          
          console.log('🎨 Map colors updated for theme:', key);
        } else {
          console.log('🎨 Map not ready, cannot update colors yet');
        }
        
        // Update control colors immediately with the NEW theme
        const bookLocationsControl = document.getElementById('book-locations-control');
        const authorCountriesControl = document.getElementById('author-countries-control');
        
        if (bookLocationsControl && authorCountriesControl) {
          console.log('🎨 Immediate control color update for NEW theme:', key);
          const newThemeOutline = propThemes[key].outline;
          
          // Update controls based on CURRENT view mode (not changing it)
          if (countryViewMode === 'book') {
            bookLocationsControl.style.color = newThemeOutline;
            bookLocationsControl.style.border = `1px solid ${newThemeOutline}`;
            authorCountriesControl.style.color = '#666';
            authorCountriesControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
            console.log('🎨 Book Locations control immediately updated with NEW theme color:', newThemeOutline);
          } else {
            authorCountriesControl.style.color = newThemeOutline;
            authorCountriesControl.style.border = `1px solid ${newThemeOutline}`;
            bookLocationsControl.style.color = '#666';
            bookLocationsControl.style.border = '1px solid rgba(0, 0, 0, 0.1)';
            console.log('🎨 Author Countries control immediately updated with NEW theme color:', newThemeOutline);
          }
        }
        
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

    // Add controls to the map container
    console.log('Adding Book Locations control to DOM...');
    
    // Check if control already exists to prevent duplicates
    if (!document.getElementById('book-locations-control')) {
      mapContainer.current?.appendChild(bookLocationsControl);
      console.log('Book Locations control added to DOM');
    } else {
      console.log('Book Locations control already exists, skipping');
    }
    
    console.log('Adding Author Countries control to DOM...');
    if (!document.getElementById('author-countries-control')) {
      mapContainer.current?.appendChild(authorCountriesControl);
      console.log('Author Countries control added to DOM');
    } else {
      console.log('Author Countries control already exists, skipping');
    }
    
    // Set initial control colors
    setTimeout(() => {
      console.log('🎨 Setting initial control colors for theme:', propCurrentTheme);
      updateControlColors();
    }, 100);
    
    console.log('Adding Theme control to DOM...');
    if (!document.querySelector('.theme-control')) {
      themeControl.classList.add('theme-control');
      themeControl.appendChild(themeIcon);
      themeControl.appendChild(themeDropdown);
      mapContainer.current?.appendChild(themeControl);
      console.log('Theme control added to DOM');
    } else {
      console.log('Theme control already exists, skipping');
    }
    
    // Debug: Check what's actually in the DOM
    setTimeout(() => {
      console.log('DOM check - Book Locations control:', document.getElementById('book-locations-control'));
      console.log('DOM check - Author Countries control:', document.getElementById('author-countries-control'));
      console.log('DOM check - Theme control:', document.querySelector('.theme-control'));
      console.log('DOM check - Map container children:', mapContainer.current?.children);
    }, 1000);

    // Create hover tooltip for country names
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    `;
    mapContainer.current?.appendChild(tooltip);

    // Add hover events for countries
    mapRef.current?.on('mousemove', 'countries-fill', (e) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties;
        
        // Debug: Log all available properties
        console.log('🔍 DEBUG: All GeoJSON properties:', properties);
        
        // Try different possible property names for country names
        const countryName = properties?.ADMIN || 
                           properties?.NAME || 
                           properties?.name || 
                           properties?.Name ||
                           properties?.COUNTRY ||
                           properties?.country ||
                           'Unknown Country';
        
        tooltip.textContent = countryName;
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        
        // Position tooltip above the mouse cursor
        const canvas = mapRef.current?.getCanvas();
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = e.point.x + rect.left;
          const y = e.point.y + rect.top - 40; // 40px above cursor
          
          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
        }
      }
    });

    mapRef.current?.on('mouseleave', 'countries-fill', () => {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
    });

    // Add click event listener for country selection
    mapRef.current?.on('click', 'countries-fill', (e) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties;
        
        // Get country name using the same logic as hover
        const countryName = properties?.ADMIN || 
                           properties?.NAME || 
                           properties?.name || 
                           properties?.Name ||
                           properties?.COUNTRY ||
                           properties?.country ||
                           'Unknown Country';
        
        // Call the onCountryClick callback if provided
        if (onCountryClick && countryName !== 'Unknown Country') {
          onCountryClick(countryName);
        }
      }
    });

    // Add error event listener
    mapRef.current?.on('error', (e) => {
      console.error("Map error:", e);
      setMapStatus('error');
    });

    // Handle window resize to adjust zoom
    const handleResize = () => {
      const newZoom = getOptimalZoom();
      if (mapRef.current && Math.abs(mapRef.current.getZoom() - newZoom) > 0.5) {
        mapRef.current.setZoom(newZoom);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update heatmap colors when books change
  useEffect(() => {
    console.log('🎨 useEffect triggered with theme:', propCurrentTheme, 'countryViewMode:', countryViewMode);
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      console.log('🎨 Map is ready, applying heatmap colors for theme:', propCurrentTheme);
      // Apply heatmap colors immediately
      applyHeatmapColors();
      
      // Update control colors to match current theme
      updateControlColors();
      
      // Also apply after a delay to ensure they stick
      setTimeout(() => {
        if (mapRef.current?.isStyleLoaded()) {
          console.log('🎨 Delayed heatmap color application for theme:', propCurrentTheme);
          applyHeatmapColors();
          updateControlColors();
        }
      }, 500);
    } else {
      console.log('🎨 Map not ready yet, cannot apply heatmap colors');
    }
  }, [books, propCurrentTheme, countryViewMode]);
  
  // Update control colors when view mode changes
  useEffect(() => {
    console.log('🎨 View mode changed to:', countryViewMode, 'updating control colors');
    updateControlColors();
  }, [countryViewMode]);
  
  // Dedicated effect for theme changes - ensure ALL colors update
  useEffect(() => {
    console.log('🎨 Theme changed to:', propCurrentTheme, 'updating ALL colors');
    
    if (mapRef.current?.isStyleLoaded()) {
      // Update map colors
      const baseColor = propThemes[propCurrentTheme].fill;
      const outlineColor = propThemes[propCurrentTheme].outline;
      
      // Update background
      mapRef.current.setPaintProperty('background', 'background-color', propThemes[propCurrentTheme].background);
      
      // Update country outlines
      mapRef.current.setPaintProperty('countries-outline', 'line-color', outlineColor);
      
      // Update country fills (heatmap)
      const countryCounts = getCountryBookCounts();
      const newHeatmapStyle = [
        "case",
        ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
          if (count === 0) return [];
          
          let color;
          if (count === 1) {
            color = baseColor;
          } else if (count === 2) {
            color = darkenColor(baseColor, 0.15);
          } else {
            color = outlineColor;
          }
          
          return [
            ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
            color
          ];
        }),
        "#ffffff"
      ];
      
      mapRef.current.setPaintProperty('countries-fill', 'fill-color', newHeatmapStyle);
      mapRef.current.triggerRepaint();
      
      console.log('🎨 All map colors updated for theme:', propCurrentTheme);
    }
    
    // Update control colors - but only if they exist and we're not in the middle of a theme change
    setTimeout(() => {
      updateControlColors();
    }, 50);
    
  }, [propCurrentTheme]);

  // Function to apply heatmap colors
  const applyHeatmapColors = () => {
    if (mapRef.current?.isStyleLoaded()) {
      console.log('🎨 DEBUG: Applying heatmap colors...');
      
      // Generate the complete heatmap style
      const heatmapStyle = generateHeatmapStyle();
      
      console.log('🎨 DEBUG: Setting paint property with:', heatmapStyle);
      mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
      
      // Force a repaint
      mapRef.current.triggerRepaint();
      console.log('🎨 DEBUG: Heatmap colors applied and repaint triggered');
    } else {
      console.log('🎨 DEBUG: Map not ready, cannot apply heatmap colors');
    }
  };

  return (
    <div className="w-full h-full">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      >
        {mapStatus === 'loading' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-600 font-bold mb-2">Map Loading...</div>
              <div className="text-gray-500 text-sm">MapLibre + Natural Earth</div>
            </div>
          </div>
        )}
        
        {mapStatus === 'error' && (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <div className="text-center">
              <div className="text-red-600 font-bold mb-2">Map Error</div>
              <div className="text-red-500 text-sm">Check console for details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
