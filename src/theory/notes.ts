/**
 * Spelled notes and pitches.
 *
 * A `Note` is a spelled pitch class (letter + accidental), e.g. F#, Bb, Cx.
 * A `Pitch` adds an octave in scientific pitch notation (C4 = middle C = MIDI 60).
 * The octave number belongs to the letter, so B#3 sounds as MIDI 60 and Cb4 as MIDI 59.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

export const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface Note {
  letter: Letter;
  /** Accidental in semitones: -2 = double flat, -1 = flat, 0 = natural, 1 = sharp, 2 = double sharp. */
  acc: number;
}

export interface Pitch extends Note {
  octave: number;
}

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

const NOTE_RE = /^([A-Ga-g])((?:#|♯|x|𝄪|b|♭|𝄫|♮)*)$/;
const PITCH_RE = /^([A-Ga-g])((?:#|♯|x|𝄪|b|♭|𝄫|♮)*)(-?\d+)$/;

function parseAccidentals(s: string): number {
  let acc = 0;
  for (const ch of s) {
    if (ch === '#' || ch === '♯') acc += 1;
    else if (ch === 'x' || ch === '𝄪') acc += 2;
    else if (ch === 'b' || ch === '♭') acc -= 1;
    else if (ch === '𝄫') acc -= 2;
  }
  return acc;
}

/** Parse a note name such as "C", "F#", "Bb", "Ebb", "Cx", "F♯". Throws on invalid input. */
export function note(name: string): Note {
  const m = NOTE_RE.exec(name.trim());
  if (!m) throw new Error(`Invalid note name: "${name}"`);
  return { letter: m[1].toUpperCase() as Letter, acc: parseAccidentals(m[2]) };
}

/** Like `note` but returns null on invalid input. */
export function tryNote(name: string): Note | null {
  try {
    return note(name);
  } catch {
    return null;
  }
}

/** Parse a pitch name such as "C4", "F#3", "Bb-1". */
export function pitch(name: string): Pitch {
  const m = PITCH_RE.exec(name.trim());
  if (!m) throw new Error(`Invalid pitch name: "${name}"`);
  return { letter: m[1].toUpperCase() as Letter, acc: parseAccidentals(m[2]), octave: parseInt(m[3], 10) };
}

export function withOctave(n: Note, octave: number): Pitch {
  return { letter: n.letter, acc: n.acc, octave };
}

export function toNote(p: Note): Note {
  return { letter: p.letter, acc: p.acc };
}

/** Pitch class 0..11 (C = 0). */
export function pc(n: Note): number {
  return mod(LETTER_PC[n.letter] + n.acc, 12);
}

/** MIDI note number. C4 = 60. */
export function midi(p: Pitch): number {
  return (p.octave + 1) * 12 + LETTER_PC[p.letter] + p.acc;
}

export function midiToFreq(m: number, a4 = 440): number {
  return a4 * Math.pow(2, (m - 69) / 12);
}

export function freqToMidi(f: number, a4 = 440): number {
  return 69 + 12 * Math.log2(f / a4);
}

const ACC_UNICODE: Record<string, string> = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
const ACC_ASCII: Record<string, string> = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' };

export function accidentalString(acc: number, unicode = true): string {
  const table = unicode ? ACC_UNICODE : ACC_ASCII;
  if (table[String(acc)] !== undefined) return table[String(acc)];
  const single = unicode ? (acc > 0 ? '♯' : '♭') : acc > 0 ? '#' : 'b';
  return single.repeat(Math.abs(acc));
}

/** Display name, e.g. "F♯" (unicode) or "F#" (ascii). */
export function noteName(n: Note, unicode = true): string {
  return n.letter + accidentalString(n.acc, unicode);
}

export function pitchName(p: Pitch, unicode = true): string {
  return noteName(p, unicode) + p.octave;
}

export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.acc === b.acc;
}

export function samePitch(a: Pitch, b: Pitch): boolean {
  return sameNote(a, b) && a.octave === b.octave;
}

export function isEnharmonic(a: Note, b: Note): boolean {
  return pc(a) === pc(b);
}

/** Preferred spellings for each pitch class. */
const SHARP_NAMES: Note[] = [
  { letter: 'C', acc: 0 },
  { letter: 'C', acc: 1 },
  { letter: 'D', acc: 0 },
  { letter: 'D', acc: 1 },
  { letter: 'E', acc: 0 },
  { letter: 'F', acc: 0 },
  { letter: 'F', acc: 1 },
  { letter: 'G', acc: 0 },
  { letter: 'G', acc: 1 },
  { letter: 'A', acc: 0 },
  { letter: 'A', acc: 1 },
  { letter: 'B', acc: 0 },
];
const FLAT_NAMES: Note[] = [
  { letter: 'C', acc: 0 },
  { letter: 'D', acc: -1 },
  { letter: 'D', acc: 0 },
  { letter: 'E', acc: -1 },
  { letter: 'E', acc: 0 },
  { letter: 'F', acc: 0 },
  { letter: 'G', acc: -1 },
  { letter: 'G', acc: 0 },
  { letter: 'A', acc: -1 },
  { letter: 'A', acc: 0 },
  { letter: 'B', acc: -1 },
  { letter: 'B', acc: 0 },
];
/** Conventional root spellings: Db, Eb, F#, Ab, Bb. */
const DEFAULT_NAMES: Note[] = SHARP_NAMES.map((n, i) => ([1, 3, 8, 10].includes(i) ? FLAT_NAMES[i] : n));

export type SpellingPreference = 'sharps' | 'flats' | 'default';

export function noteFromPc(pcValue: number, pref: SpellingPreference = 'default'): Note {
  const i = mod(pcValue, 12);
  const table = pref === 'sharps' ? SHARP_NAMES : pref === 'flats' ? FLAT_NAMES : DEFAULT_NAMES;
  return { ...table[i] };
}

export function pitchFromMidi(m: number, pref: SpellingPreference = 'default'): Pitch {
  const n = noteFromPc(m, pref);
  // Octave belongs to the letter: compute from midi minus letter+acc offset.
  const octave = Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1;
  return { ...n, octave };
}

/** Respell a note with the simplest accidental (prefers naturals, then single sharps or flats). */
export function simplify(n: Note, pref: SpellingPreference = 'default'): Note {
  if (Math.abs(n.acc) <= 1 && !isOddSpelling(n)) return { ...n };
  return noteFromPc(pc(n), pref === 'default' ? (n.acc > 0 ? 'sharps' : 'flats') : pref);
}

/** E#, B#, Fb, Cb are valid but often worth simplifying for casual display. */
function isOddSpelling(n: Note): boolean {
  return (n.acc === 1 && (n.letter === 'E' || n.letter === 'B')) || (n.acc === -1 && (n.letter === 'F' || n.letter === 'C'));
}

/** Simplify a pitch, keeping the same MIDI value. */
export function simplifyPitch(p: Pitch, pref: SpellingPreference = 'default'): Pitch {
  const n = simplify(p, pref);
  const m = midi(p);
  const octave = Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1;
  return { ...n, octave };
}

/**
 * Place a note at the lowest octave such that its MIDI value is >= `min`.
 */
export function pitchAtOrAbove(n: Note, min: number): Pitch {
  const base = LETTER_PC[n.letter] + n.acc;
  const octave = Math.ceil((min - base) / 12) - 1;
  return { letter: n.letter, acc: n.acc, octave };
}

/** Place a note at the octave nearest to a target MIDI value. */
export function pitchNear(n: Note, target: number): Pitch {
  const above = pitchAtOrAbove(n, target);
  const below = { ...above, octave: above.octave - 1 };
  return Math.abs(midi(above) - target) <= Math.abs(midi(below) - target) ? above : below;
}

/** Position on the line of fifths relative to C (F = -1, G = 1, Bb = -2, F# = 6). */
export function fifthsFromC(n: Note): number {
  const base: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
  return base[n.letter] + 7 * n.acc;
}

/** Inverse of `fifthsFromC`. */
export function noteFromFifths(f: number): Note {
  const order: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const idx = mod(f + 1, 7);
  const acc = Math.floor((f + 1) / 7);
  return { letter: order[idx], acc };
}

/** VexFlow key string, e.g. "f#/4". */
export function vexKey(p: Pitch): string {
  return `${p.letter.toLowerCase()}${accidentalString(p.acc, false)}/${p.octave}`;
}

export const ALL_ROOTS: Note[] = [
  'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
].map(note);

/** Twelve common root spellings, one per pitch class. */
export const COMMON_ROOTS: Note[] = DEFAULT_NAMES.map((n) => ({ ...n }));
