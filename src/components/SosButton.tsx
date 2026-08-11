import { useEffect, useRef, useState } from 'react';
import { Siren, X } from 'lucide-react';

interface Props {
  onSend: () => void;
  onCancel: () => void;
}

const SOS_COUNTDOWN = 3;

export function SosButton() {
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SOS_COUNTDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSOS() {
    setConfirming(true);
    setSecondsLeft(SOS_COUNTDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Trigger SOS — call the send handler via state transition
          setConfirming(false);
          // Use setTimeout to ensure state reset before callback
          setTimeout(() => handleSend(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function cancelSOS() {
    if (timerRef.current) clearInterval(timerRef.current);
    setConfirming(false);
    setSecondsLeft(SOS_COUNTDOWN);
  }

  function handleSend() {
    // This will be overridden by props in the parent component
    // We use a callback ref pattern
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (confirming) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-emergency-500/60 bg-navy-800 shadow-2xl animate-pop-in">
          <div className="flex items-center gap-2 bg-emergency-700 px-4 py-3">
            <Siren className="h-6 w-6 animate-pulse text-white" />
            <span className="text-sm font-bold uppercase tracking-wide text-white">Send Emergency?</span>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-secondary-400">
              An emergency will be sent to the AlertX Emergency Control Center.
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl font-bold tabular-nums text-emergency-400">{secondsLeft}</div>
              <div className="text-xs uppercase tracking-wider text-secondary-400">sending in</div>
            </div>
            <button
              onClick={cancelSOS}
              className="btn w-full border border-slate-500/40 bg-slate-700/40 py-3.5 text-sm font-bold text-secondary-400 hover:bg-slate-700/60"
            >
              <X className="h-5 w-5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startSOS}
      className="flex items-center gap-2 rounded-xl bg-emergency-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-500/20 transition hover:bg-emergency-700 active:scale-95"
    >
      <Siren className="h-4 w-4" /> SOS
    </button>
  );
}

/**
 * SosButton with external send callback.
 * The internal countdown handles the 3-second confirmation,
 * then calls onSend when the timer reaches zero.
 */
export function SosButtonControlled({ onSend, onCancel }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SOS_COUNTDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSOS() {
    setConfirming(true);
    setSecondsLeft(SOS_COUNTDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setConfirming(false);
          onSend();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function cancelSOS() {
    if (timerRef.current) clearInterval(timerRef.current);
    setConfirming(false);
    setSecondsLeft(SOS_COUNTDOWN);
    onCancel();
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (confirming) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-emergency-500/60 bg-navy-800 shadow-2xl animate-pop-in">
          <div className="flex items-center gap-2 bg-emergency-700 px-4 py-3">
            <Siren className="h-6 w-6 animate-pulse text-white" />
            <span className="text-sm font-bold uppercase tracking-wide text-white">Send Emergency?</span>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-secondary-400">
              An emergency will be sent to the AlertX Emergency Control Center.
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl font-bold tabular-nums text-emergency-400">{secondsLeft}</div>
              <div className="text-xs uppercase tracking-wider text-secondary-400">sending in</div>
            </div>
            <button
              onClick={cancelSOS}
              className="btn w-full border border-slate-500/40 bg-slate-700/40 py-3.5 text-sm font-bold text-secondary-400 hover:bg-slate-700/60"
            >
              <X className="h-5 w-5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startSOS}
      className="flex items-center gap-2 rounded-xl bg-emergency-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-500/20 transition hover:bg-emergency-700 active:scale-95"
    >
      <Siren className="h-4 w-4" /> SOS
    </button>
  );
}
