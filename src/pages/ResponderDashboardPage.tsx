import { useMemo } from 'react';
import { LayoutDashboard, Siren, MapPin, Clock, Eye, Check, AlertTriangle, ShieldAlert, Heart, Lock, ShieldCheck, Activity } from 'lucide-react';
import type { Incident, Responder, IncidentSource } from '@/types';
import { SeverityBadge, StatusBadge, PriorityScore, ResponderStatusBadge, CredibilityBadge } from '@/components/Badges';
import { formatRelative } from '@/lib/format';

const SOURCE_LABELS: Record<IncidentSource, string> = {
  user_report: 'USER REPORT',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

interface Props {
  incidents: Incident[];
  responders: Responder[];
  isAuthenticated: boolean;
  session: { id: string; name: string; unit: string } | null;
  onAccept: (id: string) => void;
  onView: (id: string) => void;
  onGoLogin: () => void;
}

export function ResponderDashboardPage({ incidents, responders, isAuthenticated, session, onAccept, onView, onGoLogin }: Props) {
  const stats = useMemo(() => {
    const available = responders.filter((r) => r.status === 'Available').length;
    const responding = responders.filter((r) => r.status === 'Responding').length;
    const busy = responders.filter((r) => r.status === 'Busy').length;
    const offline = responders.filter((r) => r.status === 'Offline').length;
    return { available, responding, busy, offline };
  }, [responders]);

  const activeIncidents = useMemo(() => {
    const weight = (i: Incident) => {
      let w = i.priority;
      if (i.status === 'ESCALATED') w += 200;
      if (i.status === 'VERIFICATION_REQUIRED') w += 50;
      return w;
    };
    return incidents.filter((i) => i.status !== 'RESOLVED').sort((a, b) => weight(b) - weight(a));
  }, [incidents]);

  const escalatedCount = activeIncidents.filter((i) => i.status === 'ESCALATED').length;
  const verificationCount = activeIncidents.filter((i) => i.status === 'VERIFICATION_REQUIRED').length;
  const safeCount = activeIncidents.filter((i) => i.reporterSafe).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <LayoutDashboard className="h-6 w-6 text-secondary-400" /> Responder Dashboard
        </h1>
        <p className="mt-1 text-sm text-secondary-400">Live coordination view of responders and active incidents.</p>
        {session && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <ShieldAlert className="h-3.5 w-3.5" /> Signed in: <span className="font-semibold">{session.name}</span> · {session.id}
          </div>
        )}
      </div>

      {/* Alerts */}
      {escalatedCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emergency-500/40 bg-emergency-600/15 px-4 py-3 text-sm font-semibold text-emergency-300 animate-pulse-ring">
          <AlertTriangle className="h-5 w-5" /> {escalatedCount} escalated incident{escalatedCount > 1 ? 's' : ''} need attention!
        </div>
      )}
      {verificationCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
          <AlertTriangle className="h-5 w-5" /> {verificationCount} report{verificationCount > 1 ? 's' : ''} flagged for verification.
        </div>
      )}
      {safeCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          <Heart className="h-5 w-5" /> Reporter marked themselves SAFE on {safeCount} active incident{safeCount > 1 ? 's' : ''}.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Available" value={stats.available} dot="bg-emerald-400" />
        <StatCard label="Responding" value={stats.responding} dot="bg-indigo-400" />
        <StatCard label="Busy" value={stats.busy} dot="bg-navy-8000" />
        <StatCard label="Offline" value={stats.offline} dot="bg-slate-500" />
      </div>

      {/* Responders */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Responder Units</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {responders.map((r) => (
            <ResponderCard key={r.id} responder={r} />
          ))}
        </div>
      </section>

      {/* Incident queue */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Active Incident Queue</h2>
        {activeIncidents.length === 0 ? (
          <div className="card p-8 text-center text-sm text-secondary-400">No active incidents. All clear.</div>
        ) : (
          <div className="space-y-3">
            {activeIncidents.map((inc) => (
              <IncidentQueueCard
                key={inc.id}
                incident={inc}
                isAuthenticated={isAuthenticated}
                onAccept={onAccept}
                onView={onView}
                onGoLogin={onGoLogin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-secondary-400">{label}</span>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function ResponderCard({ responder }: { responder: Responder }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{responder.name}</div>
          <div className="text-xs text-secondary-400">{responder.type}</div>
        </div>
        <ResponderStatusBadge status={responder.status} />
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-400">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary-400" />
        <span className="truncate">{responder.location}</span>
      </div>
      {responder.assignedIncidentId && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs text-secondary-400">
          <Siren className="h-3.5 w-3.5 shrink-0 text-emergency-400" />
          Assigned: <span className="font-semibold text-secondary-400">{responder.assignedIncidentId}</span>
        </div>
      )}
    </div>
  );
}

function IncidentQueueCard({ incident, isAuthenticated, onAccept, onView, onGoLogin }: {
  incident: Incident;
  isAuthenticated: boolean;
  onAccept: (id: string) => void;
  onView: (id: string) => void;
  onGoLogin: () => void;
}) {
  const isEscalated = incident.status === 'ESCALATED';
  const isVerify = incident.status === 'VERIFICATION_REQUIRED';
  return (
    <div className={`card overflow-hidden ${isEscalated ? 'border-emergency-500/50 ring-1 ring-emergency-500/30' : ''} ${isVerify ? 'border-amber-500/40' : ''}`}>
      {isEscalated && (
        <div className="flex items-center gap-2 bg-emergency-700/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emergency-300">
          <AlertTriangle className="h-4 w-4 animate-pulse" /> Emergency Escalated — no responder accepted in time
        </div>
      )}
      {isVerify && (
        <div className="flex items-center gap-2 bg-amber-600/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Verification Required — low credibility
        </div>
      )}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        {/* Thumbnail */}
        <div className="shrink-0 sm:w-28">
          {incident.imageData ? (
            <img src={incident.imageData} alt="Incident" className="h-20 w-full rounded-lg object-cover sm:h-20" />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-navy-800 text-secondary-400">
              <Siren className="h-7 w-7" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-white">{incident.type}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">
            <span className="flex items-center gap-1">
              <span className="font-mono font-semibold text-secondary-400">{incident.id}</span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> {SOURCE_LABELS[incident.source]}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{incident.location}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatRelative(incident.createdAt)}
            </span>
          </div>
          {incident.assignedByAdminId && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-2.5 py-1 text-xs text-secondary-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Assigned by {incident.assignedByAdminId}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-secondary-400">Priority:</span>
              <PriorityScore score={incident.priority} />
            </span>
            <span className="flex items-center gap-1">
              <span className="text-secondary-400">Credibility:</span>
              <CredibilityBadge level={incident.credibility.level} score={incident.credibility.score} />
            </span>
            <span className="flex items-center gap-1">
              <span className="text-secondary-400">Detection:</span>
              <span className={`badge ${
                incident.emergencyDetection === 'EMERGENCY DETECTED'
                  ? 'bg-emergency-600/20 text-emergency-300 border border-emergency-500/40'
                  : incident.emergencyDetection === 'NO CLEAR EMERGENCY'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>{incident.emergencyDetection}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-secondary-400">Confidence:</span>
              <span className="font-mono font-semibold text-secondary-400">{incident.confidence}%</span>
            </span>
          </div>
          {incident.reporterSafe && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <Heart className="h-3.5 w-3.5" /> Reporter marked themselves SAFE
            </div>
          )}
          <p className="mt-2 rounded-lg border border-navy-700 bg-navy-800 p-2.5 text-xs leading-relaxed text-secondary-400">
            {incident.aiSummary}
          </p>

          {/* Actions */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {(incident.status === 'NEW' || incident.status === 'ESCALATED' || incident.status === 'VERIFICATION_REQUIRED') && (
              isAuthenticated ? (
                <button onClick={() => onAccept(incident.id)} className="btn-danger flex-1 py-2.5 text-sm">
                  <Check className="h-4 w-4" /> Accept
                </button>
              ) : (
                <button onClick={onGoLogin} className="btn-ghost flex-1 py-2.5 text-sm">
                  <Lock className="h-4 w-4" /> Login to Accept
                </button>
              )
            )}
            <button onClick={() => onView(incident.id)} className="btn-ghost flex-1 py-2.5 text-sm">
              <Eye className="h-4 w-4" /> View Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
