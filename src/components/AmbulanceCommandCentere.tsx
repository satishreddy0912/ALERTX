import {
  Activity,
  Ambulance,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  Siren,
  User,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

import type {
  Incident,
  IncidentStatus,
  Responder,
} from '@/types';

interface Props {
  incidents: Incident[];
  responders: Responder[];

  onBack?: () => void;

  onViewIncident?: (id: string) => void;

  onAcceptIncident?: (id: string) => void;

  onMarkResponding?: (id: string) => void;

  onResolveIncident?: (id: string) => void;
}

export function AmbulanceCommandCentre({
  incidents,
  responders,
  onBack,
  onViewIncident,
  onAcceptIncident,
  onMarkResponding,
  onResolveIncident,
}: Props) {
  const ambulanceResponders = responders.filter(
    (responder) =>
      responder.type === 'Medical Response',
  );

  const activeIncidents = incidents.filter(
    (incident) =>
      incident.status !== 'RESOLVED',
  );

  const criticalIncidents = activeIncidents.filter(
    (incident) =>
      incident.severity === 'CRITICAL',
  );

  const respondingIncidents = activeIncidents.filter(
    (incident) =>
      incident.status === 'RESPONDING',
  );

  const availableAmbulances =
    ambulanceResponders.filter(
      (responder) =>
        responder.status === 'Available',
    );

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  function getSeverityClass(
    severity: Incident['severity'],
  ) {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-500/40 bg-red-500/10 text-red-300';

      case 'HIGH':
        return 'border-orange-500/40 bg-orange-500/10 text-orange-300';

      case 'MEDIUM':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';

      default:
        return 'border-green-500/40 bg-green-500/10 text-green-300';
    }
  }

  function getStatusClass(
    status: IncidentStatus,
  ) {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';

      case 'ASSIGNED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';

      case 'RESPONDING':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/30';

      case 'RESOLVED':
        return 'bg-green-500/10 text-green-300 border-green-500/30';

      case 'ESCALATED':
        return 'bg-red-500/10 text-red-300 border-red-500/30';

      case 'VERIFIED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

      case 'SUSPICIOUS':
        return 'bg-red-500/10 text-red-300 border-red-500/30';

      case 'VERIFICATION_REQUIRED':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';

      default:
        return 'bg-navy-800 text-secondary-400 border-navy-700';
    }
  }

  function getResponderForIncident(
    incident: Incident,
  ) {
    if (!incident.assignedResponderId) {
      return undefined;
    }

    return ambulanceResponders.find(
      (responder) =>
        responder.id ===
        incident.assignedResponderId,
    );
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-navy-700 bg-gradient-to-br from-navy-900 via-navy-950 to-black p-5 sm:p-7">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-secondary-400 transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                  <Ambulance className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    AlertX Medical Network
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    Ambulance Command Centre
                  </h1>
                </div>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary-400">
                Monitor medical emergencies, coordinate ambulance
                responders and track emergency response activity
                from a single command centre.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />

              <span className="text-sm font-semibold text-green-300">
                Command Centre Online
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active Emergencies"
          value={activeIncidents.length}
          icon={ShieldAlert}
          accent="text-red-400"
        />

        <StatCard
          label="Critical"
          value={criticalIncidents.length}
          icon={Siren}
          accent="text-orange-400"
        />

        <StatCard
          label="Ambulances Available"
          value={availableAmbulances.length}
          icon={Ambulance}
          accent="text-green-400"
        />

        <StatCard
          label="Responding"
          value={respondingIncidents.length}
          icon={Navigation}
          accent="text-blue-400"
        />
      </section>

      {/* =====================================================
          LIVE STATUS
      ===================================================== */}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />

              <h2 className="font-bold text-white">
                System Status
              </h2>
            </div>

            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-green-300">
              Live
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <StatusRow
              label="Emergency Network"
              value="Operational"
              online
            />

            <StatusRow
              label="Ambulance Dispatch"
              value="Operational"
              online
            />

            <StatusRow
              label="Location Services"
              value="Operational"
              online
            />

            <StatusRow
              label="AI Analysis"
              value="Operational"
              online
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Ambulance className="h-5 w-5 text-red-400" />

            <h2 className="font-bold text-white">
              Ambulance Fleet
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {ambulanceResponders.length === 0 ? (
              <EmptyState
                icon={Ambulance}
                text="No ambulance units registered."
              />
            ) : (
              ambulanceResponders
                .slice(0, 4)
                .map((responder) => (
                  <div
                    key={responder.id}
                    className="flex items-center justify-between rounded-xl border border-navy-700 bg-navy-900/60 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800">
                        <Ambulance className="h-4 w-4 text-red-400" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {responder.name}
                        </p>

                        <p className="text-[11px] text-secondary-500">
                          {responder.location}
                        </p>
                      </div>
                    </div>

                    <ResponderStatus
                      status={responder.status}
                    />
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-accent-400" />

            <h2 className="font-bold text-white">
              Response Overview
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            <Metric
              label="New emergencies"
              value={
                activeIncidents.filter(
                  (incident) =>
                    incident.status === 'NEW',
                ).length
              }
            />

            <Metric
              label="Assigned"
              value={
                activeIncidents.filter(
                  (incident) =>
                    incident.status === 'ASSIGNED',
                ).length
              }
            />

            <Metric
              label="Responding"
              value={respondingIncidents.length}
            />

            <Metric
              label="Resolved"
              value={
                incidents.filter(
                  (incident) =>
                    incident.status === 'RESOLVED',
                ).length
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          MAP / LOCATION AREA
      ===================================================== */}

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-navy-700 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-400" />

              <h2 className="font-bold text-white">
                Emergency Response Map
              </h2>
            </div>

            <p className="mt-1 text-xs text-secondary-500">
              Active emergency locations and ambulance units.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-xs text-secondary-400">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {activeIncidents.length} active
          </span>
        </div>

        <div className="relative h-[320px] overflow-hidden bg-[#07111f]">
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(47,128,237,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(47,128,237,0.12) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Radar rings */}
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/10" />

          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/10" />

          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/10" />

          {/* Emergency markers */}
          {activeIncidents
            .filter(
              (incident) =>
                incident.coords,
            )
            .slice(0, 8)
            .map((incident, index) => {
              const positions = [
                { left: '22%', top: '32%' },
                { left: '67%', top: '25%' },
                { left: '75%', top: '63%' },
                { left: '37%', top: '68%' },
                { left: '52%', top: '43%' },
                { left: '18%', top: '70%' },
                { left: '83%', top: '42%' },
                { left: '46%', top: '20%' },
              ];

              const position =
                positions[
                  index %
                    positions.length
                ];

              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() =>
                    onViewIncident?.(
                      incident.id,
                    )
                  }
                  className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={position}
                  title={incident.location}
                >
                  <span className="absolute -inset-2 animate-ping rounded-full bg-red-500/20" />

                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-red-400/50 bg-red-500/20 text-red-300 shadow-lg shadow-red-500/20">
                    <Siren className="h-4 w-4" />
                  </span>

                  <span className="absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-navy-700 bg-navy-950 px-2 py-1 text-[9px] text-white group-hover:block">
                    {incident.type}
                  </span>
                </button>
              );
            })}

          {/* Ambulance markers */}
          {ambulanceResponders
            .filter(
              (responder) =>
                responder.status !==
                'Offline',
            )
            .slice(0, 6)
            .map((responder, index) => {
              const positions = [
                { left: '30%', top: '25%' },
                { left: '72%', top: '75%' },
                { left: '60%', top: '58%' },
                { left: '25%', top: '55%' },
                { left: '82%', top: '30%' },
                { left: '45%', top: '80%' },
              ];

              const position =
                positions[
                  index %
                    positions.length
                ];

              return (
                <div
                  key={responder.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={position}
                  title={responder.name}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-300">
                    <Ambulance className="h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}

          {/* Centre */}
          <div className="absolute bottom-4 left-4 rounded-xl border border-navy-700 bg-navy-950/90 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-400" />

              <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary-400">
                Command Centre
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 flex gap-2 rounded-xl border border-navy-700 bg-navy-950/90 p-2 backdrop-blur">
            <LegendItem
              color="bg-red-400"
              label="Emergency"
            />

            <LegendItem
              color="bg-blue-400"
              label="Ambulance"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          ACTIVE EMERGENCIES
      ===================================================== */}

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Active Medical Emergencies
            </h2>

            <p className="mt-1 text-sm text-secondary-500">
              Prioritize and coordinate active ambulance
              responses.
            </p>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
            {activeIncidents.length} incidents
          </span>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <h3 className="mt-4 font-bold text-white">
              No active emergencies
            </h3>

            <p className="mt-1 max-w-sm text-sm text-secondary-500">
              The ambulance network currently has no active
              medical emergencies requiring coordination.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeIncidents.map(
              (incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  responder={getResponderForIncident(
                    incident,
                  )}
                  onView={() =>
                    onViewIncident?.(
                      incident.id,
                    )
                  }
                  onAccept={() =>
                    onAcceptIncident?.(
                      incident.id,
                    )
                  }
                  onRespond={() =>
                    onMarkResponding?.(
                      incident.id,
                    )
                  }
                  onResolve={() =>
                    onResolveIncident?.(
                      incident.id,
                    )
                  }
                  severityClass={getSeverityClass(
                    incident.severity,
                  )}
                  statusClass={getStatusClass(
                    incident.status,
                  )}
                  formatTime={
                    formatTime
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-500 sm:text-xs">
          {label}
        </span>

        <Icon
          className={`h-4 w-4 ${accent}`}
        />
      </div>

      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS ROW
========================================================= */

function StatusRow({
  label,
  value,
  online,
}: {
  label: string;
  value: string;
  online?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-navy-900/60 px-3 py-2.5">
      <span className="text-xs text-secondary-400">
        {label}
      </span>

      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online
              ? 'bg-green-400'
              : 'bg-red-400'
          }`}
        />

        <span className="text-xs font-semibold text-secondary-300">
          {value}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   METRIC
========================================================= */

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-navy-800 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-secondary-400">
        {label}
      </span>

      <span className="font-bold text-white">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   RESPONDER STATUS
========================================================= */

function ResponderStatus({
  status,
}: {
  status: Responder['status'];
}) {
  const classes =
    status === 'Available'
      ? 'bg-green-500/10 text-green-300 border-green-500/20'
      : status === 'Responding'
        ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
        : status === 'Busy'
          ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
          : 'bg-navy-800 text-secondary-500 border-navy-700';

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${classes}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   INCIDENT CARD
========================================================= */

function IncidentCard({
  incident,
  responder,
  onView,
  onAccept,
  onRespond,
  onResolve,
  severityClass,
  statusClass,
  formatTime,
}: {
  incident: Incident;
  responder?: Responder;
  onView: () => void;
  onAccept: () => void;
  onRespond: () => void;
  onResolve: () => void;
  severityClass: string;
  statusClass: string;
  formatTime: (
    timestamp: number,
  ) => string;
}) {
  return (
    <div
      className={`card overflow-hidden ${
        incident.severity ===
        'CRITICAL'
          ? 'border-red-500/30'
          : ''
      }`}
    >
      {/* Top */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${severityClass}`}
            >
              {incident.severity}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass}`}
            >
              {incident.status}
            </span>

            {incident.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">
                <Zap className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-bold text-white">
            {incident.type}
          </h3>

          <p className="mt-1 text-sm text-secondary-400">
            {incident.description ||
              'Emergency reported through AlertX.'}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <InfoItem
              icon={User}
              label="Reporter"
              value={
                incident.name ||
                'Unknown'
              }
            />

            <InfoItem
              icon={Clock3}
              label="Reported"
              value={formatTime(
                incident.createdAt,
              )}
            />

            <InfoItem
              icon={MapPin}
              label="Location"
              value={
                incident.location ||
                'Location unavailable'
              }
            />

            <InfoItem
              icon={Phone}
              label="Contact"
              value={
                incident.phone ||
                'Not available'
              }
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
          <button
            type="button"
            onClick={onView}
            className="rounded-xl border border-navy-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-secondary-300 transition hover:border-accent-500 hover:text-white"
          >
            View details
          </button>

          {incident.coords && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${incident.coords.lat},${incident.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-navy-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-secondary-300 transition hover:border-accent-500 hover:text-white"
            >
              <Navigation className="h-3.5 w-3.5" />
              Map
            </a>
          )}
        </div>
      </div>

      {/* Assigned responder */}
      {responder && (
        <div className="border-t border-navy-800 bg-navy-900/40 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Ambulance className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  {responder.name}
                </p>

                <p className="text-[10px] text-secondary-500">
                  {responder.location}
                </p>
              </div>
            </div>

            <ResponderStatus
              status={responder.status}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-navy-800 p-4 sm:p-5">
        {incident.status ===
          'NEW' && (
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-500"
          >
            <Ambulance className="h-4 w-4" />
            Dispatch Ambulance
          </button>
        )}

        {incident.status ===
          'ASSIGNED' && (
          <button
            type="button"
            onClick={onRespond}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-orange-500"
          >
            <Navigation className="h-4 w-4" />
            Start Response
          </button>
        )}

        {incident.status ===
          'RESPONDING' && (
          <button
            type="button"
            onClick={onResolve}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-green-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Resolved
          </button>
        )}

        {incident.status ===
          'ESCALATED' && (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300"
          >
            <ShieldAlert className="h-4 w-4" />
            Review Escalation
          </button>
        )}

        {incident.status ===
          'SUSPICIOUS' && (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-bold text-yellow-300"
          >
            <XCircle className="h-4 w-4" />
            Review Incident
          </button>
        )}

        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-900 px-4 py-2.5 text-xs font-semibold text-secondary-300 transition hover:text-white"
        >
          <Users className="h-4 w-4" />
          Incident timeline
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg bg-navy-900/50 p-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary-500" />

      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-secondary-600">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs text-secondary-300">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${color}`}
      />

      <span className="text-[9px] text-secondary-400">
        {label}
      </span>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof Activity;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="h-7 w-7 text-secondary-600" />

      <p className="mt-2 text-xs text-secondary-500">
        {text}
      </p>
    </div>
  );
}

export default AmbulanceCommandCentre;