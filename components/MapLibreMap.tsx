"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

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
const AVAILABLE_COUNTRIES = {
  'ES': 'Spain',
  'FR': 'France', 
  'DE': 'Germany',
  'IT': 'Italy',
  'US': 'United States',
  'CA': 'Canada',
  'BR': 'Brazil',
  'AR': 'Argentina',
  'JP': 'Japan',
  'AU': 'Australia',
  'GB': 'United Kingdom',
  'MX': 'Mexico',
  'IN': 'India',
  'CN': 'China',
  'RU': 'Russia'
};

// Function to automatically assign mock countries to books
export const assignMockCountriesToBooks = (books: any[]) => {
  const countryCodes = Object.keys(AVAILABLE_COUNTRIES);
  
  return books.map(book => {
    // Assign 1-2 book countries (where the book is set)
    const bookCountryCount = Math.random() > 0.6 ? 1 : 2;
    const bookCountries = [];
    for (let i = 0; i < bookCountryCount; i++) {
      const randomCountry = countryCodes[Math.floor(Math.random() * countryCodes.length)];
      if (!bookCountries.includes(randomCountry)) {
        bookCountries.push(randomCountry);
      }
    }
    
    // Assign 1-2 author countries (where authors are from)
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
      bookCountries: bookCountries,
      authorCountries: authorCountries
    };
  });
};

export type MapLibreMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
  books?: any[]; // Add books prop for heatmap logic
};

export const MapLibreMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick,
  books = []
}: MapLibreMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('blue');

  // Calculate country book counts for heatmap
  const getCountryBookCounts = () => {
    const countryCounts: Record<string, number> = {};
    
    // Initialize all available countries with 0
    Object.keys(AVAILABLE_COUNTRIES).forEach(countryCode => {
      countryCounts[countryCode] = 0;
    });
    
    // Count books for each country
    books.forEach(book => {
      // Count book countries (where the book is set)
      book.bookCountries?.forEach((countryCode: string) => {
        if (countryCounts.hasOwnProperty(countryCode)) {
          countryCounts[countryCode]++;
        }
      });
      
      // Count author countries (where authors are from)
      book.authorCountries?.forEach((countryCode: string) => {
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
    const baseColor = THEMES[currentTheme].fill;
    const outlineColor = THEMES[currentTheme].outline;
    
    // Create a proper heatmap with 3 shades based on book count
    // Darkest color (3+ books) = outline color, others are lighter versions of fill color
    return [
      "match",
      ["get", "ISO3166-1-Alpha-2"],
      "ES", countryCounts.ES === 0 ? "#ffffff" : (countryCounts.ES === 1 ? baseColor : (countryCounts.ES <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "FR", countryCounts.FR === 0 ? "#ffffff" : (countryCounts.FR === 1 ? baseColor : (countryCounts.FR <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "DE", countryCounts.DE === 0 ? "#ffffff" : (countryCounts.DE === 1 ? baseColor : (countryCounts.DE <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "IT", countryCounts.IT === 0 ? "#ffffff" : (countryCounts.IT === 1 ? baseColor : (countryCounts.IT <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "US", countryCounts.US === 0 ? "#ffffff" : (countryCounts.US === 1 ? baseColor : (countryCounts.US <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "CA", countryCounts.CA === 0 ? "#ffffff" : (countryCounts.CA === 1 ? baseColor : (countryCounts.CA <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "BR", countryCounts.BR === 0 ? "#ffffff" : (countryCounts.BR === 1 ? baseColor : (countryCounts.BR <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "AR", countryCounts.AR === 0 ? "#ffffff" : (countryCounts.AR === 1 ? baseColor : (countryCounts.AR <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "JP", countryCounts.JP === 0 ? "#ffffff" : (countryCounts.JP === 1 ? baseColor : (countryCounts.JP <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "AU", countryCounts.AU === 0 ? "#ffffff" : (countryCounts.AU === 1 ? baseColor : (countryCounts.AU <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "GB", countryCounts.GB === 0 ? "#ffffff" : (countryCounts.GB === 1 ? baseColor : (countryCounts.GB <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "MX", countryCounts.MX === 0 ? "#ffffff" : (countryCounts.MX === 1 ? baseColor : (countryCounts.MX <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "IN", countryCounts.IN === 0 ? "#ffffff" : (countryCounts.IN === 1 ? baseColor : (countryCounts.IN <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "CN", countryCounts.CN === 0 ? "#ffffff" : (countryCounts.CN === 1 ? baseColor : (countryCounts.CN <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "RU", countryCounts.RU === 0 ? "#ffffff" : (countryCounts.RU === 1 ? baseColor : (countryCounts.RU <= 3 ? darkenColor(baseColor, 0.15) : outlineColor)),
      "#ffffff" // Default white for all other countries
    ];
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
                  stroke="${THEMES[currentTheme].outline}"
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
              "background-color": THEMES[currentTheme].background,
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
            paint: { "line-color": THEMES[currentTheme].outline, "line-width": 2 }
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

    // Add custom theme selector control
    const themeControl = document.createElement('div');
    themeControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    themeControl.style.cssText = `
      position: absolute;
      top: 10px;
      right: 70px;
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
    Object.entries(THEMES).forEach(([key, theme]) => {
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
        setCurrentTheme(key as keyof typeof THEMES);
        
        // Update map colors immediately
        if (mapRef.current?.isStyleLoaded()) {
          mapRef.current.setPaintProperty('background', 'background-color', THEMES[key].background);
          // Update countries-fill with new heatmap colors
          applyHeatmapColors();
          mapRef.current.setPaintProperty('countries-outline', 'line-color', THEMES[key].outline);
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

    themeControl.appendChild(themeIcon);
    themeControl.appendChild(themeDropdown);
    mapContainer.current?.appendChild(themeControl);

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
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      // Apply heatmap colors immediately
      applyHeatmapColors();
      
      // Also apply after a delay to ensure they stick
      setTimeout(() => {
        if (mapRef.current?.isStyleLoaded()) {
          applyHeatmapColors();
        }
      }, 500);
    }
  }, [books, currentTheme]);
  
  // Function to apply heatmap colors
  const applyHeatmapColors = () => {
    if (mapRef.current?.isStyleLoaded()) {
      // Generate the complete heatmap style
      const heatmapStyle = generateHeatmapStyle();
      
      mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
      
      // Force a repaint
      mapRef.current.triggerRepaint();
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
