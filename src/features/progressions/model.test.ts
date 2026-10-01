import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { chordLabel, keyFromParams, normalizeNumeral, parseNumeralText, parseSymbolText, serializeItems, symbolToNumeral } from './model';

const C = makeKey('C', 'major');
const Cm = makeKey('C', 'minor');

describe('normalizeNumeral', () => {
  it('maps typing shortcuts to parser syntax', () => {
    expect(normalizeNumeral('nIII')).toBe('♮III');
    expect(normalizeNumeral('iih7')).toBe('iiø7');
    expect(normalizeNumeral('viidim7')).toBe('vii°7');
    expect(normalizeNumeral('♭VI')).toBe('bVI');
    expect(normalizeNumeral('V7/nvi')).toBe('V7/♮vi');
    expect(normalizeNumeral('N6')).toBe('N6');
  });
  it('produces parseable numerals', () => {
    expect(parseRoman(normalizeNumeral('nIII'), Cm).symbol).toBe('E');
    expect(parseRoman(normalizeNumeral('iih7'), C).symbol).toBe('Dø7');
  });
});

describe('progression text', () => {
  it('parses durations and reports errors with positions', () => {
    const r = parseNumeralText('ii7:2 V7:2 Imaj7:8 Xyz', C);
    expect(r.items).toEqual([
      { numeral: 'ii7', beats: 2 },
      { numeral: 'V7', beats: 2 },
      { numeral: 'Imaj7', beats: 8 },
    ]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].index).toBe(3);
    expect(r.errors[0].token).toBe('Xyz');
  });
  it('rejects bad durations', () => {
    expect(parseNumeralText('I:0', C).errors).toHaveLength(1);
    expect(parseNumeralText('I:40', C).errors).toHaveLength(1);
  });
  it('round trips through serialization', () => {
    const text = 'I vi7:2 ii7:2 V7/ii It+6 Cad64:2 V7:2 I:8';
    const items = parseNumeralText(text, C).items;
    expect(serializeItems(items)).toBe(text);
  });
});

describe('chord symbols', () => {
  it('analyzes symbols into numerals', () => {
    const r = parseSymbolText('Dm7 G7 Cmaj7:8 Ab7 Db7', C);
    expect(r.errors).toEqual([]);
    expect(r.items.map((i) => i.numeral)).toEqual(['ii7', 'V7', 'Imaj7', 'bVI7', 'bII7']);
    expect(r.items[2].beats).toBe(8);
  });
  it('keeps inversions from slash chords', () => {
    expect(symbolToNumeral('G/B', C).numeral).toBe('V6');
    expect(symbolToNumeral('G7/F', C).numeral).toBe('V42');
    expect(parseRoman(symbolToNumeral('Am/C', C).numeral, C).symbol).toBe('Am/C');
  });
  it('drops a non-chord-tone bass with a warning', () => {
    const r = symbolToNumeral('C/D', C);
    expect(r.numeral).toBe('I');
    expect(r.warning).toMatch(/not a chord tone/);
  });
  it('analyzes in minor with naturals', () => {
    const n = symbolToNumeral('E7', Cm).numeral;
    expect(parseRoman(n, Cm).symbol).toBe('E7');
  });
  it('reports unreadable symbols', () => {
    const r = parseSymbolText('Dm7 Hm7', C);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].token).toBe('Hm7');
  });
});

describe('helpers', () => {
  it('reads keys from params with a fallback', () => {
    expect(keyFromParams('F#', 'minor')).toEqual(makeKey('F#', 'minor'));
    expect(keyFromParams('zz', 'x')).toEqual(makeKey('C', 'major'));
  });
  it('labels augmented sixths readably', () => {
    expect(chordLabel(parseRoman('Ger+6', C))).toBe('A♭ Ger⁺⁶');
    expect(chordLabel(parseRoman('V7', C))).toBe('G7');
  });
});
