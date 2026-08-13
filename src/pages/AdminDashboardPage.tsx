import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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
  AlertOctagon,
  X,
  Car,
  Flame,
  Building,
  Phone,
  Users,
  Radio,
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

import {
  getEmergencyContacts,
  type EmergencyContact,
} from '@/lib/emergencyContacts';

import HospitalMap from '@/components/HospitalMap';

import AmbulanceCommandCenter from '@/components/AmbulanceCommandCentere';

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

const SOURCE_LABELS: Record<
  IncidentSource,
  string
> = {
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

  /*
   * FAMILY EMERGENCY CONTACTS
   *
   * These are contacts that the user saved before
   * the emergency. They are NOT required during Fast SOS.
   */
  const [
    emergencyContacts,
    setEmergencyContacts,
  ] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    setEmergencyContacts(
      getEmergencyContacts(),
    );
  }, []);

  /*
   * Hide escalated incidents.
   */
  const visibleIncidents = useMemo(() => {
    return incidents.filter(
      (incident) =>
        incident.status !== 'ESCALATED',
    );
  }, [incidents]);

  /*
   * Dashboard statistics.
   */
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

  /*
   * Sort incidents by priority.
   */
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

  /*
   * Available responders.
   */
  const availableResponders =
    responders.filter(
      (responder) =>
        responder.status === 'Available',
    );

  /*
   * Incident currently being assigned.
   */
  const assigningIncident =
    assigningId
      ? visibleIncidents.find(
          (incident) =>
            incident.id === assigningId,
        )
      : null;

  /*
   * Responder type summary.
   */
  const responderStats = useMemo(() => {
    const available = responders.filter(
      (responder) =>
        responder.status === 'Available',
    );

    const countType = (
      typeName: string,
    ) =>
      available.filter(
        (responder) =>
          responder.type
            .toLowerCase()
            .includes(
              typeName.toLowerCase(),
            ),
      ).length;

    return {
      ambulance: countType('ambulance'),
      police: countType('police'),
      fire: countType('fire'),
      rescue: countType('rescue'),
      hospital: countType('hospital'),
    };
  }, [responders]);

  return (
    <div className="space-y-5">
      {/* =========================================================
          HEADER
      ========================================================== */}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <ShieldCheck className="h-6 w-6 text-secondary-400" />

          Emergency Control Center
        </h1>

        <p className="mt-1 text-sm text-secondary-400">
          Admin coordination view —
          incidents, responders,
          ambulances, police, fire,
          rescue teams and hospitals.
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

      {/* =========================================================
          STATS
      ========================================================== */}

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

      {/* =========================================================
          RESPONSE NETWORK
      ========================================================== */}

      <section className="rounded-2xl border border-navy-700 bg-navy-900 p-4 shadow-xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Radio className="h-5 w-5 text-cyan-400" />

              Emergency Response Network
            </h2>

            <p className="mt-1 text-xs text-secondary-400">
              Available emergency organizations and
              responder units.
            </p>
          </div>

          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            NETWORK OPERATIONAL
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ResponseUnitCard
            icon={
              <Ambulance className="h-5 w-5 text-cyan-400" />
            }
            title="Ambulance"
            count={
              responderStats.ambulance
            }
            className="border-cyan-500/20 bg-cyan-500/5"
          />

          <ResponseUnitCard
            icon={
              <Siren className="h-5 w-5 text-blue-400" />
            }
            title="Police"
            count={
              responderStats.police
            }
            className="border-blue-500/20 bg-blue-500/5"
          />

          <ResponseUnitCard
            icon={
              <Flame className="h-5 w-5 text-orange-400" />
            }
            title="Fire"
            count={
              responderStats.fire
            }
            className="border-orange-500/20 bg-orange-500/5"
          />

          <ResponseUnitCard
            icon={
              <AlertOctagon className="h-5 w-5 text-purple-400" />
            }
            title="Rescue"
            count={
              responderStats.rescue
            }
            className="border-purple-500/20 bg-purple-500/5"
          />

          <ResponseUnitCard
            icon={
              <Building className="h-5 w-5 text-emerald-400" />
            }
            title="Hospital"
            count={
              responderStats.hospital
            }
            className="border-emerald-500/20 bg-emerald-500/5"
          />
        </div>
      </section>

      {/* =========================================================
          AMBULANCE COMMAND CENTER
      ========================================================== */}

      <AmbulanceCommandCenter
        responders={responders}
        incidents={visibleIncidents}
      />

      {/* =========================================================
          FAMILY EMERGENCY CONTACTS
      ========================================================== */}

      <section className="rounded-2xl border border-navy-700 bg-navy-900 p-4 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Users className="h-5 w-5 text-emerald-400" />

              Family Emergency Contacts
            </h2>

            <p className="mt-1 text-xs text-secondary-400">
              Emergency contacts saved by the
              user before an emergency.
            </p>
          </div>

          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            {emergencyContacts.length}{' '}
            Contact
            {emergencyContacts.length === 1
              ? ''
              : 's'}
          </div>
        </div>

        {emergencyContacts.length === 0 ? (
          <div className="rounded-xl border border-navy-700 bg-navy-800 p-6 text-center">
            <Phone className="mx-auto h-8 w-8 text-secondary-500" />

            <p className="mt-2 text-sm font-semibold text-white">
              No emergency contacts available
            </p>

            <p className="mt-1 text-xs text-secondary-400">
              The user has not added any
              family emergency contacts.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[11px] leading-relaxed text-secondary-400">
                These numbers are provided by the
                user for emergency notification.
                During an emergency, the admin can
                call a family member directly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {emergencyContacts.map(
                (contact) => (
                  <EmergencyContactCard
                    key={contact.id}
                    contact={contact}
                  />
                ),
              )}
            </div>
          </>
        )}
      </section>

      {/* =========================================================
          HOSPITAL MAP
      ========================================================== */}

      <HospitalMap
        incidents={visibleIncidents}
      />

      {/* =========================================================
          INCIDENT QUEUE
      ========================================================== */}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Incoming Incidents
            </h2>

            <p className="mt-1 text-xs text-secondary-400">
              Prioritized emergency reports requiring
              admin coordination.
            </p>
          </div>

          <div className="rounded-full border border-navy-700 bg-navy-900 px-3 py-1.5 text-[10px] font-bold text-secondary-400">
            {sortedIncidents.length} INCIDENT
            {sortedIncidents.length === 1
              ? ''
              : 'S'}
          </div>
        </div>

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

      {/* =========================================================
          ASSIGNMENT MODAL
      ========================================================== */}

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
                  All units are busy or offline.
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

                    const responderType =
                      responder.type ||
                      'Emergency Responder';

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
                            <ResponderIcon
                              type={
                                responderType
                              }
                            />
                          </div>

                          <div>
                            <div className="text-sm font-bold text-white">
                              {responder.id.toUpperCase()}
                            </div>

                            <div className="text-xs text-secondary-400">
                              {responderType}
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

/* ===============================================================
   FAMILY CONTACT CARD
================================================================ */

function EmergencyContactCard({
  contact,
}: {
  contact: EmergencyContact;
}) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-4 transition hover:border-emerald-500/30">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          <Phone className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {contact.name}
          </div>

          <div className="mt-0.5 text-xs text-secondary-400">
            {contact.relation}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-navy-700 bg-navy-900 px-3 py-2">
        <div className="text-[9px] uppercase tracking-wider text-secondary-500">
          Phone Number
        </div>

        <div className="mt-0.5 truncate font-mono text-sm font-semibold text-white">
          {contact.phone}
        </div>
      </div>

      <a
        href={`tel:${contact.phone}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
      >
        <Phone className="h-4 w-4" />

        Call {contact.name}
      </a>
    </div>
  );
}

/* ===============================================================
   RESPONSE UNIT CARD
================================================================ */

function ResponseUnitCard({
  icon,
  title,
  count,
  className,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900">
          {icon}
        </div>

        <span className="text-xl font-bold text-white">
          {count}
        </span>
      </div>

      <div className="mt-2 text-xs font-semibold text-secondary-300">
        {title}
      </div>

      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-emerald-400">
        Available
      </div>
    </div>
  );
}

/* ===============================================================
   RESPONDER ICON
================================================================ */

function ResponderIcon({
  type,
}: {
  type: string;
}) {
  const normalized =
    type.toLowerCase();

  if (
    normalized.includes('police')
  ) {
    return (
      <Siren className="h-5 w-5 text-blue-400" />
    );
  }

  if (
    normalized.includes('fire')
  ) {
    return (
      <Flame className="h-5 w-5 text-orange-400" />
    );
  }

  if (
    normalized.includes('rescue')
  ) {
    return (
      <AlertOctagon className="h-5 w-5 text-purple-400" />
    );
  }

  if (
    normalized.includes('hospital')
  ) {
    return (
      <Building className="h-5 w-5 text-emerald-400" />
    );
  }

  return (
    <Ambulance className="h-5 w-5 text-cyan-400" />
  );
}

/* ===============================================================
   STAT CARD
================================================================ */

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

/* ===============================================================
   INCIDENT CARD
================================================================ */

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
                className="btn bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-700"
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
                className="btn bg-amber-600 px-3 py-2 text-xs text-white hover:bg-amber-700"
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
                className="btn bg-slate-700 px-3 py-2 text-xs text-secondary-400 hover:bg-slate-600"
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