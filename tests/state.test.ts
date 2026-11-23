import { describe, it, expect } from 'vitest';
import { blank, shape, mergeState, pristine, stable, type State } from '../src/lib/state';

const st = (over: Partial<State> = {}): State => ({ ...shape({ settings: { lang: 'th' } }), ...over });
const run = (id: string, at: number, dist = 5) => ({ id, at, dur: 1800, dist, segs: [[0, 10, 0]] as [number, number, number][], elev: 0, kcal: 300, feel: 0 });

describe('shape', () => {
  it('fills defaults for an empty or broken save', () => {
    expect(shape(null).shop.equip.krathong).toBe('kt_leaf');
    expect(shape('nonsense').runs).toEqual([]);
    const s = shape({ settings: {} });
    expect(s.settings.lang).toBe('th');
    expect(s.settings.weight).toBe(60);
  });
  it('keeps old saves that predate newer features', () => {
    const old = { settings: { lang: 'en', cutoff: '18:00' }, log: { '2026-01-01': 'ok' }, gacha: { tickets: 3 } };
    const s = shape(old);
    expect(s.settings.cutoff).toBe('18:00');
    expect(s.gacha.tickets).toBe(3);
    expect(s.gacha.owned).toEqual({});
    expect(s.city.decor).toEqual({});
    expect(s.fest.floats).toEqual({});
  });
  it('copies nested objects instead of sharing them', () => {
    const src = { log: { a: 'ok' }, runs: [run('r1', 1)], shop: { owned: { ticket: 1 } } };
    const s = shape(src);
    s.log.a = 'miss'; s.runs[0].segs[0][1] = 99; s.shop.owned.ticket = 5;
    expect(src.log.a).toBe('ok');
    expect(src.runs[0].segs[0][1]).toBe(10);
    expect(src.shop.owned.ticket).toBe(1);
  });
});

describe('mergeState', () => {
  it('a reset (newer epoch) wins outright', () => {
    const a = st({ epoch: 0, xp: 500, log: { '2026-11-01': 'ok' } });
    const b = st({ epoch: 1000, xp: 0 });
    const m = mergeState(a, b);
    expect(m.xp).toBe(0);
    expect(m.log).toEqual({});
  });

  it('nights: the most recent edit wins, including clearing a night', () => {
    const a = st({ updatedAt: 10, log: { d1: 'ok', d2: 'light' }, logAt: { d1: 100, d2: 100 } });
    const b = st({ updatedAt: 20, log: { d1: 'miss' }, logAt: { d1: 200, d2: 300 } });   // d2 cleared later on b
    const m = mergeState(a, b);
    expect(m.log).toEqual({ d1: 'miss' });
    expect(m.logAt).toEqual({ d1: 200, d2: 300 });
  });

  it('things that only grow are combined', () => {
    const a = st({ updatedAt: 10, xp: 300, badges: ['first'], quests: { claimed: { q1: true } },
      gacha: { ...blank().gacha, owned: { cat: 2 }, pulls: 5 }, sessions: [{ t: 1, d: 60 }] });
    const b = st({ updatedAt: 20, xp: 200, badges: ['s3'], quests: { claimed: { q2: true } },
      gacha: { ...blank().gacha, owned: { cat: 1, owl: 1 }, pulls: 9 }, sessions: [{ t: 1, d: 60 }, { t: 2, d: 90 }] });
    const m = mergeState(a, b);
    expect(m.xp).toBe(300);
    expect(m.badges.sort()).toEqual(['first', 's3']);
    expect(m.quests.claimed).toEqual({ q1: true, q2: true });
    expect(m.gacha.owned).toEqual({ cat: 2, owl: 1 });
    expect(m.gacha.pulls).toBe(9);
    expect(m.sessions.map(x => x.t)).toEqual([1, 2]);
  });

  it('wallet and settings come from the copy changed most recently', () => {
    const a = st({ updatedAt: 10, settings: { ...blank().settings, cutoff: '17:00' }, gacha: { ...blank().gacha, tickets: 7 } });
    const b = st({ updatedAt: 20, settings: { ...blank().settings, cutoff: '19:00' }, gacha: { ...blank().gacha, tickets: 2 } });
    const m = mergeState(a, b);
    expect(m.settings.cutoff).toBe('19:00');
    expect(m.gacha.tickets).toBe(2);
  });

  it('runs: union by id, and a deleted run does not come back from the other device', () => {
    const a = st({ updatedAt: 20, runs: [run('r1', 1)], runDel: { r2: 99 } });          // r2 deleted here
    const b = st({ updatedAt: 10, runs: [run('r2', 2), run('r3', 3)] });
    for (const m of [mergeState(a, b), mergeState(b, a)]) {
      expect(m.runs.map(r => r.id)).toEqual(['r1', 'r3']);
      expect(m.runDel).toEqual({ r2: 99 });
    }
  });

  it('city, shop and festival progress from both devices survive', () => {
    const a = st({ updatedAt: 20,
      city: { crafted: 1, brickUsed: 3, woodUsed: 3, up: { d5: 1 }, decor: { 'm:0': 'tree' } },
      shop: { ...blank().shop, owned: { ticket: 2, balloon: 1 }, frozen: { d9: 1 } },
      fest: { floats: { d20: { d: 'kt_leaf', w: '', t: 1 } } } });
    const b = st({ updatedAt: 10,
      city: { crafted: 0, brickUsed: 7, woodUsed: 0, up: { d6: 1 }, decor: { 'm:1': 'lamp' } },
      shop: { ...blank().shop, owned: { ticket: 3, hat_crown: 1 }, frozen: {} },
      fest: { floats: { d21: { d: 'kt_bread', w: 'hi', t: 2 } } } });
    const m = mergeState(a, b);
    expect(m.city).toMatchObject({ crafted: 1, brickUsed: 7, woodUsed: 3, up: { d5: 1, d6: 1 }, decor: { 'm:0': 'tree', 'm:1': 'lamp' } });
    expect(m.shop.owned).toEqual({ ticket: 3, balloon: 1, hat_crown: 1 });
    expect(m.shop.frozen).toEqual({ d9: 1 });
    expect(Object.keys(m.fest.floats).sort()).toEqual(['d20', 'd21']);
  });

  it('gives the same result whichever device syncs first', () => {
    const a = st({ updatedAt: 20, xp: 50, log: { d1: 'ok' }, logAt: { d1: 5 }, runs: [run('r1', 1)], shop: { ...blank().shop, owned: { ticket: 1 } } });
    const b = st({ updatedAt: 10, xp: 80, log: { d2: 'light' }, logAt: { d2: 6 }, runs: [run('r2', 2)], shop: { ...blank().shop, owned: { goldt: 1 } } });
    expect(stable(mergeState(a, b))).toBe(stable(mergeState(b, a)));
  });

  it('keepA keeps this device as the base on first sign-in', () => {
    const local = st({ updatedAt: 5, settings: { ...blank().settings, name: 'Pee' } });
    const cloud = st({ updatedAt: 50, settings: { ...blank().settings, name: 'Old' } });
    expect(mergeState(local, cloud, true).settings.name).toBe('Pee');
  });
});

describe('pristine / stable', () => {
  it('a fresh install is pristine; any progress is not', () => {
    expect(pristine(blank())).toBe(true);
    expect(pristine(st({ log: { d1: 'ok' } }))).toBe(false);
    expect(pristine(st({ runs: [run('r', 1)] }))).toBe(false);
  });
  it('stable ignores key order (Postgres jsonb reorders keys)', () => {
    expect(stable({ b: 1, a: { d: 2, c: 3 } })).toBe(stable({ a: { c: 3, d: 2 }, b: 1 }));
  });
});
