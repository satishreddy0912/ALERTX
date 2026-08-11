import { useState } from 'react';
import { ArrowLeft, Siren, MapPin, Clock, User, Phone, Brain, ShieldCheck, CheckCircle2, Activity, FileText, Ambulance, AlertTriangle, Ban, X, Navigation, Heart, ShieldAlert } from 'lucide-react';
import type { Incident, Responder, IncidentSource } from '@/types';
import { SeverityBadge, StatusBadge, PriorityScore } from '@/components/Badges';
import { AuditTrail } from '@/components/Timeline';
import { MapPlaceholder } from '@/components/MapPlaceholder';
import { formatTime, formatRelative } from '@/lib/format';
import type { AdminSession } from '@/lib/store';

interface Props {
  incident: Incident | undefined;
  responders: Responder[];
  adminSession: AdminSession | null;
  onBack: () => void;
  onVerify: (id: string) => void;
  onAssign: (id: string, responderId: string) => void;
  onEscalate: (id: string) => void;
  onMarkSuspicious: (id: string) => void;
  onClose: (id: string) => void;
}

const SOURCE_LABELS: Record<IncidentSource, string> = {
  user_report: 'USER REPORTED',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

export function AdminIncidentDetailPage({
  incident,
  responders,
  onBack,
  onVerify,
  onAssign,
  onEscalate,
  onMarkSuspicious,
  onClose,
}: Props) {
  const [showAssign, setShowAssign] = useState(false);

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
  const canVerify = incident.status === 'NEW' || incident.status === 'VERIFICATION_REQUIRED';
  const canAssign = incident.status === 'VERIFIED' || incident.status === 'NEW' || incident.status === 'ESCALATED';
  const canEscalate = incident.status !== 'RESOLVED' && incident.status !== 'SUSPICIOUS' && incident.status !== 'ESCALATED';
  const canClose = incident.status !== 'RESOLVED' && incident.status !== 'SUSPICIOUS';
  const canMarkSuspicious = incident.status !== 'RESOLVED' && incident.status !== 'SUSPICIOUS';

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-secondary-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Control Center
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
            {incident.urgent && (
              <span className="badge bg-emergency-600/25 text-emergency-300 border border-emergency-500/50">
                <AlertTriangle className="h-3 w-3" /> URGENT
              </span>
            )}
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
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> <span className="truncate">{incident.location || 'Location unavailable'}</span></span>
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
          {incident.description || 'No description provided.'}
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
        {incident.sensorConfidence !== undefined && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-navy-900 p-3 text-sm text-secondary-400">
            <Activity className="h-4 w-4 shrink-0" />
            <span>Sensor confidence: <span className="font-mono font-semibold">{Math.round(incident.sensorConfidence * 100)}%</span> · {incident.sensorEventType?.replace('POSSIBLE_', 'Possible ') || 'Unknown event'}</span>
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

      {/* Admin Actions */}
      {incident.status !== 'RESOLVED' && incident.status !== 'SUSPICIOUS' && (
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
            <ShieldCheck className="h-4 w-4 text-secondary-400" /> Admin Actions
          </h2>
          <div className="flex flex-col gap-2.5">
            {canVerify && (
              <button onClick={() => onVerify(incident.id)} className="btn w-full bg-emerald-600 py-3 text-sm text-white hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Verify Incident
              </button>
            )}
            {canAssign && (
              <button onClick={() => setShowAssign(true)} className="btn-primary w-full py-3 text-sm">
                <Ambulance className="h-4 w-4" /> Assign Responder
              </button>
            )}
            {canEscalate && (
              <button onClick={() => onEscalate(incident.id)} className="btn w-full bg-emergency-600 py-3 text-sm text-white hover:bg-emergency-700">
                <AlertTriangle className="h-4 w-4" /> Escalate
              </button>
            )}
            {canMarkSuspicious && (
              <button onClick={() => onMarkSuspicious(incident.id)} className="btn w-full bg-amber-600 py-3 text-sm text-white hover:bg-amber-700">
                <Ban className="h-4 w-4" /> Mark Suspicious
              </button>
            )}
            {canClose && (
              <button onClick={() => onClose(incident.id)} className="btn w-full bg-slate-700 py-3 text-sm text-secondary-400 hover:bg-slate-600">
                <X className="h-4 w-4" /> Close Incident
              </button>
            )}
          </div>
        </div>
      )}

      {incident.status === 'SUSPICIOUS' && (
        <div className="card p-4 text-center">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-300">
            This incident has been marked suspicious.
          </div>
        </div>
      )}

      {incident.status === 'RESOLVED' && (
        <div className="card p-4 text-center">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
            This incident has been resolved.
          </div>
        </div>
      )}

      {/* Assignment modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Ambulance className="h-4 w-4 text-secondary-400" /> Assign Responder to {incident.id}
              </h3>
              <button onClick={() => setShowAssign(false)} className="text-secondary-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {availableResponders.length === 0 ? (
                <p className="text-center text-sm text-secondary-400">No available responders.</p>
              ) : (
                availableResponders.map((r) => {
                  const distance = (1 + Math.abs((r.id.charCodeAt(1) || 1) % 5) + Math.random() * 1.5).toFixed(1);
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        onAssign(incident.id, r.id);
                        setShowAssign(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 text-left transition hover:border-accent-500 hover:bg-navy-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">
                          <Ambulance className="h-5 w-5 text-secondary-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{r.id.toUpperCase()}</div>
                          <div className="text-xs text-secondary-400">{r.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-emerald-400">{distance} km</div>
                        <div className="text-[10px] uppercase tracking-wider text-emerald-500">Available</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
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
