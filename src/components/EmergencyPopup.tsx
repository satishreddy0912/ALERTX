import { useEffect, useState } from 'react';
import { Siren, MapPin, X, Eye, Check, Lock, ShieldCheck } from 'lucide-react';
import type { Incident, IncidentSource } from '@/types';
import { SeverityBadge, PriorityScore, CredibilityBadge } from '@/components/Badges';

interface Props {
  incident: Incident | null;
  isAuthenticated: boolean;
  onAccept: (id: string) => void;
  onView: (id: string) => void;
  onDismiss: () => void;
}

const SOURCE_LABELS: Record<IncidentSource, string> = {
  user_report: 'USER REPORT',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

export function EmergencyPopup({ incident, isAuthenticated, onAccept, onView, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (incident) {
      setVisible(true);
    }
  }, [incident]);

  if (!incident || !visible) return null;

  function handleAccept() {
    if (!isAuthenticated) return;
    onAccept(incident!.id);
    setVisible(false);
  }
  function handleView() {
    onView(incident!.id);
    setVisible(false);
  }
  function handleDismiss() {
    onDismiss();
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-end sm:justify-end sm:p-6 md:items-start md:top-20">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={handleDismiss} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emergency-500/40 bg-navy-800 shadow-2xl shadow-navy-950/30 animate-pop-in sm:max-w-xs">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-accent-600 to-accent-800 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <Siren className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-wide">New Emergency</span>
          </div>
          <button onClick={handleDismiss} className="rounded-lg p-1 text-white/80 hover:bg-white/20" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-white">{incident.type}</span>
            <SeverityBadge severity={incident.severity} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-navy-800 px-3 py-2">
              <span className="text-xs text-secondary-400">Priority</span>
              <PriorityScore score={incident.priority} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-navy-800 px-3 py-2">
              <span className="text-xs text-secondary-400">Credibility</span>
              <CredibilityBadge level={incident.credibility.level} score={incident.credibility.score} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-navy-800 px-3 py-2">
            <span className="text-xs text-secondary-400">Detection</span>
            <span className={`badge ${
              incident.emergencyDetection === 'EMERGENCY DETECTED'
                ? 'bg-emergency-600/20 text-emergency-300 border border-emergency-500/40'
                : incident.emergencyDetection === 'NO CLEAR EMERGENCY'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>{incident.emergencyDetection}</span>
          </div>

          <div className="flex items-start gap-2 text-sm text-secondary-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary-400" />
            <span className="break-words">{incident.location || 'Location not provided'}</span>
          </div>

          <p className="rounded-lg border border-navy-700 bg-navy-800 p-3 text-sm leading-relaxed text-secondary-400">
            {incident.aiSummary}
          </p>

          <div className="flex items-center justify-between text-xs text-secondary-400">
            <span>{incident.id}</span>
            <span className="badge bg-white/5 text-secondary-400 border border-navy-700">{SOURCE_LABELS[incident.source]}</span>
          </div>

          {incident.assignedByAdminId && (
            <div className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs text-secondary-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Assigned by {incident.assignedByAdminId}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            {isAuthenticated ? (
              <button onClick={handleAccept} className="btn-danger w-full py-3 text-sm">
                <Check className="h-4 w-4" /> Accept
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-navy-700 bg-navy-800 py-3 text-xs text-secondary-400">
                <Lock className="h-3.5 w-3.5" /> Login required to accept
              </div>
            )}
            <button onClick={handleView} className="btn-ghost w-full py-3 text-sm">
              <Eye className="h-4 w-4" /> View Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
