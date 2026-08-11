import type { ResponderAccount } from '@/types';

const ACCOUNTS_KEY = 'alertx_accounts_v1';
const SESSION_KEY = 'alertx_session_v1';

const DEMO_ACCOUNTS: ResponderAccount[] = [
  { id: 'R-101', email: 'medic@alertx.demo', password: 'demo123', name: 'Cmdr. Arjun Patel', unit: 'Medical Response' },
  { id: 'R-102', email: 'fire@alertx.demo', password: 'demo123', name: 'Capt. Sneha Rao', unit: 'Fire & Rescue' },
  { id: 'R-103', email: 'rescue@alertx.demo', password: 'demo123', name: 'Lt. Vikram Singh', unit: 'Urban Rescue' },
  { id: 'R-104', email: 'traffic@alertx.demo', password: 'demo123', name: 'Sgt. Meera Nair', unit: 'Traffic Response' },
];

function loadAccounts(): ResponderAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEMO_ACCOUNTS));
      return DEMO_ACCOUNTS;
    }
    return JSON.parse(raw) as ResponderAccount[];
  } catch {
    return DEMO_ACCOUNTS;
  }
}

export function login(emailOrId: string, password: string): ResponderAccount | null {
  const accounts = loadAccounts();
  const key = emailOrId.trim().toLowerCase();
  const account = accounts.find(
    (a) => a.email.toLowerCase() === key || a.id.toLowerCase() === key
  );
  if (!account || account.password !== password) return null;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: account.id, email: account.email, name: account.name, unit: account.unit }));
  } catch {
    /* ignore */
  }
  return account;
}

export function getSession(): { id: string; email: string; name: string; unit: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getDemoAccounts(): ResponderAccount[] {
  return DEMO_ACCOUNTS;
}
