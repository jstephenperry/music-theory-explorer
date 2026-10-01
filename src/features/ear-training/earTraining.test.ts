import { describe, expect, it } from 'vitest';
import { midi, pitch, pitchName } from '../../theory/notes';
import {
  DEFAULT_SETTINGS,
  generateQuestion,
  ITEMS,
  itemWeight,
  mulberry32,
  normalizeSettings,
  recordAnswer,
  renderItem,
  scoreSession,
  EMPTY_SESSION,
  selectionOdds,
  statKey,
  weightedPick,
  type Settings,
  type Stats,
} from './earTraining';

const names = (ps: Array<{ letter: string; acc: number; octave: number }>) => ps.map((p) => pitchName(p as never)).join(' ');

describe('seedable random', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(xs[0]);
  });
});

describe('statistics and weighting', () => {
  it('records answers with a bounded recent window', () => {
    let s: Stats = {};
    for (let i = 0; i < 15; i++) s = recordAnswer(s, 'intervals:M3', i % 3 !== 0);
    expect(s['intervals:M3'].a).toBe(15);
    expect(s['intervals:M3'].c).toBe(10);
    expect(s['intervals:M3'].r).toHaveLength(10);
  });
  it('weights missed items above mastered ones', () => {
    const wrong = { a: 8, c: 0, r: [0, 0, 0, 0, 0, 0, 0, 0] };
    const right = { a: 8, c: 8, r: [1, 1, 1, 1, 1, 1, 1, 1] };
    expect(itemWeight(wrong)).toBeGreaterThan(itemWeight(undefined));
    expect(itemWeight(undefined)).toBeGreaterThan(itemWeight(right));
    expect(itemWeight(wrong) / itemWeight(right)).toBeGreaterThan(3);
    expect(itemWeight(wrong, false)).toBe(1);
  });
  it('weightedPick follows the weights', () => {
    const rng = mulberry32(7);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) counts[weightedPick(['a', 'b'] as const, [3, 1], rng)]++;
    expect(counts.a / 4000).toBeGreaterThan(0.7);
    expect(counts.a / 4000).toBeLessThan(0.8);
  });
  it('adaptive generation favors items the user gets wrong', () => {
    let stats: Stats = {};
    for (let i = 0; i < 10; i++) {
      stats = recordAnswer(stats, statKey('intervals', 'm3'), false);
      stats = recordAnswer(stats, statKey('intervals', 'P5'), true);
    }
    const settings: Settings = { ...DEFAULT_SETTINGS, items: { ...DEFAULT_SETTINGS.items, intervals: ['m3', 'P5'] } };
    const rng = mulberry32(1);
    let m3 = 0;
    for (let i = 0; i < 2000; i++) if (generateQuestion('intervals', settings, stats, rng).answer === 'm3') m3++;
    expect(m3 / 2000).toBeGreaterThan(0.7);
    const odds = selectionOdds('intervals', ['m3', 'P5'], stats, true);
    expect(odds.m3 + odds.P5).toBeCloseTo(1);
    expect(odds.m3).toBeGreaterThan(odds.P5);
    // Without adaptation the choice is even.
    const flat = { ...settings, adaptive: false };
    let m3b = 0;
    for (let i = 0; i < 2000; i++) if (generateQuestion('intervals', flat, stats, rng).answer === 'm3') m3b++;
    expect(m3b / 2000).toBeGreaterThan(0.44);
    expect(m3b / 2000).toBeLessThan(0.56);
  });
  it('avoids repeating the previous answer', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, adaptive: false, items: { ...DEFAULT_SETTINGS.items, chords: ['maj', 'min'] } };
    const rng = mulberry32(3);
    let same = 0;
    for (let i = 0; i < 2000; i++) if (generateQuestion('chords', settings, {}, rng, 'maj').answer === 'maj') same++;
    expect(same / 2000).toBeLessThan(0.35);
  });
});

describe('question generation', () => {
  it('produces answers from the selected items and roots within range', () => {
    const rng = mulberry32(99);
    const settings = { ...DEFAULT_SETTINGS, range: 'low' as const };
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion('intervals', settings, {}, rng);
      expect(settings.items.intervals).toContain(q.answer);
      expect(q.options).toEqual(settings.items.intervals);
      const m = (q.params.root.octave + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[q.params.root.letter] + q.params.root.acc;
      expect(m).toBeGreaterThanOrEqual(48);
      expect(m).toBeLessThanOrEqual(59);
    }
  });
  it('is reproducible with a seed', () => {
    const a = generateQuestion('chords', DEFAULT_SETTINGS, {}, mulberry32(5));
    const b = generateQuestion('chords', DEFAULT_SETTINGS, {}, mulberry32(5));
    expect(a).toEqual(b);
  });
  it('mixed direction yields all three directions', () => {
    const rng = mulberry32(11);
    const dirs = new Set<string>();
    for (let i = 0; i < 60; i++) dirs.add(generateQuestion('intervals', { ...DEFAULT_SETTINGS, intervalDirection: 'mixed' }, {}, rng).params.direction!);
    expect([...dirs].sort()).toEqual(['asc', 'desc', 'harmonic']);
  });
  it('puts Phrygian cadences and minor progressions in minor', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, keyMode: 'major', items: { ...DEFAULT_SETTINGS.items, cadences: ['phrygian', 'authentic'], progressions: ['i-VII-VI-V', 'I-IV-V-I'] } };
    const rng = mulberry32(2);
    for (let i = 0; i < 50; i++) {
      const c = generateQuestion('cadences', settings, {}, rng);
      expect(c.params.mode).toBe(c.answer === 'phrygian' ? 'minor' : 'major');
      const p = generateQuestion('progressions', settings, {}, rng);
      expect(p.params.mode).toBe(p.answer === 'i-VII-VI-V' ? 'minor' : 'major');
    }
  });
  it('normalizes stored settings', () => {
    const n = normalizeSettings({ bpm: 999, items: { ...DEFAULT_SETTINGS.items, chords: ['maj'] } } as Partial<Settings>);
    expect(n.bpm).toBe(200);
    expect(n.items.chords).toEqual(DEFAULT_SETTINGS.items.chords);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('rendering', () => {
  it('spells intervals in every direction', () => {
    const root = pitch('C4');
    expect(names(renderItem('intervals', 'M3', { root, direction: 'asc' }).events.flatMap((e) => e.pitches))).toBe('C4 E4');
    expect(names(renderItem('intervals', 'm3', { root, direction: 'desc' }).events.flatMap((e) => e.pitches))).toBe('C4 A3');
    const h = renderItem('intervals', 'A4', { root: pitch('Eb4'), direction: 'harmonic' });
    expect(h.events).toHaveLength(1);
    expect(names(h.events[0].pitches)).toBe('E♭4 A4');
    expect(names(renderItem('intervals', 'm6', { root: pitch('F#3'), direction: 'asc' }).focus)).toBe('F♯3 D4');
  });
  it('voices chords with inversions and styles', () => {
    expect(names(renderItem('chords', 'dim', { root: pitch('B3'), inversion: 0 }).focus)).toBe('B3 D4 F4');
    expect(names(renderItem('chords', 'maj', { root: pitch('C4'), inversion: 1 }).focus)).toBe('E4 G4 C5');
    const both = renderItem('chords', 'maj7', { root: pitch('Db4'), chordStyle: 'both' });
    expect(both.events).toHaveLength(5);
    expect(names(both.focus)).toBe('D♭4 F4 A♭4 C5');
  });
  it('renders scales ascending, descending and both', () => {
    const up = renderItem('scales', 'harmonic-minor', { root: pitch('A3'), scaleDirection: 'asc' });
    expect(names(up.events.flatMap((e) => e.pitches))).toBe('A3 B3 C4 D4 E4 F4 G♯4 A4');
    const both = renderItem('scales', 'major-pentatonic', { root: pitch('C4'), scaleDirection: 'both' });
    expect(both.events).toHaveLength(11);
    expect(names(both.events.map((e) => e.pitches[0]).slice(-2))).toBe('D4 C4');
  });
  it('renders degree questions after a cadence in the key', () => {
    const r = renderItem('degrees', 'b3', { root: pitch('D4'), mode: 'minor' });
    expect(r.events).toHaveLength(5);
    expect(names(r.focus)).toBe('F4');
    expect(r.keySig?.mode).toBe('minor');
    expect(r.staff[r.staff.length - 1].top).toBe('♭3');
    const m = renderItem('degrees', '7', { root: pitch('Eb4'), mode: 'major' });
    expect(names(m.focus)).toBe('D5');
  });
  it('renders cadences and progressions with roman numerals', () => {
    const dec = renderItem('cadences', 'deceptive', { root: pitch('C4'), mode: 'major' });
    expect(dec.staff.map((s) => s.bottom)).toEqual(['I', 'IV', 'V⁷', 'vi']);
    const phr = renderItem('cadences', 'phrygian', { root: pitch('A4'), mode: 'minor' });
    expect(phr.keySig?.mode).toBe('minor');
    expect(phr.events).toHaveLength(4);
    // iv6 has the minor sixth degree (F) in the bass, moving to E.
    const bass = phr.events.map((e) => [...e.pitches].sort((a, b) => midi(a) - midi(b))[0]);
    expect(bass[2].letter).toBe('F');
    expect(bass[3].letter).toBe('E');
    const pr = renderItem('progressions', 'I-V-vi-IV', { root: pitch('G4'), mode: 'major' });
    expect(pr.events).toHaveLength(4);
    expect(pr.keySig?.tonic.letter).toBe('G');
  });
  it('every catalog item renders', () => {
    for (const type of Object.keys(ITEMS) as Array<keyof typeof ITEMS>) {
      for (const item of ITEMS[type]) {
        const r = renderItem(type, item.id, { root: pitch('E4'), mode: 'minor', direction: 'asc', inversion: 0 });
        expect(r.events.length).toBeGreaterThan(0);
        expect(r.staff.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('session', () => {
  it('tracks score and streaks', () => {
    let s = EMPTY_SESSION;
    for (const c of [true, true, false, true]) s = scoreSession(s, c);
    expect(s).toEqual({ correct: 3, total: 4, streak: 1, best: 2 });
  });
});
