'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

interface MapProps {
  address?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: string;
  markers?: Array<{
    lat: number;
    lng: number;
    title?: string;
    info?: string;
  }>;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  interactive?: boolean;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function GoogleMap({
  address,
  lat,
  lng,
  zoom = 15,
  height = '400px',
  markers = [],
  onLocationSelect,
  interactive = true
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (window.google && mapInstanceRef.current) {
      if (address) {
        geocodeAddress(address);
      } else if (lat && lng) {
        updateMapLocation(lat, lng);
      }
    }
  }, [address, lat, lng]);

  useEffect(() => {
    if (window.google && mapInstanceRef.current && markers.length > 0) {
      addMarkers(markers);
    }
  }, [markers]);

  const loadGoogleMaps = () => {
    if (window.google) {
      initializeMap();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('Google Maps API key is not configured');
      setLoading(false);
      return;
    }

    window.initMap = initializeMap;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setLoading(false);
    };
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    try {
      const defaultLat = lat || 40.7831; // NYC center
      const defaultLng = lng || -73.9712;

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        gestureHandling: interactive ? 'auto' : 'none',
        disableDefaultUI: !interactive
      });

      geocoderRef.current = new window.google.maps.Geocoder();

      if (interactive && onLocationSelect) {
        mapInstanceRef.current.addListener('click', (event: any) => {
          const clickedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          
          reverseGeocode(clickedLocation.lat, clickedLocation.lng);
        });
      }

      if (address) {
        geocodeAddress(address);
      } else if (lat && lng) {
        updateMapLocation(lat, lng);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
      setLoading(false);
    }
  };

  const geocodeAddress = (address: string) => {
    if (!geocoderRef.current) return;

    // Append ", New York, NY" if not already specified
    const fullAddress = address.toLowerCase().includes('new york') 
      ? address 
      : `${address}, New York, NY`;

    geocoderRef.current.geocode({ address: fullAddress }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        updateMapLocation(location.lat(), location.lng());
        
        // Add marker for the address
        new window.google.maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          title: address,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });
      } else {
        console.error('Geocoding failed:', status);
        setError('Could not find location');
      }
    });
  };

  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderRef.current || !onLocationSelect) return;

    const latlng = { lat, lng };
    geocoderRef.current.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        onLocationSelect({
          lat,
          lng,
          address: results[0].formatted_address
        });
      }
    });
  };

  const updateMapLocation = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    const location = { lat, lng };
    mapInstanceRef.current.setCenter(location);
    mapInstanceRef.current.setZoom(zoom);
  };

  const addMarkers = (markers: MapProps['markers']) => {
    if (!mapInstanceRef.current || !markers) return;

    const bounds = new window.google.maps.LatLngBounds();

    markers.forEach((marker, index) => {
      const mapMarker = new window.google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map: mapInstanceRef.current,
        title: marker.title || `Location ${index + 1}`,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      if (marker.info) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: marker.info
        });

        mapMarker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, mapMarker);
        });
      }

      bounds.extend({ lat: marker.lat, lng: marker.lng });
    });

    if (markers.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">Map Unavailable</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <div className="text-sm text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: height }}
      />
    </div>
  );
}

// Property Map Component - specific for property listings
interface PropertyMapProps {
  property: {
    address: string;
    latitude?: number;
    longitude?: number;
    title: string;
    rentAmount: number;
  };
  nearbyProperties?: Array<{
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    rentAmount: number;
  }>;
  showNearby?: boolean;
}

export function PropertyMap({ property, nearbyProperties = [], showNearby = false }: PropertyMapProps) {
  const markers = showNearby ? nearbyProperties.map(p => ({
    lat: p.latitude,
    lng: p.longitude,
    title: p.title,
    info: `
      <div class="p-2">
        <h3 class="font-medium text-sm">${p.title}</h3>
        <p class="text-xs text-gray-600">${p.address}</p>
        <p class="text-sm font-medium text-blue-600">$${p.rentAmount.toLocaleString()}/mo</p>
      </div>
    `
  })) : [];

  return (
    <GoogleMap
      address={property.address}
      lat={property.latitude}
      lng={property.longitude}
      markers={markers}
      height="400px"
      interactive={true}
    />
  );
}

// Search Map Component - for property search with location selection
interface SearchMapProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
  properties?: Array<{
    id: string;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    rentAmount: number;
    bedrooms: number;
    bathrooms: number;
  }>;
}

export function SearchMap({ onLocationSelect, initialLocation, properties = [] }: SearchMapProps) {
  const markers = properties.map(p => ({
    lat: p.latitude,
    lng: p.longitude,
    title: p.title,
    info: `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-medium text-sm mb-1">${p.title}</h3>
        <p class="text-xs text-gray-600 mb-2">${p.address}</p>
        <div class="flex justify-between items-center">
          <div class="text-xs text-gray-500">${p.bedrooms}br • ${p.bathrooms}ba</div>
          <div class="text-sm font-medium text-blue-600">$${p.rentAmount.toLocaleString()}/mo</div>
        </div>
        <a href="/properties/${p.id}" class="text-xs text-blue-600 hover:underline">View Details</a>
      </div>
    `
  }));

  return (
    <GoogleMap
      lat={initialLocation?.lat || 40.7831}
      lng={initialLocation?.lng || -73.9712}
      zoom={12}
      markers={markers}
      onLocationSelect={onLocationSelect}
      height="500px"
      interactive={true}
    />
  );
}