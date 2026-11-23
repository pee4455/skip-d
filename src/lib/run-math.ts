/* Treadmill run maths. A run is the console settings over time: segments [t, km/h, incline%],
   each holding until the next one (t = seconds of moving time). Everything else is derived. */
import type { Run, Seg } from './state';

const pad = (n: number) => String(n).padStart(2, '0');

/** ACSM metabolic equations (walking below 6.5 km/h, running above) → kcal per minute. */
export function kcalPerMin(speed: number, incline: number, kg: number): number {
  if (speed <= 0) return 0;
  const v = speed * 1000 / 60, g = incline / 100;
  const vo2 = speed < 6.5 ? 0.1 * v + 1.8 * v * g + 3.5 : 0.2 * v + 0.9 * v * g + 3.5;
  return vo2 * kg / 1000 * 5;
}

/** Distance (km), climb (m) and calories for segments up to `end` seconds. */
export function segTotals(segs: Seg[], end: number, kg: number) {
  let dist = 0, elev = 0, kcal = 0;
  segs.forEach(([ts, sp, inc], k) => {
    const dt = Math.max(0, (k + 1 < segs.length ? segs[k + 1][0] : end) - ts), d = sp * dt / 3600;
    dist += d; elev += d * 1000 * Math.max(0, inc) / 100; kcal += kcalPerMin(sp, inc, kg) * dt / 60;
  });
  return { dist, elev, kcal };
}

export function paceStr(sec: number): string {
  if (!isFinite(sec) || sec <= 0 || sec >= 6000) return '–:––';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
export function durStr(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
/** Rounds down like a treadmill console. */
export const kmStr = (km: number) => (Math.floor(km * 100 + 1e-6) / 100).toFixed(2);
export const runPace = (r: Pick<Run, 'dist' | 'dur'>) => r.dist > 0 ? r.dur / r.dist : NaN;
export const runXP = (km: number) => 10 + Math.round(km * 10);

/** "32:10", "1:02:03" or plain minutes "45" → seconds (NaN if unreadable). */
export function parseDur(v: string): number {
  const p = String(v).trim().split(':').map(x => x.trim() === '' ? NaN : Number(x));
  if (!p.length || p.some(x => !isFinite(x) || x < 0)) return NaN;
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60;
}

/** Metres covered by each whole second of moving time, scaled to the run's saved distance. */
export function cumDist(r: Pick<Run, 'dur' | 'dist' | 'segs'>): Float64Array {
  const n = Math.max(1, Math.round(r.dur)), out = new Float64Array(n + 1);
  let k = 0, d = 0;
  for (let s = 1; s <= n; s++) {
    while (k + 1 < r.segs.length && r.segs[k + 1][0] <= s - 1) k++;
    d += (r.segs[k]?.[1] || 0) / 3.6; out[s] = d;
  }
  const f = out[n] ? r.dist * 1000 / out[n] : 1;
  for (let s = 1; s <= n; s++) out[s] *= f;
  return out;
}

const _best = new Map<string, number>();
/** Fastest time (s) to cover `metres` anywhere inside the run; Infinity if the run is shorter. */
export function bestTime(r: Run, metres: number): number {
  const key = `${r.id}|${metres}|${r.dist}|${r.dur}`;
  const hit = _best.get(key); if (hit !== undefined) return hit;
  let best = Infinity;
  if (r.dist * 1000 >= metres - 0.5) {
    const c = cumDist(r); let i = 0;
    for (let j = 1; j < c.length; j++) {
      while (i + 1 < j && c[j] - c[i + 1] >= metres) i++;
      if (c[j] - c[i] >= metres - 0.5) best = Math.min(best, j - i);
    }
  }
  _best.set(key, best); return best;
}

export interface Split { km: number | string; sec: number; part?: number }
/** Time for each full kilometre, plus the last partial one (≥ 50 m). */
export function splits(r: Pick<Run, 'dur' | 'dist' | 'segs'>): Split[] {
  const c = cumDist(r), out: Split[] = [];
  let km = 1, last = 0;
  for (let s = 1; s < c.length; s++) while (c[s] >= km * 1000 - 1e-6) {
    const tt = s - 1 + (km * 1000 - c[s - 1]) / ((c[s] - c[s - 1]) || 1);
    out.push({ km, sec: tt - last }); last = tt; km++;
  }
  const rest = r.dist - (km - 1);
  if (rest >= 0.05) out.push({ km: (km - 1 + rest).toFixed(2), part: rest, sec: r.dur - last });
  return out;
}

export interface RunDraft {
  id: string; at: number; segs: Seg[]; rawDur: number; dur: number; dist: number;
  kcal?: number; feel?: number; manual?: boolean;
}
/** Turn raw console segments into a saved run whose totals match what the user confirmed
    (time and distance from the treadmill screen): times and speeds are rescaled to fit. */
export function buildRun(o: RunDraft, kg: number): Run {
  let segs: Seg[] = o.segs.map(s => [...s] as Seg);
  const tScale = o.rawDur > 0 ? o.dur / o.rawDur : 1;
  segs.forEach(s => { s[0] = Math.round(s[0] * tScale); });
  segs = segs.filter((s, k) => s[0] < o.dur && (k + 1 >= segs.length || segs[k + 1][0] > s[0]));
  if (!segs.length || segs[0][0] !== 0) { const f = segs[0] || o.segs[0]; segs.unshift([0, f[1], f[2]]); }
  const raw = segTotals(segs, o.dur, kg).dist;
  if (raw > 0) { const f = o.dist / raw; segs.forEach(s => { s[1] = Math.round(s[1] * f * 100) / 100; }); }
  else segs = [[0, Math.round(o.dist / (o.dur / 3600) * 100) / 100, segs[0][2]]];
  const tot = segTotals(segs, o.dur, kg);
  return {
    id: o.id, at: o.at, dur: Math.round(o.dur), dist: Math.round(o.dist * 100) / 100, segs, elev: Math.round(tot.elev),
    kcal: o.kcal ?? Math.round(tot.kcal), feel: o.feel || 0, ...(o.manual ? { manual: 1 as const } : {}),
  };
}
