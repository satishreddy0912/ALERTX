import { Users, MapPin, Siren, Search } from 'lucide-react';
import { useState } from 'react';
import type { Responder, ResponderType } from '@/types';
import { ResponderStatusBadge } from '@/components/Badges';

interface Props {
  responders: Responder[];
  onViewIncident: (id: string) => void;
}

const TYPE_FILTERS: (ResponderType | 'ALL')[] = ['ALL', 'Medical Response', 'Fire & Rescue', 'Urban Rescue', 'Traffic Response'];

export function RespondersPage({ responders, onViewIncident }: Props) {
  const [filter, setFilter] = useState<ResponderType | 'ALL'>('ALL');

  const filtered = responders.filter((r) => filter === 'ALL' || r.type === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Users className="h-6 w-6 text-secondary-400" /> Responders
        </h1>
        <p className="mt-1 text-sm text-secondary-400">All emergency response units and their current status.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-navy-700 text-white' : 'bg-white/5 text-secondary-400 hover:bg-navy-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{r.name}</div>
                <div className="text-xs text-secondary-400">{r.type}</div>
              </div>
              <ResponderStatusBadge status={r.status} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary-400" />
              <span className="truncate">{r.location}</span>
            </div>
            {r.assignedIncidentId && (
              <button
                onClick={() => r.assignedIncidentId && onViewIncident(r.assignedIncidentId)}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs text-secondary-400 hover:bg-navy-800"
              >
                <Siren className="h-3.5 w-3.5 shrink-0 text-emergency-400" />
                Assigned: <span className="font-semibold text-secondary-400">{r.assignedIncidentId}</span>
                <Search className="ml-auto h-3.5 w-3.5 text-secondary-400" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
