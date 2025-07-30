
'use client'

import { memo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography
} from 'react-simple-maps'
import type { Geography as GeoType } from 'react-simple-maps'
import { feature } from 'topojson-client'

// URL to a TopoJSON of world countries
const TOPO_URL =
  'https://unpkg.com/world-atlas@2.0.2/countries-110m.json'

// Pre-extract GeoJSON features
let geoFeatures: GeoType[] = []
fetch(TOPO_URL)
  .then(res => res.json())
  .then(topology => {
    geoFeatures = feature(
      topology,
      (topology as any).objects.countries
    ).features
  })

type MapChartProps = {
  highlighted: Set<string>  // ISO Alpha-2 codes e.g. 'US', 'NG'
  onCountryClick: (countryCode: string) => void
  selectedCountry: string | null
}

export const MapChart = memo(({ highlighted, onCountryClick, selectedCountry }: MapChartProps) => {
  return (
    <div className="w-full h-full">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 180 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={TOPO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const isoA2 = geo.properties.ISO_A2 as string
              const isHighlighted = highlighted.has(isoA2)
              const isSelected = selectedCountry === isoA2
              
              // Vintage map colors with better contrast
              const getCountryFill = () => {
                if (isSelected) return '#8B4513' // Dark brown for selected
                if (isHighlighted) return '#CD853F' // Peru/darker tan for countries with books
                return '#F5F5DC' // Light beige for countries without books
              }
              
              const getHoverFill = () => {
                if (isSelected) return '#654321' // Darker brown on hover
                if (isHighlighted) return '#A0522D' // Sienna on hover for highlighted
                return '#DDD' // Light gray on hover for empty countries
              }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getCountryFill()}
                  stroke="#654321"
                  strokeWidth={0.5}
                  style={{
                    default: { 
                      outline: 'none',
                      cursor: isHighlighted ? 'pointer' : 'default'
                    },
                    hover: { 
                      fill: getHoverFill(), 
                      outline: 'none',
                      cursor: isHighlighted ? 'pointer' : 'default'
                    },
                    pressed: { 
                      outline: 'none',
                      fill: isHighlighted ? '#A0522D' : getCountryFill()
                    }
                  }}
                  onClick={() => {
                    if (isHighlighted) {
                      onCountryClick(isoA2)
                    }
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
})
