import type { Severity, IncidentStatus, ResponderStatus, CredibilityLevel } from '@/types';

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  HIGH: 'bg-navy-900 text-secondary-400 border border-navy-600',
  CRITICAL: 'bg-emergency-600/20 text-emergency-400 border border-emergency-500/40',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${SEVERITY_STYLES[severity]}`}>{severity}</span>;
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  NEW: 'bg-navy-900 text-secondary-400 border border-navy-600',
  ASSIGNED: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  RESPONDING: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  ESCALATED: 'bg-emergency-600/25 text-emergency-300 border border-emergency-500/50',
  VERIFICATION_REQUIRED: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
  VERIFIED: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  SUSPICIOUS: 'bg-amber-600/15 text-amber-400 border border-amber-600/40',
};

const STATUS_DOT: Record<IncidentStatus, string> = {
  NEW: 'bg-accent-400',
  ASSIGNED: 'bg-sky-400',
  RESPONDING: 'bg-indigo-400',
  RESOLVED: 'bg-emerald-400',
  ESCALATED: 'bg-emergency-500',
  VERIFICATION_REQUIRED: 'bg-amber-400',
  VERIFIED: 'bg-emerald-400',
  SUSPICIOUS: 'bg-amber-500',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]} ${status === 'ESCALATED' ? 'animate-pulse' : ''}`} />
      {status === 'VERIFICATION_REQUIRED' ? 'VERIFY' : status}
    </span>
  );
}

const CREDIBILITY_STYLES: Record<CredibilityLevel, string> = {
  'HIGH CREDIBILITY': 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  'MEDIUM CREDIBILITY': 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  'LOW CREDIBILITY': 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  'VERIFICATION REQUIRED': 'bg-emergency-600/20 text-emergency-400 border border-emergency-500/40',
};

export function CredibilityBadge({ level, score }: { level: CredibilityLevel; score?: number }) {
  const short = level === 'VERIFICATION REQUIRED' ? 'VERIFY' : level.replace(' CREDIBILITY', '');
  return (
    <span className={`badge ${CREDIBILITY_STYLES[level]}`}>
      {score !== undefined && <span className="font-mono">{score}%</span>}
      {short}
    </span>
  );
}

const RESPONDER_STATUS_STYLES: Record<ResponderStatus, string> = {
  Available: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  Responding: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  Busy: 'bg-navy-900 text-secondary-400 border border-navy-600',
  Offline: 'bg-slate-500/15 text-secondary-400 border border-slate-500/30',
};

const RESPONDER_DOT: Record<ResponderStatus, string> = {
  Available: 'bg-emerald-400',
  Responding: 'bg-indigo-400',
  Busy: 'bg-navy-8000',
  Offline: 'bg-slate-500',
};

export function ResponderStatusBadge({ status }: { status: ResponderStatus }) {
  return (
    <span className={`badge ${RESPONDER_STATUS_STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${RESPONDER_DOT[status]} ${status === 'Available' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

export function PriorityScore({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emergency-400' : score >= 60 ? 'text-secondary-400' : score >= 35 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <span className={`text-sm font-bold ${color}`}>{score}<span className="text-secondary-400">/100</span></span>
  );
}
