import { useState } from 'react';
import { AlertTriangle, Search, Siren, MapPin, Clock, Eye, Heart } from 'lucide-react';
import type { Incident, IncidentStatus } from '@/types';
import { SeverityBadge, StatusBadge, PriorityScore, CredibilityBadge } from '@/components/Badges';
import { formatRelative } from '@/lib/format';

interface Props {
  incidents: Incident[];
  onView: (id: string) => void;
}

const FILTERS: (IncidentStatus | 'ALL')[] = ['ALL', 'NEW', 'VERIFIED', 'ASSIGNED', 'RESPONDING', 'ESCALATED', 'VERIFICATION_REQUIRED', 'SUSPICIOUS', 'RESOLVED'];

export function IncidentsPage({ incidents, onView }: Props) {
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const filtered = incidents.filter((i) => {
    if (filter !== 'ALL' && i.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        i.id.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <AlertTriangle className="h-6 w-6 text-secondary-400" /> Incidents
        </h1>
        <p className="mt-1 text-sm text-secondary-400">All reported and simulated emergencies.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
        <input
          className="input pl-10"
          placeholder="Search by ID, type, location or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-navy-700 text-white' : 'bg-white/5 text-secondary-400 hover:bg-navy-900'
            }`}
          >
            {f === 'VERIFICATION_REQUIRED' ? 'VERIFY' : f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-secondary-400">No incidents match your filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <button
              key={inc.id}
              onClick={() => onView(inc.id)}
              className="card block w-full p-4 text-left transition hover:border-accent-500 hover:bg-navy-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {inc.imageData ? (
                    <img src={inc.imageData} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-secondary-400">
                      <Siren className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{inc.type}</div>
                    <div className="font-mono text-xs text-secondary-400">{inc.id}</div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={inc.status} />
                  <SeverityBadge severity={inc.severity} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{inc.location}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {formatRelative(inc.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  Priority <PriorityScore score={inc.priority} />
                </span>
                <span className="flex items-center gap-1">
                  <CredibilityBadge level={inc.credibility.level} score={inc.credibility.score} />
                </span>
                {inc.reporterSafe && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Heart className="h-3.5 w-3.5" /> SAFE
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-secondary-400">
                <Eye className="h-3.5 w-3.5" /> View details
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
