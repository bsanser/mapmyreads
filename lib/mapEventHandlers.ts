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
    return 1.4; // Good mobile view of complete world width
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

  // Add hover tooltip functionality
  const tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  // Add tooltip to map container
  map.getContainer().appendChild(tooltip);

  // Show tooltip on hover
  map.on('mousemove', 'countries-fill', (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      
      // Extract country name
      const countryName = 
        properties?.ADMIN || 
        properties?.name || 
        properties?.Name ||
        properties?.COUNTRY ||
        properties?.country ||
        'Unknown Country';
      
      if (countryName !== 'Unknown Country') {
        tooltip.textContent = countryName;
        tooltip.style.opacity = '1';
        
        // Position tooltip near cursor
        const canvas = map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const x = e.point.x + rect.left;
        const y = e.point.y + rect.top;
        
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y - 30}px`;
      }
    }
  });

  // Hide tooltip when leaving countries
  map.on('mouseleave', 'countries-fill', () => {
    tooltip.style.opacity = '0';
  });

  // Add resize event listener
  window.addEventListener('resize', handleResize);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
  };
};
