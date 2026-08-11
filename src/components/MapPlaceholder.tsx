import { MapPin, ExternalLink, Navigation } from 'lucide-react';

interface Props {
  location: string;
  coords: { lat: number; lng: number } | null;
  className?: string;
}

export function MapPlaceholder({ location, coords, className = '' }: Props) {
  const lat = coords?.lat ?? 17.385;
  const lng = coords?.lng ?? 78.4867;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 ${className}`}>
      <div
        className="relative h-44 w-full sm:h-56"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #1d3260 0%, #15233f 60%, #0d1729 100%)',
        }}
      >
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,140,200,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,140,200,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Roads */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 bg-navy-700/60" />
        <div className="absolute bottom-0 left-1/3 top-0 w-1.5 -translate-x-1/2 bg-navy-700/60" />
        <div className="absolute left-0 right-0 top-1/4 h-1 bg-navy-700/40" />
        {/* Marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute -inset-4 animate-pulse-ring rounded-full" />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emergency-600 shadow-lg shadow-emergency-600/50">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
        {/* Label */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-secondary-400 backdrop-blur">
          <Navigation className="h-3.5 w-3.5 shrink-0 text-secondary-400" />
          <span className="truncate">{location || 'Location not provided'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-secondary-400">{location || 'Unknown location'}</div>
          <div className="text-xs text-secondary-400">
            {coords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Coordinates unavailable'}
          </div>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost shrink-0 px-3 py-2 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
        </a>
      </div>
    </div>
  );
}
