/**
 * Rhythm pattern library for the step sequencer: clave, Afro-Cuban and Brazilian cells,
 * a rock beat and a Balkan 7/8 pattern. Cells are written as strings ("x" = hit).
 */

export type SoundId = 'clave' | 'bell' | 'block' | 'conga' | 'low' | 'kick' | 'snare' | 'hat' | 'dum' | 'tek' | 'ka';

export interface Sound {
  id: SoundId;
  name: string;
  /** Parameters for audio.percussion. */
  pitch: number;
  gain: number;
  decay: number;
}

export const SOUNDS: Record<SoundId, Sound> = {
  clave: { id: 'clave', name: 'Clave', pitch: 2400, gain: 0.5, decay: 0.05 },
  bell: { id: 'bell', name: 'Bell', pitch: 1150, gain: 0.32, decay: 0.12 },
  block: { id: 'block', name: 'Woodblock', pitch: 1600, gain: 0.4, decay: 0.06 },
  conga: { id: 'conga', name: 'Conga', pitch: 340, gain: 0.55, decay: 0.16 },
  low: { id: 'low', name: 'Low drum', pitch: 150, gain: 0.7, decay: 0.2 },
  kick: { id: 'kick', name: 'Kick', pitch: 75, gain: 0.85, decay: 0.22 },
  snare: { id: 'snare', name: 'Snare', pitch: 480, gain: 0.45, decay: 0.09 },
  hat: { id: 'hat', name: 'Hi-hat', pitch: 5200, gain: 0.22, decay: 0.03 },
  dum: { id: 'dum', name: 'Dum (low)', pitch: 120, gain: 0.8, decay: 0.22 },
  tek: { id: 'tek', name: 'Tek (high)', pitch: 950, gain: 0.45, decay: 0.06 },
  ka: { id: 'ka', name: 'Ka (ghost)', pitch: 1500, gain: 0.18, decay: 0.03 },
};

export interface PatternVoice {
  name: string;
  sound: SoundId;
  cells: boolean[];
}

export interface RhythmPattern {
  id: string;
  name: string;
  origin: string;
  /** Short explanation shown with the pattern. */
  blurb: string;
  steps: number;
  /** Steps per quarter-note beat (4 = sixteenths, 2 = eighths). */
  stepsPerBeat: number;
  /** Visual grouping of steps (beats), summing to steps. */
  groups: number[];
  timeSig: string;
  bpm: number;
  voices: PatternVoice[];
}

/** "x..x" → [true, false, false, true] */
export function cells(s: string): boolean[] {
  return [...s.replace(/\s/g, '')].map((c) => c === 'x' || c === 'X');
}

export function cellString(c: boolean[]): string {
  return c.map((x) => (x ? 'x' : '.')).join('');
}

export function onsets(c: boolean[]): number[] {
  return c.flatMap((x, i) => (x ? [i] : []));
}

/** Durations between successive onsets, wrapping around the cycle (e.g. tresillo 3+3+2). */
export function interOnsetIntervals(c: boolean[]): number[] {
  const on = onsets(c);
  if (on.length === 0) return [];
  return on.map((o, i) => (i < on.length - 1 ? on[i + 1] - o : c.length - o + on[0]));
}

/** Beat groups of a step count: full beats, then a remainder. */
export function beatGroups(steps: number, stepsPerBeat: number): number[] {
  const out: number[] = [];
  let rest = steps;
  while (rest > 0) {
    const g = Math.min(stepsPerBeat, rest);
    out.push(g);
    rest -= g;
  }
  return out;
}

const v = (name: string, sound: SoundId, s: string): PatternVoice => ({ name, sound, cells: cells(s) });

export const PATTERNS: RhythmPattern[] = [
  {
    id: 'son-32',
    name: 'Son clave 3-2',
    origin: 'Cuba',
    blurb: 'Three strokes, then two. The 3 side begins with the tresillo; the whole band phrases against it.',
    steps: 16,
    stepsPerBeat: 4,
    groups: [4, 4, 4, 4],
    timeSig: '4/4',
    bpm: 100,
    voices: [v('Clave', 'clave', 'x..x..x...x.x...'), v('Conga', 'conga', '......xx......xx'), v('Pulse', 'low', 'x...x...x...x...')],
  },
  {
    id: 'son-23',
    name: 'Son clave 2-3',
    origin: 'Cuba',
    blurb: 'The same clave started from its other half. Arrangers choose the direction to match the melody.',
    steps: 16,
    stepsPerBeat: 4,
    groups: [4, 4, 4, 4],
    timeSig: '4/4',
    bpm: 100,
    voices: [v('Clave', 'clave', '..x.x...x..x..x.'), v('Conga', 'conga', '......xx......xx'), v('Pulse', 'low', 'x...x...x...x...')],
  },
  {
    id: 'rumba-32',
    name: 'Rumba clave 3-2',
    origin: 'Cuba',
    blurb: 'Like son clave, but the third stroke is delayed by one sixteenth, to just before beat 3.',
    steps: 16,
    stepsPerBeat: 4,
    groups: [4, 4, 4, 4],
    timeSig: '4/4',
    bpm: 96,
    voices: [v('Clave', 'clave', 'x..x...x..x.x...'), v('Conga', 'conga', '..x...xx..x...xx'), v('Pulse', 'low', 'x.......x.......')],
  },
  {
    id: 'tresillo',
    name: 'Tresillo',
    origin: 'Cuba, Africa, worldwide',
    blurb: 'Eight pulses divided 3+3+2: the most widespread syncopation in the Americas.',
    steps: 8,
    stepsPerBeat: 4,
    groups: [4, 4],
    timeSig: '2/4',
    bpm: 92,
    voices: [v('Tresillo', 'bell', 'x..x..x.'), v('Shaker', 'hat', 'xxxxxxxx'), v('Pulse', 'low', 'x...x...')],
  },
  {
    id: 'cinquillo',
    name: 'Cinquillo',
    origin: 'Cuba (danzón, contradanza)',
    blurb: 'Tresillo with two notes filled in: long, short, long, short, long.',
    steps: 8,
    stepsPerBeat: 4,
    groups: [4, 4],
    timeSig: '2/4',
    bpm: 88,
    voices: [v('Cinquillo', 'block', 'x.xx.xx.'), v('Bass', 'conga', 'x..x..x.'), v('Pulse', 'low', 'x...x...')],
  },
  {
    id: 'habanera',
    name: 'Habanera',
    origin: 'Cuba, via Spain (Bizet’s Carmen)',
    blurb: 'A dotted figure on beat one, two even notes on beat two. Tresillo with its last stroke split.',
    steps: 8,
    stepsPerBeat: 4,
    groups: [4, 4],
    timeSig: '2/4',
    bpm: 76,
    voices: [v('Habanera', 'conga', 'x..xx.x.'), v('Melody', 'bell', 'x.x.x.x.'), v('Pulse', 'low', 'x...x...')],
  },
  {
    id: 'bossa',
    name: 'Bossa nova',
    origin: 'Brazil',
    blurb: 'A clave-like rim pattern over a steady bass on 1 and 3 with anticipations.',
    steps: 16,
    stepsPerBeat: 4,
    groups: [4, 4, 4, 4],
    timeSig: '4/4',
    bpm: 132,
    voices: [v('Rim', 'block', 'x..x..x...x..x..'), v('Shaker', 'hat', 'x.x.x.x.x.x.x.x.'), v('Bass', 'low', 'x.....xx.....xx.')],
  },
  {
    id: 'rock',
    name: 'Basic rock beat',
    origin: 'Rock and pop',
    blurb: 'Eighth-note hi-hat, kick on 1 and 3, snare backbeat on 2 and 4.',
    steps: 16,
    stepsPerBeat: 4,
    groups: [4, 4, 4, 4],
    timeSig: '4/4',
    bpm: 112,
    voices: [v('Hi-hat', 'hat', 'x.x.x.x.x.x.x.x.'), v('Snare', 'snare', '....x.......x...'), v('Kick', 'kick', 'x.......x.x.....')],
  },
  {
    id: 'balkan-78',
    name: 'Rachenitsa 7/8',
    origin: 'Bulgaria',
    blurb: 'Seven eighths as 2+2+3: two short beats and one long. Dancers feel three uneven steps.',
    steps: 7,
    stepsPerBeat: 2,
    groups: [2, 2, 3],
    timeSig: '7/8',
    bpm: 150,
    voices: [v('Dum', 'dum', 'x...x..'), v('Tek', 'tek', '..x...x'), v('Ka', 'ka', '.x.x.x.')],
  },
];
