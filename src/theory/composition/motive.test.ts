import { describe, expect, it } from 'vitest';
import { contour, develop, invertChromatic, invertDiatonic, retrograde, scaleRhythm, sequence, stepContour, stepPitch, transposeReal, type Motive } from './motive';
import { makeKey } from '../keys';
import { pitch, pitchName } from '../notes';

const C = makeKey('C');
const m = (s: string): Motive => s.split(' ').map((t) => ({ pitch: t === 'r' ? null : pitch(t), dur: 0.25 }));
const names = (x: Motive) => x.map((n) => (n.pitch ? pitchName(n.pitch, false) : 'r')).join(' ');

// Bach, Invention No. 1: the motive and its inversion.
const BACH = m('C4 D4 E4 F4 D4 E4 C4');

describe('motive transformations', () => {
  it('moves by scale steps, keeping chromatic alterations', () => {
    expect(pitchName(stepPitch(pitch('B4'), 1, C), false)).toBe('C5');
    expect(pitchName(stepPitch(pitch('F#4'), 1, C), false)).toBe('G#4');
    expect(pitchName(stepPitch(pitch('C4'), -1, makeKey('F')), false)).toBe('Bb3');
  });

  it('sequences tonally: Beethoven 5 moves down a step from G G G Eb to F F F D', () => {
    expect(names(sequence(m('G4 G4 G4 Eb4'), -1, makeKey('C', 'minor')))).toBe('F4 F4 F4 D4');
  });

  it('inverts diatonically as Bach does in bar 3 of the Invention', () => {
    // Bach states the inversion on A: A G F E G F A.
    const inv = invertDiatonic(sequence(BACH, 5, C), C);
    expect(names(inv)).toBe('A4 G4 F4 E4 G4 F4 A4');
  });

  it('inverts exactly, mirroring interval sizes', () => {
    expect(names(invertChromatic(m('C4 E4 G4')))).toBe('C4 Ab3 F3');
    expect(contour(invertChromatic(m('C4 E4 G4')))).toEqual([-4, -3]);
  });

  it('transposes really, keeping every interval', () => {
    const t = transposeReal(m('C4 E4 G4 B4'), 'P5');
    expect(names(t)).toBe('G4 B4 D5 F#5');
  });

  it('reverses and rescales rhythm', () => {
    expect(names(retrograde(m('C4 D4 E4')))).toBe('E4 D4 C4');
    expect(scaleRhythm(m('C4 D4'), 2).map((n) => n.dur)).toEqual([0.5, 0.5]);
  });

  it('keeps step contour under tonal sequence', () => {
    expect(stepContour(sequence(BACH, -1, C))).toEqual(stepContour(BACH));
  });

  it('chains operations, each on the result of the last', () => {
    const d = develop(BACH, ['original', 'seq-down', 'seq-down', 'head'], C);
    expect(names(d[2].motive)).toBe('A3 B3 C4 D4 B3 C4 A3');
    expect(d[3].motive).toHaveLength(4);
  });
});
