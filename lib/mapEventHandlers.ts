import maplibregl from 'maplibre-gl';

export interface MapEventHandlersProps {
  map: maplibregl.Map;
  onCountryClick?: (countryName: string) => void;
}

export const getOptimalZoom = () => {
  if (typeof window === 'undefined') return 1.6;
  const screenWidth = window.innerWidth;
  // Zoom to show complete populated world horizontally (Japan to America) without Antarctica
  if (screenWidth >= 1024) { // Desktop
    return 1.8; // Shows complete world width without cutting off Japan or America
  } else if (screenWidth >= 768) { // Tablet
    return 1.6; // Balanced view for tablet
  } else { // Mobile
    return 0; // Zoom farther out on small screens
  }
};

export const setupMapEventHandlers = (props: MapEventHandlersProps) => {
  const { map, onCountryClick } = props;

  // Handle window resize to adjust zoom
  const handleResize = () => {
    const newZoom = getOptimalZoom();
    if (map && Math.abs(map.getZoom() - newZoom) > 0.5) {
      map.setZoom(newZoom);
    }
  };

  // Log map errors without surfacing them to the user — most are non-fatal
  map.on('error', (e) => {
    console.error("Map error:", e);
  });

  // Add country click event listener
  map.on('click', 'countries-fill', (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      
      // Extract country name — GeoJSON uses `name`, ADMIN is a fallback for other sources
      const countryName =
        properties?.name ||
        properties?.ADMIN ||
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

  // Add resize event listener
  window.addEventListener('resize', handleResize);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};
