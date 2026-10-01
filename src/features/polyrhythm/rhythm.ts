/**
 * Rhythm math for polyrhythms and polymeters: LCM grids, onset times, composite rhythms,
 * phase drift, tuplet notation and the mapping from rhythmic ratios to musical intervals.
 * Pure functions, no DOM.
 */

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b);
}

export function lcmAll(xs: number[]): number {
  return xs.reduce((acc, x) => lcm(acc, x), 1);
}

export interface Fraction {
  n: number;
  d: number;
}

export function frac(n: number, d: number): Fraction {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

export function fracString(f: Fraction): string {
  return f.n === 0 ? '0' : f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

/** Grid steps (out of `size`) where a layer of `count` evenly spaced onsets sounds. */
export function layerSteps(count: number, size: number): number[] {
  if (count <= 0 || size % count !== 0) throw new Error(`${size} is not a multiple of ${count}`);
  const step = size / count;
  return Array.from({ length: count }, (_, k) => k * step);
}

export interface PolyGrid {
  /** Number of grid steps per cycle: the least common multiple of the counts. */
  size: number;
  /** rows[layer][step] is true where the layer has an onset. */
  rows: boolean[][];
  /** Steps where at least one layer sounds. */
  composite: number[];
  /** Which layers sound at each composite onset. */
  compositeLayers: number[][];
  /** Durations between composite onsets in grid steps (wrapping). */
  compositeIOI: number[];
  /** Steps where every layer sounds together. */
  together: number[];
}

export function polyGrid(counts: number[]): PolyGrid {
  const size = lcmAll(counts);
  const rows = counts.map((c) => {
    const r = Array<boolean>(size).fill(false);
    for (const s of layerSteps(c, size)) r[s] = true;
    return r;
  });
  const composite: number[] = [];
  const compositeLayers: number[][] = [];
  const together: number[] = [];
  for (let s = 0; s < size; s++) {
    const layers = rows.flatMap((r, i) => (r[s] ? [i] : []));
    if (layers.length) {
      composite.push(s);
      compositeLayers.push(layers);
    }
    if (layers.length === counts.length) together.push(s);
  }
  const compositeIOI = composite.map((s, i) => (i < composite.length - 1 ? composite[i + 1] - s : size - s + composite[0]));
  return { size, rows, composite, compositeLayers, compositeIOI, together };
}

/** Onset times of a layer within a cycle of length `cycle` (any unit). */
export function onsetTimes(count: number, cycle = 1): number[] {
  return Array.from({ length: count }, (_, k) => (k * cycle) / count);
}

/** Composite onsets as reduced fractions of the cycle. */
export function compositeFractions(counts: number[]): Fraction[] {
  const g = polyGrid(counts);
  return g.composite.map((s) => frac(s, g.size));
}

// ---------- Mnemonics ----------

const MNEMONICS: Record<string, { words: string; syllables: string[] }> = {
  '2:3': { words: 'Nice cup of tea', syllables: ['Nice', 'cup', 'of', 'tea'] },
  '3:4': { words: 'Pass the golden butter', syllables: ['Pass', 'the', 'gol', 'den', 'but', 'ter'] },
};

/** A well-known spoken mnemonic aligned to the composite rhythm, if one exists for these counts. */
export function mnemonic(counts: number[]): { words: string; syllables: string[] } | null {
  if (counts.length !== 2) return null;
  const [a, b] = [...counts].sort((x, y) => x - y);
  const m = MNEMONICS[`${a}:${b}`];
  if (!m) return null;
  return polyGrid(counts).composite.length === m.syllables.length ? m : null;
}

// ---------- Polymeter ----------

export interface PolymeterInfo {
  /** Pulses until every layer's cycle starts together again. */
  period: number;
  /** Number of complete cycles each layer plays in one period. */
  cycles: number[];
  /** accents[layer][pulse] true where that layer's cycle starts (within one period). */
  accents: boolean[][];
}

export function polymeter(lengths: number[]): PolymeterInfo {
  const period = lcmAll(lengths);
  return {
    period,
    cycles: lengths.map((l) => period / l),
    accents: lengths.map((l) => Array.from({ length: period }, (_, p) => p % l === 0)),
  };
}

/** Position (1-based) within each layer's cycle at a given pulse. */
export function cyclePositions(lengths: number[], pulse: number): number[] {
  return lengths.map((l) => (pulse % l) + 1);
}

/**
 * Phase drift of layer B against layer A: at the start of each of A's cycles within a period,
 * how many pulses B is into its own cycle (0 = aligned).
 */
export function phaseDrift(a: number, b: number): number[] {
  const period = lcm(a, b);
  return Array.from({ length: period / a }, (_, k) => (k * a) % b);
}

// ---------- Ratios as intervals ----------

const JUST: Record<string, string> = {
  '1/1': 'unison',
  '2/1': 'octave',
  '3/2': 'perfect fifth',
  '4/3': 'perfect fourth',
  '5/4': 'major third',
  '6/5': 'minor third',
  '5/3': 'major sixth',
  '8/5': 'minor sixth',
  '9/8': 'major second',
  '10/9': 'minor whole tone',
  '16/15': 'minor second',
  '15/8': 'major seventh',
  '9/5': 'minor seventh',
  '16/9': 'minor seventh',
  '7/4': 'harmonic seventh',
  '7/6': 'septimal minor third',
  '7/5': 'septimal tritone',
  '8/7': 'septimal whole tone',
  '9/7': 'septimal major third',
  '11/8': 'undecimal tritone',
  '13/8': 'tridecimal neutral sixth',
};

const ET_NAMES = [
  'unison',
  'minor second',
  'major second',
  'minor third',
  'major third',
  'perfect fourth',
  'tritone',
  'perfect fifth',
  'minor sixth',
  'major sixth',
  'minor seventh',
  'major seventh',
  'octave',
];

export interface RatioInterval {
  ratio: Fraction;
  cents: number;
  /** Name of the just interval (octave-reduced), e.g. "perfect fifth". */
  justName: string | null;
  octaves: number;
  /** Full description, e.g. "perfect fifth" or "major third plus an octave". */
  description: string;
  /** Nearest equal-tempered interval and the deviation in cents. */
  nearest: { semitones: number; name: string; deviation: number };
}

const ORDINAL_OCT = (o: number) => (o === 1 ? 'an octave' : `${o} octaves`);

export function ratioInterval(a: number, b: number): RatioInterval {
  const r = frac(Math.max(a, b), Math.min(a, b));
  const cents = 1200 * Math.log2(r.n / r.d);
  // Octave-reduce into (1, 2].
  let red = r;
  let oct = 0;
  while (red.n / red.d > 2) {
    red = frac(red.n, red.d * 2);
    oct++;
  }
  const justName = JUST[`${red.n}/${red.d}`] ?? null;
  const semis = Math.round(cents / 100);
  const pc = semis % 12;
  const nearestName = semis <= 12 ? ET_NAMES[semis] : `${pc === 0 ? 'octave' : ET_NAMES[pc]} plus ${ORDINAL_OCT(pc === 0 ? semis / 12 - 1 : Math.floor(semis / 12))}`;
  let description: string;
  if (r.n === 3 && r.d === 1) description = 'octave plus a perfect fifth (a twelfth)';
  else if (justName === 'octave') description = oct === 0 ? 'octave' : `${oct + 1} octaves`;
  else if (justName) description = oct === 0 ? justName : `${justName} plus ${ORDINAL_OCT(oct)}`;
  else description = `about a ${nearestName}`;
  return { ratio: r, cents, justName, octaves: oct, description, nearest: { semitones: semis, name: nearestName, deviation: cents - semis * 100 } };
}

// ---------- Notation of A against B ----------

export type NoteDur = 'w' | 'h' | 'q' | '8' | '16' | '32';

const DUR_WHOLE: Array<[NoteDur, number]> = [
  ['w', 1],
  ['h', 1 / 2],
  ['q', 1 / 4],
  ['8', 1 / 8],
  ['16', 1 / 16],
  ['32', 1 / 32],
];

const near = (x: number, y: number) => Math.abs(x - y) < 1e-9;

export interface LayerNotation {
  count: number;
  dur: NoteDur;
  dots: number;
  tuplet: { numNotes: number; notesOccupied: number; ratioed: boolean } | null;
}

export interface PolyNotation {
  timeSig: string;
  top: LayerNotation;
  bottom: LayerNotation;
}

/** Plain (possibly dotted) note value of a duration in whole notes, if one exists. */
export function plainValue(whole: number): { dur: NoteDur; dots: number } | null {
  for (const [dur, w] of DUR_WHOLE) {
    if (near(whole, w)) return { dur, dots: 0 };
    if (near(whole, w * 1.5)) return { dur, dots: 1 };
  }
  return null;
}

const largestPow2Below = (n: number) => {
  let p = 1;
  while (p * 2 < n) p *= 2;
  return p;
};

/**
 * Notate `a` evenly spaced notes against `b` beats in one bar of b/4 (b ≤ 4) or b/8 (b ≤ 8).
 * Uses plain or dotted values when they fit exactly (4 against 3 as dotted eighths),
 * otherwise a tuplet (3 against 2 as a quarter-note triplet). Returns null if not notatable.
 */
export function polyNotation(a: number, b: number): PolyNotation | null {
  if (a < 1 || b < 1 || b > 8 || a > 16) return null;
  const unit = b <= 4 ? 1 / 4 : 1 / 8;
  const unitDur: NoteDur = b <= 4 ? 'q' : '8';
  const total = b * unit;
  const bottom: LayerNotation = { count: b, dur: unitDur, dots: 0, tuplet: null };
  const timeSig = `${b}/${b <= 4 ? 4 : 8}`;
  const plain = plainValue(total / a);
  if (plain) return { timeSig, top: { count: a, ...plain, tuplet: null }, bottom };
  for (const [dur, v] of DUR_WHOLE) {
    const occ = total / v;
    if (!near(occ, Math.round(occ))) continue;
    const o = Math.round(occ);
    if (o <= a && a < 2 * o) {
      const standard = o === largestPow2Below(a) && (a & (a - 1)) !== 0;
      return { timeSig, top: { count: a, dur, dots: 0, tuplet: { numNotes: a, notesOccupied: o, ratioed: !standard } }, bottom };
    }
  }
  return null;
}

// ---------- Presets ----------

export interface PolyPreset {
  id: string;
  label: string;
  counts: number[];
  note?: string;
}

export const POLY_PRESETS: PolyPreset[] = [
  { id: '3-2', label: '3:2', counts: [3, 2], note: 'The hemiola cell' },
  { id: '4-3', label: '4:3', counts: [4, 3] },
  { id: '5-4', label: '5:4', counts: [5, 4] },
  { id: '5-3', label: '5:3', counts: [5, 3] },
  { id: '5-2', label: '5:2', counts: [5, 2] },
  { id: '7-4', label: '7:4', counts: [7, 4] },
  { id: '7-8', label: '7:8', counts: [7, 8] },
  { id: '3-4-2', label: '3:4:2', counts: [3, 4, 2], note: 'Three layers' },
  { id: '5-4-3', label: '5:4:3', counts: [5, 4, 3] },
  { id: '3-2-1', label: '6:4:3', counts: [6, 4, 3], note: 'Shares common pulses' },
];

export const POLYMETER_PRESETS: PolyPreset[] = [
  { id: '3-4', label: '3 against 4', counts: [3, 4] },
  { id: '2-3', label: '2 against 3', counts: [2, 3] },
  { id: '4-5', label: '4 against 5', counts: [4, 5] },
  { id: '5-7', label: '5 against 7', counts: [5, 7] },
  { id: '3-4-5', label: '3, 4 and 5', counts: [3, 4, 5] },
  { id: '6-4', label: '6 against 4', counts: [6, 4], note: 'Shares a factor' },
];
