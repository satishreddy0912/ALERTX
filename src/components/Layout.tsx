import { Home, Siren, Radar, LayoutDashboard, AlertTriangle, Users, Info, Menu, X, ShieldAlert, LogIn, LogOut, UserCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { ViewKey } from '@/types';

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'report', label: 'Report Emergency', icon: Siren },
  { key: 'simulator', label: 'Detection Simulator', icon: Radar },
  { key: 'dashboard', label: 'Responder Dashboard', icon: LayoutDashboard },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { key: 'responders', label: 'Responders', icon: Users },
  { key: 'about', label: 'About', icon: Info },
];

interface Props {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  children: React.ReactNode;
  session: { id: string; name: string; unit: string } | null;
  adminSession: { id: string; name: string } | null;
  onLogout: () => void;
  onAdminLogout: () => void;
}

export function Layout({ current, onNavigate, children, session, adminSession, onLogout, onAdminLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function go(v: ViewKey) {
    onNavigate(v);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Top bar (mobile + tablet) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-navy-700 bg-navy-900 px-4 py-3 shadow-lg shadow-navy-950/50 lg:hidden">
        <button onClick={() => go('home')} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">AlertX</div>
            <div className="text-[10px] uppercase tracking-wider text-secondary-400">AI-Assisted Prototype</div>
          </div>
        </button>
        <button onClick={() => setMobileOpen((o) => !o)} className="rounded-lg border border-navy-600 bg-navy-800 p-2 text-white" aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[80%] overflow-y-auto border-r border-navy-700 bg-navy-800 p-4 shadow-2xl animate-slide-in">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-white">AlertX</div>
                <div className="text-[10px] uppercase tracking-wider text-secondary-400">AI-Assisted Prototype</div>
              </div>
            </div>
            <NavList current={current} onNavigate={go} />
            <div className="mt-4 space-y-2 border-t border-navy-700 pt-3">
              <button onClick={() => go('admin_login')} className="flex w-full items-center gap-2 rounded-lg border border-navy-600 bg-navy-700 px-3 py-2 text-sm text-white hover:bg-navy-600">
                <ShieldCheck className="h-4 w-4" /> Admin Control Center
              </button>
              {adminSession && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-navy-700 px-3 py-2 text-xs text-secondary-400">
                    <ShieldCheck className="h-4 w-4" /> {adminSession.name} · {adminSession.id}
                  </div>
                  <button onClick={() => { onAdminLogout(); setMobileOpen(false); }} className="flex w-full items-center gap-2 rounded-lg border border-navy-600 bg-navy-700 px-3 py-2 text-sm text-white hover:bg-navy-600">
                    <LogOut className="h-4 w-4" /> Admin Logout
                  </button>
                </div>
              )}
              {session ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                    <UserCircle className="h-4 w-4" /> {session.name} · {session.id}
                  </div>
                  <button onClick={() => { onLogout(); setMobileOpen(false); }} className="flex w-full items-center gap-2 rounded-lg border border-navy-600 bg-navy-700 px-3 py-2 text-sm text-white hover:bg-navy-600">
                    <LogOut className="h-4 w-4" /> Responder Logout
                  </button>
                </div>
              ) : (
                <button onClick={() => go('login')} className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20">
                  <LogIn className="h-4 w-4" /> Responder Login
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-navy-700 bg-navy-900 p-4 lg:flex">
          <button onClick={() => go('home')} className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 shadow-lg shadow-accent-500/30">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div className="text-left leading-tight">
              <div className="text-sm font-bold text-white">AlertX</div>
              <div className="text-[10px] uppercase tracking-wider text-secondary-400">AI-Assisted Prototype</div>
            </div>
          </button>
          <NavListDark current={current} onNavigate={go} />
          <div className="mt-auto space-y-2">
            {adminSession ? (
              <>
                <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-accent-400" /> {adminSession.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-secondary-400">{adminSession.id} · Admin</div>
                </div>
                <button onClick={onAdminLogout} className="flex w-full items-center gap-2 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-700">
                  <LogOut className="h-4 w-4" /> Admin Logout
                </button>
              </>
            ) : (
              <button onClick={() => go('admin_login')} className="flex w-full items-center gap-2 rounded-lg border border-accent-500/40 bg-accent-500/15 px-3 py-2 text-sm text-accent-400 hover:bg-accent-500/25">
                <ShieldCheck className="h-4 w-4" /> Admin Control Center
              </button>
            )}
            {session ? (
              <>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <UserCircle className="h-4 w-4" /> {session.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-emerald-400/70">{session.id} · {session.unit}</div>
                </div>
                <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-700">
                  <LogOut className="h-4 w-4" /> Responder Logout
                </button>
              </>
            ) : (
              <button onClick={() => go('login')} className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:bg-emergency-500/20">
                <LogIn className="h-4 w-4" /> Responder Login
              </button>
            )}
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3 text-xs text-secondary-400">
              <div className="mb-1 flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> System Online
              </div>
              Prototype demo environment
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-navy-700 bg-navy-900 shadow-lg shadow-navy-950/50 backdrop-blur lg:hidden">
        {([
          ['home', Home],
          ['report', Siren],
          ['dashboard', LayoutDashboard],
          ['incidents', AlertTriangle],
          ['simulator', Radar],
        ] as [ViewKey, typeof Home][]).map(([key, Icon]) => (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
              current === key ? 'text-accent-400' : 'text-secondary-400'
            }`}
          >
            <Icon className={`h-5 w-5 ${current === key ? 'scale-110' : ''} transition`} />
            {labelFor(key)}
          </button>
        ))}
      </nav>

      {/* Spacer so content isn't hidden behind bottom nav on mobile */}
      <div className="h-14 lg:hidden" />
    </div>
  );
}

function labelFor(key: ViewKey): string {
  const item = NAV_ITEMS.find((n) => n.key === key);
  return item ? item.label.split(' ')[0] : key;
}

function NavList({ current, onNavigate }: { current: ViewKey; onNavigate: (v: ViewKey) => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <button
            onClick={() => onNavigate(key)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              current === key
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'text-secondary-400 hover:bg-navy-700 hover:text-white'
            }`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function NavListDark({ current, onNavigate }: { current: ViewKey; onNavigate: (v: ViewKey) => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <button
            onClick={() => onNavigate(key)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              current === key
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'text-secondary-400 hover:bg-navy-800 hover:text-white'
            }`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}
