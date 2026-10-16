// Phone-number auth + wallets, persisted in localStorage (single-device).
// Admin accounts are seeded; admins create player accounts (phone = username)
// and load balance. House take from each locked pool goes to the house vault.
export interface User {
  phone: string;
  /** hex sha-256 (salted); "!"-prefixed cyrb53 fallback on non-secure contexts */
  pass: string;
  role: "admin" | "player";
  balance: number;
  createdAt: number;
}

interface StoreShape {
  v: 1;
  users: User[];
  house: number;
}

const USERS_KEY = "pm_users_v1";
const SESSION_KEY = "pm_session_v1";

const ADMIN_PHONE = "admin";
const ADMIN_PASS = "admin123";
const DEMO_PHONE = "09123456789";
const DEMO_PASS = "1234";
const DEMO_BALANCE = 1000;

async function sha256(s: string): Promise<string> {
  const salted = `karera::${s}`;
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through */
  }
  // Fallback for non-secure contexts (not cryptographic, local demo only).
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `!${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as StoreShape;
      if (p && p.v === 1 && Array.isArray(p.users)) {
        return { v: 1, users: p.users, house: p.house || 0 };
      }
    }
  } catch {
    /* corrupted → reseed */
  }
  return { v: 1, users: [], house: 0 };
}

function save(s: StoreShape): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(s));
  } catch {
    /* storage full/blocked */
  }
}

export function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

export const Auth = {
  /** Seed the admin + a demo player on first run. Call once at startup. */
  async init(): Promise<void> {
    const s = load();
    if (s.users.length === 0) {
      const now = Date.now();
      s.users.push({
        phone: ADMIN_PHONE,
        pass: await sha256(ADMIN_PASS),
        role: "admin",
        balance: 0,
        createdAt: now,
      });
      s.users.push({
        phone: DEMO_PHONE,
        pass: await sha256(DEMO_PASS),
        role: "player",
        balance: DEMO_BALANCE,
        createdAt: now,
      });
      save(s);
    }
  },

  users(): User[] {
    return load().users;
  },

  getUser(phone: string): User | undefined {
    return load().users.find((u) => u.phone === phone);
  },

  async verify(phone: string, password: string): Promise<User | null> {
    const u = this.getUser(phone.trim());
    if (!u) return null;
    const h = await sha256(password);
    return h === u.pass ? u : null;
  },

  async createUser(phone: string, password: string, balance: number, role: "player" | "admin" = "player"): Promise<User> {
    phone = phone.trim();
    if (role === "player" && !isValidPhone(phone)) {
      throw new Error("Phone must be 09XXXXXXXXX (11 digits).");
    }
    if (!phone) throw new Error("Username required.");
    if (password.length < 4) throw new Error("Password needs 4+ characters.");
    if (!Number.isFinite(balance) || balance < 0) throw new Error("Balance must be 0 or more.");
    const s = load();
    if (s.users.some((u) => u.phone === phone)) throw new Error("Account already exists.");
    const u: User = {
      phone,
      pass: await sha256(password),
      role,
      balance: Math.round(balance * 100) / 100,
      createdAt: Date.now(),
    };
    s.users.push(u);
    save(s);
    return u;
  },

  /** Add (or subtract) balance. Returns the new balance. */
  adjustBalance(phone: string, delta: number): number {
    const s = load();
    const u = s.users.find((x) => x.phone === phone);
    if (!u) throw new Error("Account not found.");
    u.balance = Math.max(0, Math.round((u.balance + delta) * 100) / 100);
    save(s);
    return u.balance;
  },

  persistBalance(phone: string, balance: number): void {
    const s = load();
    const u = s.users.find((x) => x.phone === phone);
    if (!u) return;
    u.balance = Math.max(0, Math.round(balance * 100) / 100);
    save(s);
  },

  creditHouse(amount: number): void {
    if (!(amount > 0)) return;
    const s = load();
    s.house = Math.round((s.house + amount) * 100) / 100;
    save(s);
  },

  house(): number {
    return load().house;
  },

  setSession(phone: string): void {
    try {
      localStorage.setItem(SESSION_KEY, phone);
    } catch {
      /* ignore */
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  },

  sessionPhone(): string | null {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },

  currentUser(): User | null {
    const p = this.sessionPhone();
    return p ? this.getUser(p) ?? null : null;
  },
};
