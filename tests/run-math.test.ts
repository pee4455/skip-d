import { describe, it, expect } from 'vitest';
import { segTotals, kcalPerMin, paceStr, durStr, kmStr, parseDur, splits, bestTime, buildRun, runXP } from '../src/lib/run-math';
import type { Seg } from '../src/lib/state';

describe('segTotals', () => {
  it('30 min at 10 km/h on the flat is 5 km and ~387 kcal at 70 kg (ACSM running)', () => {
    const t = segTotals([[0, 10, 0]], 1800, 70);
    expect(t.dist).toBeCloseTo(5, 6);
    expect(t.elev).toBe(0);
    expect(t.kcal).toBeCloseTo(386.75, 2);   // VO2 = 0.2·166.7 + 3.5 = 36.83 ml/kg/min → 12.89 kcal/min
  });
  it('adds up changing speed and counts climb from incline', () => {
    // 10 min walking at 6 km/h on 2%, then 20 min at 9 km/h flat
    const t = segTotals([[0, 6, 2], [600, 9, 0]], 1800, 70);
    expect(t.dist).toBeCloseTo(4, 6);
    expect(t.elev).toBeCloseTo(20, 6);     // 1 km at 2%
  });
  it('uses the walking equation below 6.5 km/h', () => {
    expect(kcalPerMin(5, 0, 70)).toBeLessThan(kcalPerMin(7, 0, 70));
    expect(kcalPerMin(0, 5, 70)).toBe(0);
  });
});

describe('formatting', () => {
  it('pace and duration', () => {
    expect(paceStr(359.6)).toBe('6:00');
    expect(paceStr(3600 / 10)).toBe('6:00');
    expect(paceStr(NaN)).toBe('–:––');
    expect(durStr(810)).toBe('13:30');
    expect(durStr(3723)).toBe('1:02:03');
  });
  it('distance rounds down like a treadmill console', () => {
    expect(kmStr(1.999)).toBe('1.99');
    expect(kmStr(2)).toBe('2.00');
  });
  it('parses durations typed by hand', () => {
    expect(parseDur('32:10')).toBe(1930);
    expect(parseDur('1:02:03')).toBe(3723);
    expect(parseDur('45')).toBe(2700);
    expect(parseDur('a')).toBeNaN();
    expect(parseDur('')).toBeNaN();
  });
  it('XP grows with distance', () => {
    expect(runXP(0)).toBe(10);
    expect(runXP(5)).toBe(60);
  });
});

describe('splits and best efforts', () => {
  const segs: Seg[] = [[0, 6, 2], [600, 9, 0]];
  const r = { id: 'x', at: 0, dur: 1800, dist: 4, segs, elev: 20, kcal: 0, feel: 0 };
  it('one split per kilometre', () => {
    expect(splits(r).map(s => paceStr(s.sec / (s.part || 1)))).toEqual(['10:00', '6:40', '6:40', '6:40']);
  });
  it('fastest 1 km is found inside the run, not the average', () => {
    expect(durStr(bestTime(r, 1000))).toBe('6:40');
    expect(bestTime(r, 5000)).toBe(Infinity);
  });
});

describe('buildRun', () => {
  const draft = { id: 'y', at: 0, segs: [[0, 6, 2], [600, 9, 0]] as Seg[], rawDur: 1800 };
  it('keeps totals when nothing was edited', () => {
    const r = buildRun({ ...draft, dur: 1800, dist: 4 }, 70);
    expect(r.dist).toBe(4);
    expect(r.segs).toEqual([[0, 6, 2], [600, 9, 0]]);
    expect(r.elev).toBe(20);
  });
  it('rescales to match the treadmill screen (4.20 km in 31:00)', () => {
    const r = buildRun({ ...draft, dur: 1860, dist: 4.2 }, 70);
    expect(r.dur).toBe(1860);
    expect(r.segs[1][0]).toBe(620);
    expect(segTotals(r.segs, 1860, 70).dist).toBeCloseTo(4.2, 2);
  });
  it('a manual log becomes one steady segment', () => {
    const r = buildRun({ id: 'm', at: 0, segs: [[0, 9.3, 1]], rawDur: 2400, dur: 2400, dist: 6.2, manual: true }, 70);
    expect(r.manual).toBe(1);
    expect(r.segs).toEqual([[0, 9.3, 1]]);
    expect(r.elev).toBe(62);
  });
  it('uses the calories typed by the user when given', () => {
    expect(buildRun({ ...draft, dur: 1800, dist: 4, kcal: 321 }, 70).kcal).toBe(321);
  });
});
