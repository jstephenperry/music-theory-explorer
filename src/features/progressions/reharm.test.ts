import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { insertBefore, reharmTools } from './reharm';
import type { ProgItem } from './model';

const C = makeKey('C', 'major');
const p = (s: string): ProgItem[] => s.split(' ').map((t) => {
  const [numeral, beats] = t.split(':');
  return { numeral, beats: beats ? Number(beats) : 4 };
});
const tool = (items: ProgItem[], i: number, id: string, k = C) => reharmTools(items, i, k).find((t) => t.id === id)!;

describe('insertBefore', () => {
  it('borrows time from the previous chord', () => {
    expect(insertBefore(p('I ii'), 1, ['V7/ii'])).toEqual(p('I:2 V7/ii:2 ii'));
    expect(insertBefore(p('I ii'), 1, ['ii7/ii', 'V7/ii'])).toEqual(p('I:2 ii7/ii:1 V7/ii:1 ii'));
  });
  it('adds two beats each when there is no room', () => {
    expect(insertBefore(p('I'), 0, ['V7'])).toEqual(p('V7:2 I'));
  });
});

describe('reharmTools', () => {
  it('inserts secondary dominants and ii–V approaches', () => {
    const items = p('I vi ii V7 I');
    expect(tool(items, 1, 'secondary').options[0].numerals).toEqual(['V7/vi']);
    expect(tool(items, 4, 'secondary').options[0].numerals).toEqual(['V7']);
    expect(tool(items, 1, 'twofive').options[0].numerals).toEqual(['iiø7/vi', 'V7/vi']);
    expect(tool(items, 2, 'twofive').options[1].numerals).toEqual(['ii7/ii', 'bII7/ii'].map((x) => x.replace('ii7/ii', 'iiø7/ii')));
    const sym = tool(items, 1, 'twofive').options[0].numerals.map((n) => parseRoman(n, C).symbol);
    expect(sym).toEqual(['Bø7', 'E7']);
  });
  it('tritone-substitutes dominants only', () => {
    expect(tool(p('ii7 V7 I'), 1, 'tritone').options[0].numerals).toEqual(['bII7']);
    expect(tool(p('V7/V V'), 0, 'tritone').options[0].numerals).toEqual(['bII7/V']);
    expect(parseRoman('bII7/V', C).symbol).toBe('A♭7');
    expect(tool(p('bII7 I'), 0, 'tritone').options[0].numerals).toEqual(['V7']);
    expect(tool(p('ii7 V7 I'), 0, 'tritone').unavailable).toBeTruthy();
  });
  it('offers borrowed equivalents on the same degree', () => {
    const t = tool(p('I IV V I'), 1, 'borrowed');
    const syms = t.options.map((o) => parseRoman(o.numerals[0], C).symbol);
    expect(syms[0]).toBe('Fm');
    expect(t.options[0].label).toMatch(/C minor/);
    const back = tool(p('I bVI V I'), 1, 'borrowed');
    expect(back.options[0].numerals).toEqual(['vi']);
    const sev = tool(p('Imaj7 IVmaj7'), 1, 'borrowed');
    expect(parseRoman(sev.options[0].numerals[0], C).symbol).toBe('Fm7');
  });
  it('offers chromatic mediant substitutes outside the key', () => {
    const t = tool(p('I IV'), 0, 'mediant');
    const syms = t.options.map((o) => parseRoman(o.numerals[0], C).symbol).sort();
    expect(syms).toEqual(['A', 'A♭', 'E', 'E♭'].sort());
    expect(t.options[0].items).toHaveLength(2);
  });
});
