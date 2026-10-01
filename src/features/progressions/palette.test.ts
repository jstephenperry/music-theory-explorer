import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { buildPalette } from './palette';

describe('buildPalette', () => {
  for (const mode of ['major', 'minor'] as const) {
    for (const t of ['C', 'F#', 'Eb', 'A']) {
      it(`every chord parses in ${t} ${mode}`, () => {
        const key = makeKey(t, mode);
        const groups = buildPalette(key);
        expect(groups.map((g) => g.id)).toEqual(['diatonic', 'borrowed', 'secondary', 'substitutions', 'chromatic']);
        for (const g of groups) {
          expect(g.tooltip.length).toBeGreaterThan(20);
          for (const s of g.sections) for (const c of s.chords) expect(() => parseRoman(c.numeral, key), c.numeral).not.toThrow();
        }
      });
    }
  }
  it('generates the right borrowed and secondary chords in C major', () => {
    const key = makeKey('C');
    const g = buildPalette(key);
    const sym = (id: string) => g.find((x) => x.id === id)!.sections.flatMap((s) => s.chords.map((c) => parseRoman(c.numeral, key).symbol));
    expect(sym('borrowed')).toEqual(expect.arrayContaining(['A♭', 'B♭', 'Fm', 'E♭', 'D♭', 'D']));
    expect(sym('secondary')).toEqual(expect.arrayContaining(['A7', 'B7', 'C7', 'D7', 'E7', 'C♯°7', 'F♯°7']));
    expect(sym('substitutions')).toEqual(expect.arrayContaining(['D♭7', 'A♭7', 'E♭7', 'B♭7', 'Fm7']));
  });
  it('uses naturals for chromatic mediants in minor', () => {
    const key = makeKey('C', 'minor');
    const g = buildPalette(key).find((x) => x.id === 'chromatic')!;
    const med = g.sections.find((s) => s.title === 'Chromatic mediants')!.chords.map((c) => parseRoman(c.numeral, key).symbol);
    expect(med).toEqual(['E', 'A', 'E♭m', 'A♭m', 'Em', 'Am']);
  });
});
