import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Incident } from '@/types';

interface HospitalMapProps {
  incidents?: Incident[];
}

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface HospitalWithDistance extends Hospital {
  distance: number;
}

const DEFAULT_LOCATION: [number, number] = [17.3850, 78.4867];

/*
 * Hospital locations used for the prototype.
 *
 * These are fallback hospitals around Hyderabad.
 * The map also attempts to obtain nearby hospitals from
 * OpenStreetMap Overpass.
 */
const FALLBACK_HOSPITALS: Hospital[] = [
  {
    id: 'care-banjara',
    name: 'CARE Hospitals, Banjara Hills',
    lat: 17.4156,
    lng: 78.4347,
    address: 'Banjara Hills, Hyderabad',
  },
  {
    id: 'apollo-jubilee',
    name: 'Apollo Hospitals, Jubilee Hills',
    lat: 17.4239,
    lng: 78.4118,
    address: 'Jubilee Hills, Hyderabad',
  },
  {
    id: 'yashoda-secunderabad',
    name: 'Yashoda Hospitals, Secunderabad',
    lat: 17.4399,
    lng: 78.4983,
    address: 'Secunderabad, Hyderabad',
  },
  {
    id: 'kims',
    name: 'KIMS Hospitals',
    lat: 17.4300,
    lng: 78.4565,
    address: 'Secunderabad, Hyderabad',
  },
  {
    id: 'continental',
    name: 'Continental Hospitals',
    lat: 17.4096,
    lng: 78.3455,
    address: 'Gachibowli, Hyderabad',
  },
];

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function createHospitalIcon() {
  return L.divIcon({
    className: 'alertx-hospital-marker',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #ef4444;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 18px;
        box-shadow: 0 3px 10px rgba(0,0,0,.35);
      ">
        H
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function createIncidentIcon() {
  return L.divIcon({
    className: 'alertx-incident-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #f97316;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 16px;
        box-shadow: 0 3px 10px rgba(0,0,0,.35);
      ">
        !
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const hospitalIcon = createHospitalIcon();
const incidentIcon = createIncidentIcon();

function MapRecenter({
  position,
}: {
  position: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 12);
  }, [map, position]);

  return null;
}

function getIncidentCoordinates(
  incident: Incident,
): [number, number] | null {
  const item = incident as Incident & {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    coordinates?: {
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    };
  };

  if (
    typeof item.latitude === 'number' &&
    typeof item.longitude === 'number'
  ) {
    return [item.latitude, item.longitude];
  }

  if (
    typeof item.lat === 'number' &&
    typeof item.lng === 'number'
  ) {
    return [item.lat, item.lng];
  }

  if (
    item.coordinates &&
    typeof item.coordinates.lat === 'number' &&
    typeof item.coordinates.lng === 'number'
  ) {
    return [
      item.coordinates.lat,
      item.coordinates.lng,
    ];
  }

  if (
    item.coordinates &&
    typeof item.coordinates.latitude === 'number' &&
    typeof item.coordinates.longitude === 'number'
  ) {
    return [
      item.coordinates.latitude,
      item.coordinates.longitude,
    ];
  }

  return null;
}

export default function HospitalMap({
  incidents = [],
}: HospitalMapProps) {
  const [userPosition, setUserPosition] =
    useState<[number, number]>(DEFAULT_LOCATION);

  const [hospitals, setHospitals] =
    useState<Hospital[]>(FALLBACK_HOSPITALS);

  const [locationLoading, setLocationLoading] =
    useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);

        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNearbyHospitals() {
      try {
        const [lat, lng] = userPosition;

        const radius = 25000;

        const query = `
          [out:json];
          (
            node["amenity"="hospital"](around:${radius},${lat},${lng});
            way["amenity"="hospital"](around:${radius},${lat},${lng});
            relation["amenity"="hospital"](around:${radius},${lat},${lng});
          );
          out center tags;
        `;

        const response = await fetch(
          'https://overpass-api.de/api/interpreter',
          {
            method: 'POST',
            body: query,
          },
        );

        if (!response.ok) {
          throw new Error('Hospital lookup failed');
        }

        const data = await response.json();

        const results: Hospital[] = [];

        for (const item of data.elements ?? []) {
          const latValue =
            typeof item.lat === 'number'
              ? item.lat
              : item.center?.lat;

          const lngValue =
            typeof item.lon === 'number'
              ? item.lon
              : item.center?.lon;

          if (
            typeof latValue !== 'number' ||
            typeof lngValue !== 'number'
          ) {
            continue;
          }

          const name =
            item.tags?.name ||
            item.tags?.['name:en'] ||
            'Hospital';

          results.push({
            id: `osm-${item.type}-${item.id}`,
            name,
            lat: latValue,
            lng: lngValue,
            address:
              item.tags?.['addr:street'] ||
              item.tags?.['addr:city'] ||
              'Nearby hospital',
          });
        }

        if (!cancelled && results.length > 0) {
          setHospitals(results);
        }
      } catch {
        // Keep fallback hospitals if OpenStreetMap lookup fails.
      }
    }

    loadNearbyHospitals();

    return () => {
      cancelled = true;
    };
  }, [userPosition]);

  const hospitalsWithDistance =
    useMemo<HospitalWithDistance[]>(() => {
      return hospitals
        .map((hospital) => ({
          ...hospital,
          distance: calculateDistance(
            userPosition[0],
            userPosition[1],
            hospital.lat,
            hospital.lng,
          ),
        }))
        .sort(
          (a, b) =>
            a.distance - b.distance,
        );
    }, [hospitals, userPosition]);

  const nearestHospital =
    hospitalsWithDistance[0];

  const incidentMarkers = useMemo(() => {
    return incidents
      .map((incident) => {
        const coordinates =
          getIncidentCoordinates(incident);

        if (!coordinates) {
          return null;
        }

        return {
          incident,
          coordinates,
        };
      })
      .filter(
        (
          item,
        ): item is {
          incident: Incident;
          coordinates: [number, number];
        } => item !== null,
      );
  }, [incidents]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-navy-700 bg-navy-800/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Nearby Hospitals
            </h2>

            <p className="mt-1 text-xs text-secondary-400">
              Hospitals around the current location are shown
              on the map.
            </p>
          </div>

          {nearestHospital && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Nearest Hospital
              </div>

              <div className="mt-0.5 text-sm font-bold text-white">
                {nearestHospital.name}
              </div>

              <div className="text-xs text-emerald-300">
                {nearestHospital.distance.toFixed(1)} km away
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[420px] w-full">
        <MapContainer
          center={userPosition}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter position={userPosition} />

          <Marker position={userPosition}>
            <Popup>
              <strong>Current Location</strong>
              <br />
              AlertX Control Center
            </Popup>
          </Marker>

          {hospitalsWithDistance.map(
            (hospital, index) => (
              <Marker
                key={hospital.id}
                position={[
                  hospital.lat,
                  hospital.lng,
                ]}
                icon={hospitalIcon}
              >
                <Popup>
                  <div>
                    <strong>
                      {hospital.name}
                    </strong>

                    <br />

                    <span>
                      {hospital.address}
                    </span>

                    <br />

                    <strong>
                      Distance:{' '}
                      {hospital.distance.toFixed(
                        1,
                      )}{' '}
                      km
                    </strong>

                    {index === 0 && (
                      <>
                        <br />
                        <span style={{ color: 'green' }}>
                          Nearest hospital
                        </span>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ),
          )}

          {incidentMarkers.map(
            ({
              incident,
              coordinates,
            }) => (
              <Marker
                key={`incident-${incident.id}`}
                position={coordinates}
                icon={incidentIcon}
              >
                <Popup>
                  <strong>
                    {incident.type}
                  </strong>

                  <br />

                  Incident ID:{' '}
                  {incident.id}

                  <br />

                  Status:{' '}
                  {incident.status}
                </Popup>
              </Marker>
            ),
          )}
        </MapContainer>

        {locationLoading && (
          <div className="absolute left-3 top-3 z-[1000] rounded-lg bg-navy-900/90 px-3 py-2 text-xs text-white shadow-lg">
            Detecting current location...
          </div>
        )}
      </div>

      <div className="border-t border-navy-700 bg-navy-900/70 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {hospitalsWithDistance
            .slice(0, 6)
            .map((hospital, index) => (
              <div
                key={hospital.id}
                className={`rounded-xl border p-3 ${
                  index === 0
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-navy-700 bg-navy-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {hospital.name}
                    </div>

                    <div className="mt-1 truncate text-xs text-secondary-500">
                      {hospital.address}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-xs font-bold ${
                      index === 0
                        ? 'text-emerald-400'
                        : 'text-secondary-400'
                    }`}
                  >
                    {hospital.distance.toFixed(1)} km
                  </div>
                </div>

                {index === 0 && (
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Nearest hospital
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}