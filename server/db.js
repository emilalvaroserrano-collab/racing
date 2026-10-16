import "./env.js";

// Race rows and bets in Supabase. Service-role key stays on the server.

const COUNTDOWN_S = 60;

function creds() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export function enabled() {
  const { url, key } = creds();
  return Boolean(url && key);
}

async function rest(path, { method = "GET", body, prefer } = {}) {
  const { url, key } = creds();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer || "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("supabase", method, path, res.status, text.slice(0, 240));
    return null;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function loadState() {
  if (!enabled()) return null;
  const races = await rest("races?select=id,race_number,phase,countdown_start_ms&order=created_at.desc&limit=1");
  const race = races?.[0];
  if (!race) return null;
  const bets = (await rest(`bets?race_id=eq.${race.id}&select=phone,kind,a,b,amount`)) || [];
  let countdown = 0;
  let phase = race.phase || "betting";
  if (phase === "betting" && race.countdown_start_ms) {
    countdown = COUNTDOWN_S - (Date.now() - Number(race.countdown_start_ms)) / 1000;
    if (countdown <= 0) {
      countdown = 0;
      phase = "racing";
    }
  }
  return {
    raceId: race.id,
    raceNumber: race.race_number,
    phase,
    countdown,
    bets: bets.map((b) => ({ phone: b.phone, kind: b.kind, a: b.a, b: b.b, amount: Number(b.amount) })),
    results: null,
  };
}

let timer = null;
let pending = null;

async function flush() {
  if (!enabled() || !pending?.raceId) return;
  const race = pending;
  pending = null;
  const countdownStart =
    race.phase === "betting" && race.countdown > 0
      ? Math.round(Date.now() - (COUNTDOWN_S - race.countdown) * 1000)
      : null;
  await rest(`races?id=eq.${race.raceId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      race_number: race.raceNumber,
      phase: race.phase,
      countdown_start_ms: countdownStart,
    },
  });
}

export function saveState(state) {
  if (!enabled() || !state?.raceId) return;
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(() => {
    void flush();
  }, 400);
}

export async function ensureRace(state) {
  if (!enabled()) return null;
  if (state.raceId) return state.raceId;
  const rows = await rest("races", {
    method: "POST",
    body: { race_number: state.raceNumber || 1, phase: state.phase || "betting" },
  });
  const id = rows?.[0]?.id ?? null;
  if (id) state.raceId = id;
  return id;
}

export function recordBet(state, bet) {
  if (!enabled() || !state?.raceId) return;
  void rest("bets", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      race_id: state.raceId,
      phone: bet.phone,
      kind: bet.kind,
      a: bet.a,
      b: bet.b ?? -1,
      amount: bet.amount,
    },
  });
}
