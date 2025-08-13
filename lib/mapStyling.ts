import { THEMES, ThemeKey } from './themeManager';
import type { StyleSpecification } from 'maplibre-gl';

export interface WavePatternConfig {
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export const createWavePatternSVG = (config: WavePatternConfig): string => {
  const { width, height, strokeColor, strokeWidth, opacity } = config;
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="waves" width="${width}" height="${height}" patternUnits="userSpaceOnUse">
          <path d="M0 4 Q2 0 4 4 T8 4 T12 4 T16 4"
                fill="none"
                stroke="${strokeColor}"
                stroke-width="${strokeWidth}"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="${opacity}"
                vector-effect="non-scaling-stroke"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#waves)" />
    </svg>
  `;
};

export const createMapStyle = (currentTheme: ThemeKey): { style: StyleSpecification; wavePatternDataURL: string } => {
  const theme = THEMES[currentTheme];
  
  // Create wave pattern for ocean background
  const wavePatternSVG = createWavePatternSVG({
    width: 16,
    height: 8,
    strokeColor: theme.outline,
    strokeWidth: 1,
    opacity: 0.3
  });
  
  // Convert SVG to data URL
  const wavePatternDataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wavePatternSVG)}`;
  
  const style: StyleSpecification = {
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
          "background-color": theme.background,
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
        paint: { 
          "line-color": theme.outline, 
          "line-width": 2 
        }
      },
      {
        id: "country-labels",
        type: "symbol",
        source: "countries",
        layout: {
          "text-field": ["get", "ADMIN"],
          "text-font": ["Open Sans Regular","Arial Unicode MS Regular"],
          "text-size": 12,
          "text-allow-overlap": false
        },
        paint: { 
          "text-color": theme.outline, 
          "text-halo-color": theme.background, 
          "text-halo-width": 1.2 
        }
      }
    ]
  } as StyleSpecification;

  return { style, wavePatternDataURL };
};

export const getMapInitialConfig = () => ({
  center: [0, 19] as [number, number],
  attributionControl: { compact: false }
});
