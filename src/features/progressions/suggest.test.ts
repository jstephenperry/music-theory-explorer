import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { baseTriad, dominantTarget, suggestNext } from './suggest';

const C = makeKey('C', 'major');
const Am = makeKey('A', 'minor');
const all = (cur: string, k = C) => suggestNext(cur, k).flatMap((g) => g.items.map((i) => i.numeral));
const nums = (cur: string, id: string, k = C) => suggestNext(cur, k).find((g) => g.id === id)?.items.map((i) => i.numeral) ?? [];

describe('dominantTarget', () => {
  it('finds the goal of dominants', () => {
    expect(dominantTarget(parseRoman('V7', C), C)?.numeral).toBe('I');
    expect(dominantTarget(parseRoman('V7/ii', C), C)?.numeral).toBe('ii');
    expect(dominantTarget(parseRoman('vii°7/V', C), C)?.numeral).toBe('V');
    expect(dominantTarget(parseRoman('bII7', C), C)?.numeral).toBe('I');
    expect(dominantTarget(parseRoman('bVII7', C), C)?.numeral).toBe('I');
    expect(dominantTarget(parseRoman('III7', C), C)?.numeral).toBe('vi');
    expect(dominantTarget(parseRoman('V', Am), Am)?.numeral).toBe('i');
    expect(dominantTarget(parseRoman('IV', C), C)).toBeNull();
    expect(dominantTarget(parseRoman('ii7', C), C)).toBeNull();
  });
  it('reduces chords to their base triad', () => {
    expect(baseTriad(parseRoman('ii7', C), C)).toBe('ii');
    expect(baseTriad(parseRoman('V7/V', C), C)).toBe('II');
    expect(baseTriad(parseRoman('bVImaj7', C), C)).toBe('bVI');
  });
});

describe('suggestNext', () => {
  it('resolves dominants and offers deceptive moves', () => {
    expect(nums('V7', 'strong')).toEqual(['I', 'Imaj7']);
    expect(nums('V7', 'deceptive')).toEqual(['vi', 'bVI', 'IV6']);
    expect(nums('V7', 'tritone')).toEqual(['bII7']);
    expect(nums('V7/ii', 'strong')).toEqual(['ii']);
    expect(nums('V7/ii', 'deceptive')).toEqual(['bVII']);
  });
  it('moves down a fifth from non-dominants', () => {
    expect(nums('I', 'strong')[0]).toBe('IV');
    expect(nums('vi', 'strong')[0]).toBe('ii');
    expect(nums('ii7', 'strong')[0]).toBe('V7');
  });
  it('offers predominant to dominant motion', () => {
    expect(all('IV')).toEqual(expect.arrayContaining(['V', 'V7', 'Cad64']));
    expect(nums('IV', 'functional')).toEqual(expect.arrayContaining(['V7', 'Cad64']));
    expect(nums('Ger+6', 'functional')[0]).toBe('Cad64');
    expect(all('I')).toEqual(expect.arrayContaining(['ii', 'IV']));
  });
  it('offers chromatic mediants outside the key', () => {
    const med = nums('I', 'mediant').map((n) => parseRoman(n, C).symbol);
    expect(med.sort()).toEqual(['A', 'E']);
    // ♭VI and ♭III also qualify but are listed once, under borrowed color.
    expect(all('I')).toEqual(expect.arrayContaining(['bVI', 'bIII']));
  });
  it('offers secondary dominants of plausible next chords', () => {
    expect(nums('I', 'secondary')).toContain('V7/IV');
    expect(nums('ii7', 'secondary')).toContain('V7/V');
  });
  it('never suggests unparseable or duplicate chords', () => {
    for (const k of [C, Am, makeKey('F#'), makeKey('Eb', 'minor')]) {
      for (const cur of ['I', 'i', 'ii7', 'iiø7', 'IV', 'iv', 'V7', 'V', 'vi', 'VI', 'bVI', 'bVII7', 'V7/V', 'vii°7/vi', 'N6', 'It+6', 'Cad64', 'III', '#iv°7', 'I+', 'bII7']) {
        const all = suggestNext(cur, k).flatMap((g) => g.items.map((i) => i.numeral));
        expect(new Set(all).size).toBe(all.length);
        for (const n of all) expect(() => parseRoman(n, k), `${cur} -> ${n}`).not.toThrow();
      }
    }
  });
});
