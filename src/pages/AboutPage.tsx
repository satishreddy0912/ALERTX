import { Info, Brain, ShieldAlert, Siren, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Info className="h-6 w-6 text-secondary-400" /> About
        </h1>
        <p className="mt-1 text-sm text-secondary-400">AlertX — an AI-assisted emergency reporting and responder coordination prototype.</p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-bold text-white">What this is</h2>
        <p className="text-sm leading-relaxed text-secondary-400">
          This is a hackathon prototype demonstrating how AI can assist emergency reporting, automated incident analysis, and responder coordination. Citizens can report emergencies with photos and location, the AI layer analyzes severity and priority, and responders receive instant alerts to accept and resolve incidents.
        </p>
      </div>

      <div className="card border-emergency-500/20 bg-emergency-600/5 p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emergency-400">
          <AlertTriangle className="h-5 w-5" /> Important limitations
        </h2>
        <ul className="space-y-2 text-sm text-secondary-400">
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emergency-400" /> This is a prototype — not a replacement for official emergency services.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emergency-400" /> It does NOT guarantee 100% accident or emergency detection.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emergency-400" /> It is NOT directly connected to real police, ambulance or fire services.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emergency-400" /> Response times are not guaranteed.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emergency-400" /> In a real emergency, always call your local emergency number directly.</li>
        </ul>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-bold text-white">How the AI analysis works</h2>
        <p className="text-sm leading-relaxed text-secondary-400">
          The prototype uses a rule-based analysis engine that considers the emergency type, description keywords, and whether an image was provided. It generates a severity level (Low / Medium / High / Critical), a priority score out of 100, a short summary, and a recommended response unit. This is designed to be swappable with a real AI model in production.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-white">System flow</h2>
        <ol className="space-y-3">
          {[
            { icon: Siren, label: 'Report / Detect', desc: 'Citizen reports or simulator triggers an emergency.' },
            { icon: Brain, label: 'AI Analysis', desc: 'Severity, priority and recommended response generated.' },
            { icon: ShieldAlert, label: 'Responder Alert', desc: 'Popup appears on the responder dashboard.' },
            { icon: CheckCircle2, label: 'Responder Accepts', desc: 'Incident assigned, responder status updated.' },
            { icon: Activity, label: 'Responding', desc: 'Responder en route to the incident.' },
            { icon: CheckCircle2, label: 'Resolved', desc: 'Incident closed and responder freed up.' },
          ].map((step, i) => (
            <li key={step.label} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-secondary-400">
                <step.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{i + 1}. {step.label}</div>
                <div className="text-xs text-secondary-400">{step.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-bold text-white">Technology</h2>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Tailwind CSS', 'localStorage', 'Rule-based AI'].map((t) => (
            <span key={t} className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs font-medium text-secondary-400">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
