import { useMemo, useState } from 'react';
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
   * ESCALATED INCIDENTS ARE COMPLETELY HIDDEN
   * FROM THE ADMIN DASHBOARD.
   */
  const visibleIncidents = useMemo(() => {
    return incidents.filter(
      (incident) =>
        incident.status !== 'ESCALATED',
    );
  }, [incidents]);

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
  }, [visibleIncidents, responders]);

  const sortedIncidents = useMemo(() => {
    const weight = (
      incident: Incident,
    ) => {
      let weight =
        incident.priority;

      if (incident.urgent) {
        weight += 150;
      }

      if (
        incident.status ===
        'VERIFICATION_REQUIRED'
      ) {
        weight += 30;
      }

      if (
        incident.status === 'NEW'
      ) {
        weight += 20;
      }

      if (
        incident.status === 'RESOLVED' ||
        incident.status === 'SUSPICIOUS'
      ) {
        weight -= 100;
      }

      return weight;
    };

    return [...visibleIncidents].sort(
      (a, b) =>
        weight(b) - weight(a),
    );
  }, [visibleIncidents]);

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

  return (
    <div className="space-y-5">
      {/* Header */}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <ShieldCheck className="h-6 w-6 text-secondary-400" />

          Emergency Control Center
        </h1>

        <p className="mt-1 text-sm text-secondary-400">
          Admin coordination view — incidents,
          responders and nearby hospitals.
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

      {/* Stats */}

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
      </div>

      {/* Hospital Map */}

      <HospitalMap incidents={visibleIncidents} />

      {/* Incident Queue */}

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

      {/* Assignment modal */}

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
                onClick={() =>
                  setAssigningId(null)
                }
                className="text-secondary-400 hover:text-white"
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

                    return (
                      <button
                        key={responder.id}
                        onClick={() => {
                          if (
                            adminSession
                          ) {
                            onAssign(
                              assigningIncident.id,
                              responder.id,
                            );
                          }

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

function AdminIncidentCard({
  incident,
  onView,
  onVerify,
  onAssign,
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

  /*
   * Escalation functionality is no longer
   * displayed in the Admin Dashboard.
   *
   * The callback remains in Props so your
   * existing parent component does not break.
   */
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
        {/* Thumbnail */}

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

        {/* Information */}

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

          {/* Actions */}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
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
                onClick={() =>
                  onVerify(incident.id)
                }
                className="btn px-3 py-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />

                Verify
              </button>
            )}

            {canAssign && (
              <button
                onClick={() =>
                  onAssign(incident.id)
                }
                className="btn-primary px-3 py-2 text-xs"
              >
                <Ambulance className="h-3.5 w-3.5" />

                Assign
              </button>
            )}

            {canClose && (
              <button
                onClick={() =>
                  onClose(incident.id)
                }
                className="btn px-3 py-2 text-xs bg-slate-700 text-secondary-400 hover:bg-slate-600"
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