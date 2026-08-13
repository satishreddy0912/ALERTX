import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Siren,
  MapPin,
  Clock,
  Eye,
  Check,
  AlertTriangle,
  Ban,
  Activity,
  Ambulance,
  Flame,
  Car,
  Building,
  AlertOctagon,
  X,
  Navigation,
  Radio,
  LocateFixed,
  Gauge,
  UserRound,
  Timer,
  Zap,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';

import type {
  Incident,
  Responder,
  IncidentSource,
} from '@/types';

import {
  SeverityBadge,
  StatusBadge,
  PriorityScore,
  CredibilityBadge,
} from '@/components/Badges';

import { formatRelative } from '@/lib/format';
import type { AdminSession } from '@/lib/store';

import HospitalMap from '@/components/HospitalMap';

interface Props {
  incidents: Incident[];
  responders: Responder[];
  adminSession: AdminSession | null;

  onView: (id: string) => void;
  onVerify: (id: string) => void;

  onAssign: (
    id: string,
    responderId: string,
  ) => void;

  onEscalate: (id: string) => void;
  onClose: (id: string) => void;
}

const SOURCE_LABELS: Record<IncidentSource, string> = {
  user_report: 'USER REPORTED',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

const SOURCE_ICONS: Record<
  IncidentSource,
  typeof Siren
> = {
  user_report: Activity,
  mobile_sensor: Siren,
  simulator: AlertTriangle,
  fast_sos: Siren,
};

const TYPE_ICONS: Record<
  string,
  typeof Ambulance
> = {
  'Road Accident': Car,
  'Medical Emergency': Ambulance,
  Fire: Flame,
  Other: Building,
};

// ============================================================
// DEMO AMBULANCE DATA
// ============================================================

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

// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadius = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return earthRadius * c;
}

// ============================================================
// ETA
// ============================================================

function calculateETA(
  distanceKm: number,
): number {
  const averageSpeed = 35;

  return Math.max(
    1,
    Math.ceil(
      (distanceKm / averageSpeed) * 60,
    ),
  );
}

// ============================================================
// AMBULANCE STATUS HELPERS
// ============================================================

function getAmbulanceStatusLabel(
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

function getAmbulanceStatusColor(
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

// ============================================================
// COMMAND CENTER
// ============================================================

function AmbulanceCommandCenter({
  incidents,
}: {
  incidents: Incident[];
}) {
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

  // ----------------------------------------------------------
  // DEMO EMERGENCY LOCATION
  // ----------------------------------------------------------

  const victim = {
    lat: 17.433,
    lng: 78.501,
  };

  // ----------------------------------------------------------
  // FIND NEAREST AMBULANCE
  // ----------------------------------------------------------

  const ambulanceDistances = useMemo(() => {
    return ambulances
      .map((ambulance) => ({
        ...ambulance,
        distance: calculateDistance(
          ambulance.lat,
          ambulance.lng,
          victim.lat,
          victim.lng,
        ),
      }))
      .sort(
        (a, b) =>
          a.distance - b.distance,
      );
  }, [ambulances, victim.lat, victim.lng]);

  const nearestAmbulance =
    ambulanceDistances[0];

  const selectedAmbulance =
    ambulances.find(
      (ambulance) =>
        ambulance.id ===
        selectedAmbulanceId,
    ) || nearestAmbulance;

  // ----------------------------------------------------------
  // AUTO SELECT NEAREST AMBULANCE
  // ----------------------------------------------------------

  useEffect(() => {
  const nearestId = ambulanceDistances[0]?.id;

  if (!nearestId) {
    return;
  }

  setSelectedAmbulanceId((currentId) => {
    if (currentId === nearestId) {
      return currentId;
    }

    return nearestId;
  });
}, [ambulanceDistances]);

  // ----------------------------------------------------------
  // TRACKING PROGRESSION
  // ----------------------------------------------------------

  useEffect(() => {
    if (!tracking) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setTrackingStep((previous) => {
          if (previous >= 4) {
            setTracking(false);
            return 4;
          }

          return previous + 1;
        });
      }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [tracking]);

  // ----------------------------------------------------------
  // MOVE AMBULANCE TOWARD VICTIM
  // ----------------------------------------------------------

  useEffect(() => {
    if (!tracking) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setAmbulances((current) =>
          current.map((ambulance) => {
            if (
              ambulance.id !==
              selectedAmbulanceId
            ) {
              return ambulance;
            }

            // Arrived
            if (trackingStep >= 4) {
              return {
                ...ambulance,
                lat: victim.lat,
                lng: victim.lng,
                status: 'ARRIVED',
                speed: 0,
                eta: 0,
              };
            }

            // Calculate movement toward victim
            const latDifference =
              victim.lat -
              ambulance.lat;

            const lngDifference =
              victim.lng -
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
                victim.lat,
                victim.lng,
              );

            let status:
              AmbulanceUnit['status'];

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

    return () => {
      window.clearInterval(timer);
    };
  }, [
    tracking,
    trackingStep,
    selectedAmbulanceId,
    victim.lat,
    victim.lng,
  ]);

  // ----------------------------------------------------------
  // DISPATCH NEAREST
  // ----------------------------------------------------------

  const dispatchNearestAmbulance =
    () => {
      if (!nearestAmbulance) {
        return;
      }

      setSelectedAmbulanceId(
        nearestAmbulance.id,
      );

      setTrackingStep(0);

      setAmbulances((current) =>
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

  // ----------------------------------------------------------
  // ACTIVE INCIDENT
  // ----------------------------------------------------------

  const activeIncident = useMemo(() => {
    return [...incidents]
      .filter(
        (incident) =>
          incident.status !==
            'RESOLVED' &&
          incident.status !==
            'SUSPICIOUS',
      )
      .sort(
        (a, b) =>
          b.priority - a.priority,
      )[0];
  }, [incidents]);

  // ----------------------------------------------------------
  // CURRENT TRACKING DISTANCE
  // ----------------------------------------------------------

  const currentDistance =
    selectedAmbulance
      ? calculateDistance(
          selectedAmbulance.lat,
          selectedAmbulance.lng,
          victim.lat,
          victim.lng,
        )
      : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl">
      {/* HEADER */}

      <div className="border-b border-navy-700 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emergency-600/20">
              <Ambulance className="h-5 w-5 text-emergency-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                ALERTX COMMAND CENTER
              </h2>

              <p className="text-xs text-secondary-400">
                Live Emergency Response &
                Ambulance Tracking
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

      {/* MAIN */}

      <div className="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr]">
        {/* MAP */}

        <div className="relative min-h-[430px] overflow-hidden rounded-xl border border-navy-700 bg-[#07101d]">
          {/* Grid */}

          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(100,150,200,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,150,200,0.12) 1px, transparent 1px)',
              backgroundSize:
                '40px 40px',
            }}
          />

          {/* Map title */}

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

          {/* Traffic */}

          <div className="absolute right-3 top-3 z-10 rounded-lg border border-navy-700 bg-navy-900/90 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-400" />

              <div>
                <div className="text-[9px] uppercase text-secondary-400">
                  Traffic
                </div>

                <div className="text-xs font-bold text-amber-400">
                  Moderate
                </div>
              </div>
            </div>
          </div>

          {/* Roads */}

          <div className="absolute left-[10%] top-[50%] h-[3px] w-[80%] rotate-[12deg] bg-slate-600/60" />

          <div className="absolute left-[40%] top-[10%] h-[90%] w-[3px] rotate-[18deg] bg-slate-600/50" />

          <div className="absolute left-[15%] top-[30%] h-[2px] w-[70%] -rotate-[25deg] bg-slate-700/70" />

          {/* VICTIM */}

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

          {/* MAP LEGEND */}

          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap gap-2">
            <MapLegend
              icon={
                <MapPin className="h-3 w-3 text-white" />
              }
              label="Victim"
              className="bg-emergency-600"
            />

            <MapLegend
              icon={
                <Ambulance className="h-3 w-3 text-white" />
              }
              label="Ambulance"
              className="bg-cyan-600"
            />

            <MapLegend
              icon={
                <CircleDot className="h-3 w-3 text-emerald-400" />
              }
              label="Nearest"
              className="bg-navy-800"
            />
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
                    value={`${nearestAmbulance.distance.toFixed(
                      2,
                    )} km`}
                  />

                  <InfoMetric
                    label="ETA"
                    value={`${calculateETA(
                      nearestAmbulance.distance,
                    )} min`}
                  />

                  <InfoMetric
                    label="Status"
                    value={
                      getAmbulanceStatusLabel(
                        nearestAmbulance.status,
                      )
                    }
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
                    Highest Priority Incident
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
                Demo location is ready.
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

          {/* SELECTED AMBULANCE */}

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
                  className={`rounded-full border border-current/20 bg-current/10 px-2 py-1 text-[9px] font-bold uppercase ${getAmbulanceStatusColor(
                    selectedAmbulance.status,
                  )}`}
                >
                  {getAmbulanceStatusLabel(
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
                  value={`${currentDistance.toFixed(
                    2,
                  )} km`}
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

      {/* TRACKING TIMELINE */}

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
                  ? `${activeIncident.type} detected. ${
                      activeIncident.location ||
                      'Emergency location identified'
                    }. Nearest ambulance ${
                      nearestAmbulance?.id ||
                      'available unit'
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
                          ? 'Ambulance has arrived at the emergency location.'
                          : 'Awaiting automatic dispatch.'
                    }`
                  : 'Emergency monitoring active. Ambulance network ready for automatic dispatch.'}
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

// ============================================================
// SMALL COMMAND CENTER COMPONENTS
// ============================================================

function MapLegend({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-navy-700 bg-navy-900/90 px-2 py-1 backdrop-blur">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${className}`}
      >
        {icon}
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

// ============================================================
// MAIN ADMIN DASHBOARD
// ============================================================

export function AdminDashboardPage({
  incidents,
  responders,
  adminSession,
  onView,
  onVerify,
  onAssign,
  onEscalate,
  onClose,
}: Props) {
  const [assigningId, setAssigningId] =
    useState<string | null>(null);

  // ----------------------------------------------------------
  // HIDE ESCALATED INCIDENTS
  // ----------------------------------------------------------

  const visibleIncidents = useMemo(() => {
    return incidents.filter(
      (incident) =>
        incident.status !== 'ESCALATED',
    );
  }, [incidents]);

  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------

  const stats = useMemo(() => {
    const active =
      visibleIncidents.filter(
        (incident) =>
          incident.status !== 'RESOLVED' &&
          incident.status !== 'SUSPICIOUS',
      );

    return {
      active: active.length,

      critical: active.filter(
        (incident) =>
          incident.severity === 'CRITICAL',
      ).length,

      high: active.filter(
        (incident) =>
          incident.severity === 'HIGH',
      ).length,

      awaitingReview: active.filter(
        (incident) =>
          incident.status === 'NEW' ||
          incident.status ===
            'VERIFICATION_REQUIRED',
      ).length,

      responding: active.filter(
        (incident) =>
          incident.status === 'RESPONDING',
      ).length,

      resolvedToday:
        visibleIncidents.filter(
          (incident) =>
            incident.status === 'RESOLVED',
        ).length,

      availableResponders:
        responders.filter(
          (responder) =>
            responder.status === 'Available',
        ).length,
    };
  }, [
    visibleIncidents,
    responders,
  ]);

  // ----------------------------------------------------------
  // SORT INCIDENTS
  // ----------------------------------------------------------

  const sortedIncidents = useMemo(() => {
    const weight = (
      incident: Incident,
    ) => {
      let value =
        incident.priority;

      if (incident.urgent) {
        value += 150;
      }

      if (
        incident.status ===
        'VERIFICATION_REQUIRED'
      ) {
        value += 30;
      }

      if (
        incident.status === 'NEW'
      ) {
        value += 20;
      }

      if (
        incident.status === 'RESOLVED' ||
        incident.status === 'SUSPICIOUS'
      ) {
        value -= 100;
      }

      return value;
    };

    return [...visibleIncidents].sort(
      (a, b) =>
        weight(b) - weight(a),
    );
  }, [visibleIncidents]);

  // ----------------------------------------------------------
  // AVAILABLE RESPONDERS
  // ----------------------------------------------------------

  const availableResponders =
    responders.filter(
      (responder) =>
        responder.status === 'Available',
    );

  const assigningIncident =
    assigningId
      ? visibleIncidents.find(
          (incident) =>
            incident.id === assigningId,
        )
      : null;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <ShieldCheck className="h-6 w-6 text-secondary-400" />

          Emergency Control Center
        </h1>

        <p className="mt-1 text-sm text-secondary-400">
          Admin coordination view —
          incidents, responders,
          ambulances and nearby hospitals.
        </p>

        {adminSession && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-navy-700 bg-navy-900 px-3 py-1.5 text-xs text-secondary-400">
            <ShieldCheck className="h-3.5 w-3.5" />

            Signed in:{' '}

            <span className="font-semibold">
              {adminSession.name}
            </span>

            {' · '}

            {adminSession.id}
          </div>
        )}
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label="Active"
          value={stats.active}
          color="text-secondary-400"
        />

        <StatCard
          label="Critical"
          value={stats.critical}
          color="text-emergency-400"
        />

        <StatCard
          label="High"
          value={stats.high}
          color="text-secondary-400"
        />

        <StatCard
          label="Awaiting Review"
          value={stats.awaitingReview}
          color="text-amber-400"
        />

        <StatCard
          label="Responding"
          value={stats.responding}
          color="text-indigo-400"
        />

        <StatCard
          label="Resolved Today"
          value={stats.resolvedToday}
          color="text-emerald-400"
        />

        <StatCard
          label="Available Responders"
          value={
            stats.availableResponders
          }
          color="text-sky-400"
        />

        <StatCard
          label="Ambulance Network"
          value={3}
          color="text-cyan-400"
        />
      </div>

      {/* AMBULANCE COMMAND CENTER */}

      <AmbulanceCommandCenter
        incidents={visibleIncidents}
      />

      {/* HOSPITAL MAP */}

      <HospitalMap
        incidents={visibleIncidents}
      />

      {/* INCIDENT QUEUE */}

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">
          Incoming Incidents
        </h2>

        {sortedIncidents.length === 0 ? (
          <div className="card p-8 text-center text-sm text-secondary-400">
            No incidents in the system.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedIncidents.map(
              (incident) => (
                <AdminIncidentCard
                  key={incident.id}
                  incident={incident}
                  onView={onView}
                  onVerify={onVerify}
                  onAssign={(id) =>
                    setAssigningId(id)
                  }
                  onEscalate={
                    onEscalate
                  }
                  onClose={onClose}
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* ASSIGNMENT MODAL */}

      {assigningIncident && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Ambulance className="h-4 w-4 text-secondary-400" />

                Assign Responder to{' '}

                {assigningIncident.id}
              </h3>

              <button
                type="button"
                onClick={() =>
                  setAssigningId(null)
                }
                className="text-secondary-400 hover:text-white"
                aria-label="Close assignment modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 p-4">
              {availableResponders.length ===
              0 ? (
                <p className="text-center text-sm text-secondary-400">
                  No available responders.
                  All units are busy or
                  offline.
                </p>
              ) : (
                availableResponders.map(
                  (responder) => {
                    const distance =
                      (
                        1 +
                        Math.abs(
                          (
                            responder.id.charCodeAt(
                              1,
                            ) || 1
                          ) % 5,
                        )
                      ).toFixed(1);

                    return (
                      <button
                        key={responder.id}
                        type="button"
                        onClick={() => {
                          onAssign(
                            assigningIncident.id,
                            responder.id,
                          );

                          setAssigningId(
                            null,
                          );
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 text-left transition hover:border-accent-500"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
                            <Ambulance className="h-5 w-5 text-secondary-400" />
                          </div>

                          <div>
                            <div className="text-sm font-bold text-white">
                              {responder.id.toUpperCase()}
                            </div>

                            <div className="text-xs text-secondary-400">
                              {responder.type}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-semibold text-emerald-400">
                            {distance} km
                          </div>

                          <div className="text-[10px] uppercase tracking-wider text-emerald-500">
                            Available
                          </div>
                        </div>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-secondary-400 sm:text-xs">
        {label}
      </div>

      <div
        className={`mt-1 text-xl font-bold sm:text-2xl ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// INCIDENT CARD
// ============================================================

function AdminIncidentCard({
  incident,
  onView,
  onVerify,
  onAssign,
  onEscalate,
  onClose,
}: {
  incident: Incident;

  onView: (id: string) => void;

  onVerify: (id: string) => void;

  onAssign: (id: string) => void;

  onEscalate: (id: string) => void;

  onClose: (id: string) => void;
}) {
  const SourceIcon =
    SOURCE_ICONS[incident.source];

  const TypeIcon =
    TYPE_ICONS[incident.type] ||
    AlertOctagon;

  const isUrgent =
    incident.urgent;

  const isResolved =
    incident.status === 'RESOLVED';

  const isSuspicious =
    incident.status === 'SUSPICIOUS';

  const canVerify =
    incident.status === 'NEW' ||
    incident.status ===
      'VERIFICATION_REQUIRED';

  const canAssign =
    incident.status === 'VERIFIED' ||
    incident.status === 'NEW';

  const canEscalate =
    !isResolved &&
    !isSuspicious;

  const canClose =
    !isResolved &&
    !isSuspicious;

  return (
    <div
      className={`card overflow-hidden ${
        isUrgent
          ? 'border-emergency-500/50 ring-1 ring-emergency-500/20'
          : ''
      } ${
        isSuspicious
          ? 'border-amber-500/40'
          : ''
      }`}
    >
      {isUrgent &&
        !isResolved && (
          <div className="flex items-center gap-2 bg-emergency-700/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-emergency-300">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />

            Urgent —{' '}

            {incident.source ===
            'fast_sos'
              ? 'Fast SOS'
              : 'High-Confidence Sensor'}
          </div>
        )}

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        {/* THUMBNAIL */}

        <div className="shrink-0 sm:w-24">
          {incident.imageData ? (
            <img
              src={incident.imageData}
              alt="Incident"
              className="h-20 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-navy-800 text-secondary-400">
              <TypeIcon className="h-7 w-7" />
            </div>
          )}
        </div>

        {/* INFORMATION */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-white">
              {incident.type}
            </span>

            <span className="font-mono text-xs text-secondary-400">
              {incident.id}
            </span>

            <SeverityBadge
              severity={incident.severity}
            />

            <StatusBadge
              status={incident.status}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary-400">
            <span className="flex items-center gap-1">
              <SourceIcon className="h-3.5 w-3.5" />

              {
                SOURCE_LABELS[
                  incident.source
                ]
              }
            </span>

            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />

              <span className="truncate">
                {incident.location ||
                  'Location unavailable'}
              </span>
            </span>

            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />

              {formatRelative(
                incident.createdAt,
              )}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-secondary-400">
                Priority:
              </span>

              <PriorityScore
                score={
                  incident.priority
                }
              />
            </span>

            {incident.credibility && (
              <span className="flex items-center gap-1">
                <span className="text-secondary-400">
                  Credibility:
                </span>

                <CredibilityBadge
                  level={
                    incident.credibility
                      .level
                  }
                  score={
                    incident.credibility
                      .score
                  }
                />
              </span>
            )}

            {incident.sensorConfidence !==
              undefined && (
              <span className="flex items-center gap-1">
                <span className="text-secondary-400">
                  Sensor:
                </span>

                <span className="font-mono font-semibold text-secondary-400">
                  {Math.round(
                    incident.sensorConfidence *
                      100,
                  )}
                  %
                </span>
              </span>
            )}
          </div>

          {incident.aiSummary && (
            <p className="mt-2 rounded-lg border border-navy-700 bg-navy-800 p-2.5 text-xs leading-relaxed text-secondary-400">
              {incident.aiSummary}
            </p>
          )}

          {/* ACTIONS */}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onView(incident.id)
              }
              className="btn-ghost px-3 py-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />

              View
            </button>

            {canVerify && (
              <button
                type="button"
                onClick={() =>
                  onVerify(incident.id)
                }
                className="btn px-3 py-2 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />

                Verify
              </button>
            )}

            {canAssign && (
              <button
                type="button"
                onClick={() =>
                  onAssign(incident.id)
                }
                className="btn-primary px-3 py-2 text-xs"
              >
                <Ambulance className="h-3.5 w-3.5" />

                Assign
              </button>
            )}

            {canEscalate && (
              <button
                type="button"
                onClick={() =>
                  onEscalate(incident.id)
                }
                className="btn px-3 py-2 bg-amber-600 text-xs text-white hover:bg-amber-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" />

                Escalate
              </button>
            )}

            {canClose && (
              <button
                type="button"
                onClick={() =>
                  onClose(incident.id)
                }
                className="btn px-3 py-2 bg-slate-700 text-xs text-secondary-400 hover:bg-slate-600"
              >
                <Ban className="h-3.5 w-3.5" />

                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}