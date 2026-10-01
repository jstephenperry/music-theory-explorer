import { describe, expect, it } from 'vitest';
import { note, noteName, pitchName, type Note } from '../../theory/notes';
import {
  BRIGHTNESS_LADDER,
  bestRootSpelling,
  brightnessLadder,
  compareScales,
  differenceSummary,
  findScales,
  loweredDegrees,
  parallelModes,
  parentRoot,
  relativeModes,
  rootFromParam,
  rootToParam,
  scaleHarmony,
  scaleTones,
} from './scaleLogic';

const names = (ns: Note[]) => ns.map((n) => noteName(n, false)).join(' ');

describe('scaleTones', () => {
  it('spells C# Lydian with F## and ends on the upper tonic', () => {
    const t = scaleTones(note('C#'), 'lydian');
    expect(t.map((x) => pitchName(x.pitch, false)).join(' ')).toBe('C#4 D#4 E#4 F##4 G#4 A#4 B#4 C#5');
    expect(t[3].degree).toBe('♯4');
    expect(t[3].characteristic).toBe(true);
    expect(t[7].midi - t[0].midi).toBe(12);
  });
  it('places the root between A3 and G#4', () => {
    expect(pitchName(scaleTones(note('A'), 'ionian')[0].pitch, false)).toBe('A3');
    expect(pitchName(scaleTones(note('Ab'), 'ionian')[0].pitch, false)).toBe('Ab4');
    expect(pitchName(scaleTones(note('Cb'), 'ionian')[0].pitch, false)).toBe('Cb4');
  });
  it('labels intervals and degrees', () => {
    const t = scaleTones(note('D'), 'dorian');
    expect(t.map((x) => x.degree).slice(0, 7)).toEqual(['1', '2', '♭3', '4', '5', '6', '♭7']);
    expect(t.map((x) => x.intervalName).slice(0, 7)).toEqual(['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7']);
  });
});

describe('url params', () => {
  it('round-trips roots including double accidentals', () => {
    for (const n of ['C', 'F#', 'Bb', 'Ebb', 'F##']) expect(rootToParam(rootFromParam(n))).toBe(n === 'F##' ? 'F##' : n);
    expect(rootToParam(rootFromParam('nonsense'))).toBe('C');
  });
});

describe('modes', () => {
  it('finds the parent root', () => {
    expect(noteName(parentRoot(note('D'), 'dorian')!.root)).toBe('C');
    expect(noteName(parentRoot(note('F#'), 'locrian')!.root)).toBe('G');
    expect(noteName(parentRoot(note('E'), 'phrygian-dominant')!.root)).toBe('A');
    expect(parentRoot(note('C'), 'blues')).toBeNull();
  });
  it('lists relative modes of D Dorian', () => {
    const r = relativeModes(note('D'), 'dorian');
    expect(r.map((m) => `${noteName(m.root, false)} ${m.scale?.id}`)).toEqual([
      'C ionian', 'D dorian', 'E phrygian', 'F lydian', 'G mixolydian', 'A aeolian', 'B locrian',
    ]);
  });
  it('lists relative modes of A harmonic minor', () => {
    const r = relativeModes(note('E'), 'phrygian-dominant');
    expect(names(r.map((m) => m.root))).toBe('A B C D E F G#');
  });
  it('names rotations of scales without a parent', () => {
    const r = relativeModes(note('C'), 'whole-tone');
    expect(r.every((m) => m.scale?.id === 'whole-tone')).toBe(true);
  });
  it('lists parallel modes', () => {
    expect(parallelModes('dorian').map((s) => s.id)).toEqual(['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']);
    // Scales that are not modes of a parent list the rest of their catalog family instead.
    expect(parallelModes('blues').map((s) => s.id)).toEqual(['blues', 'major-blues']);
    expect(parallelModes('bayati').map((s) => s.id)).toEqual(['bayati', 'bayati-shuri', 'husayni']);
    expect(parallelModes('slendro').map((s) => s.id)).toContain('pelog');
  });
});

describe('brightness ladder', () => {
  it('orders the diatonic modes from Lydian to Locrian', () => {
    expect(BRIGHTNESS_LADDER).toEqual(['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian']);
  });
  it('lowers exactly one degree per rung', () => {
    const rungs = brightnessLadder();
    expect(rungs.map((r) => (r.lowered === null ? '-' : `${r.from}>${r.to}`))).toEqual([
      '-', '♯4>4', '7>♭7', '3>♭3', '6>♭6', '2>♭2', '5>♭5',
    ]);
    for (let i = 1; i < BRIGHTNESS_LADDER.length; i++) expect(loweredDegrees(BRIGHTNESS_LADDER[i - 1], BRIGHTNESS_LADDER[i])).toHaveLength(1);
  });
});

describe('scaleHarmony', () => {
  it('gives Dorian numerals relative to its own tonic', () => {
    const h = scaleHarmony(note('D'), 'dorian', false);
    expect(h.map((c) => c.numeral)).toEqual(['i', 'ii', '♭III', 'IV', 'v', 'vi°', '♭VII']);
    expect(h.map((c) => c.symbol)).toEqual(['Dm', 'Em', 'F', 'G', 'Am', 'B°', 'C']);
  });
  it('gives seventh chords for harmonic minor', () => {
    const h = scaleHarmony(note('A'), 'harmonic-minor', true);
    expect(h.map((c) => c.numeral)).toEqual(['i(maj7)', 'iiø7', '♭III+maj7', 'iv7', 'V7', '♭VImaj7', 'vii°7']);
    expect(h[4].symbol).toBe('E7');
  });
  it('gives Lydian and Mixolydian numerals', () => {
    expect(scaleHarmony(note('F'), 'lydian', false).map((c) => c.numeral)).toEqual(['I', 'II', 'iii', '♯iv°', 'V', 'vi', 'vii']);
    expect(scaleHarmony(note('G'), 'mixolydian', true).map((c) => c.numeral)).toEqual(['I7', 'ii7', 'iiiø7', 'IVmaj7', 'v7', 'vi7', '♭VIImaj7']);
  });
  it('voices chords in close position within the piano range', () => {
    for (const r of ['C', 'G#', 'B', 'Cb', 'A']) {
      for (const c of scaleHarmony(note(r), 'ionian', true)) {
        const ms = c.pitches.map((p) => (p.octave + 1) * 12);
        expect(Math.max(...ms)).toBeLessThanOrEqual(96);
      }
    }
  });
  it('flags chords that are not in the chord catalog', () => {
    const h = scaleHarmony(note('C'), 'persian', false);
    expect(h).toHaveLength(7);
    expect(h.some((c) => c.chordId === null)).toBe(true);
  });
  it('returns nothing for non-heptatonic scales', () => {
    expect(scaleHarmony(note('C'), 'minor-pentatonic', false)).toEqual([]);
  });
});

describe('compare', () => {
  it('aligns Ionian and Dorian', () => {
    const rows = compareScales(note('C'), 'ionian', 'dorian');
    expect(rows.filter((r) => r.a && r.b)).toHaveLength(5);
    const d = differenceSummary(note('C'), 'ionian', 'dorian');
    expect(d).toEqual({ onlyA: ['3', '7'], onlyB: ['♭3', '♭7'], shared: 5 });
  });
});

describe('finder', () => {
  it('spells roots sensibly', () => {
    expect(noteName(bestRootSpelling(1, 'ionian'), false)).toBe('Db');
    expect(noteName(bestRootSpelling(6, 'ionian'), false)).toBe('F#');
    expect(noteName(bestRootSpelling(8, 'aeolian'), false)).toBe('G#');
    expect(noteName(bestRootSpelling(0, 'ionian'), false)).toBe('C');
  });
  it('finds scales containing C E G B, smallest first, with exact matches flagged', () => {
    const r = findScales([0, 4, 7, 11]);
    expect(r.length).toBeGreaterThan(10);
    expect(r.some((x) => x.scale.id === 'ionian' && noteName(x.root) === 'C')).toBe(true);
    expect(r.some((x) => x.scale.id === 'lydian' && noteName(x.root) === 'C')).toBe(true);
    expect(r.some((x) => x.scale.id === 'aeolian' && noteName(x.root) === 'E')).toBe(true);
    for (let i = 1; i < r.length; i++) expect(r[i].scale.intervals.length).toBeGreaterThanOrEqual(r[i - 1].scale.intervals.length);
  });
  it('flags exact matches', () => {
    const r = findScales([0, 2, 4, 7, 9]);
    expect(r.find((x) => x.scale.id === 'major-pentatonic' && noteName(x.root) === 'C')?.exact).toBe(true);
    expect(r.find((x) => x.scale.id === 'ionian' && noteName(x.root) === 'C')?.exact).toBe(false);
    expect(findScales([])).toEqual([]);
  });
});

describe('microtonal rotations', () => {
  it('finds Sikah on the third degree of Rast, matching by intonation', () => {
    const rows = relativeModes(note('C'), 'rast');
    expect(rows[2].scale?.id).toBe('sikah');
    expect(rows.every((r) => r.scale?.id !== 'phrygian')).toBe(true);
  });
});
