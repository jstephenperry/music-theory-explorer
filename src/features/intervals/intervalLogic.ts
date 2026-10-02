/**
 * Pure helpers for the Intervals room: just-intonation ratios and cents, a spelling-aware
 * consonance classification, enharmonic spellings and musical contexts for each interval.
 */
import { buildScale, getScale } from '../../theory/scales';
import {
  interval,
  intervalFromSemis,
  intervalName,
  invert,
  isPerfectType,
  quality,
  simpleNum,
  simplifyInterval,
  transpose,
  transposeDown,
  type Interval,
} from '../../theory/intervals';
import { mod, noteFromPc, noteName, pc, pitchAtOrAbove, tryNote, type Note, type Pitch } from '../../theory/notes';

/** Simple intervals in the default grid. */
export const PRIMARY_INTERVALS = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
/** Augmented and diminished spellings that share keys with the primary ones. */
export const ALTERED_INTERVALS = ['A1', 'd3', 'A2', 'd4', 'A3', 'd5', 'd6', 'A5', 'd7', 'A6'];
/** Compound intervals up to two octaves. */
export const COMPOUND_INTERVALS = ['m9', 'M9', 'm10', 'M10', 'P11', 'A11', 'P12', 'm13', 'M13', 'm14', 'M14', 'P15'];

export interface Ratio {
  n: number;
  d: number;
}

/**
 * 5-limit just ratios (one common choice per spelling). Altered intervals are the natural ones
 * widened or narrowed by the chromatic semitone 25/24; the tritones use the textbook 45/32 and 64/45.
 * Each ratio times the ratio of its inversion equals 2/1.
 */
export const JUST_RATIOS: Record<string, Ratio> = {
  P1: { n: 1, d: 1 },
  A1: { n: 25, d: 24 },
  m2: { n: 16, d: 15 },
  M2: { n: 9, d: 8 },
  d3: { n: 144, d: 125 },
  A2: { n: 75, d: 64 },
  m3: { n: 6, d: 5 },
  M3: { n: 5, d: 4 },
  d4: { n: 32, d: 25 },
  A3: { n: 125, d: 96 },
  P4: { n: 4, d: 3 },
  A4: { n: 45, d: 32 },
  d5: { n: 64, d: 45 },
  P5: { n: 3, d: 2 },
  d6: { n: 192, d: 125 },
  A5: { n: 25, d: 16 },
  m6: { n: 8, d: 5 },
  M6: { n: 5, d: 3 },
  d7: { n: 128, d: 75 },
  A6: { n: 125, d: 72 },
  m7: { n: 16, d: 9 },
  M7: { n: 15, d: 8 },
  P8: { n: 2, d: 1 },
};

/** Other ratios often quoted for the same interval. */
export const ALTERNATIVE_RATIOS: Record<string, Array<Ratio & { note: string }>> = {
  M2: [{ n: 10, d: 9, note: 'minor whole tone' }],
  m3: [{ n: 7, d: 6, note: 'septimal minor third' }],
  m7: [
    { n: 9, d: 5, note: 'large just minor seventh' },
    { n: 7, d: 4, note: 'harmonic seventh (7th partial)' },
  ],
  A4: [{ n: 7, d: 5, note: 'septimal tritone' }],
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Just ratio for any interval in the table, including compounds (one factor of 2 per octave). */
export function justRatio(iv: Interval): Ratio | null {
  const simple = simplifyInterval(iv);
  const base = JUST_RATIOS[safeName(simple) ?? ''];
  if (!base) return null;
  const octaves = Math.round((iv.semis - simple.semis) / 12);
  let n = base.n * 2 ** octaves;
  let d = base.d;
  const g = gcd(n, d);
  n /= g;
  d /= g;
  return { n, d };
}

export function cents(r: Ratio): number {
  return 1200 * Math.log2(r.n / r.d);
}

export interface TuningComparison {
  ratio: Ratio;
  justCents: number;
  equalCents: number;
  /** Equal temperament minus just intonation, in cents (positive: the tempered interval is wider). */
  difference: number;
}

export function compareTuning(iv: Interval): TuningComparison | null {
  const ratio = justRatio(iv);
  if (!ratio) return null;
  const justCents = cents(ratio);
  const equalCents = iv.semis * 100;
  return { ratio, justCents, equalCents, difference: equalCents - justCents };
}

function safeName(iv: Interval): string | null {
  try {
    return intervalName(iv);
  } catch {
    return null;
  }
}

export type ConsonanceClass = 'perfect consonance' | 'imperfect consonance' | 'dissonance';

/**
 * Spelling-aware consonance (common-practice teaching): perfect unisons, fifths and octaves are perfect
 * consonances; major and minor thirds and sixths are imperfect consonances; everything else, including
 * augmented and diminished intervals that sound like consonances (A2, d4, A5, d7), is dissonant.
 * The perfect fourth is acoustically a perfect consonance but is treated as a dissonance above the bass.
 */
export function classifyConsonance(iv: Interval): { cls: ConsonanceClass; note?: string } {
  const sn = simpleNum(iv.num);
  const q = quality(iv);
  if (q === 'P' && (sn === 1 || sn === 5)) return { cls: 'perfect consonance' };
  if ((q === 'M' || q === 'm') && (sn === 3 || sn === 6)) return { cls: 'imperfect consonance' };
  if (q === 'P' && sn === 4) {
    return { cls: 'perfect consonance', note: 'Treated as a dissonance when it sits above the bass in common-practice counterpoint.' };
  }
  if ((q === 'A' && sn === 4) || (q === 'd' && sn === 5)) return { cls: 'dissonance', note: 'The tritone: three whole steps, splitting the octave in half.' };
  if ((q === 'A' || q === 'd') && [0, 3, 4, 5, 7, 8, 9].includes(mod(iv.semis, 12))) {
    return { cls: 'dissonance', note: 'It sounds like a consonance on the piano, but the spelling marks it as a dissonance that needs to resolve.' };
  }
  return { cls: 'dissonance' };
}

/** All ordinary spellings (perfect, major, minor, augmented, diminished) of a size in semitones, simple or compound. */
export function enharmonicSpellings(semis: number): Interval[] {
  const out: Interval[] = [];
  for (let num = 1; num <= 15; num++) {
    if (semis <= 12 ? num > 8 : num < 8) continue;
    for (const q of isPerfectType(num) ? ['P', 'A', 'd'] : ['M', 'm', 'A', 'd']) {
      if (num === 1 && q === 'd') continue;
      const iv = interval(q + num);
      if (iv.semis === semis) out.push(iv);
    }
  }
  return out.sort((a, b) => rank(a) - rank(b));
}

/** Order spellings: common names first, then augmented, then diminished. */
function rank(iv: Interval): number {
  const q = quality(iv);
  return (q === 'P' || q === 'M' || q === 'm' ? 0 : q === 'A' ? 1 : 2) * 100 + iv.num;
}

/** Inversion that also works for compound intervals (inverts the simple part). */
export function inversionOf(iv: Interval): Interval {
  return invert(iv);
}

export function isCompound(iv: Interval): boolean {
  return iv.num > 8;
}

/** Parse URL params into a lower pitch and an interval. */
export function parseState(rootParam: string, octParam: string, ivParam: string): { lower: Pitch; iv: Interval } {
  const root = tryNote(rootParam) ?? { letter: 'C', acc: 0 };
  const oct = Number.parseInt(octParam, 10);
  let iv: Interval;
  try {
    iv = interval(ivParam);
    quality(iv);
    if (iv.num > 15 || iv.semis < 0) throw new Error('out of range');
  } catch {
    iv = interval('M3');
  }
  return { lower: { ...root, octave: Number.isFinite(oct) && oct >= 1 && oct <= 6 ? oct : 4 }, iv };
}

/** Spell an interval chosen by two piano keys, reusing the current root spelling when the lower key matches it. */
export function spellFromKeys(lowMidi: number, highMidi: number, currentRoot: Note): { lower: Pitch; iv: Interval } {
  const lo = Math.min(lowMidi, highMidi);
  const hi = Math.max(lowMidi, highMidi);
  const rootNote = pc(currentRoot) === mod(lo, 12) ? currentRoot : noteFromPc(lo);
  const lower = pitchAtOrAbove(rootNote, lo);
  return { lower, iv: intervalFromSemis(hi - lo) };
}

export interface IntervalContext {
  text: string;
  /** The key the example comes from, e.g. "G major". */
  keyName: string;
}

interface ContextDef {
  scale: string;
  from: number;
  to: number;
  mode: 'major' | 'minor' | 'harmonic minor';
  text: string;
}

/**
 * Where each spelling lives. `{a}` and `{b}` are the two notes, `{key}` the key the example comes from.
 * The upper note is always the `to` degree of the scale on the derived tonic.
 */
const CONTEXTS: Record<string, ContextDef> = {
  m2: { scale: 'ionian', from: 7, to: 1, mode: 'major', text: '{a} is the leading tone of {key}, pulling up a half step to the tonic {b}.' },
  M2: { scale: 'ionian', from: 1, to: 2, mode: 'major', text: 'Tonic to supertonic in {key}: the basic whole step of the scale.' },
  d3: {
    scale: 'hungarian-minor', from: 4, to: 6, mode: 'minor',
    text: '{a} and {b} are the raised 4th and lowered 6th of {key}: an augmented sixth turned inside out, which closes inward onto the dominant.',
  },
  m3: { scale: 'aeolian', from: 1, to: 3, mode: 'minor', text: '{a} to {b} is the minor third of {key}, the bottom of its tonic triad.' },
  A2: { scale: 'harmonic-minor', from: 6, to: 7, mode: 'harmonic minor', text: 'Between the lowered 6th {a} and the leading tone {b} of {key}: the augmented second that marks the harmonic minor scale.' },
  M3: { scale: 'ionian', from: 1, to: 3, mode: 'major', text: 'Tonic to mediant of {key}: the bottom of the major triad.' },
  d4: {
    scale: 'harmonic-minor', from: 7, to: 3, mode: 'harmonic minor',
    text: 'From the leading tone {a} up to the minor third {b} of {key}. It sounds like a major third, but {a} rises to the tonic while {b} stays put.',
  },
  P4: { scale: 'ionian', from: 5, to: 1, mode: 'major', text: 'From the dominant {a} up to the tonic {b} of {key}: the upbeat-to-downbeat leap that opens many tunes.' },
  A4: {
    scale: 'ionian', from: 4, to: 7, mode: 'major',
    text: '{a} is the 4th and {b} the 7th of {key}. Spelled as a fourth, the tritone expands outward to a sixth: {a} falls and {b} rises.',
  },
  d5: {
    scale: 'ionian', from: 7, to: 4, mode: 'major',
    text: '{a} is the 7th and {b} the 4th of {key}, the frame of the diminished triad. Spelled as a fifth, it contracts inward to a third.',
  },
  P5: { scale: 'ionian', from: 1, to: 5, mode: 'major', text: 'Tonic to dominant of {key}: the frame of the major and minor triads.' },
  m6: { scale: 'ionian', from: 3, to: 1, mode: 'major', text: 'From the 3rd {a} up to the tonic {b} of {key}: a major third turned upside down.' },
  A5: { scale: 'harmonic-minor', from: 3, to: 7, mode: 'harmonic minor', text: 'From the minor third {a} up to the leading tone {b} of {key}: the outer notes of the augmented triad on ♭III.' },
  M6: { scale: 'ionian', from: 1, to: 6, mode: 'major', text: 'Tonic to submediant of {key}.' },
  d7: { scale: 'harmonic-minor', from: 7, to: 6, mode: 'harmonic minor', text: 'From the leading tone {a} up to the lowered 6th {b} of {key}: the outer notes of the diminished seventh chord vii°7.' },
  m7: { scale: 'ionian', from: 5, to: 4, mode: 'major', text: '{a} is the dominant of {key} and {b} its 4th: the root and seventh of the dominant seventh chord.' },
  A6: {
    scale: 'hungarian-minor', from: 6, to: 4, mode: 'minor',
    text: 'From the lowered 6th {a} up to the raised 4th {b} of {key}: the augmented sixth chord, which expands outward to an octave on the dominant.',
  },
  M7: { scale: 'ionian', from: 1, to: 7, mode: 'major', text: 'Tonic to leading tone of {key}: the major seventh chord stretches across it.' },
};

const GENERIC_CONTEXTS: Record<string, string> = {
  P1: 'Two voices on the same pitch.',
  A1: 'One letter name, raised: a chromatic inflection such as a passing tone or a secondary leading tone ({a} becomes {b}).',
  A3: 'Rare: it appears in chromatic voice leading when one voice is raised while another is lowered.',
  d6: 'Rare: it appears in chromatic voice leading when one voice is lowered while another is raised.',
  P8: 'The same pitch class an octave higher: the frame of the scale.',
};

/** A short, concrete context for a spelling above a given root (uses the simple part of compounds). */
export function contextFor(root: Note, iv: Interval): IntervalContext | null {
  const simple = simplifyInterval(iv);
  const name = safeName(simple);
  if (!name) return null;
  const upper = transpose(root, simple);
  const fill = (t: string, keyName: string) => t.replace(/\{a\}/g, noteName(root)).replace(/\{b\}/g, noteName(upper)).replace(/\{key\}/g, keyName);
  const def = CONTEXTS[name];
  if (def) {
    const scale = getScale(def.scale);
    const tonic = transposeDown(root, interval(scale.intervals[def.from - 1]));
    const keyName = `${noteName(tonic)} ${def.mode}`;
    return { text: fill(def.text, keyName), keyName };
  }
  const generic = GENERIC_CONTEXTS[name];
  return generic ? { text: fill(generic, ''), keyName: '' } : null;
}

/** For tests: the upper note implied by a context definition. */
export function contextUpperNote(root: Note, name: string): Note | null {
  const def = CONTEXTS[name];
  if (!def) return null;
  const scale = getScale(def.scale);
  const tonic = transposeDown(root, interval(scale.intervals[def.from - 1]));
  return buildScale(tonic, def.scale)[def.to - 1];
}

export function contextNames(): string[] {
  return Object.keys(CONTEXTS);
}
