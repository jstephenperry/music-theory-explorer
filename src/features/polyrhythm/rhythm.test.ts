import { describe, expect, it } from 'vitest';
import {
  compositeFractions,
  cyclePositions,
  fracString,
  gcd,
  lcm,
  lcmAll,
  mnemonic,
  onsetTimes,
  phaseDrift,
  polyGrid,
  polymeter,
  polyNotation,
  POLY_PRESETS,
  POLYMETER_PRESETS,
  ratioInterval,
} from './rhythm';

describe('gcd and lcm', () => {
  it('computes basics', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(lcm(3, 2)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(lcmAll([5, 4, 3])).toBe(60);
    expect(lcmAll([6, 4, 3])).toBe(12);
  });
});

describe('polyrhythm grid', () => {
  it('builds the 3:2 grid and composite rhythm', () => {
    const g = polyGrid([3, 2]);
    expect(g.size).toBe(6);
    expect(g.rows[0].map(Number)).toEqual([1, 0, 1, 0, 1, 0]);
    expect(g.rows[1].map(Number)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(g.composite).toEqual([0, 2, 3, 4]);
    expect(g.compositeIOI).toEqual([2, 1, 1, 2]);
    expect(g.together).toEqual([0]);
    expect(g.compositeLayers).toEqual([[0, 1], [0], [1], [0]]);
  });
  it('builds the 4:3 composite', () => {
    const g = polyGrid([4, 3]);
    expect(g.size).toBe(12);
    expect(g.compositeIOI).toEqual([3, 1, 2, 2, 1, 3]);
    expect(compositeFractions([4, 3]).map(fracString)).toEqual(['0', '1/4', '1/3', '1/2', '2/3', '3/4']);
  });
  it('finds shared onsets when counts share a factor', () => {
    expect(polyGrid([6, 4, 3]).together).toEqual([0]);
    expect(polyGrid([4, 2]).together).toEqual([0, 2]);
  });
  it('places onsets in time', () => {
    expect(onsetTimes(3, 2)).toEqual([0, 2 / 3, 4 / 3]);
  });
});

describe('mnemonics', () => {
  it('knows the classic phrases', () => {
    expect(mnemonic([3, 2])?.words).toBe('Nice cup of tea');
    expect(mnemonic([2, 3])?.syllables.length).toBe(4);
    expect(mnemonic([4, 3])?.syllables).toEqual(['Pass', 'the', 'gol', 'den', 'but', 'ter']);
    expect(mnemonic([5, 4])).toBeNull();
    expect(mnemonic([3, 2, 4])).toBeNull();
  });
});

describe('polymeter', () => {
  it('realigns at the LCM', () => {
    const p = polymeter([3, 4]);
    expect(p.period).toBe(12);
    expect(p.cycles).toEqual([4, 3]);
    expect(p.accents[0].filter(Boolean).length).toBe(4);
    expect(cyclePositions([3, 4], 5)).toEqual([3, 2]);
  });
  it('measures phase drift', () => {
    expect(phaseDrift(3, 4)).toEqual([0, 3, 2, 1]);
    expect(phaseDrift(4, 3)).toEqual([0, 1, 2]);
  });
});

describe('ratios as intervals', () => {
  it('names just intervals', () => {
    expect(ratioInterval(3, 2).description).toBe('perfect fifth');
    expect(ratioInterval(3, 2).cents).toBeCloseTo(701.955, 2);
    expect(ratioInterval(2, 3).justName).toBe('perfect fifth');
    expect(ratioInterval(5, 4).description).toBe('major third');
    expect(ratioInterval(5, 4).nearest.deviation).toBeCloseTo(-13.686, 2);
    expect(ratioInterval(4, 3).description).toBe('perfect fourth');
    expect(ratioInterval(7, 4).description).toBe('harmonic seventh');
    expect(ratioInterval(2, 1).description).toBe('octave');
    expect(ratioInterval(4, 1).description).toBe('2 octaves');
    expect(ratioInterval(3, 1).description).toContain('twelfth');
    expect(ratioInterval(5, 2).description).toBe('major third plus an octave');
    expect(ratioInterval(8, 7).description).toBe('septimal whole tone');
  });
});

describe('notation', () => {
  it('writes 3 against 2 as a quarter-note triplet', () => {
    const n = polyNotation(3, 2)!;
    expect(n.timeSig).toBe('2/4');
    expect(n.top).toMatchObject({ count: 3, dur: 'q', tuplet: { numNotes: 3, notesOccupied: 2, ratioed: false } });
    expect(n.bottom).toMatchObject({ count: 2, dur: 'q' });
  });
  it('writes 4 against 3 as dotted eighths and 2 against 3 as dotted quarters', () => {
    expect(polyNotation(4, 3)!.top).toMatchObject({ dur: '8', dots: 1, tuplet: null });
    expect(polyNotation(2, 3)!.top).toMatchObject({ dur: 'q', dots: 1, tuplet: null });
  });
  it('uses quintuplets, septuplets and ratioed tuplets', () => {
    expect(polyNotation(5, 4)!.top.tuplet).toEqual({ numNotes: 5, notesOccupied: 4, ratioed: false });
    expect(polyNotation(5, 3)!.top.tuplet).toEqual({ numNotes: 5, notesOccupied: 3, ratioed: true });
    expect(polyNotation(7, 4)!.top).toMatchObject({ dur: 'q', tuplet: { numNotes: 7, notesOccupied: 4 } });
    const sevenEight = polyNotation(7, 8)!;
    expect(sevenEight.timeSig).toBe('8/8');
    expect(sevenEight.top).toMatchObject({ dur: 'q', tuplet: { numNotes: 7, notesOccupied: 4 } });
    expect(polyNotation(3, 4)!.top).toMatchObject({ dur: 'h', tuplet: { numNotes: 3, notesOccupied: 2 } });
    expect(polyNotation(3, 9)).toBeNull();
  });
  it('can notate every two-layer preset', () => {
    for (const p of POLY_PRESETS.filter((x) => x.counts.length === 2)) expect(polyNotation(p.counts[0], p.counts[1])).not.toBeNull();
    expect(POLYMETER_PRESETS.length).toBeGreaterThan(3);
  });
});
