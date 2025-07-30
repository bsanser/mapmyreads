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
}

export const MapChart = memo(({ highlighted }: MapChartProps) => {
  return (
    <div className="mt-8">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150 }}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={TOPO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const isoA2 = geo.properties.ISO_A2 as string
              const isHighlighted = highlighted.has(isoA2)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isHighlighted ? '#4ADE80' : '#E2E8F0'}
                  stroke="#FFF"
                  style={{
                    default:   { outline: 'none' },
                    hover:     { fill: '#A7F3D0', outline: 'none' },
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
