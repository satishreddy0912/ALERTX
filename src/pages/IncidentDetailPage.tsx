import { ArrowLeft, Siren, MapPin, Clock, User, Phone, Brain, ShieldAlert, CheckCircle2, Activity, FileText, Ambulance, Heart, AlertTriangle, XCircle, Navigation } from 'lucide-react';
import type { Incident, Responder, IncidentSource } from '@/types';
import { SeverityBadge, StatusBadge, PriorityScore } from '@/components/Badges';
import { AuditTrail } from '@/components/Timeline';
import { MapPlaceholder } from '@/components/MapPlaceholder';
import { formatTime, formatRelative } from '@/lib/format';

const SOURCE_LABELS: Record<IncidentSource, string> = {
  user_report: 'USER REPORTED',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

interface Props {
  incident: Incident | undefined;
  responders: Responder[];
  isAuthenticated: boolean;
  session: { id: string; name: string; unit: string } | null;
  onBack: () => void;
  onAssign: (id: string) => void;
  onMarkResponding: (id: string) => void;
  onResolve: (id: string) => void;
  onReject: (id: string) => void;
  onMarkSafe: (id: string) => void;
  onGoLogin: () => void;
}

export function IncidentDetailPage({
  incident,
  responders,
  isAuthenticated,
  onBack,
  onAssign,
  onMarkResponding,
  onResolve,
  onReject,
  onMarkSafe,
  onGoLogin,
}: Props) {
  if (!incident) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-secondary-400">Incident not found.</p>
        <button onClick={onBack} className="btn-ghost mt-4 px-4 py-2 text-sm">Go back</button>
      </div>
    );
  }

  const assignedResponder = responders.find((r) => r.id === incident.assignedResponderId) || null;
  const availableResponders = responders.filter((r) => r.status === 'Available');
  const nearestAvailable = availableResponders[0] || null;

  // Fake distance for the prototype
  const distance = nearestAvailable ? (1 + Math.abs((nearestAvailable.id.charCodeAt(1) || 1) % 5) + Math.random() * 1.5).toFixed(1) : null;

  const canAct = isAuthenticated;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-secondary-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-accent-600 to-accent-800 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-emergency-400" />
            <span className="font-mono text-sm font-bold text-secondary-400">{incident.id}</span>
            <span className="badge bg-white/5 text-secondary-400 border border-navy-700">{SOURCE_LABELS[incident.source]}</span>
          </div>
          <StatusBadge status={incident.status} />
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white">{incident.type}</h1>
            <SeverityBadge severity={incident.severity} />
            {incident.escalated && (
              <span className="badge bg-emergency-600/25 text-emergency-300 border border-emergency-500/50">
                <AlertTriangle className="h-3 w-3" /> ESCALATED
              </span>
            )}
            {incident.reporterSafe && (
              <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Heart className="h-3 w-3" /> REPORTER SAFE
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatRelative(incident.createdAt)}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <span className="truncate">{incident.location}</span></span>
            <span className="flex items-center gap-1">Priority <PriorityScore score={incident.priority} /></span>
          </div>
        </div>
      </div>

      {/* Image */}
      {incident.imageData && (
        <div className="card overflow-hidden">
          <img src={incident.imageData} alt="Incident" className="h-56 w-full object-cover sm:h-72" />
        </div>
      )}

      {/* Reporter info */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary-400">Reporter</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={User} label="Name" value={incident.name || 'Anonymous'} />
          <InfoRow icon={Phone} label="Phone" value={incident.phone || 'Not provided'} />
        </div>
      </div>

      {/* Description */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <FileText className="h-4 w-4" /> Description
        </h2>
        <p className="text-sm leading-relaxed text-secondary-400">
          {incident.description || 'No description provided'}
        </p>
      </div>

      {/* AI Analysis */}
      <div className="card border-navy-700 bg-gradient-to-br from-navy-900 to-navy-950 p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <Brain className="h-4 w-4" /> AI Analysis
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info label="Severity" value={incident.severity} />
          <Info label="Priority" value={`${incident.priority}/100`} />
          <Info label="Credibility" value={`${incident.credibility.score}%`} />
          <Info label="Confidence" value={`${incident.confidence}%`} />
          <Info label="Detection" value={incident.emergencyDetection} />
          <Info label="Recommended" value={incident.recommendedResponse} />
        </div>
        <div className="mt-3 rounded-lg border border-navy-700 bg-navy-950/50 p-3 text-sm leading-relaxed text-secondary-400">
          {incident.aiSummary}
        </div>
        <div className="mt-2 rounded-lg border border-navy-700 bg-navy-950/50 p-3 text-sm text-secondary-400">
          <div className="mb-1 text-xs uppercase tracking-wider text-secondary-400">Reason</div>
          {incident.reason}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {incident.credibility.reasons.map((r, i) => (
            <span key={i} className="rounded-lg border border-navy-700 bg-navy-800 px-2.5 py-1 text-[11px] text-secondary-400">{r}</span>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-navy-900 p-3 text-sm text-secondary-400">
          <Ambulance className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-semibold">Recommended response:</span> {incident.recommendedResponse}</span>
        </div>
        {incident.sensorConfidence !== undefined && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy-800 p-3 text-sm text-secondary-400">
            <Activity className="h-4 w-4 shrink-0 text-secondary-400" />
            <span>Sensor confidence: <span className="font-mono font-semibold text-secondary-400">{Math.round(incident.sensorConfidence * 100)}%</span> · {incident.sensorEventType?.replace('POSSIBLE_', 'Possible ') || 'Unknown event'}</span>
          </div>
        )}
      </div>

      {/* Response Intelligence */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <Navigation className="h-4 w-4 text-secondary-400" /> Response Intelligence
        </h2>
        <div className="space-y-2.5">
          <Row label="Source" value={SOURCE_LABELS[incident.source]} />
          <Row label="Emergency Detection" value={incident.emergencyDetection} />
          <Row label="Severity" value={incident.severity} />
          <Row label="Confidence" value={`${incident.confidence}%`} />
          <Row label="Credibility" value={`${incident.credibility.score}% — ${incident.credibility.level.replace(' CREDIBILITY', '')}`} />
          <Row label="Priority" value={`${incident.priority}/100`} />
          <Row label="Recommended Response" value={incident.recommendedResponse} />
          <Row
            label="Nearest Available Unit"
            value={nearestAvailable ? `${nearestAvailable.type} — ${distance} km` : 'None available'}
          />
        </div>
      </div>

      {/* Map */}
      <MapPlaceholder location={incident.location} coords={incident.coords} />

      {/* Assigned responder */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <ShieldAlert className="h-4 w-4" /> Assigned Responder
        </h2>
        {assignedResponder ? (
          <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
            <div className="text-sm font-bold text-white">{assignedResponder.name}</div>
            <div className="text-xs text-secondary-400">{assignedResponder.type}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-secondary-400">
              <MapPin className="h-3.5 w-3.5" /> {assignedResponder.location}
            </div>
            {incident.assignedByAdminId && (
              <div className="mt-1 text-xs text-secondary-400">Assigned by {incident.assignedByAdminId} · {incident.assignedByAdminName || ''}</div>
            )}
            {incident.acceptedBy && (
              <div className="mt-1 text-xs text-emerald-400">Accepted by {incident.acceptedBy} · {incident.acceptedByName || ''}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-secondary-400">No responder assigned yet.</p>
        )}
      </div>

      {/* Audit Trail */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <Activity className="h-4 w-4" /> Incident Audit Trail
        </h2>
        <AuditTrail entries={incident.audit} />
      </div>

      {/* Auth notice */}
      {!isAuthenticated && incident.status !== 'RESOLVED' && (
        <div className="card border-navy-600 bg-navy-800 p-4 text-center">
          <p className="text-sm text-secondary-400">Responder access requires authentication.</p>
          <button onClick={onGoLogin} className="btn-primary mt-3 px-5 py-2.5 text-sm">
            Login as Responder
          </button>
        </div>
      )}

      {/* Actions */}
      {incident.status !== 'RESOLVED' && (
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary-400">Actions</h2>
          <div className="flex flex-col gap-2.5">
            {(incident.status === 'NEW' || incident.status === 'ESCALATED' || incident.status === 'VERIFICATION_REQUIRED') && (
              canAct ? (
                <button
                  onClick={() => onAssign(incident.id)}
                  disabled={availableResponders.length === 0}
                  className="btn-primary w-full py-3 text-sm"
                >
                  <ShieldAlert className="h-4 w-4" /> Assign Responder {availableResponders.length === 0 ? '(None available)' : ''}
                </button>
              ) : (
                <button onClick={onGoLogin} className="btn-ghost w-full py-3 text-sm">
                  Login to Assign
                </button>
              )
            )}
            {(incident.status === 'ASSIGNED' || incident.status === 'NEW' || incident.status === 'ESCALATED') && canAct && (
              <button
                onClick={() => onMarkResponding(incident.id)}
                disabled={!incident.assignedResponderId}
                className="btn-ghost w-full py-3 text-sm"
              >
                <Activity className="h-4 w-4" /> Mark Responding
              </button>
            )}
            {canAct && (
              <button
                onClick={() => onResolve(incident.id)}
                disabled={incident.status === 'NEW' || incident.status === 'ESCALATED' || incident.status === 'VERIFICATION_REQUIRED'}
                className="btn w-full bg-emerald-600 py-3 text-sm text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Resolved
              </button>
            )}
            {incident.status === 'VERIFICATION_REQUIRED' && canAct && (
              <button
                onClick={() => onReject(incident.id)}
                className="btn w-full bg-emergency-700 py-3 text-sm text-white hover:bg-emergency-800"
              >
                <XCircle className="h-4 w-4" /> Reject / Close as False Report
              </button>
            )}
            {!incident.reporterSafe && (
              <button
                onClick={() => onMarkSafe(incident.id)}
                className="btn w-full border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm text-emerald-300 hover:bg-emerald-500/20"
              >
                <Heart className="h-4 w-4" /> I'm Safe
              </button>
            )}
            {incident.reporterSafe && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-semibold text-emerald-300">
                <Heart className="mr-1 inline h-4 w-4" /> Reporter marked themselves SAFE
              </div>
            )}
          </div>
        </div>
      )}

      {incident.status === 'RESOLVED' && (
        <div className="card p-4 text-center">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-semibold text-emerald-300">
            This incident has been resolved.
          </div>
        </div>
      )}

      <div className="text-center text-xs text-secondary-400">
        Reported at {formatTime(incident.createdAt)} · Source: {SOURCE_LABELS[incident.source]}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-secondary-400" />
      <div className="min-w-0">
        <div className="text-xs text-secondary-400">{label}</div>
        <div className="truncate text-sm text-secondary-400">{value}</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
      <div className="text-xs uppercase tracking-wider text-secondary-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy-700 pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs text-secondary-400">{label}</span>
      <span className="text-right text-sm font-semibold text-secondary-400">{value}</span>
    </div>
  );
}
