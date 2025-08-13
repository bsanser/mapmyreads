"use client";
import { useEffect, useRef, useState } from "react";

export type LeafletMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
};

export const LeafletMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const initMap = async () => {
      try {
        // Dynamically import Leaflet only on client side
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix Leaflet marker icons
        delete (L.default.Icon.Default.prototype as any)._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        });

        if (mapRef.current) {
          console.log('🗺️ LEAFLET: Starting map initialization...');
          
          // Create map instance with responsive zoom
          const map = L.default.map(mapRef.current, {
            center: [20, 0], // Center of the world
            zoom: getOptimalZoom(),
            zoomControl: false, // Disable default zoom control
            attributionControl: true,
            // Removed maxBounds to allow horizontal scrolling
          });

          // Add political boundaries with country labels
          const tileLayer = L.default.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            {
              attribution: '© CartoDB, © OpenStreetMap contributors',
              maxZoom: 18,
              noWrap: false, // Allow horizontal wrapping for scrolling
            }
          );

          tileLayer.addTo(map);

          // Add custom zoom control to top-right
          const zoomControl = L.default.control.zoom({
            position: 'topright'
          });
          zoomControl.addTo(map);

          // Handle window resize to adjust zoom
          const handleResize = () => {
            const newZoom = getOptimalZoom();
            if (Math.abs(map.getZoom() - newZoom) > 0.5) {
              map.setZoom(newZoom);
            }
          };

          window.addEventListener('resize', handleResize);

          // Map event listeners
          map.whenReady(() => {
            console.log('🗺️ LEAFLET: Map is ready!');
            setMapStatus('ready');
          });

          console.log('🗺️ LEAFLET: Map setup complete');

          // Cleanup resize listener
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        } else {
          console.error('❌ LEAFLET: Map container not found');
          setMapStatus('error');
        }

      } catch (error: any) {
        console.error('❌ LEAFLET: Error creating map:', error);
        setMapStatus('error');
      }
    };

    initMap();
  }, []);

  // Calculate appropriate zoom level based on screen size
  const getOptimalZoom = () => {
    if (typeof window === 'undefined') return 2;
    
    const screenWidth = window.innerWidth;
    
    // Zoom to show complete populated world horizontally (Japan to America) without Antarctica
    if (screenWidth >= 1024) { // Desktop
      return 2.1; // Shows complete world width without cutting off Japan or America
    } else if (screenWidth >= 768) { // Tablet
      return 1.8; // Balanced view for tablet
    } else { // Mobile
      return 1.5; // Good mobile view of complete world width
    }
  };

  return (
    <div className="w-full h-full">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      >
        {mapStatus === 'loading' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-600 font-bold mb-2">Map Loading...</div>
              <div className="text-gray-500 text-sm">Leaflet + OpenStreetMap</div>
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
