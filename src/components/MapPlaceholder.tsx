import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, Navigation, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Props {
  location: string;
  coords: { lat: number; lng: number } | null;
  className?: string;
}

// Fix Leaflet's default marker icons in Vite
const accidentIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Automatically move the map when incident coordinates change
function MapController({
  coords,
}: {
  coords: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([coords.lat, coords.lng], 15, {
      animate: true,
    });
  }, [map, coords.lat, coords.lng]);

  return null;
}

export function MapPlaceholder({
  location,
  coords,
  className = '',
}: Props) {
  // Hyderabad fallback if coordinates aren't available
  const lat = coords?.lat ?? 17.385;
  const lng = coords?.lng ?? 78.4867;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700 bg-navy-900 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emergency-400" />
            <span className="text-sm font-bold text-white">
              Accident Location
            </span>
          </div>

          <div className="mt-1 text-xs text-secondary-400">
            Live incident coordinates
          </div>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Maps
        </a>
      </div>

      {/* Map */}
      <div className="h-72 w-full sm:h-96">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController coords={{ lat, lng }} />

          {/* Accident marker */}
          <Marker position={[lat, lng]} icon={accidentIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <strong>🚨 Accident / Emergency</strong>

                <div className="mt-1 text-sm">
                  {location || 'Location unavailable'}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Location information */}
      <div className="flex items-center justify-between gap-3 border-t border-navy-700 bg-navy-900 p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 shrink-0 text-secondary-400" />

            <div className="truncate text-sm font-medium text-white">
              {location || 'Unknown location'}
            </div>
          </div>

          <div className="mt-1 text-xs text-secondary-400">
            {coords
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : 'Coordinates unavailable — showing Hyderabad'}
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-emergency-500/30 bg-emergency-500/10 px-2.5 py-1.5 text-xs font-semibold text-emergency-300">
          INCIDENT
        </div>
      </div>
    </div>
  );
}