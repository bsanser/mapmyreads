import maplibregl from 'maplibre-gl';

export interface MapEventHandlersProps {
  map: maplibregl.Map;
  onCountryClick?: (countryName: string) => void;
  onMapError?: (error: any) => void;
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
  const { map, onCountryClick, onMapError } = props;

  // Handle window resize to adjust zoom
  const handleResize = () => {
    const newZoom = getOptimalZoom();
    if (map && Math.abs(map.getZoom() - newZoom) > 0.5) {
      map.setZoom(newZoom);
    }
  };

  // Add error event listener
  map.on('error', (e) => {
    console.error("Map error:", e);
    onMapError?.(e);
  });

  // Add country click event listener
  map.on('click', 'countries-fill', (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      
      // Extract country name from various possible property names
      const countryName = 
        properties?.ADMIN || 
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

  // Add resize event listener
  window.addEventListener('resize', handleResize);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};
