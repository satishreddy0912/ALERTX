import { Siren, Radar, LayoutDashboard, ShieldAlert, Activity, Zap, Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ViewKey } from '@/types';

interface Props {
  onNavigate: (v: ViewKey) => void;
  activeCount: number;
  resolvedCount: number;
  responderCount: number;
}

export function HomePage({ onNavigate, activeCount, resolvedCount, responderCount }: Props) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-navy-700 bg-gradient-to-br from-accent-600 to-accent-800 p-6 sm:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emergency-600/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-navy-900 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emergency-500/30 bg-emergency-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emergency-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emergency-400" /> AI-Assisted Prototype
          </div>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Alert<span className="text-secondary-400">X</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary-400 sm:text-base">
            An AI-assisted emergency reporting and responder coordination prototype. Report incidents, get instant AI severity analysis, and coordinate responders in real time.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onNavigate('report')} className="btn-danger px-5 py-3 text-sm sm:text-base">
              <Siren className="h-5 w-5" /> Report an Emergency
            </button>
            <button onClick={() => onNavigate('simulator')} className="btn-ghost px-5 py-3 text-sm sm:text-base">
              <Radar className="h-5 w-5" /> Detection Simulator
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active Incidents" value={activeCount} icon={Activity} color="text-secondary-400" />
        <StatCard label="Resolved" value={resolvedCount} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Responders" value={responderCount} icon={ShieldAlert} color="text-sky-400" />
        <StatCard label="AI Analysis" value="Live" icon={Brain} color="text-indigo-400" />
      </section>

      {/* Flow */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-white">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FlowCard
            step="01"
            title="Report / Detect"
            desc="Citizens report emergencies with photo and location, or trigger the detection simulator for demos."
            icon={Siren}
            onClick={() => onNavigate('report')}
          />
          <FlowCard
            step="02"
            title="AI Analysis"
            desc="The AI layer analyzes type, severity, priority score and recommends the right response unit."
            icon={Brain}
            onClick={() => onNavigate('incidents')}
          />
          <FlowCard
            step="03"
            title="Responder Coordination"
            desc="Responders get instant alerts, accept incidents, and update status through resolution."
            icon={LayoutDashboard}
            onClick={() => onNavigate('dashboard')}
          />
        </div>
      </section>

      {/* Lifecycle */}
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Incident lifecycle</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {['NEW', 'ASSIGNED', 'RESPONDING', 'RESOLVED'].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 font-semibold text-secondary-400">{s}</span>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-secondary-400" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-secondary-400">
          This is a prototype demonstrating how AI can assist emergency reporting and responder coordination. It is not connected to real emergency services.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Activity; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-secondary-400">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function FlowCard({ step, title, desc, icon: Icon, onClick }: { step: string; title: string; desc: string; icon: typeof Siren; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card group p-5 text-left transition hover:border-accent-500 hover:bg-navy-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-secondary-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-secondary-400">{step}</span>
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-secondary-400">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-secondary-400 opacity-0 transition group-hover:opacity-100">
        <Zap className="h-3.5 w-3.5" /> Open
      </div>
    </button>
  );
}
