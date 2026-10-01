/**
 * Intervals with correct generic size and quality.
 *
 * An interval is a generic number (1 = unison, 3 = third, 9 = ninth ...) plus a size in semitones.
 * The quality (perfect, major, minor, augmented, diminished) follows from comparing the
 * semitone count with the major-scale reference size for that generic number.
 */
import { LETTERS, letterIndex, mod, pc, midi, type Note, type Pitch } from './notes';

export interface Interval {
  /** Generic size, 1-based (1 = unison, 8 = octave, 9 = ninth). Always >= 1. */
  num: number;
  /** Size in semitones. */
  semis: number;
}

/** Semitones in the major scale for generic sizes 1..7. */
const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Unison, fourth and fifth (and their compounds) are perfect intervals. */
const PERFECT_SIMPLE = new Set([1, 4, 5]);

export function simpleNum(num: number): number {
  return mod(num - 1, 7) + 1;
}

export function isPerfectType(num: number): boolean {
  return PERFECT_SIMPLE.has(simpleNum(num));
}

/** Reference semitones (perfect or major) for a generic size. */
export function referenceSemis(num: number): number {
  const octaves = Math.floor((num - 1) / 7);
  return MAJOR_SEMIS[(num - 1) % 7] + 12 * octaves;
}

export type Quality = 'P' | 'M' | 'm' | 'A' | 'd' | 'AA' | 'dd';

export function quality(i: Interval): Quality {
  const diff = i.semis - referenceSemis(i.num);
  if (isPerfectType(i.num)) {
    if (diff === 0) return 'P';
    if (diff === 1) return 'A';
    if (diff === -1) return 'd';
    if (diff === 2) return 'AA';
    if (diff === -2) return 'dd';
  } else {
    if (diff === 0) return 'M';
    if (diff === -1) return 'm';
    if (diff === 1) return 'A';
    if (diff === -2) return 'd';
    if (diff === 2) return 'AA';
    if (diff === -3) return 'dd';
  }
  throw new Error(`Unsupported interval quality for num=${i.num} semis=${i.semis}`);
}

const INTERVAL_RE = /^(P|M|m|A+|d+)(\d+)$/;

/** Parse "P5", "m3", "A4", "d7", "M9", "AA5". */
export function interval(name: string): Interval {
  const m = INTERVAL_RE.exec(name.trim());
  if (!m) throw new Error(`Invalid interval: "${name}"`);
  const q = m[1];
  const num = parseInt(m[2], 10);
  if (num < 1) throw new Error(`Invalid interval number: "${name}"`);
  const ref = referenceSemis(num);
  const perfect = isPerfectType(num);
  let semis: number;
  if (q === 'P') {
    if (!perfect) throw new Error(`"${name}": only unisons, fourths, fifths and octaves can be perfect`);
    semis = ref;
  } else if (q === 'M') {
    if (perfect) throw new Error(`"${name}": perfect-type intervals cannot be major`);
    semis = ref;
  } else if (q === 'm') {
    if (perfect) throw new Error(`"${name}": perfect-type intervals cannot be minor`);
    semis = ref - 1;
  } else if (q[0] === 'A') {
    semis = ref + q.length;
  } else {
    semis = ref - q.length - (perfect ? 0 : 1);
  }
  return { num, semis };
}

export function intervalName(i: Interval): string {
  return quality(i) + i.num;
}

const QUALITY_WORDS: Record<Quality, string> = {
  P: 'perfect',
  M: 'major',
  m: 'minor',
  A: 'augmented',
  d: 'diminished',
  AA: 'doubly augmented',
  dd: 'doubly diminished',
};

const NUMBER_WORDS = [
  '', 'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave',
  'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
];

export function intervalLongName(i: Interval): string {
  const word = NUMBER_WORDS[i.num] ?? `${i.num}th`;
  return `${QUALITY_WORDS[quality(i)]} ${word}`;
}

/** Transpose a spelled note up by an interval. */
export function transpose(n: Note, i: Interval): Note {
  const li = letterIndex(n.letter);
  const targetLetter = LETTERS[mod(li + i.num - 1, 7)];
  // Semitones between the two natural letters, plus whole octaves for compound intervals.
  const octaves = Math.floor((i.num - 1) / 7);
  const naturalSimple = mod(pcOfLetter(targetLetter) - pcOfLetter(n.letter), 12);
  const naturalTotal = naturalSimple + 12 * octaves;
  const acc = n.acc + (i.semis - naturalTotal);
  return { letter: targetLetter, acc };
}

/** Transpose down by an interval. */
export function transposeDown(n: Note, i: Interval): Note {
  const li = letterIndex(n.letter);
  const targetLetter = LETTERS[mod(li - (i.num - 1), 7)];
  const octaves = Math.floor((i.num - 1) / 7);
  const naturalSimple = mod(pcOfLetter(n.letter) - pcOfLetter(targetLetter), 12);
  const naturalTotal = naturalSimple + 12 * octaves;
  const acc = n.acc - (i.semis - naturalTotal);
  return { letter: targetLetter, acc };
}

function pcOfLetter(l: Note['letter']): number {
  return pc({ letter: l, acc: 0 });
}

/** Transpose a pitch up by an interval, tracking octave. */
export function transposePitch(p: Pitch, i: Interval): Pitch {
  const n = transpose(p, i);
  const li = letterIndex(p.letter);
  const octave = p.octave + Math.floor((li + i.num - 1) / 7);
  return { ...n, octave };
}

export function transposePitchDown(p: Pitch, i: Interval): Pitch {
  const n = transposeDown(p, i);
  const li = letterIndex(p.letter);
  const octave = p.octave + Math.floor((li - (i.num - 1)) / 7);
  return { ...n, octave };
}

/** Ascending simple interval from note a up to note b (within one octave; unison for equal letters). */
export function intervalBetween(a: Note, b: Note): Interval {
  const num = mod(letterIndex(b.letter) - letterIndex(a.letter), 7) + 1;
  const raw = mod(pc(b) - pc(a), 12);
  const base = referenceSemis(num);
  const delta = mod(raw - base + 6, 12) - 6;
  return { num, semis: base + delta };
}

/** Interval between two pitches (a assumed lower or equal). Compound when spanning more than an octave. */
export function pitchInterval(a: Pitch, b: Pitch): Interval {
  const lo = midi(a) <= midi(b) ? a : b;
  const hi = lo === a ? b : a;
  const steps = (hi.octave * 7 + letterIndex(hi.letter)) - (lo.octave * 7 + letterIndex(lo.letter));
  return { num: Math.abs(steps) + 1, semis: midi(hi) - midi(lo) };
}

/** Inversion of a simple interval (M3 -> m6, P4 -> P5, A4 -> d5). */
export function invert(i: Interval): Interval {
  const sn = simpleNum(i.num);
  const ss = i.semis - 12 * Math.floor((i.num - 1) / 7);
  if (sn === 1 && ss === 0) return { num: 8, semis: 12 };
  return { num: 9 - sn, semis: 12 - ss };
}

/** Reduce a compound interval to a simple one (M9 -> M2). Octave stays an octave. */
export function simplifyInterval(i: Interval): Interval {
  if (i.num <= 8) return i;
  const octaves = Math.floor((i.num - 1) / 7);
  return { num: i.num - 7 * octaves, semis: i.semis - 12 * octaves };
}

/** Default spelling for an interval of a given number of semitones (0..12). */
export const DEFAULT_INTERVAL_FOR_SEMIS: string[] = [
  'P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8',
];

export function intervalFromSemis(semis: number): Interval {
  const octaves = Math.floor(semis / 12);
  const rem = semis - octaves * 12;
  const base = interval(DEFAULT_INTERVAL_FOR_SEMIS[rem]);
  return { num: base.num + 7 * octaves, semis: base.semis + 12 * octaves };
}

/**
 * Scale-degree label relative to the major scale: P5 -> "5", m3 -> "♭3", A4 -> "♯4", d7 -> "𝄫7", M9 -> "9".
 */
export function degreeLabel(i: Interval, unicode = true): string {
  const diff = i.semis - referenceSemis(i.num);
  const flat = unicode ? '♭' : 'b';
  const sharp = unicode ? '♯' : '#';
  let prefix = '';
  if (diff < 0) prefix = flat.repeat(-diff);
  if (diff > 0) prefix = sharp.repeat(diff);
  if (unicode && diff === -2) prefix = '𝄫';
  return prefix + i.num;
}

/** Common consonance classification used for teaching. */
export function consonance(i: Interval): 'perfect consonance' | 'imperfect consonance' | 'dissonance' {
  const s = mod(i.semis, 12);
  const sn = simpleNum(i.num);
  if ((s === 0 || s === 7) && (sn === 1 || sn === 5)) return 'perfect consonance';
  if (s === 3 || s === 4 || s === 8 || s === 9) return 'imperfect consonance';
  return 'dissonance';
}
