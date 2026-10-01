import { describe, expect, it } from 'vitest';
import {
  note, pitch, midi, pc, noteName, pitchFromMidi, pitchName, pitchAtOrAbove, fifthsFromC, noteFromFifths,
  interval, intervalName, transpose, transposeDown, intervalBetween, pitchInterval, invert, intervalLongName, degreeLabel,
  buildScale, scaleFormula, stepNames, distinctTranspositions, SCALES, findScalesByPcs,
  buildChord, identifyChord, parseChordSymbol, chordSymbol, CHORDS, chordToneLabels,
  makeKey, keySignatureFifths, keySignature, relativeKey, diatonicChords, vexKeySpec, closelyRelatedKeys,
  parseRoman, analyzeChord, formatRoman, splitProgression,
  voiceChord, voiceProgression, pitchName as pn,
} from '..';

const names = (ns: { letter: string; acc: number }[]) => ns.map((n) => noteName(n as never, false)).join(' ');

describe('notes', () => {
  it('parses and computes midi', () => {
    expect(midi(pitch('C4'))).toBe(60);
    expect(midi(pitch('A4'))).toBe(69);
    expect(midi(pitch('B#3'))).toBe(60);
    expect(midi(pitch('Cb4'))).toBe(59);
    expect(pc(note('Fx'))).toBe(7);
    expect(pc(note('E♭'))).toBe(3);
  });
  it('spells midi values', () => {
    expect(pitchName(pitchFromMidi(61), false)).toBe('Db4');
    expect(pitchName(pitchFromMidi(61, 'sharps'), false)).toBe('C#4');
    expect(pitchName(pitchFromMidi(59), false)).toBe('B3');
  });
  it('places notes at or above a floor', () => {
    expect(pitchName(pitchAtOrAbove(note('C'), 60), false)).toBe('C4');
    expect(pitchName(pitchAtOrAbove(note('C'), 61), false)).toBe('C5');
    expect(pitchName(pitchAtOrAbove(note('B#'), 60), false)).toBe('B#3');
  });
  it('line of fifths round trips', () => {
    for (let f = -14; f <= 14; f++) expect(fifthsFromC(noteFromFifths(f))).toBe(f);
    expect(noteName(noteFromFifths(6), false)).toBe('F#');
    expect(noteName(noteFromFifths(-2), false)).toBe('Bb');
  });
});

describe('intervals', () => {
  it('parses names', () => {
    expect(interval('P5')).toEqual({ num: 5, semis: 7 });
    expect(interval('m3')).toEqual({ num: 3, semis: 3 });
    expect(interval('d7')).toEqual({ num: 7, semis: 9 });
    expect(interval('A4')).toEqual({ num: 4, semis: 6 });
    expect(interval('M9')).toEqual({ num: 9, semis: 14 });
    expect(interval('d4')).toEqual({ num: 4, semis: 4 });
    expect(() => interval('M5')).toThrow();
  });
  it('transposes with correct spelling', () => {
    expect(noteName(transpose(note('C'), interval('A4')), false)).toBe('F#');
    expect(noteName(transpose(note('C'), interval('d5')), false)).toBe('Gb');
    expect(noteName(transpose(note('F#'), interval('M3')), false)).toBe('A#');
    expect(noteName(transpose(note('B'), interval('d7')), false)).toBe('Ab');
    expect(noteName(transpose(note('G#'), interval('M7')), false)).toBe('F##');
    expect(noteName(transpose(note('C'), interval('M9')), false)).toBe('D');
    expect(noteName(transposeDown(note('C'), interval('m3')), false)).toBe('A');
    expect(noteName(transposeDown(note('E'), interval('A4')), false)).toBe('Bb');
  });
  it('measures intervals', () => {
    expect(intervalName(intervalBetween(note('C'), note('F#')))).toBe('A4');
    expect(intervalName(intervalBetween(note('C'), note('Gb')))).toBe('d5');
    expect(intervalName(intervalBetween(note('C'), note('B#')))).toBe('A7');
    expect(intervalName(intervalBetween(note('E'), note('C')))).toBe('m6');
    expect(intervalName(pitchInterval(pitch('C4'), pitch('D5')))).toBe('M9');
    expect(intervalName(invert(interval('M3')))).toBe('m6');
    expect(intervalName(invert(interval('A4')))).toBe('d5');
    expect(intervalLongName(interval('m6'))).toBe('minor sixth');
    expect(degreeLabel(interval('m3'), false)).toBe('b3');
    expect(degreeLabel(interval('A11'), false)).toBe('#11');
  });
});

describe('scales', () => {
  it('builds every scale on every common root without throwing', () => {
    for (const s of SCALES) for (const r of ['C', 'C#', 'Db', 'F#', 'Gb', 'Bb', 'B']) expect(buildScale(note(r), s.id).length).toBe(s.intervals.length);
  });
  it('heptatonic scales use each letter once', () => {
    for (const s of SCALES.filter((x) => x.intervals.length === 7)) {
      const letters = new Set(buildScale(note('Eb'), s.id).map((n) => n.letter));
      expect(letters.size, s.id).toBe(7);
    }
  });
  it('spells modes correctly', () => {
    expect(names(buildScale(note('D'), 'dorian'))).toBe('D E F G A B C');
    expect(names(buildScale(note('F'), 'lydian'))).toBe('F G A B C D E');
    expect(names(buildScale(note('C#'), 'lydian'))).toBe('C# D# E# F## G# A# B#');
    expect(names(buildScale(note('B'), 'altered'))).toBe('B C D Eb F G A');
    expect(names(buildScale(note('E'), 'phrygian-dominant'))).toBe('E F G# A B C D');
    expect(names(buildScale(note('A'), 'harmonic-minor'))).toBe('A B C D E F G#');
  });
  it('modes of a parent share notes', () => {
    const parentPcs = new Set(buildScale(note('C'), 'melodic-minor').map(pc));
    const modes = SCALES.filter((s) => s.modeOf?.parent === 'melodic-minor');
    expect(modes.length).toBe(7);
    for (const m of modes) {
      const root = buildScale(note('C'), 'melodic-minor')[m.modeOf!.degree - 1];
      expect(buildScale(root, m.id).every((n) => parentPcs.has(pc(n))), m.id).toBe(true);
    }
    for (const parent of ['ionian', 'harmonic-minor', 'harmonic-major']) {
      const pcs = new Set(buildScale(note('C'), parent).map(pc));
      for (const m of SCALES.filter((s) => s.modeOf?.parent === parent)) {
        const root = buildScale(note('C'), parent)[m.modeOf!.degree - 1];
        expect(buildScale(root, m.id).every((n) => pcs.has(pc(n))), m.id).toBe(true);
      }
    }
  });
  it('formulas and steps', () => {
    expect(scaleFormula('dorian', false).join(' ')).toBe('1 2 b3 4 5 6 b7');
    expect(stepNames('ionian').join('')).toBe('WWHWWWH');
    expect(stepNames('harmonic-minor').join(' ')).toBe('W H W W H W+H H');
  });
  it('symmetry', () => {
    expect(distinctTranspositions('whole-tone')).toBe(2);
    expect(distinctTranspositions('diminished-hw')).toBe(3);
    expect(distinctTranspositions('augmented')).toBe(4);
    expect(distinctTranspositions('ionian')).toBe(12);
  });
  it('finds scales by pitch class set', () => {
    const found = findScalesByPcs([0, 2, 4, 5, 7, 9, 11]).map((f) => f.scale.id);
    expect(found).toContain('ionian');
    expect(found).toContain('dorian');
  });
});

describe('chords', () => {
  it('builds every chord', () => {
    for (const c of CHORDS) expect(buildChord(note('Eb'), c.id).length).toBe(c.intervals.length);
  });
  it('spells chords', () => {
    expect(names(buildChord(note('B'), 'dim7'))).toBe('B D F Ab');
    expect(names(buildChord(note('F#'), 'm7b5'))).toBe('F# A C E');
    expect(names(buildChord(note('Ab'), 'ger6'))).toBe('Ab C Eb F#');
    expect(chordToneLabels('7#9', false).join(' ')).toBe('R 3 5 b7 #9');
  });
  it('parses chord symbols', () => {
    expect(parseChordSymbol('Cmaj7')).toMatchObject({ chordId: 'maj7' });
    expect(parseChordSymbol('F#m7b5')).toMatchObject({ chordId: 'm7b5', root: { letter: 'F', acc: 1 } });
    expect(parseChordSymbol('Bb7#9')).toMatchObject({ chordId: '7#9' });
    expect(parseChordSymbol('D/F#')).toMatchObject({ chordId: 'maj', bass: { letter: 'F', acc: 1 } });
    expect(parseChordSymbol('Ebsus4')).toMatchObject({ chordId: 'sus4' });
    expect(parseChordSymbol('Am')).toMatchObject({ chordId: 'min' });
    expect(parseChordSymbol('Cdim7')).toMatchObject({ chordId: 'dim7' });
    expect(parseChordSymbol('Hello')).toBeNull();
    expect(chordSymbol(note('F#'), 'm7b5')).toBe('F♯ø7');
  });
  it('identifies chords', () => {
    expect(identifyChord([0, 4, 7], { bassPc: 0 })[0].symbol).toBe('C');
    expect(identifyChord([4, 7, 0], { bassPc: 4 })[0].symbol).toBe('C/E');
    expect(identifyChord([0, 4, 7, 11], { bassPc: 0 })[0].chordId).toBe('maj7');
    expect(identifyChord([7, 11, 2, 5], { bassPc: 7 })[0].symbol).toBe('G7');
    expect(identifyChord([9, 0, 4, 7], { bassPc: 9 })[0].symbol).toBe('Am7');
    expect(identifyChord([0, 4, 10], { bassPc: 0 })[0].symbol).toBe('C7(no5)');
  });
});

describe('keys', () => {
  it('computes key signatures', () => {
    expect(keySignatureFifths(makeKey('A', 'major'))).toBe(3);
    expect(keySignatureFifths(makeKey('C', 'minor'))).toBe(-3);
    expect(keySignatureFifths(makeKey('F#', 'minor'))).toBe(3);
    expect(names(keySignature(makeKey('Eb')).accidentals)).toBe('Bb Eb Ab');
    expect(vexKeySpec(makeKey('G#', 'minor'))).toBe('G#m');
    expect(vexKeySpec(makeKey('G#', 'major'))).toBeNull();
  });
  it('relations', () => {
    expect(noteName(relativeKey(makeKey('Eb')).tonic, false)).toBe('C');
    expect(closelyRelatedKeys(makeKey('C')).map((r) => noteName(r.key.tonic, false) + r.key.mode[0]).join(' ')).toBe('Am Gm Em Fm Dm');
  });
  it('diatonic chords', () => {
    expect(diatonicChords(makeKey('C'), true).map((c) => c.chordId).join(' ')).toBe('maj7 m7 m7 maj7 7 m7 m7b5');
    expect(diatonicChords(makeKey('A', 'minor'), false, 'harmonic').map((c) => c.chordId).join(' ')).toBe('min dim aug min maj maj dim');
  });
});

describe('roman numerals', () => {
  const C = makeKey('C');
  const cm = makeKey('C', 'minor');
  const sym = (s: string, k = C) => parseRoman(s, k).symbol;
  it('parses diatonic numerals', () => {
    expect(sym('I')).toBe('C');
    expect(sym('ii7')).toBe('Dm7');
    expect(sym('V7')).toBe('G7');
    expect(sym('viiø7')).toBe('Bø7');
    expect(sym('IVmaj7')).toBe('Fmaj7');
    expect(sym('V6')).toBe('G/B');
    expect(sym('V65')).toBe('G7/B');
    expect(sym('I64')).toBe('C/G');
  });
  it('minor keys', () => {
    expect(sym('i', cm)).toBe('Cm');
    expect(sym('VI', cm)).toBe('A♭');
    expect(sym('VII', cm)).toBe('B♭');
    expect(sym('vii°7', cm)).toBe('B°7');
    expect(sym('V7', cm)).toBe('G7');
    expect(sym('iiø7', cm)).toBe('Dø7');
  });
  it('borrowed and chromatic', () => {
    expect(sym('bVI')).toBe('A♭');
    expect(sym('bVII')).toBe('B♭');
    expect(sym('bIII')).toBe('E♭');
    expect(sym('iv')).toBe('Fm');
    expect(sym('bVI', cm)).toBe('A♭');
    expect(sym('#iv°7')).toBe('F♯°7');
  });
  it('secondary functions', () => {
    expect(sym('V/V')).toBe('D');
    expect(sym('V7/ii')).toBe('A7');
    expect(sym('vii°7/V')).toBe('F♯°7');
    expect(sym('V7/IV')).toBe('C7');
    expect(sym('V/V/V')).toBe('A');
  });
  it('special chords', () => {
    expect(names(parseRoman('N6', C).notes)).toBe('Db F Ab');
    expect(parseRoman('N6', C).bass.letter).toBe('F');
    expect(names(parseRoman('Ger+6', C).notes)).toBe('Ab C Eb F#');
    expect(names(parseRoman('It+6', cm).notes)).toBe('Ab C F#');
    expect(sym('Cad64')).toBe('C/G');
  });
  it('analyzes chords', () => {
    expect(analyzeChord(note('D'), 'm7', C)).toBe('ii7');
    expect(analyzeChord(note('Ab'), 'maj', C)).toBe('bVI');
    expect(analyzeChord(note('Ab'), 'maj', cm)).toBe('VI');
    expect(analyzeChord(note('B'), 'dim7', cm)).toBe('vii°7');
    expect(analyzeChord(note('G'), '7', C, 1)).toBe('V65');
    expect(analyzeChord(note('F'), 'min', C)).toBe('iv');
    for (const s of ['I', 'ii7', 'bVI', 'V65', 'vii°7', 'IVmaj7']) {
      const rc = parseRoman(s, C);
      expect(parseRoman(analyzeChord(rc.root, rc.chordId, C, rc.inversion), C).symbol).toBe(rc.symbol);
    }
  });
  it('formats and splits', () => {
    expect(formatRoman('V65/V')).toBe('V⁶₅/V');
    expect(formatRoman('bVII')).toBe('♭VII');
    expect(splitProgression('I - V - vi - IV')).toEqual(['I', 'V', 'vi', 'IV']);
    expect(splitProgression('ii7 | V7 | Imaj7')).toEqual(['ii7', 'V7', 'Imaj7']);
  });
});

describe('voicing', () => {
  it('voices chords', () => {
    const c7 = buildChord(note('C'), 'maj7');
    expect(voiceChord(c7, { low: 60 }).map((p) => pn(p, false)).join(' ')).toBe('C4 E4 G4 B4');
    expect(voiceChord(c7, { low: 60, inversion: 1 }).map((p) => pn(p, false)).join(' ')).toBe('E4 G4 B4 C5');
    expect(voiceChord(c7, { low: 48, style: 'shell' }).map((p) => pn(p, false)).join(' ')).toBe('C3 E3 B3');
  });
  it('drop 2 drops the second voice from the top', () => {
    const v = voiceChord(buildChord(note('C'), 'maj7'), { low: 48, style: 'drop2' }).map((p) => midi(p));
    // Close C4 E4 G4 B4 -> drop G4 -> G3 C4 E4 B4
    expect(v).toEqual([55, 60, 64, 71]);
  });
  it('voice leads smoothly', () => {
    const C = makeKey('C');
    const chords = ['ii7', 'V7', 'Imaj7'].map((s) => parseRoman(s, C)).map((r) => ({ notes: r.notes, bass: r.bass }));
    const v = voiceProgression(chords);
    expect(v.length).toBe(3);
    for (const chord of v) expect(chord.length).toBe(4);
    for (let i = 1; i < v.length; i++) {
      for (let j = 1; j < 4; j++) expect(Math.abs(midi(v[i][j]) - midi(v[i - 1][j]))).toBeLessThanOrEqual(5);
    }
  });
});
