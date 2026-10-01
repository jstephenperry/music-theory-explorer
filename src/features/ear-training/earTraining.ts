/**
 * Ear-training logic: exercise catalogs, question generation, rendering of questions to
 * spelled notes and timed events, answer statistics and adaptive item selection.
 * Pure functions with an injectable random source so everything is testable.
 */
import { buildChord } from '../../theory/chords';
import { degreeLabel, interval, intervalLongName, transpose, transposePitch, transposePitchDown } from '../../theory/intervals';
import { keyName, makeKey, type Key } from '../../theory/keys';
import { midi as toMidi, note, pitchAtOrAbove, type Pitch } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { buildScale } from '../../theory/scales';
import { voiceChord, voiceProgression } from '../../theory/voicing';

// ---------- Random ----------

export type Rng = () => number;

/** Small, fast seedable PRNG (mulberry32). Returns numbers in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------- Catalogs ----------

export type ExerciseType = 'intervals' | 'chords' | 'scales' | 'degrees' | 'cadences' | 'progressions';

export interface ItemDef {
  id: string;
  label: string;
  /** Secondary line on the answer button. */
  sub?: string;
  group?: string;
}

const INTERVAL_IDS = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];

const CHORD_ITEMS: ItemDef[] = [
  { id: 'maj', label: 'Major', group: 'Triads' },
  { id: 'min', label: 'Minor', group: 'Triads' },
  { id: 'dim', label: 'Diminished', group: 'Triads' },
  { id: 'aug', label: 'Augmented', group: 'Triads' },
  { id: 'sus2', label: 'Sus 2', group: 'Triads' },
  { id: 'sus4', label: 'Sus 4', group: 'Triads' },
  { id: 'maj7', label: 'Major 7', sub: 'maj7', group: 'Sevenths' },
  { id: '7', label: 'Dominant 7', sub: '7', group: 'Sevenths' },
  { id: 'm7', label: 'Minor 7', sub: 'm7', group: 'Sevenths' },
  { id: 'm7b5', label: 'Half-diminished', sub: 'ø7', group: 'Sevenths' },
  { id: 'dim7', label: 'Diminished 7', sub: '°7', group: 'Sevenths' },
  { id: 'mMaj7', label: 'Minor-major 7', sub: 'm(maj7)', group: 'Sevenths' },
];

const SCALE_ITEMS: ItemDef[] = [
  { id: 'ionian', label: 'Major', sub: 'Ionian', group: 'Major and minor' },
  { id: 'aeolian', label: 'Natural minor', sub: 'Aeolian', group: 'Major and minor' },
  { id: 'harmonic-minor', label: 'Harmonic minor', group: 'Major and minor' },
  { id: 'melodic-minor', label: 'Melodic minor', sub: 'ascending', group: 'Major and minor' },
  { id: 'dorian', label: 'Dorian', group: 'Modes' },
  { id: 'phrygian', label: 'Phrygian', group: 'Modes' },
  { id: 'lydian', label: 'Lydian', group: 'Modes' },
  { id: 'mixolydian', label: 'Mixolydian', group: 'Modes' },
  { id: 'locrian', label: 'Locrian', group: 'Modes' },
  { id: 'major-pentatonic', label: 'Major pentatonic', group: 'Other' },
  { id: 'minor-pentatonic', label: 'Minor pentatonic', group: 'Other' },
  { id: 'blues', label: 'Blues', group: 'Other' },
  { id: 'whole-tone', label: 'Whole tone', group: 'Other' },
  { id: 'diminished-hw', label: 'Diminished', sub: 'half-whole', group: 'Other' },
  { id: 'phrygian-dominant', label: 'Phrygian dominant', group: 'Other' },
];

const DEGREE_DEFS: Array<{ id: string; ivl: string }> = [
  { id: '1', ivl: 'P1' },
  { id: 'b2', ivl: 'm2' },
  { id: '2', ivl: 'M2' },
  { id: 'b3', ivl: 'm3' },
  { id: '3', ivl: 'M3' },
  { id: '4', ivl: 'P4' },
  { id: '#4', ivl: 'A4' },
  { id: '5', ivl: 'P5' },
  { id: 'b6', ivl: 'm6' },
  { id: '6', ivl: 'M6' },
  { id: 'b7', ivl: 'm7' },
  { id: '7', ivl: 'M7' },
];

export interface CadenceDef {
  id: string;
  label: string;
  sub: string;
  major?: string[];
  minor: string[];
}

export const CADENCES: CadenceDef[] = [
  { id: 'authentic', label: 'Authentic', sub: 'V to I', major: ['I', 'IV', 'V7', 'I'], minor: ['i', 'iv', 'V7', 'i'] },
  { id: 'plagal', label: 'Plagal', sub: 'IV to I', major: ['I', 'vi', 'IV', 'I'], minor: ['i', 'VI', 'iv', 'i'] },
  { id: 'half', label: 'Half', sub: 'ends on V', major: ['I', 'vi', 'ii6', 'V'], minor: ['i', 'VI', 'iio6', 'V'] },
  { id: 'deceptive', label: 'Deceptive', sub: 'V to vi', major: ['I', 'IV', 'V7', 'vi'], minor: ['i', 'iv', 'V7', 'VI'] },
  { id: 'phrygian', label: 'Phrygian half', sub: 'iv6 to V (minor)', minor: ['i', 'VI', 'iv6', 'V'] },
];

export interface ProgressionDef {
  id: string;
  mode: 'major' | 'minor';
  numerals: string[];
  label: string;
  nickname?: string;
}

export const PROGRESSIONS: ProgressionDef[] = [
  { id: 'I-IV-V-I', mode: 'major', numerals: ['I', 'IV', 'V', 'I'], label: 'I IV V I' },
  { id: 'I-V-vi-IV', mode: 'major', numerals: ['I', 'V', 'vi', 'IV'], label: 'I V vi IV', nickname: 'Axis' },
  { id: 'I-vi-IV-V', mode: 'major', numerals: ['I', 'vi', 'IV', 'V'], label: 'I vi IV V', nickname: 'Doo-wop' },
  { id: 'vi-IV-I-V', mode: 'major', numerals: ['vi', 'IV', 'I', 'V'], label: 'vi IV I V' },
  { id: 'I-IV-vi-V', mode: 'major', numerals: ['I', 'IV', 'vi', 'V'], label: 'I IV vi V' },
  { id: 'ii-V-I', mode: 'major', numerals: ['ii7', 'V7', 'Imaj7', 'Imaj7'], label: 'ii⁷ V⁷ Imaj⁷', nickname: 'Jazz two-five-one' },
  { id: 'I-vi-ii-V', mode: 'major', numerals: ['I', 'vi', 'ii', 'V'], label: 'I vi ii V', nickname: 'Turnaround' },
  { id: 'I-bVII-IV-I', mode: 'major', numerals: ['I', 'bVII', 'IV', 'I'], label: 'I ♭VII IV I', nickname: 'Mixolydian' },
  { id: 'IV-V-iii-vi', mode: 'major', numerals: ['IV', 'V', 'iii', 'vi'], label: 'IV V iii vi', nickname: 'Royal road' },
  { id: 'i-VII-VI-V', mode: 'minor', numerals: ['i', 'VII', 'VI', 'V'], label: 'i VII VI V', nickname: 'Andalusian' },
  { id: 'i-iv-V-i', mode: 'minor', numerals: ['i', 'iv', 'V', 'i'], label: 'i iv V i', nickname: 'Minor cadence' },
  { id: 'i-VI-III-VII', mode: 'minor', numerals: ['i', 'VI', 'III', 'VII'], label: 'i VI III VII', nickname: 'Epic minor' },
];

export const EXERCISES: Array<{ id: ExerciseType; label: string; blurb: string }> = [
  { id: 'intervals', label: 'Intervals', blurb: 'Name the distance between two notes.' },
  { id: 'chords', label: 'Chord qualities', blurb: 'Name the quality of a chord.' },
  { id: 'scales', label: 'Scales & modes', blurb: 'Name the scale or mode.' },
  { id: 'degrees', label: 'Scale degrees', blurb: 'A cadence sets the key; name the degree of the note that follows.' },
  { id: 'cadences', label: 'Cadences', blurb: 'Name how the phrase ends.' },
  { id: 'progressions', label: 'Progressions', blurb: 'Identify the chord progression.' },
];

/** Movable-do solfège names (do-based minor) for the degree buttons. */
const DEGREE_NAMES: Record<string, string> = {
  '1': 'do', b2: 'ra', '2': 're', b3: 'me', '3': 'mi', '4': 'fa', '#4': 'fi', '5': 'sol', b6: 'le', '6': 'la', b7: 'te', '7': 'ti',
};

export const ITEMS: Record<ExerciseType, ItemDef[]> = {
  intervals: INTERVAL_IDS.map((id) => ({ id, label: id, sub: intervalLongName(interval(id)).replace('perfect octave', 'octave').replace('augmented fourth', 'tritone') })),
  chords: CHORD_ITEMS,
  scales: SCALE_ITEMS,
  degrees: DEGREE_DEFS.map((d) => ({ id: d.id, label: degreeLabel(interval(d.ivl)), sub: DEGREE_NAMES[d.id] })),
  cadences: CADENCES.map((c) => ({ id: c.id, label: c.label, sub: c.sub })),
  progressions: PROGRESSIONS.map((p) => ({ id: p.id, label: p.label, sub: p.nickname ?? (p.mode === 'minor' ? 'minor' : undefined) })),
};



export const DEFAULT_ITEMS: Record<ExerciseType, string[]> = {
  intervals: ['m3', 'M3', 'P4', 'P5', 'M6', 'P8'],
  chords: ['maj', 'min', 'dim', 'aug'],
  scales: ['ionian', 'aeolian', 'harmonic-minor', 'melodic-minor'],
  degrees: ['1', '2', '3', '4', '5', '6', '7'],
  cadences: ['authentic', 'plagal', 'half', 'deceptive'],
  progressions: ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'ii-V-I'],
};

export function itemLabel(type: ExerciseType, id: string): string {
  return ITEMS[type].find((i) => i.id === id)?.label ?? id;
}

// ---------- Settings ----------

export type IntervalDirection = 'asc' | 'desc' | 'harmonic' | 'mixed';
export type ChordStyle = 'block' | 'arpeggio' | 'both';
export type ScaleDirection = 'asc' | 'desc' | 'both';
export type KeyModeSetting = 'major' | 'minor' | 'mixed';
export type RangeId = 'low' | 'mid' | 'high' | 'wide' | 'fixed';

export const RANGES: Record<RangeId, { label: string; lo: number; hi: number }> = {
  low: { label: 'Low (C3 to B3)', lo: 48, hi: 59 },
  mid: { label: 'Middle (G3 to G4)', lo: 55, hi: 67 },
  high: { label: 'High (C4 to C5)', lo: 60, hi: 72 },
  wide: { label: 'Wide (C3 to C5)', lo: 48, hi: 72 },
  fixed: { label: 'Always C4', lo: 60, hi: 60 },
};

export interface Settings {
  items: Record<ExerciseType, string[]>;
  intervalDirection: IntervalDirection;
  chordInversions: boolean;
  chordStyle: ChordStyle;
  scaleDirection: ScaleDirection;
  keyMode: KeyModeSetting;
  /** Degrees, cadences and progressions: random key or always C. */
  randomKey: boolean;
  range: RangeId;
  bpm: number;
  adaptive: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  items: DEFAULT_ITEMS,
  intervalDirection: 'asc',
  chordInversions: false,
  chordStyle: 'block',
  scaleDirection: 'asc',
  keyMode: 'major',
  randomKey: true,
  range: 'mid',
  bpm: 96,
  adaptive: true,
};

/** Merge stored settings with defaults (stored values may come from an older version). */
export function normalizeSettings(s: Partial<Settings> | null | undefined): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS, ...(s ?? {}), items: { ...DEFAULT_ITEMS } };
  for (const t of Object.keys(DEFAULT_ITEMS) as ExerciseType[]) {
    const valid = new Set(ITEMS[t].map((i) => i.id));
    const chosen = (s?.items?.[t] ?? DEFAULT_ITEMS[t]).filter((id) => valid.has(id));
    out.items[t] = chosen.length >= 2 ? ITEMS[t].map((i) => i.id).filter((id) => chosen.includes(id)) : DEFAULT_ITEMS[t];
  }
  if (!(out.range in RANGES)) out.range = 'mid';
  out.bpm = Math.max(40, Math.min(200, Number(out.bpm) || 96));
  return out;
}

// ---------- Statistics ----------

export interface ItemStat {
  /** Attempts. */
  a: number;
  /** Correct answers. */
  c: number;
  /** Most recent results (1 = correct), newest last, at most RECENT_WINDOW long. */
  r: number[];
}

export type Stats = Record<string, ItemStat>;

export const RECENT_WINDOW = 10;

export function statKey(type: ExerciseType, id: string): string {
  return `${type}:${id}`;
}

export function recordAnswer(stats: Stats, key: string, correct: boolean): Stats {
  const prev = stats[key] ?? { a: 0, c: 0, r: [] };
  const r = [...prev.r, correct ? 1 : 0].slice(-RECENT_WINDOW);
  return { ...stats, [key]: { a: prev.a + 1, c: prev.c + (correct ? 1 : 0), r } };
}

/**
 * Selection weight for an item. Recent accuracy is smoothed (Laplace: one imaginary right and one
 * wrong answer), so unseen items sit in the middle, items you miss rise to about 4 times the weight
 * of items you always get right.
 */
export function itemWeight(stat: ItemStat | undefined, adaptive = true): number {
  if (!adaptive) return 1;
  const r = stat?.r ?? [];
  const acc = (r.reduce((a, b) => a + b, 0) + 1) / (r.length + 2);
  return 0.4 + 2.6 * (1 - acc);
}

export function weightedPick<T>(items: T[], weights: number[], rng: Rng): T {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= Math.max(0, weights[i]);
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Probability of each item under the current weights (for display). */
export function selectionOdds(type: ExerciseType, ids: string[], stats: Stats, adaptive: boolean): Record<string, number> {
  const w = ids.map((id) => itemWeight(stats[statKey(type, id)], adaptive));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(ids.map((id, i) => [id, w[i] / total]));
}

// ---------- Questions ----------

export interface QuestionParams {
  /** Root (intervals, chords, scales) or tonic (degrees, cadences, progressions), with octave. */
  root: Pitch;
  direction?: 'asc' | 'desc' | 'harmonic';
  inversion?: number;
  chordStyle?: ChordStyle;
  scaleDirection?: ScaleDirection;
  mode?: 'major' | 'minor';
}

export interface Question {
  type: ExerciseType;
  answer: string;
  options: string[];
  params: QuestionParams;
}

/** Spellings for random tonics: conventional key signatures for each mode. */
const MAJOR_TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function rootFromMidi(m: number, mode: 'major' | 'minor' = 'major'): Pitch {
  const n = note((mode === 'minor' ? MINOR_TONICS : MAJOR_TONICS)[((m % 12) + 12) % 12]);
  // Octave belongs to the letter (Cb and B# never occur in these tables).
  return pitchAtOrAbove(n, m);
}

export function generateQuestion(type: ExerciseType, settings: Settings, stats: Stats, rng: Rng, lastAnswer?: string): Question {
  const options = settings.items[type].length >= 2 ? settings.items[type] : DEFAULT_ITEMS[type];
  const weights = options.map((id) => itemWeight(stats[statKey(type, id)], settings.adaptive) * (id === lastAnswer ? 0.35 : 1));
  const answer = weightedPick(options, weights, rng);
  const range = RANGES[settings.range] ?? RANGES.mid;
  const params: QuestionParams = { root: rootFromMidi(randInt(rng, range.lo, range.hi)) };

  switch (type) {
    case 'intervals': {
      const d = settings.intervalDirection;
      params.direction = d === 'mixed' ? pick(rng, ['asc', 'desc', 'harmonic'] as const) : d;
      break;
    }
    case 'chords': {
      params.chordStyle = settings.chordStyle;
      const size = buildChord(note('C'), answer).length;
      params.inversion = settings.chordInversions ? randInt(rng, 0, size - 1) : 0;
      break;
    }
    case 'scales':
      params.scaleDirection = settings.scaleDirection;
      break;
    case 'degrees':
    case 'cadences':
    case 'progressions': {
      let mode: 'major' | 'minor' = settings.keyMode === 'mixed' ? pick(rng, ['major', 'minor'] as const) : settings.keyMode;
      if (type === 'cadences' && !CADENCES.find((c) => c.id === answer)?.major) mode = 'minor';
      if (type === 'progressions') mode = PROGRESSIONS.find((p) => p.id === answer)?.mode ?? 'major';
      params.mode = mode;
      const tonicMidi = settings.randomKey ? randInt(rng, 0, 11) : 0;
      // Tonic octave is only a reference here; voicing chooses registers.
      params.root = rootFromMidi(60 + tonicMidi, mode);
      break;
    }
  }
  return { type, answer, options, params };
}

// ---------- Rendering ----------

export interface TimedEvent {
  /** Beats from the start. */
  time: number;
  /** Beats. */
  duration: number;
  pitches: Pitch[];
  /** Index of the staff event this belongs to. */
  staff: number;
}

export interface StaffItem {
  keys: Pitch[];
  duration: 'q' | 'h' | 'w' | '8';
  rest?: boolean;
  /** Text above the staff (used for single notes, which may sit on one staff of a grand staff). */
  top?: string;
  bottom?: string;
}

export interface Rendered {
  events: TimedEvent[];
  staff: StaffItem[];
  keySig: Key | null;
  /** Every pitch involved (for the piano). */
  pitches: Pitch[];
  /** Pitches of the answer itself (excluding context such as a cadence). */
  focus: Pitch[];
  /** Labels for the focus pitches on the keyboard (defaults to note names). */
  focusLabels?: string[];
  /** Short human description of what was played. */
  description: string;
  lengthBeats: number;
}

function keyFor(params: QuestionParams): Key {
  return makeKey({ letter: params.root.letter, acc: params.root.acc }, params.mode ?? 'major');
}

function chordsInKey(numerals: string[], key: Key): { pitches: Pitch[][]; display: string[] } {
  const chords = numerals.map((n) => parseRoman(n, key));
  const voiced = voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass })));
  return { pitches: voiced, display: chords.map((c) => c.display) };
}

/** Render any item of an exercise with the parameters of a question (used to compare answers). */
export function renderItem(type: ExerciseType, id: string, params: QuestionParams): Rendered {
  const root = params.root;
  switch (type) {
    case 'intervals': {
      const ivl = interval(id);
      const dir = params.direction ?? 'asc';
      const other = dir === 'desc' ? transposePitchDown(root, ivl) : transposePitch(root, ivl);
      const lo = dir === 'desc' ? other : root;
      const hi = dir === 'desc' ? root : other;
      if (dir === 'harmonic') {
        return {
          events: [{ time: 0, duration: 2.5, pitches: [lo, hi], staff: 0 }],
          staff: [{ keys: [lo, hi], duration: 'w', bottom: id }],
          keySig: null,
          pitches: [lo, hi],
          focus: [lo, hi],
          description: `${intervalLongName(ivl)}, harmonic`,
          lengthBeats: 2.5,
        };
      }
      const first = dir === 'desc' ? hi : lo;
      const second = dir === 'desc' ? lo : hi;
      return {
        events: [
          { time: 0, duration: 1, pitches: [first], staff: 0 },
          { time: 1, duration: 1.5, pitches: [second], staff: 1 },
        ],
        staff: [
          { keys: [first], duration: 'h' },
          { keys: [second], duration: 'h', bottom: id },
        ],
        keySig: null,
        pitches: [lo, hi],
        focus: [lo, hi],
        description: `${intervalLongName(ivl)}, ${dir === 'desc' ? 'descending' : 'ascending'}`,
        lengthBeats: 2.5,
      };
    }
    case 'chords': {
      const tones = buildChord(root, id);
      const inv = Math.min(params.inversion ?? 0, tones.length - 1);
      const voiced = voiceChord(tones, { inversion: inv, low: toMidi(root) });
      const style = params.chordStyle ?? 'block';
      const events: TimedEvent[] = [];
      let t = 0;
      if (style !== 'block') {
        voiced.forEach((p) => {
          events.push({ time: t, duration: 0.5, pitches: [p], staff: 0 });
          t += 0.5;
        });
        t += 0.25;
      }
      if (style !== 'arpeggio') {
        events.push({ time: t, duration: 2.5, pitches: voiced, staff: 0 });
        t += 2.5;
      }
      const invName = ['root position', 'first inversion', 'second inversion', 'third inversion'][inv];
      return {
        events,
        staff: [{ keys: voiced, duration: 'w' }],
        keySig: null,
        pitches: voiced,
        focus: voiced,
        description: `${itemLabel('chords', id).toLowerCase()} chord, ${invName}`,
        lengthBeats: t,
      };
    }
    case 'scales': {
      const notes = buildScale(root, id);
      const up: Pitch[] = [];
      let floor = toMidi(root);
      for (const n of notes) {
        const p = pitchAtOrAbove(n, floor);
        up.push(p);
        floor = toMidi(p) + 1;
      }
      up.push({ ...root, octave: root.octave + 1 });
      const dir = params.scaleDirection ?? 'asc';
      const seq = dir === 'asc' ? up : dir === 'desc' ? [...up].reverse() : [...up, ...up.slice(0, -1).reverse()];
      const events = seq.map((p, i) => ({ time: i * 0.5, duration: i === seq.length - 1 ? 1.25 : 0.5, pitches: [p], staff: i }));
      return {
        events,
        staff: seq.map((p) => ({ keys: [p], duration: '8' as const })),
        keySig: null,
        pitches: up,
        focus: up,
        description: `${itemLabel('scales', id)} scale`,
        lengthBeats: (seq.length - 1) * 0.5 + 1.25,
      };
    }
    case 'degrees': {
      const key = keyFor(params);
      const ctx = chordsInKey(key.mode === 'major' ? ['I', 'IV', 'V7', 'I'] : ['i', 'iv', 'V7', 'i'], key);
      const def = DEGREE_DEFS.find((d) => d.id === id)!;
      // The target sits at or above the tonic (placed between A3 and G♯4), so degrees rise in order.
      const tonicMidi = toMidi(pitchAtOrAbove(key.tonic, 57));
      const target = pitchAtOrAbove(transpose(key.tonic, interval(def.ivl)), tonicMidi);
      const events: TimedEvent[] = ctx.pitches.map((p, i) => ({ time: i, duration: 0.95, pitches: p, staff: i }));
      events.push({ time: 5, duration: 2, pitches: [target], staff: 5 });
      return {
        events,
        staff: [
          ...ctx.pitches.map((p, i) => ({ keys: p, duration: 'q' as const, bottom: ctx.display[i] })),
          { keys: [], duration: 'q', rest: true },
          { keys: [target], duration: 'h', top: degreeLabel(interval(def.ivl)) },
        ],
        keySig: key,
        pitches: [target],
        focus: [target],
        focusLabels: [degreeLabel(interval(def.ivl))],
        description: `degree ${degreeLabel(interval(def.ivl))} in ${keyName(key)}`,
        lengthBeats: 7,
      };
    }
    case 'cadences':
    case 'progressions': {
      const key = keyFor(params);
      let numerals: string[];
      if (type === 'cadences') {
        const c = CADENCES.find((x) => x.id === id)!;
        numerals = key.mode === 'major' && c.major ? c.major : c.minor;
      } else {
        numerals = PROGRESSIONS.find((x) => x.id === id)!.numerals;
      }
      // Render in the item's own mode when it differs from the question's (e.g. comparing a minor progression).
      const ownMode = type === 'progressions' ? PROGRESSIONS.find((x) => x.id === id)!.mode : type === 'cadences' && !CADENCES.find((x) => x.id === id)!.major ? 'minor' : key.mode;
      const useKey = ownMode === key.mode ? key : makeKey(key.tonic, ownMode);
      const ctx = chordsInKey(numerals, useKey);
      const beats = 2;
      return {
        events: ctx.pitches.map((p, i) => ({ time: i * beats, duration: beats * 0.95, pitches: p, staff: i })),
        staff: ctx.pitches.map((p, i) => ({ keys: p, duration: 'q' as const, bottom: ctx.display[i] })),
        keySig: useKey,
        pitches: ctx.pitches[ctx.pitches.length - 1],
        focus: type === 'cadences' ? [...ctx.pitches[ctx.pitches.length - 2], ...ctx.pitches[ctx.pitches.length - 1]] : ctx.pitches.flat(),
        description: ctx.display.join(' '),
        lengthBeats: numerals.length * beats,
      };
    }
  }
}

// ---------- Session ----------

export interface Session {
  correct: number;
  total: number;
  streak: number;
  best: number;
}

export const EMPTY_SESSION: Session = { correct: 0, total: 0, streak: 0, best: 0 };

export function scoreSession(s: Session, correct: boolean): Session {
  const streak = correct ? s.streak + 1 : 0;
  return { correct: s.correct + (correct ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) };
}
