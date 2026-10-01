import { describe, expect, it } from 'vitest';
import { makeKey, note, noteName, pitchName } from '../../theory';
import {
  bestRootSpelling,
  chordNeighborhood,
  chordScales,
  chordStack,
  describeAlternative,
  describeInversion,
  figureText,
  identifyMidi,
  movedSpelling,
  pitchWithSpelling,
  spellMidis,
  toneRole,
} from './chordLogic';

const symbols = (list: Array<{ symbol: string }>) => list.map((n) => n.symbol);

describe('spelling helpers', () => {
  it('chooses readable root spellings', () => {
    expect(noteName(bestRootSpelling(1, 'maj'))).toBe('D♭');
    expect(noteName(bestRootSpelling(8, 'min'))).toBe('G♯');
    expect(noteName(bestRootSpelling(10, '7'))).toBe('B♭');
    expect(noteName(bestRootSpelling(6, 'maj'))).toBe('F♯');
  });

  it('prefers the spelling that belongs to a key', () => {
    expect(noteName(bestRootSpelling(8, 'maj', makeKey('Eb')))).toBe('A♭');
    expect(noteName(bestRootSpelling(8, 'dim', makeKey('A')))).toBe('G♯');
    expect(noteName(bestRootSpelling(1, 'dim', makeKey('D')))).toBe('C♯');
  });

  it('places spelled notes at the right octave', () => {
    expect(pitchName(pitchWithSpelling(note('B#'), 60))).toBe('B♯3');
    expect(pitchName(pitchWithSpelling(note('Cb'), 59))).toBe('C♭4');
    expect(pitchName(pitchWithSpelling(note('Eb'), 63))).toBe('E♭4');
  });

  it('spells MIDI notes with chord tones', () => {
    const pitches = spellMidis([67, 60, 63], [note('C'), note('Eb'), note('G')]);
    expect(pitches.map((p) => pitchName(p))).toEqual(['C4', 'E♭4', 'G4']);
  });

  it('spells moved notes tidily', () => {
    expect(noteName(movedSpelling(note('G'), 1))).toBe('G♯');
    expect(noteName(movedSpelling(note('E'), -1))).toBe('E♭');
    expect(noteName(movedSpelling(note('E'), 1))).toBe('F');
    expect(noteName(movedSpelling(note('C'), -1))).toBe('B');
    expect(noteName(movedSpelling(note('Bb'), -1))).toBe('A');
  });
});

describe('identifyMidi', () => {
  it('names a root-position triad', () => {
    const c = identifyMidi([60, 64, 67]);
    expect(c[0].symbol).toBe('C');
    expect(describeInversion(c[0])).toBe('Root position');
  });

  it('uses the lowest note as the bass and explains alternatives', () => {
    // C E G A with C in the bass: C6 first, Am7/C as an alternative.
    const c = identifyMidi([48, 64, 67, 69]);
    expect(c[0].symbol).toBe('C6');
    const am7 = c.find((x) => x.symbol === 'Am7/C');
    expect(am7).toBeDefined();
    expect(am7!.inversion).toBe(1);
    expect(describeAlternative(am7!, c[0])).toContain('Same notes heard as Am7 in first inversion');
  });

  it('describes inversions with the bass tone', () => {
    const c = identifyMidi([52, 60, 67]);
    expect(c[0].symbol).toBe('C/E');
    expect(describeInversion(c[0])).toBe('First inversion (E, the third, in the bass)');
  });

  it('respells black-key roots for readability', () => {
    const c = identifyMidi([61, 65, 68]);
    expect(c[0].symbol).toBe('D♭');
    const g = identifyMidi([56, 59, 63]);
    expect(g[0].symbol).toBe('G♯m');
  });

  it('returns nothing for a single note', () => {
    expect(identifyMidi([60])).toEqual([]);
  });
});

describe('chordStack', () => {
  it('shows a dominant seventh as stacked thirds', () => {
    const s = chordStack(note('C'), '7');
    expect(s.tones.map((t) => noteName(t.note))).toEqual(['C', 'E', 'G', 'B♭']);
    expect(s.steps.map((x) => x.name)).toEqual(['M3', 'm3', 'm3']);
    expect(s.steps.every((x) => x.isThird)).toBe(true);
  });

  it('flags non-third steps in sixth and quartal chords', () => {
    const six = chordStack(note('C'), '6');
    expect(six.steps.map((x) => x.name)).toEqual(['M3', 'm3', 'M2']);
    expect(six.steps[2].isThird).toBe(false);
    const q = chordStack(note('C'), 'quartal');
    expect(q.steps.map((x) => x.name)).toEqual(['P4', 'P4', 'P4']);
  });

  it('measures the gap in a thirteenth chord without its eleventh', () => {
    const s = chordStack(note('G'), '13');
    expect(s.steps.map((x) => x.name)).toEqual(['M3', 'm3', 'm3', 'M3', 'P5']);
  });
});

describe('chordNeighborhood', () => {
  it('finds chords one note away from a C major triad', () => {
    const n = chordNeighborhood(note('C'), 'maj');
    expect(symbols(n.add)).toEqual(expect.arrayContaining(['C6', 'Cmaj7', 'C7', 'Cadd9']));
    expect(symbols(n.remove)).toContain('C5');
    const moves = symbols(n.move);
    expect(moves).toEqual(expect.arrayContaining(['Cm', 'C+', 'Csus4', 'Em', 'C♯°', 'C(♭5)']));
    expect(n.move.find((m) => m.symbol === 'Cm')!.detail).toBe('3 → ♭3');
    expect(n.move.find((m) => m.symbol === 'Em')!.detail).toBe('C → B');
  });

  it('groups symmetric chords so each pitch-class set appears once', () => {
    const n = chordNeighborhood(note('C'), 'maj');
    const aug = n.move.filter((m) => m.chordId === 'aug');
    expect(aug).toHaveLength(1);
    expect(aug[0].symbol).toBe('C+');
    expect(aug[0].aka).toHaveLength(2);
  });

  it('labels added and removed tones', () => {
    const n = chordNeighborhood(note('C'), '7');
    expect(n.add.find((a) => a.symbol === 'C9')!.detail).toBe('add 9 (D)');
    expect(n.remove.find((a) => a.symbol === 'C')!.detail).toBe('drop ♭7 (B♭)');
  });

  it('finds enharmonic reinterpretations', () => {
    const six = chordNeighborhood(note('C'), '6');
    const am7 = six.same.find((s) => s.symbol === 'Am7');
    expect(am7).toBeDefined();
    expect(am7!.sameSpelling).toBe(true);
    expect(am7!.detail).toContain('Am7/C');

    const dom = chordNeighborhood(note('C'), '7');
    const ger = dom.same.find((s) => s.chordId === 'ger6');
    expect(ger).toBeDefined();
    expect(ger!.sameSpelling).toBe(false);

    const half = chordNeighborhood(note('C'), 'm7b5');
    expect(symbols(half.same)).toContain('E♭m6');
  });

  it('lists all four rotations of a diminished seventh as the same notes', () => {
    const n = chordNeighborhood(note('C'), 'dim7');
    const dims = n.same.filter((s) => s.chordId === 'dim7').map((s) => s.symbol);
    expect(dims).toEqual(expect.arrayContaining(['E♭°7', 'G♭°7', 'A°7']));
  });
});

describe('chordScales', () => {
  it('suggests modes on the same root with avoid notes', () => {
    const list = chordScales(note('C'), 'maj7');
    const ids = list.map((s) => s.scale.id);
    expect(ids).toContain('ionian');
    expect(ids).toContain('lydian');
    expect(ids).not.toContain('dorian');
    const ionian = list.find((s) => s.scale.id === 'ionian')!;
    const f = ionian.notes.findIndex((n) => noteName(n) === 'F');
    expect(ionian.roles[f]).toBe('avoid');
    const lydian = list.find((s) => s.scale.id === 'lydian')!;
    expect(lydian.roles.includes('avoid')).toBe(false);
  });

  it('puts the catalog pairing first', () => {
    const list = chordScales(note('D'), 'm7');
    expect(list[0].primary).toBe(true);
    expect(list.every((s) => s.notes[0].letter === 'D')).toBe(true);
  });
});

describe('labels', () => {
  it('assigns roles to chord-tone labels', () => {
    expect(toneRole('R')).toBe('root');
    expect(toneRole('♭3')).toBe('tone');
    expect(toneRole('♭7')).toBe('tone');
    expect(toneRole('9')).toBe('extra');
    expect(toneRole('♯11')).toBe('alt');
    expect(toneRole('♯5')).toBe('alt');
  });

  it('formats figured bass', () => {
    expect(figureText('65')).toBe('⁶₅');
    expect(figureText('6')).toBe('6');
    expect(figureText('')).toBe('');
  });
});
