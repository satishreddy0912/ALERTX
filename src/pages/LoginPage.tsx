import { useState } from 'react';
import { LogIn, ShieldAlert, AlertCircle, Eye, EyeOff, UserCircle } from 'lucide-react';
import { login, getDemoAccounts } from '@/lib/auth';

interface Props {
  onLogin: (session: { id: string; email: string; name: string; unit: string }) => void;
  onGoHome: () => void;
}

export function LoginPage({ onLogin, onGoHome }: Props) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoAccounts = getDemoAccounts();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!id.trim() || !password.trim()) {
      setError('Please enter your Responder ID/Email and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const account = login(id.trim(), password);
      if (!account) {
        setError('Invalid credentials. Use a demo account below.');
        setLoading(false);
        return;
      }
      onLogin({ id: account.id, email: account.email, name: account.name, unit: account.unit });
      setLoading(false);
    }, 350);
  }

  function fillDemo(acc: { id: string; email: string; password: string }) {
    setId(acc.email);
    setPassword(acc.password);
    setError('');
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency-600 shadow-lg shadow-accent-500/20">
          <ShieldAlert className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Responder Login</h1>
        <p className="mt-1 text-sm text-secondary-400">Responder access requires authentication.</p>
      </div>

      <div className="card p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="rid">Responder ID / Email</label>
            <input
              id="rid"
              className="input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. R-101 or medic@alertx.demo"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="rpw">Password</label>
            <div className="relative">
              <input
                id="rpw"
                type={showPw ? 'text' : 'password'}
                className="input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-400"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-emergency-500/30 bg-emergency-600/10 p-3 text-sm text-emergency-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-danger w-full py-3.5 text-base">
            <LogIn className="h-5 w-5" /> {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <button onClick={onGoHome} className="mt-3 w-full text-center text-xs text-secondary-400 underline hover:text-secondary-400">
          Back to public site
        </button>
      </div>

      {/* Demo accounts */}
      <div className="card mt-4 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary-400">
          <UserCircle className="h-4 w-4" /> Demo Responder Accounts
        </div>
        <div className="space-y-2">
          {demoAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => fillDemo(a)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-left text-xs transition hover:border-accent-500 hover:bg-navy-800"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-secondary-400">{a.name}</div>
                <div className="truncate text-secondary-400">{a.email} · {a.id}</div>
              </div>
              <span className="shrink-0 rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-secondary-400">{a.password}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-secondary-400">Tap an account to auto-fill, then press Login.</p>
      </div>
    </div>
  );
}
