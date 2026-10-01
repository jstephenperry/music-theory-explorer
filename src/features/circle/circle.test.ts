import { describe, expect, it } from 'vitest';
import { keyName, makeKey, note, noteName } from '../../theory';
import {
  circleWalkChords,
  circleWalkRoots,
  harmonyPositions,
  nearestAngle,
  normalizeFifths,
  polar,
  sectorPath,
  signatureLabel,
  slotAngle,
  slotKeys,
  slotOfKey,
  slotOfMajorRoot,
  slotOfMinorRoot,
} from './circle';

describe('slots', () => {
  it('places keys by signature', () => {
    expect(slotOfKey(makeKey('C'))).toBe(0);
    expect(slotOfKey(makeKey('A', 'minor'))).toBe(0);
    expect(slotOfKey(makeKey('Eb'))).toBe(9);
    expect(slotOfKey(makeKey('C', 'minor'))).toBe(9);
    expect(slotOfKey(makeKey('Cb'))).toBe(5);
    expect(slotOfKey(makeKey('C#'))).toBe(7);
  });

  it('lists enharmonic pairs at the bottom', () => {
    expect(slotKeys(5, 'major').map((k) => keyName(k))).toEqual(['B major', 'C♭ major']);
    expect(slotKeys(6, 'major').map((k) => keyName(k))).toEqual(['F♯ major', 'G♭ major']);
    expect(slotKeys(7, 'major').map((k) => keyName(k))).toEqual(['D♭ major', 'C♯ major']);
    expect(slotKeys(6, 'minor').map((k) => keyName(k))).toEqual(['D♯ minor', 'E♭ minor']);
    expect(slotKeys(9, 'minor').map((k) => keyName(k))).toEqual(['C minor']);
  });

  it('maps chord roots to ring slots', () => {
    expect(slotOfMajorRoot(note('F'))).toBe(11);
    expect(slotOfMinorRoot(note('D'))).toBe(11);
    expect(slotOfMinorRoot(note('B'))).toBe(2);
  });
});

describe('geometry', () => {
  it('measures angles clockwise from the top', () => {
    const [x, y] = polar(0, 0, 10, 90);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(0);
    expect(slotAngle(1, 'fifths')).toBe(30);
    expect(slotAngle(1, 'fourths')).toBe(-30);
  });

  it('takes the short way round', () => {
    expect(nearestAngle(350, 10)).toBe(370);
    expect(nearestAngle(0, 270)).toBe(-90);
    expect(nearestAngle(-30, -30)).toBe(-30);
  });

  it('draws closed sector paths', () => {
    expect(sectorPath(0, 0, 10, 20, -15, 15)).toMatch(/^M.*Z$/);
  });

  it('labels signatures', () => {
    expect(signatureLabel(0)).toBe('0');
    expect(signatureLabel(3)).toBe('3♯');
    expect(signatureLabel(-2)).toBe('2♭');
  });
});

describe('harmony positions', () => {
  it('places the diatonic chords of C major in a wedge', () => {
    const pos = harmonyPositions(makeKey('C'));
    const byNumeral = Object.fromEntries(pos.map((p) => [p.numeral, p]));
    expect(byNumeral['I']).toMatchObject({ slot: 0, ring: 'major', mode: 'Ionian' });
    expect(byNumeral['IV']).toMatchObject({ slot: 11, ring: 'major', mode: 'Lydian' });
    expect(byNumeral['V']).toMatchObject({ slot: 1, ring: 'major', mode: 'Mixolydian' });
    expect(byNumeral['ii']).toMatchObject({ slot: 11, ring: 'minor', mode: 'Dorian' });
    expect(byNumeral['iii']).toMatchObject({ slot: 1, ring: 'minor', mode: 'Phrygian' });
    expect(byNumeral['vi']).toMatchObject({ slot: 0, ring: 'minor', mode: 'Aeolian' });
    expect(byNumeral['vii°']).toMatchObject({ slot: 2, ring: 'minor', mode: 'Locrian' });
    expect(noteName(byNumeral['vii°'].root)).toBe('B');
  });

  it('uses minor-key numerals for a minor key', () => {
    const pos = harmonyPositions(makeKey('A', 'minor'));
    const byNumeral = Object.fromEntries(pos.map((p) => [p.numeral, p]));
    expect(noteName(byNumeral['i'].root)).toBe('A');
    expect(byNumeral['i'].ring).toBe('minor');
    expect(noteName(byNumeral['III'].root)).toBe('C');
    expect(noteName(byNumeral['VII'].root)).toBe('G');
    expect(noteName(byNumeral['ii°'].root)).toBe('B');
  });

  it('spells modes from the parent scale', () => {
    const pos = harmonyPositions(makeKey('Eb'));
    expect(pos.map((p) => `${noteName(p.root)} ${p.mode}`)).toEqual([
      'E♭ Ionian',
      'F Dorian',
      'G Phrygian',
      'A♭ Lydian',
      'B♭ Mixolydian',
      'C Aeolian',
      'D Locrian',
    ]);
  });
});

describe('walking the circle', () => {
  it('descends in fifths with readable spellings', () => {
    expect(circleWalkRoots(note('C')).map((n) => noteName(n))).toEqual(['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'B', 'E', 'A', 'D', 'G']);
    expect(normalizeFifths(7)).toBe(-5);
  });

  it('chains dominant sevenths and resolves home', () => {
    const chain = circleWalkChords(note('Eb'));
    expect(chain).toHaveLength(13);
    expect(chain[0].chordId).toBe('7');
    expect(noteName(chain[11].root)).toBe('B♭');
    expect(chain[12]).toMatchObject({ chordId: 'maj' });
    expect(noteName(chain[12].root)).toBe('E♭');
    expect(circleWalkChords(note('A'), 'min')[12].chordId).toBe('min');
  });
});
