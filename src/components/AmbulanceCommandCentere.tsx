import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ambulance,
  Building2,
  CheckCircle2,
  Flame,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Shield,
  Siren,
  Timer,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react';

import type { Incident } from '@/types';

interface AmbulanceUnit {
  id: string;
  driver: string;
  lat: number;
  lng: number;
  status:
    | 'AVAILABLE'
    | 'ASSIGNED'
    | 'DISPATCHED'
    | 'EN_ROUTE'
    | 'ARRIVED';
  speed: number;
  eta: number;
  phone: string;
}

interface Props {
  incidents: Incident[];
}

const INITIAL_AMBULANCES: AmbulanceUnit[] = [
  {
    id: 'AMB-01',
    driver: 'Rajesh Kumar',
    lat: 17.4401,
    lng: 78.4982,
    status: 'AVAILABLE',
    speed: 0,
    eta: 0,
    phone: '+91 90000 00001',
  },
  {
    id: 'AMB-02',
    driver: 'Suresh Reddy',
    lat: 17.4256,
    lng: 78.5104,
    status: 'AVAILABLE',
    speed: 0,
    eta: 0,
    phone: '+91 90000 00002',
  },
  {
    id: 'AMB-03',
    driver: 'Arjun Rao',
    lat: 17.4582,
    lng: 78.4868,
    status: 'AVAILABLE',
    speed: 0,
    eta: 0,
    phone: '+91 90000 00003',
  },
];

const RESPONSE_TEAMS = [
  {
    id: 'POL-01',
    name: 'Hyderabad Police',
    type: 'POLICE',
    icon: Shield,
    status: 'READY',
    eta: 4,
  },
  {
    id: 'FIRE-01',
    name: 'Fire & Rescue Unit',
    type: 'FIRE',
    icon: Flame,
    status: 'READY',
    eta: 6,
  },
  {
    id: 'RES-01',
    name: 'Special Rescue Team',
    type: 'RESCUE',
    icon: UsersRound,
    status: 'READY',
    eta: 8,
  },
  {
    id: 'HOSP-01',
    name: 'Emergency Hospital',
    type: 'HOSPITAL',
    icon: Building2,
    status: 'READY',
    eta: 5,
  },
] as const;

const VICTIM = {
  lat: 17.433,
  lng: 78.501,
};

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
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return earthRadius * c;
}

function calculateETA(distanceKm: number): number {
  const averageSpeed = 35;

  return Math.max(
    1,
    Math.ceil(
      (distanceKm / averageSpeed) * 60,
    ),
  );
}

function getStatusLabel(
  status: AmbulanceUnit['status'],
): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'ASSIGNED':
      return 'Assigned';
    case 'DISPATCHED':
      return 'Dispatched';
    case 'EN_ROUTE':
      return 'En Route';
    case 'ARRIVED':
      return 'Arrived';
    default:
      return 'Unknown';
  }
}

function getStatusColor(
  status: AmbulanceUnit['status'],
): string {
  switch (status) {
    case 'AVAILABLE':
      return 'text-emerald-400';
    case 'ASSIGNED':
      return 'text-yellow-400';
    case 'DISPATCHED':
      return 'text-blue-400';
    case 'EN_ROUTE':
      return 'text-cyan-400';
    case 'ARRIVED':
      return 'text-green-400';
    default:
      return 'text-secondary-400';
  }
}

export default function AmbulanceCommandCenter({
  incidents,
}: Props) {
  const [ambulances, setAmbulances] =
    useState<AmbulanceUnit[]>(
      INITIAL_AMBULANCES,
    );

  const [tracking, setTracking] =
    useState(false);

  const [
    selectedAmbulanceId,
    setSelectedAmbulanceId,
  ] = useState('AMB-01');

  const [trackingStep, setTrackingStep] =
    useState(0);

  const [dispatchedTeams, setDispatchedTeams] =
    useState<string[]>([]);

  const ambulanceDistances = useMemo(() => {
    return ambulances
      .map((ambulance) => ({
        ...ambulance,
        distance: calculateDistance(
          ambulance.lat,
          ambulance.lng,
          VICTIM.lat,
          VICTIM.lng,
        ),
      }))
      .sort(
        (a, b) =>
          a.distance - b.distance,
      );
  }, [ambulances]);

  const nearestAmbulance =
    ambulanceDistances[0];

  const selectedAmbulance =
    ambulances.find(
      (ambulance) =>
        ambulance.id ===
        selectedAmbulanceId,
    ) ?? nearestAmbulance;

  const activeIncident = useMemo(() => {
    return [...incidents]
      .filter(
        (incident) =>
          incident.status !== 'RESOLVED' &&
          incident.status !== 'SUSPICIOUS',
      )
      .sort(
        (a, b) =>
          b.priority - a.priority,
      )[0];
  }, [incidents]);

  useEffect(() => {
    if (!nearestAmbulance) {
      return;
    }

    setSelectedAmbulanceId(
      (currentId) => {
        const exists = ambulances.some(
          (ambulance) =>
            ambulance.id === currentId,
        );

        return exists
          ? currentId
          : nearestAmbulance.id;
      },
    );
  }, [nearestAmbulance, ambulances]);

  useEffect(() => {
    if (!tracking) {
      return;
    }

    const timer = window.setInterval(() => {
      setTrackingStep(
        (previous) => {
          if (previous >= 4) {
            setTracking(false);
            return 4;
          }

          return previous + 1;
        },
      );
    }, 3000);

    return () =>
      window.clearInterval(timer);
  }, [tracking]);

  useEffect(() => {
    if (!tracking) {
      return;
    }

    const timer = window.setInterval(() => {
      setAmbulances(
        (current) =>
          current.map((ambulance) => {
            if (
              ambulance.id !==
              selectedAmbulanceId
            ) {
              return ambulance;
            }

            if (trackingStep >= 4) {
              return {
                ...ambulance,
                lat: VICTIM.lat,
                lng: VICTIM.lng,
                status: 'ARRIVED',
                speed: 0,
                eta: 0,
              };
            }

            const latDifference =
              VICTIM.lat -
              ambulance.lat;

            const lngDifference =
              VICTIM.lng -
              ambulance.lng;

            const newLat =
              ambulance.lat +
              latDifference * 0.12;

            const newLng =
              ambulance.lng +
              lngDifference * 0.12;

            const newDistance =
              calculateDistance(
                newLat,
                newLng,
                VICTIM.lat,
                VICTIM.lng,
              );

            let status: AmbulanceUnit['status'];

            if (trackingStep === 0) {
              status = 'ASSIGNED';
            } else if (
              trackingStep === 1
            ) {
              status = 'DISPATCHED';
            } else {
              status = 'EN_ROUTE';
            }

            return {
              ...ambulance,
              lat: newLat,
              lng: newLng,
              status,
              speed:
                trackingStep >= 1
                  ? 42
                  : 0,
              eta:
                trackingStep >= 3
                  ? 1
                  : calculateETA(
                      newDistance,
                    ),
            };
          }),
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    tracking,
    trackingStep,
    selectedAmbulanceId,
  ]);

  const dispatchNearestAmbulance =
    () => {
      if (!nearestAmbulance) {
        return;
      }

      setSelectedAmbulanceId(
        nearestAmbulance.id,
      );

      setTrackingStep(0);

      setAmbulances(
        (current) =>
          current.map((ambulance) =>
            ambulance.id ===
            nearestAmbulance.id
              ? {
                  ...ambulance,
                  status: 'ASSIGNED',
                  speed: 0,
                  eta: calculateETA(
                    nearestAmbulance.distance,
                  ),
                }
              : ambulance,
          ),
      );

      setTracking(true);
    };

  const dispatchTeam = (
    teamId: string,
  ) => {
    setDispatchedTeams((current) =>
      current.includes(teamId)
        ? current
        : [...current, teamId],
    );
  };

  const currentDistance =
    selectedAmbulance
      ? calculateDistance(
          selectedAmbulance.lat,
          selectedAmbulance.lng,
          VICTIM.lat,
          VICTIM.lng,
        )
      : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl">
      {/* HEADER */}

      <div className="border-b border-navy-700 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emergency-600/20">
              <Siren className="h-5 w-5 text-emergency-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                ALERTX COMMAND CENTER
              </h2>

              <p className="text-xs text-secondary-400">
                Multi-Agency Emergency Response
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Live System
            </span>
          </div>
        </div>
      </div>

      {/* RESPONSE TEAMS */}

      <div className="border-b border-navy-700 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Multi-Agency Response
            </h3>

            <p className="text-[10px] text-secondary-400">
              Coordinate all emergency services
            </p>
          </div>

          <Radio className="h-4 w-4 text-cyan-400" />
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {RESPONSE_TEAMS.map(
            (team) => {
              const Icon = team.icon;
              const dispatched =
                dispatchedTeams.includes(
                  team.id,
                );

              return (
                <div
                  key={team.id}
                  className={`rounded-xl border p-3 transition ${
                    dispatched
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-navy-700 bg-navy-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900">
                      <Icon className="h-5 w-5 text-secondary-300" />
                    </div>

                    <span
                      className={`text-[8px] font-bold uppercase ${
                        dispatched
                          ? 'text-emerald-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {dispatched
                        ? 'DISPATCHED'
                        : team.status}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-white">
                    {team.name}
                  </div>

                  <div className="mt-1 text-[9px] text-secondary-400">
                    ETA {team.eta} min
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      dispatchTeam(
                        team.id,
                      )
                    }
                    disabled={dispatched}
                    className={`mt-2 w-full rounded-md px-2 py-1.5 text-[9px] font-bold ${
                      dispatched
                        ? 'cursor-default bg-emerald-500/10 text-emerald-400'
                        : 'bg-navy-700 text-white hover:bg-navy-600'
                    }`}
                  >
                    {dispatched
                      ? 'ACTIVE'
                      : 'DISPATCH'}
                  </button>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* MAIN */}

      <div className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr]">
        {/* MAP */}

        <div className="relative min-h-[430px] overflow-hidden rounded-xl border border-navy-700 bg-[#07101d]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(100,150,200,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,150,200,0.12) 1px, transparent 1px)',
              backgroundSize:
                '40px 40px',
            }}
          />

          <div className="absolute left-3 top-3 z-10 rounded-lg border border-navy-700 bg-navy-900/90 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-cyan-400" />

              <div>
                <div className="text-xs font-bold text-white">
                  LIVE RESPONSE MAP
                </div>

                <div className="text-[9px] text-secondary-400">
                  Hyderabad Emergency Zone
                </div>
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-10 rounded-lg border border-navy-700 bg-navy-900/90 px-3 py-2 backdrop-blur">
            <div className="text-[9px] uppercase text-secondary-400">
              Traffic
            </div>

            <div className="text-xs font-bold text-amber-400">
              Moderate
            </div>
          </div>

          {/* ROADS */}

          <div className="absolute left-[10%] top-[50%] h-[3px] w-[80%] rotate-[12deg] bg-slate-600/60" />

          <div className="absolute left-[40%] top-[10%] h-[90%] w-[3px] rotate-[18deg] bg-slate-600/50" />

          <div className="absolute left-[15%] top-[30%] h-[2px] w-[70%] -rotate-[25deg] bg-slate-700/70" />

          {/* INCIDENT */}

          <div className="absolute left-[52%] top-[51%] z-20 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-5 animate-ping rounded-full bg-emergency-500/20" />

              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-emergency-300 bg-emergency-600 shadow-lg shadow-emergency-500/40">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-emergency-500/30 bg-navy-900 px-2 py-1 text-[9px] font-bold text-emergency-300">
              EMERGENCY LOCATION
            </div>
          </div>

          {/* AMBULANCES */}

          {ambulanceDistances.map(
            (ambulance, index) => {
              const isSelected =
                ambulance.id ===
                selectedAmbulanceId;

              const left =
                25 +
                ((ambulance.lng -
                  78.48) /
                  0.04) *
                  50;

              const top =
                25 +
                ((17.47 -
                  ambulance.lat) /
                  0.05) *
                  50;

              return (
                <button
                  key={ambulance.id}
                  type="button"
                  onClick={() =>
                    setSelectedAmbulanceId(
                      ambulance.id,
                    )
                  }
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${Math.min(
                      82,
                      Math.max(
                        18,
                        left,
                      ),
                    )}%`,
                    top: `${Math.min(
                      82,
                      Math.max(
                        18,
                        top,
                      ),
                    )}%`,
                  }}
                  aria-label={`Select ${ambulance.id}`}
                >
                  <div
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg transition ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-600 shadow-cyan-500/40'
                        : 'border-white/50 bg-slate-700'
                    }`}
                  >
                    <Ambulance className="h-5 w-5 text-white" />

                    {isSelected &&
                      tracking && (
                        <span className="absolute -inset-2 animate-ping rounded-full border border-cyan-400/40" />
                      )}
                  </div>

                  <div className="mt-1 whitespace-nowrap rounded bg-navy-950/95 px-1.5 py-0.5 text-[8px] font-bold text-white">
                    {ambulance.id}
                  </div>

                  {index === 0 && (
                    <div className="mt-0.5 rounded bg-emerald-500/20 px-1 text-[7px] font-bold text-emerald-400">
                      NEAREST
                    </div>
                  )}
                </button>
              );
            },
          )}

          {/* LEGEND */}

          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap gap-2">
            <MapLegend
              label="Emergency"
              className="bg-emergency-600"
            >
              <MapPin className="h-3 w-3 text-white" />
            </MapLegend>

            <MapLegend
              label="Ambulance"
              className="bg-cyan-600"
            >
              <Ambulance className="h-3 w-3 text-white" />
            </MapLegend>

            <MapLegend
              label="Police"
              className="bg-blue-600"
            >
              <Shield className="h-3 w-3 text-white" />
            </MapLegend>

            <MapLegend
              label="Fire"
              className="bg-orange-600"
            >
              <Flame className="h-3 w-3 text-white" />
            </MapLegend>
          </div>
        </div>

        {/* RESPONSE PANEL */}

        <div className="space-y-3">
          {/* NEAREST */}

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LocateFixed className="h-4 w-4 text-cyan-400" />

                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Nearest Ambulance
                </span>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-400">
                AUTO SELECTED
              </span>
            </div>

            {nearestAmbulance && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/20">
                    <Ambulance className="h-6 w-6 text-cyan-400" />
                  </div>

                  <div className="flex-1">
                    <div className="text-base font-bold text-white">
                      {nearestAmbulance.id}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-secondary-400">
                      <UserRound className="h-3 w-3" />

                      {nearestAmbulance.driver}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <InfoMetric
                    label="Distance"
                    value={`${nearestAmbulance.distance.toFixed(2)} km`}
                  />

                  <InfoMetric
                    label="ETA"
                    value={`${calculateETA(nearestAmbulance.distance)} min`}
                  />

                  <InfoMetric
                    label="Status"
                    value={getStatusLabel(
                      nearestAmbulance.status,
                    )}
                  />
                </div>
              </>
            )}
          </div>

          {/* DISPATCH */}

          <div className="rounded-xl border border-navy-700 bg-navy-800 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />

              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Automatic Dispatch
              </span>
            </div>

            {activeIncident ? (
              <div className="mb-3 rounded-lg border border-navy-700 bg-navy-900 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-400">
                    Highest Priority
                  </span>

                  <span className="font-mono text-xs font-bold text-emergency-400">
                    {activeIncident.id}
                  </span>
                </div>

                <div className="mt-1 text-sm font-bold text-white">
                  {activeIncident.type}
                </div>

                <div className="mt-1 text-[10px] text-secondary-400">
                  {activeIncident.location ||
                    'Location unavailable'}
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-lg border border-navy-700 bg-navy-900 p-3 text-xs text-secondary-400">
                No active incident selected.
              </div>
            )}

            <button
              type="button"
              onClick={
                dispatchNearestAmbulance
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emergency-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emergency-500 active:scale-[0.98]"
            >
              <Siren className="h-4 w-4" />

              {tracking
                ? 'Ambulance Tracking Active'
                : 'Dispatch Nearest Ambulance'}
            </button>
          </div>

          {/* SELECTED */}

          {selectedAmbulance && (
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-secondary-400">
                    Tracking Unit
                  </div>

                  <div className="mt-1 text-lg font-bold text-white">
                    {selectedAmbulance.id}
                  </div>
                </div>

                <div
                  className={`rounded-full border border-current/20 bg-current/10 px-2 py-1 text-[9px] font-bold uppercase ${getStatusColor(
                    selectedAmbulance.status,
                  )}`}
                >
                  {getStatusLabel(
                    selectedAmbulance.status,
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <InfoMetric
                  label="Driver"
                  value={
                    selectedAmbulance.driver
                  }
                />

                <InfoMetric
                  label="Distance"
                  value={`${currentDistance.toFixed(2)} km`}
                />

                <InfoMetric
                  label="Speed"
                  value={`${selectedAmbulance.speed} km/h`}
                />

                <InfoMetric
                  label="ETA"
                  value={`${selectedAmbulance.eta} min`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TRACKING */}

      <div className="border-t border-navy-700 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Live Ambulance Tracking
            </h3>

            <p className="text-[10px] text-secondary-400">
              Real-time response progression
            </p>
          </div>

          {tracking && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              TRACKING LIVE
            </div>
          )}

          {!tracking &&
            trackingStep >= 4 && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ARRIVED
              </div>
            )}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <TrackingStep
            number="01"
            title="Assigned"
            active={trackingStep >= 0}
            completed={trackingStep > 0}
          />

          <TrackingStep
            number="02"
            title="Dispatched"
            active={trackingStep >= 1}
            completed={trackingStep > 1}
          />

          <TrackingStep
            number="03"
            title="En Route"
            active={trackingStep >= 2}
            completed={trackingStep > 2}
          />

          <TrackingStep
            number="04"
            title="Arrived"
            active={trackingStep >= 4}
            completed={trackingStep >= 4}
          />
        </div>
      </div>

      {/* SUMMARY */}

      <div className="border-t border-navy-700 bg-navy-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Activity className="h-4 w-4 text-purple-400" />
            </div>

            <div>
              <div className="text-xs font-bold text-white">
                AI Emergency Summary
              </div>

              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-secondary-400">
                {activeIncident
                  ? `${activeIncident.type} detected at ${
                      activeIncident.location ||
                      'emergency location'
                    }. ${
                      nearestAmbulance?.id ||
                      'Nearest ambulance'
                    } is ${
                      nearestAmbulance
                        ? nearestAmbulance.distance.toFixed(
                            1,
                          )
                        : '—'
                    } km away. ${
                      tracking
                        ? 'Ambulance dispatched and live tracking is active.'
                        : trackingStep >= 4
                          ? 'Ambulance has arrived.'
                          : 'Awaiting dispatch.'
                    }`
                  : 'Emergency monitoring active. Multi-agency response network ready.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-secondary-400" />

              <span className="text-[10px] text-secondary-400">
                System
              </span>

              <span className="text-xs font-bold text-emerald-400">
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MapLegend({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-navy-700 bg-navy-900/90 px-2 py-1 backdrop-blur">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${className}`}
      >
        {children}
      </span>

      <span className="text-[9px] text-secondary-300">
        {label}
      </span>
    </div>
  );
}

function InfoMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-navy-700 bg-navy-900 p-2">
      <div className="text-[9px] uppercase tracking-wider text-secondary-500">
        {label}
      </div>

      <div className="mt-0.5 truncate text-xs font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function TrackingStep({
  number,
  title,
  active,
  completed,
}: {
  number: string;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border p-3 transition ${
        active
          ? 'border-cyan-500/40 bg-cyan-500/5'
          : 'border-navy-700 bg-navy-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${
            completed
              ? 'bg-emerald-500 text-white'
              : active
                ? 'bg-cyan-600 text-white'
                : 'bg-navy-700 text-secondary-500'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            number
          )}
        </div>

        <div>
          <div
            className={`text-xs font-bold ${
              active
                ? 'text-white'
                : 'text-secondary-500'
            }`}
          >
            {title}
          </div>

          <div className="text-[8px] uppercase tracking-wider text-secondary-500">
            {active
              ? completed
                ? 'Complete'
                : 'Active'
              : 'Waiting'}
          </div>
        </div>
      </div>
    </div>
  );
}