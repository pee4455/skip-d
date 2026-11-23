/* The saved state (localStorage "skipdinner.v1", mirrored to Supabase user_state.data)
   and how two copies of it merge. Kept free of DOM code so it can be unit-tested. */

export type Night = 'ok' | 'light' | 'miss';
export type Seg = [t: number, speed: number, incline: number];

export interface Run {
  id: string; at: number; dur: number; dist: number; segs: Seg[];
  elev: number; kcal: number; feel: number; manual?: 1;
}

export interface Settings {
  name: string; cutoff: string; breakfast: string; cost: number; lang: string; weight: number;
}

export interface State {
  settings: Settings;
  log: Record<string, Night>;
  logAt: Record<string, number>;
  epoch: number;
  updatedAt: number;
  xp: number; challenges: number; cravings: number; best: number;
  badges: string[];
  sessions: { t: number; d: number }[];
  tourDone: boolean;
  gacha: { tickets: number; gold: number; shards: number; pity: number; pulls: number; owned: Record<string, number>; buddy: string | null };
  quests: { claimed: Record<string, boolean> };
  runs: Run[];
  runDel: Record<string, number>;
  city: { crafted: number; brickUsed: number; woodUsed: number; up: Record<string, number>; decor: Record<string, string> };
  shop: {
    owned: Record<string, number>;
    frozen: Record<string, number>;
    equip: { hat: string; face: string; frame: string; fx: Record<string, number>; krathong: string };
  };
  fest: { floats: Record<string, { d: string; w: string; t: number }> };
}

export const DEFAULTS: Settings = { name: '', cutoff: '17:00', breakfast: '07:00', cost: 80, lang: '', weight: 60 };

export function detectLang(): 'th' | 'en' {
  try { return (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en'; } catch { return 'th'; }
}

export function blank(): State {
  return {
    settings: { ...DEFAULTS, lang: detectLang() }, log: {}, logAt: {}, epoch: 0, updatedAt: 0,
    xp: 0, challenges: 0, cravings: 0, best: 0, badges: [], sessions: [], tourDone: false,
    gacha: { tickets: 0, gold: 0, shards: 0, pity: 0, pulls: 0, owned: {}, buddy: null },
    quests: { claimed: {} }, runs: [], runDel: {},
    city: { crafted: 0, brickUsed: 0, woodUsed: 0, up: {}, decor: {} },
    shop: { owned: {}, frozen: {}, equip: { hat: '', face: '', frame: '', fx: {}, krathong: 'kt_leaf' } },
    fest: { floats: {} },
  };
}

/** Fill in defaults and copy every nested object, so the result never shares references with the input. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shape(r: any): State {
  const b = blank();
  if (!r || typeof r !== 'object') return b;
  const settings: Settings = { ...DEFAULTS, ...(r.settings || {}) };
  if (!settings.lang) settings.lang = 'th';
  const g = r.gacha || {};
  const sh = r.shop || {};
  return {
    ...b, ...r, settings,
    log: { ...(r.log || {}) }, logAt: { ...(r.logAt || {}) },
    badges: [...(r.badges || [])], sessions: [...(r.sessions || [])],
    gacha: { ...b.gacha, ...g, owned: { ...(g.owned || {}) } },
    quests: { claimed: { ...((r.quests || {}).claimed || {}) } },
    runs: (Array.isArray(r.runs) ? r.runs : []).map((x: Run) => ({ ...x, segs: (x.segs || []).map(s => [...s] as Seg) })),
    runDel: { ...(r.runDel || {}) },
    city: { ...b.city, ...(r.city || {}), up: { ...((r.city || {}).up || {}) }, decor: { ...((r.city || {}).decor || {}) } },
    fest: { floats: { ...((r.fest || {}).floats || {}) } },
    shop: {
      owned: { ...(sh.owned || {}) }, frozen: { ...(sh.frozen || {}) },
      equip: { ...b.shop.equip, ...(sh.equip || {}), fx: { ...((sh.equip || {}).fx || {}) } },
    },
  };
}

/** JSON with sorted keys: Postgres jsonb does not keep key order, so compare copies with this. */
export function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o: Record<string, unknown>, key) => (o[key] = x[key], o), {})
    : x);
}

/** A fresh install with nothing worth keeping (on first sign-in the cloud copy simply replaces it). */
export const pristine = (s: State): boolean =>
  !Object.keys(s.log).length && !s.gacha.pulls && !Object.keys(s.quests.claimed).length && !s.sessions.length
  && !(s.runs || []).length && !Object.keys((s.city || {}).decor || {}).length;

/* Merge two copies of the state.
   - A reset (newer epoch) wins outright.
   - Nights: last write wins per night (logAt), so edits and clears on either device survive.
   - Things that only grow (badges, claimed quests, owned characters, sessions, XP, records,
     purchases, city builds, krathong floats): union / max.
   - Runs: union by id; a deletion on either device is kept as a tombstone so the run does not come back.
   - Everything else (wallet, pity, settings, buddy, outfits) comes from the copy changed most recently.
   keepA: treat `a` as the base whatever the timestamps (first sign-in on a device). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeState(a: any, b: any, keepA?: boolean): State {
  const A = shape(a), B = shape(b);
  if (!keepA && (A.epoch || 0) !== (B.epoch || 0)) return (A.epoch || 0) > (B.epoch || 0) ? A : B;
  const [n, o] = keepA || (A.updatedAt || 0) >= (B.updatedAt || 0) ? [A, B] : [B, A];
  const m = shape(JSON.parse(JSON.stringify(n)));
  m.log = {}; m.logAt = {};
  new Set([...Object.keys(n.log), ...Object.keys(o.log), ...Object.keys(n.logAt), ...Object.keys(o.logAt)]).forEach(k => {
    const tn = n.logAt[k] || 0, to = o.logAt[k] || 0;
    const v = (tn || to) ? (to > tn ? o.log[k] : n.log[k]) : (n.log[k] || o.log[k]);
    if (v) m.log[k] = v;
    if (tn || to) m.logAt[k] = Math.max(tn, to);
  });
  m.badges = [...new Set([...n.badges, ...o.badges])];
  const seen = new Set(n.sessions.map(x => x.t));
  m.sessions = [...n.sessions, ...o.sessions.filter(x => !seen.has(x.t))].sort((x, y) => x.t - y.t).slice(-300);
  m.quests.claimed = { ...o.quests.claimed, ...n.quests.claimed };
  for (const [id, c] of Object.entries(o.gacha.owned)) m.gacha.owned[id] = Math.max(m.gacha.owned[id] || 0, c);
  m.gacha.pulls = Math.max(n.gacha.pulls || 0, o.gacha.pulls || 0);
  for (const f of ['xp', 'best', 'challenges', 'cravings'] as const) m[f] = Math.max(n[f] || 0, o[f] || 0);
  m.tourDone = !!(n.tourDone || o.tourDone);
  m.runDel = { ...o.runDel, ...n.runDel };
  const runs = new Map<string, Run>(); [...o.runs, ...n.runs].forEach(r => runs.set(r.id, r));
  m.runs = [...runs.values()].filter(r => !m.runDel[r.id]).sort((x, y) => x.at - y.at);
  for (const f of ['crafted', 'brickUsed', 'woodUsed'] as const) m.city[f] = Math.max(n.city[f] || 0, o.city[f] || 0);
  m.city.up = { ...o.city.up, ...n.city.up }; m.city.decor = { ...o.city.decor, ...n.city.decor };
  for (const [id, c] of Object.entries(o.shop.owned)) m.shop.owned[id] = Math.max(m.shop.owned[id] || 0, c);
  m.shop.frozen = { ...o.shop.frozen, ...n.shop.frozen };
  m.fest.floats = { ...o.fest.floats, ...n.fest.floats };
  m.updatedAt = Math.max(n.updatedAt || 0, o.updatedAt || 0);
  return m;
}
