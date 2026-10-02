import { describe, expect, it } from 'vitest';
import { CANTUS_FIRMI, checkCounterpoint, isComplete, leadingTone, solveCounterpoint, type CPNote, type Exercise } from '../composition/counterpoint';
import { pitch, pitchName } from '../notes';

const ps = (s: string): CPNote[] => s.split(' ').map((t) => (t === 'r' ? 'rest' : t === '_' ? null : pitch(t)));
const cfOf = (id: string) => CANTUS_FIRMI.find((c) => c.id === id)!.notes.split(' ').map(pitch);
const D: Exercise = { cf: cfOf('d'), species: 1, above: true };
const errors = (ex: Exercise, cp: CPNote[]) => checkCounterpoint(ex, cp).filter((i) => i.severity === 'error');

describe('first species', () => {
  it('accepts Fux’s own solution above the Dorian cantus firmus', () => {
    const fux = ps('A4 A4 G4 A4 B4 C5 C5 B4 D5 C#5 D5');
    expect(errors(D, fux)).toEqual([]);
    expect(isComplete(D, fux)).toBe(true);
    // Fux repeats two notes; the checker notes it without calling it an error.
    expect(checkCounterpoint(D, fux).filter((i) => i.rule === 'repeat')).toHaveLength(2);
  });

  it('finds parallel fifths, dissonances and a weak ending', () => {
    const bad = ps('A4 C5 B4 A4 D5 F5 E5 D5 C5 B4 D5');
    const rules = errors(D, bad).map((i) => i.rule);
    expect(rules).toContain('parallel');
    expect(rules).toContain('end');
  });

  it('calls a fourth a dissonance and a diminished fourth too, though it sounds like a third', () => {
    const cp = ps('A4 Bb4 _ _ _ _ _ _ _ _ _');
    expect(errors(D, cp).map((i) => i.rule)).toContain('consonance');
    const ex: Exercise = { cf: [pitch('C#4'), pitch('D4')], species: 1, above: true };
    expect(errors(ex, ps('F4 _')).some((i) => i.rule === 'consonance')).toBe(true);
  });

  it('requires a perfect consonance to begin, and no fifth below', () => {
    const below: Exercise = { ...D, above: false };
    expect(errors(below, ps('G3 _ _ _ _ _ _ _ _ _ _')).map((i) => i.rule)).toContain('begin');
    expect(errors(below, ps('D3 _ _ _ _ _ _ _ _ _ _'))).toEqual([]);
  });

  it('spells the leading tone', () => {
    expect(pitchName(leadingTone(pitch('D5')), false)).toBe('C#5');
    expect(pitchName(leadingTone(pitch('C5')), false)).toBe('B4');
  });
});

describe('second species', () => {
  const ex: Exercise = { cf: cfOf('d'), species: 2, above: true };
  it('allows a passing dissonance and rejects a neighbor dissonance', () => {
    // D-A, then G (a fourth above D) passing down to F over F.
    expect(errors(ex, ps('A4 G4 F4 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _')).filter((i) => i.rule === 'passing')).toEqual([]);
    expect(errors(ex, ps('A4 G4 A4 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _')).map((i) => i.rule)).toContain('passing');
  });

  it('may begin with a half rest', () => {
    expect(errors(ex, ps('r A4 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _'))).toEqual([]);
  });
});

describe('solver', () => {
  for (const cf of CANTUS_FIRMI)
    for (const species of [1, 2] as const)
      for (const above of [true, false]) {
        it(`solves ${cf.name}, species ${species}, ${above ? "above" : "below"}, without warnings`, () => {
          const ex: Exercise = { cf: cf.notes.split(' ').map(pitch), species, above };
          let seed = 7;
          const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          const sol = solveCounterpoint(ex, { random });
          expect(sol).not.toBeNull();
          expect(isComplete(ex, sol!)).toBe(true);
          expect(checkCounterpoint(ex, sol!).filter((i) => !i.soft)).toEqual([]);
        });
      }
});
