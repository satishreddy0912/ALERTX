import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { SensorDetectionResult } from '@/types';

interface Props {
  detection: SensorDetectionResult | null;
  onTimeout: () => void;
  onCancel: () => void;
}

export function SensorAlert({ detection, onTimeout, onCancel }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const firedRef = useRef<boolean>(false);

  // Stable refs so the countdown effect doesn't re-run when parent re-renders
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!detection) {
      setSecondsLeft(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const total = detection.highConfidence ? 5 : 30;
    endTimeRef.current = Date.now() + total * 1000;
    firedRef.current = false;
    setSecondsLeft(total);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onTimeoutRef.current();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [detection]);

  if (!detection) return null;

  const isFast = detection.highConfidence;
  const total = isFast ? 5 : 30;
  const progress = ((total - secondsLeft) / total) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className={`w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl animate-pop-in ${isFast ? 'border-red-500/60' : 'border-amber-500/50'}`}>
        <div className={`flex items-center gap-2 px-4 py-3 ${isFast ? 'bg-red-700' : 'bg-amber-600'}`}>
          {isFast ? (
            <ShieldAlert className="h-6 w-6 animate-pulse text-white" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-white" />
          )}
          <span className="text-sm font-bold uppercase tracking-wide text-white">
            {isFast ? 'High-Confidence Emergency' : 'Possible Accident Detected'}
          </span>
        </div>

        <div className="space-y-4 p-5 bg-[#0D2747]">
          <p className="text-sm leading-relaxed text-[#B8C7D9]">
            {isFast
              ? 'Possible serious accident detected. Emergency will be sent automatically unless you cancel.'
              : 'We detected an unusual impact and movement pattern. Emergency will be sent unless you confirm you are OK.'}
          </p>

          <div className="flex flex-col items-center gap-2">
            <div className={`text-6xl font-bold tabular-nums ${secondsLeft <= 5 ? 'text-red-400' : 'text-amber-400'}`}>
              {secondsLeft}
            </div>
            <div className="text-xs uppercase tracking-wider text-[#B8C7D9]">seconds remaining</div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#071A33]">
              <div
                className={`h-full rounded-full transition-all duration-200 ease-linear ${isFast ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#123E73] bg-[#071A33] p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#B8C7D9]">Detection</span>
              <span className="font-semibold text-white">{detection.eventType.replace('POSSIBLE_', 'Possible ')}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#B8C7D9]">Confidence</span>
              <span className="font-mono font-semibold text-[#2F80ED]">{Math.round(detection.confidence * 100)}%</span>
            </div>
            <div className="mt-2 text-[#B8C7D9]">{detection.reason}</div>
          </div>

          <button
            onClick={onCancel}
            className="btn w-full border border-emerald-500/40 bg-emerald-500/10 py-3.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
          >
            <X className="h-5 w-5" /> I'm OK — Cancel Alert
          </button>
          <p className="text-center text-[11px] text-[#B8C7D9]">
            If you don't respond, an emergency will be sent to the AlertX Emergency Control Center.
          </p>
        </div>
      </div>
    </div>
  );
}
