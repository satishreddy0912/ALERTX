import { useEffect, useState, useRef } from 'react';

interface Props {
  onComplete: () => void;
}

/**
 * Premium cinematic intro for AlertX.
 * Shows a 3.5-second animated sequence with ECG line, radar sweep,
 * emergency light reflections, and the AlertX branding.
 * Respects prefers-reduced-motion — shows a static version and skips quickly.
 * Shows once per browser session (controlled by parent via sessionStorage).
 */
export function CinematicIntro({ onComplete }: Props) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    if (mq.matches) {
      // Reduced motion: show static content for 1.5s then exit
      setPhase(4);
      const t = setTimeout(() => triggerExit(), 1500);
      timersRef.current.push(t);
      return;
    }

    // Normal animation sequence
    const sequence: { phase: number; delay: number }[] = [
      { phase: 1, delay: 200 },   // Emergency glow
      { phase: 2, delay: 700 },   // ECG line
      { phase: 3, delay: 1400 },  // Radar sweep
      { phase: 4, delay: 2100 },  // Logo + text
    ];

    sequence.forEach(({ phase: p, delay }) => {
      const t = setTimeout(() => setPhase(p), delay);
      timersRef.current.push(t);
    });

    const tExit = setTimeout(() => triggerExit(), 3400);
    timersRef.current.push(tExit);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerExit() {
    if (completedRef.current) return;
    completedRef.current = true;
    setExiting(true);
    const t = setTimeout(onComplete, 500);
    timersRef.current.push(t);
  }

  function handleSkip() {
    timersRef.current.forEach(clearTimeout);
    triggerExit();
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-navy-950 ${
        exiting ? 'opacity-0 transition-opacity duration-500' : 'opacity-100'
      }`}
    >
      {/* ── Background: night-city gradient + atmosphere ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-black" />

      {/* Subtle city skyline silhouette at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-30">
        <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
          <g fill="#0D2747">
            <rect x="0" y="60" width="30" height="60" />
            <rect x="32" y="40" width="25" height="80" />
            <rect x="60" y="55" width="20" height="65" />
            <rect x="85" y="30" width="35" height="90" />
            <rect x="125" y="50" width="22" height="70" />
            <rect x="152" y="20" width="40" height="100" />
            <rect x="196" y="45" width="28" height="75" />
            <rect x="230" y="35" width="32" height="85" />
            <rect x="268" y="55" width="20" height="65" />
            <rect x="292" y="25" width="38" height="95" />
            <rect x="335" y="48" width="25" height="72" />
            <rect x="365" y="38" width="35" height="82" />
          </g>
          {/* Random lit windows */}
          <g fill="#2F80ED" opacity="0.4">
            <rect x="90" y="45" width="3" height="3" />
            <rect x="100" y="50" width="3" height="3" />
            <rect x="160" y="30" width="3" height="3" />
            <rect x="170" y="50" width="3" height="3" />
            <rect x="240" y="45" width="3" height="3" />
            <rect x="300" y="35" width="3" height="3" />
            <rect x="310" y="55" width="3" height="3" />
            <rect x="375" y="45" width="3" height="3" />
          </g>
        </svg>
      </div>

      {/* ── Emergency light reflections (red/blue sweeps) ── */}
      {!reducedMotion && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: phase >= 1
                ? 'radial-gradient(ellipse at 15% 50%, rgba(239, 68, 68, 0.12), transparent 50%), radial-gradient(ellipse at 85% 50%, rgba(47, 128, 237, 0.12), transparent 50%)'
                : 'transparent',
              transition: 'background 0.6s ease-in',
            }}
          />
          {/* Animated red/blue light bars */}
          <div className="absolute left-0 top-1/4 h-2 w-full origin-left scale-x-0 bg-gradient-to-r from-transparent via-emergency-500/30 to-transparent" style={{ animation: 'lightSweepRight 2.5s ease-in-out infinite', animationDelay: '0.3s' }} />
          <div className="absolute left-0 top-2/3 h-2 w-full origin-left scale-x-0 bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" style={{ animation: 'lightSweepRight 2.5s ease-in-out infinite', animationDelay: '0.8s' }} />
        </>
      )}

      {/* ── Radar sweep ── */}
      {phase >= 3 && !reducedMotion && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-64 w-64 sm:h-80 sm:w-80">
            {/* Radar rings */}
            <div className="absolute inset-0 rounded-full border border-accent-500/20" />
            <div className="absolute inset-8 rounded-full border border-accent-500/15" />
            <div className="absolute inset-16 rounded-full border border-accent-500/10" />
            {/* Cross hairs */}
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent-500/10" />
            <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-accent-500/10" />
            {/* Sweeping line */}
            <div
              className="absolute left-1/2 top-1/2 h-1/2 w-px origin-bottom"
              style={{
                background: 'linear-gradient(to top, transparent, rgba(47, 128, 237, 0.6))',
                animation: 'radarSweep 2s linear infinite',
              }}
            />
            {/* Blips */}
            <div className="absolute left-[60%] top-[35%] h-1.5 w-1.5 rounded-full bg-emergency-400 shadow-emergency-400/50" style={{ animation: 'blipPulse 1.5s ease-out infinite' }} />
            <div className="absolute left-[30%] top-[55%] h-1.5 w-1.5 rounded-full bg-accent-400 shadow-accent-400/50" style={{ animation: 'blipPulse 1.5s ease-out infinite', animationDelay: '0.5s' }} />
          </div>
        </div>
      )}

      {/* ── ECG / pulse line ── */}
      {phase >= 2 && !reducedMotion && (
        <div className="absolute left-0 right-0 top-[28%] z-10 flex justify-center">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="none" className="max-w-md px-6">
            <path
              d="M0,30 L60,30 L70,30 L75,15 L80,45 L85,5 L90,55 L95,30 L160,30 L170,30 L175,15 L180,45 L185,5 L190,55 L195,30 L260,30 L270,30 L275,15 L280,45 L285,5 L290,55 L295,30 L400,30"
              fill="none"
              stroke="#2F80ED"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 800,
                strokeDashoffset: phase >= 2 ? 0 : 800,
                transition: 'stroke-dashoffset 1s ease-out',
                filter: 'drop-shadow(0 0 4px rgba(47, 128, 237, 0.6))',
              }}
            />
          </svg>
        </div>
      )}

      {/* ── Center content: Logo + text ── */}
      <div className="relative z-20 flex flex-col items-center px-6 text-center">
        {/* AlertX logo icon */}
        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-500/40 transition-all duration-700 sm:h-20 sm:w-20 ${
            phase >= 4 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 sm:h-11 sm:w-11">
            <path d="M12 2L2 22h20L12 2z" fill="white" fillOpacity="0.95" />
            <path d="M12 9l-4 7h8l-4-7z" fill="#2F80ED" />
          </svg>
        </div>

        {/* ALERTX title */}
        <h1
          className={`text-3xl font-black tracking-[0.15em] text-white transition-all duration-500 sm:text-5xl ${
            phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
          style={{ textShadow: '0 0 20px rgba(47, 128, 237, 0.5), 0 0 40px rgba(47, 128, 237, 0.2)' }}
        >
          ALERTX
        </h1>

        {/* "EVERY SECOND MATTERS" */}
        <p
          className={`mt-2 text-sm font-bold uppercase tracking-[0.25em] text-emergency-400 transition-all duration-500 delay-200 sm:text-lg ${
            phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          Every Second Matters
        </p>

        {/* Tagline */}
        <p
          className={`mt-3 max-w-xs text-[11px] leading-relaxed text-secondary-400 transition-all duration-500 delay-300 sm:max-w-sm sm:text-sm ${
            phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          AI-Powered Emergency Detection<br />and Real-Time Response
        </p>

        {/* DETECT • INFORM • RESPOND */}
        <div
          className={`mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-400 transition-all duration-500 delay-500 sm:text-xs ${
            phase >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span>Detect</span>
          <span className="text-secondary-600">•</span>
          <span>Inform</span>
          <span className="text-secondary-600">•</span>
          <span>Respond</span>
        </div>
      </div>

      {/* ── Skip button ── */}
      <button
        onClick={handleSkip}
        className="absolute right-4 top-4 z-30 rounded-lg border border-navy-600 bg-navy-800/60 px-3 py-1.5 text-xs font-semibold text-secondary-400 backdrop-blur-sm transition hover:text-white hover:border-accent-500 sm:right-6 sm:top-6"
      >
        SKIP →
      </button>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy-800">
        <div
          className="h-full bg-gradient-to-r from-accent-500 to-emergency-500"
          style={{
            width: reducedMotion ? '100%' : '0%',
            animation: reducedMotion ? 'none' : 'introProgress 3.4s linear forwards',
          }}
        />
      </div>
    </div>
  );
}
