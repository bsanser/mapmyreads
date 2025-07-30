
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
  onHoverCountry?: (iso2: string) => void
  onClickCountry?: (iso2: string) => void
}

export const MapChart = memo(({ highlighted, onHoverCountry, onClickCountry }: MapChartProps) => {
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
              const iso2 = geo.properties.ISO_A2 as string
              const isHighlighted = highlighted.has(iso2)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isHighlighted ? '#FACC15' /* amber-400 */ : '#E2E8F0' /* gray-200 */}
                  stroke="#FFF"
                  onMouseEnter={() => onHoverCountry?.(iso2)}
                  onClick={() => onClickCountry?.(iso2)}
                  style={{
                    default:   { outline: 'none' },
                    hover:     { fill: isHighlighted ? '#FBBF24' /* amber-300 */ : '#CBD5E1' /* gray-300 */ },
                    pressed:   { outline: 'none' }
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
