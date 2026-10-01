import { describe, expect, it } from 'vitest';
import { makeKey, type Key } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { LIBRARY, LIBRARY_GROUPS } from './library';
import { parseNumeralText } from './model';

const TONICS = ['C', 'G', 'D', 'F', 'Bb', 'Eb', 'F#', 'A', 'Ab'];

function symbols(prog: string, key: Key): string[] {
  const r = parseNumeralText(prog, key);
  expect(r.errors).toEqual([]);
  return r.items.map((i) => parseRoman(i.numeral, key).symbol);
}

describe('progression library', () => {
  it('has at least 30 entries with unique ids and known groups', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30);
    expect(new Set(LIBRARY.map((e) => e.id)).size).toBe(LIBRARY.length);
    for (const e of LIBRARY) {
      expect(LIBRARY_GROUPS).toContain(e.group);
      expect(e.description.length).toBeGreaterThan(10);
      expect(e.era.length).toBeGreaterThan(0);
    }
  });

  it('every entry parses in its intended mode in many keys', () => {
    for (const e of LIBRARY) {
      const modes = e.mode === 'both' ? (['major', 'minor'] as const) : [e.mode];
      for (const m of modes) {
        for (const t of TONICS) {
          const r = parseNumeralText(e.progression, makeKey(t, m));
          expect(r.errors, `${e.id} in ${t} ${m}`).toEqual([]);
          expect(r.items.length).toBe(e.progression.trim().split(/\s+/).length);
        }
      }
    }
  });

  it('spells landmark progressions correctly', () => {
    const get = (id: string) => LIBRARY.find((e) => e.id === id)!.progression;
    expect(symbols(get('coltrane'), makeKey('C'))).toEqual(['Cmaj7', 'E♭7', 'A♭maj7', 'B7', 'Emaj7', 'G7', 'Cmaj7']);
    expect(symbols(get('coltrane'), makeKey('B'))).toEqual(['Bmaj7', 'D7', 'Gmaj7', 'A♯7', 'D♯maj7', 'F♯7', 'Bmaj7']);
    expect(symbols(get('countdown'), makeKey('C'))).toEqual(['Dm7', 'E♭7', 'A♭maj7', 'B7', 'Emaj7', 'G7', 'Cmaj7']);
    expect(symbols(get('hexatonic'), makeKey('C'))).toEqual(['C', 'Cm', 'A♭', 'A♭m', 'E', 'Em', 'C']);
    expect(symbols(get('andalusian'), makeKey('A', 'minor'))).toEqual(['Am', 'G', 'F', 'E']);
    expect(symbols(get('lament'), makeKey('D', 'minor'))).toEqual(['Dm', 'Am/C', 'Gm/B♭', 'A']);
    expect(symbols(get('backdoor'), makeKey('C'))).toEqual(['Fm7', 'B♭7', 'Cmaj7']);
    expect(symbols(get('tritone-sub'), makeKey('C'))).toEqual(['Dm7', 'D♭7', 'Cmaj7']);
    expect(symbols(get('lady-bird'), makeKey('C'))).toEqual(['Cmaj7', 'E♭maj7', 'A♭maj7', 'D♭maj7']);
    expect(symbols(get('ragtime'), makeKey('C'))).toEqual(['E7', 'A7', 'D7', 'G7', 'C']);
    expect(symbols(get('gospel'), makeKey('C'))).toEqual(['C', 'C7', 'F', 'F♯°7', 'C/G', 'G7', 'C']);
    expect(symbols(get('minor-two-five'), makeKey('C', 'minor'))).toEqual(['Dø7', 'G7♭9', 'Cm7']);
    expect(symbols(get('line-cliche'), makeKey('A', 'minor'))).toEqual(['Am', 'Am(maj7)', 'Am7', 'Am6']);
    expect(symbols(get('neapolitan'), makeKey('A', 'minor'))).toEqual(['Am', 'B♭/D', 'E7', 'Am']);
    expect(symbols(get('rhythm-a'), makeKey('Bb')).slice(0, 6)).toEqual(['B♭', 'Gm7', 'Cm7', 'F7', 'Dm7', 'G7']);
    expect(symbols(get('montgomery-ward'), makeKey('F'))).toEqual(['F7', 'B♭', 'G7', 'C7']);
    expect(symbols(get('chromatic-descent'), makeKey('C'))).toEqual(['C', 'G/B', 'C7/B♭', 'F/A', 'Fm/A♭', 'C/G', 'G7', 'C']);
    expect(symbols(get('octatonic'), makeKey('C'))).toEqual(['C', 'E♭', 'G♭', 'A', 'C']);
    expect(symbols(get('minor-blues'), makeKey('C', 'minor')).slice(8, 10)).toEqual(['A♭7', 'G7']);
  });
});
