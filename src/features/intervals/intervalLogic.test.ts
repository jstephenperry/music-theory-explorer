import { describe, expect, it } from 'vitest';
import { interval, intervalName, invert, transpose } from '../../theory/intervals';
import { note, noteName, pitchName, sameNote } from '../../theory/notes';
import {
  ALTERED_INTERVALS,
  COMPOUND_INTERVALS,
  JUST_RATIOS,
  PRIMARY_INTERVALS,
  classifyConsonance,
  compareTuning,
  contextFor,
  contextNames,
  contextUpperNote,
  cents,
  enharmonicSpellings,
  justRatio,
  parseState,
  spellFromKeys,
} from './intervalLogic';
import { MELODIC_REFERENCES } from './references';

describe('just ratios', () => {
  it('covers every interval in the grids', () => {
    for (const n of [...PRIMARY_INTERVALS, ...ALTERED_INTERVALS, ...COMPOUND_INTERVALS]) expect(justRatio(interval(n)), n).not.toBeNull();
  });
  it('has classic 5-limit values', () => {
    expect(JUST_RATIOS.P5).toEqual({ n: 3, d: 2 });
    expect(JUST_RATIOS.M3).toEqual({ n: 5, d: 4 });
    expect(JUST_RATIOS.m3).toEqual({ n: 6, d: 5 });
    expect(JUST_RATIOS.M6).toEqual({ n: 5, d: 3 });
  });
  it('pairs every interval with its inversion to make an octave', () => {
    for (const n of [...PRIMARY_INTERVALS, ...ALTERED_INTERVALS]) {
      const iv = interval(n);
      if (n === 'P8') continue;
      const inv = invert(iv);
      const a = JUST_RATIOS[n];
      const b = JUST_RATIOS[intervalName(inv)];
      if (!b) continue; // d8 and A8 are not in the table
      expect((a.n * b.n) / (a.d * b.d), `${n} x ${intervalName(inv)}`).toBeCloseTo(2, 10);
    }
  });
  it('is close to equal temperament (within 45 cents) and ordered by size', () => {
    for (const [n, r] of Object.entries(JUST_RATIOS)) expect(Math.abs(cents(r) - interval(n).semis * 100), n).toBeLessThan(45);
  });
  it('reduces compound ratios', () => {
    expect(justRatio(interval('M10'))).toEqual({ n: 5, d: 2 });
    expect(justRatio(interval('P12'))).toEqual({ n: 3, d: 1 });
    expect(justRatio(interval('P15'))).toEqual({ n: 4, d: 1 });
    expect(justRatio(interval('m9'))).toEqual({ n: 32, d: 15 });
  });
  it('compares just and tempered cents', () => {
    const m3 = compareTuning(interval('M3'))!;
    expect(m3.justCents).toBeCloseTo(386.31, 1);
    expect(m3.difference).toBeCloseTo(13.69, 1);
    const p5 = compareTuning(interval('P5'))!;
    expect(p5.difference).toBeCloseTo(-1.955, 2);
    expect(compareTuning(interval('P8'))!.difference).toBeCloseTo(0, 10);
  });
});

describe('consonance', () => {
  it('classifies by spelling, not only by sound', () => {
    expect(classifyConsonance(interval('P5')).cls).toBe('perfect consonance');
    expect(classifyConsonance(interval('P8')).cls).toBe('perfect consonance');
    expect(classifyConsonance(interval('m3')).cls).toBe('imperfect consonance');
    expect(classifyConsonance(interval('M10')).cls).toBe('imperfect consonance');
    expect(classifyConsonance(interval('A2')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('d4')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('A5')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('d7')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('A4')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('M7')).cls).toBe('dissonance');
    expect(classifyConsonance(interval('P4')).note).toMatch(/above the bass/);
  });
});

describe('enharmonic spellings', () => {
  it('lists the spellings that share keys', () => {
    const names = (s: number) => enharmonicSpellings(s).map(intervalName);
    expect(names(6)).toEqual(['A4', 'd5']);
    expect(names(3)).toEqual(['m3', 'A2']);
    expect(names(8)).toEqual(['m6', 'A5']);
    expect(names(0)).toEqual(['P1', 'd2']);
    expect(names(12)).toEqual(['P8', 'A7']);
    expect(names(14)).toEqual(['M9', 'd10']);
  });
  it('spells C to F sharp and C to G flat', () => {
    expect(noteName(transpose(note('C'), interval('A4')))).toBe('F♯');
    expect(noteName(transpose(note('C'), interval('d5')))).toBe('G♭');
  });
});

describe('contexts', () => {
  it('derive keys whose scale degrees produce exactly the spelled upper note', () => {
    for (const r of ['C', 'F#', 'Bb', 'E', 'Ab', 'D']) {
      for (const name of contextNames()) {
        const root = note(r);
        const expected = transpose(root, interval(name));
        const got = contextUpperNote(root, name)!;
        expect(sameNote(got, expected), `${r} ${name}: ${noteName(got)} vs ${noteName(expected)}`).toBe(true);
      }
    }
  });
  it('names the key', () => {
    expect(contextFor(note('C'), interval('A4'))!.keyName).toBe('G major');
    expect(contextFor(note('B'), interval('d5'))!.keyName).toBe('C major');
    expect(contextFor(note('Ab'), interval('A2'))!.keyName).toBe('C harmonic minor');
    expect(contextFor(note('C'), interval('A4'))!.text).toContain('F♯');
    expect(contextFor(note('C'), interval('P1'))).not.toBeNull();
  });
});

describe('state', () => {
  it('parses URL params with fallbacks', () => {
    const s = parseState('Eb', '3', 'm7');
    expect(pitchName(s.lower, false)).toBe('Eb3');
    expect(intervalName(s.iv)).toBe('m7');
    const bad = parseState('H', 'x', 'Q9');
    expect(pitchName(bad.lower, false)).toBe('C4');
    expect(intervalName(bad.iv)).toBe('M3');
  });
  it('spells intervals picked on the piano', () => {
    const a = spellFromKeys(60, 66, note('C'));
    expect(pitchName(a.lower, false)).toBe('C4');
    expect(intervalName(a.iv)).toBe('A4');
    const b = spellFromKeys(70, 61, note('C'));
    expect(pitchName(b.lower, false)).toBe('Db4');
    expect(intervalName(b.iv)).toBe('M6');
    const c = spellFromKeys(61, 65, note('C#'));
    expect(pitchName(c.lower, false)).toBe('C#4');
    const d = spellFromKeys(60, 77, note('C'));
    expect(intervalName(d.iv)).toBe('P11');
  });
});

describe('melodic references', () => {
  it('has at least one reference for every simple interval', () => {
    for (let s = 1; s <= 12; s++) expect(MELODIC_REFERENCES[s].up.length + MELODIC_REFERENCES[s].down.length).toBeGreaterThan(0);
  });
});
