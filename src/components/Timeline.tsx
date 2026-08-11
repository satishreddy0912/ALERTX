import { Check } from 'lucide-react';
import type { AuditEntry } from '@/types';
import { formatTime } from '@/lib/format';

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  return (
    <ol className="relative space-y-0">
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-accent-500/60" />
            )}
            <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-accent-500 bg-navy-200">
              <Check className="h-3.5 w-3.5 text-secondary-400" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-sm font-medium text-white">{entry.event}</div>
              <div className="text-xs text-secondary-400">
                {formatTime(entry.timestamp)}
                {entry.responderId && <span className="ml-1 text-secondary-400">· {entry.responderId}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
