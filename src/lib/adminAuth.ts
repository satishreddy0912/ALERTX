import type { AdminAccount } from '@/types';

const ADMIN_ACCOUNTS_KEY = 'alertx_admin_accounts_v1';
const ADMIN_SESSION_KEY = 'alertx_admin_session_v1';

const DEMO_ADMIN_ACCOUNTS: AdminAccount[] = [
  { id: 'A-001', email: 'admin@alertx.demo', password: 'admin123', name: 'Admin A-001' },
  { id: 'A-002', email: 'admin2@alertx.demo', password: 'admin123', name: 'Admin A-002' },
];

function loadAdminAccounts(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(ADMIN_ACCOUNTS_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(DEMO_ADMIN_ACCOUNTS));
      return DEMO_ADMIN_ACCOUNTS;
    }
    return JSON.parse(raw) as AdminAccount[];
  } catch {
    return DEMO_ADMIN_ACCOUNTS;
  }
}

export function adminLogin(emailOrId: string, password: string): AdminAccount | null {
  const accounts = loadAdminAccounts();
  const key = emailOrId.trim().toLowerCase();
  const account = accounts.find(
    (a) => a.email.toLowerCase() === key || a.id.toLowerCase() === key
  );
  if (!account || account.password !== password) return null;
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ id: account.id, email: account.email, name: account.name }));
  } catch {
    /* ignore */
  }
  return account;
}

export function getAdminSession(): { id: string; email: string; name: string } | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function adminLogout() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getDemoAdminAccounts(): AdminAccount[] {
  return DEMO_ADMIN_ACCOUNTS;
}
