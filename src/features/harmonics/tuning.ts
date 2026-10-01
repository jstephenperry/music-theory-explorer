/**
 * Tuning mathematics: cents, the harmonic series, just ratios, beating and historical tuning systems.
 * Pure functions only (no DOM, no audio) so every value can be unit tested.
 */
import { intervalFromSemis, transpose, transposePitch, type Interval } from '../../theory/intervals';
import { midi as toMidi, mod, type Note, type Pitch } from '../../theory/notes';

// ---------- Basics ----------

/** Size of a frequency ratio in cents (1200 cents per octave). */
export function cents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

export function ratioFromCents(c: number): number {
  return Math.pow(2, c / 1200);
}

export function midiToFreqA4(m: number, a4: number): number {
  return a4 * Math.pow(2, (m - 69) / 12);
}

/** Fractional MIDI number of a frequency for a given A4. */
export function freqToMidiA4(f: number, a4: number): number {
  return 69 + 12 * Math.log2(f / a4);
}

/** Nearest equal-tempered MIDI note and the deviation of `f` from it in cents (positive = sharp). */
export function nearestTempered(f: number, a4: number): { midi: number; cents: number } {
  const exact = freqToMidiA4(f, a4);
  const m = Math.round(exact);
  return { midi: m, cents: (exact - m) * 100 };
}

/** Wrap a cents value into the range [-600, 600). */
export function wrapCents(c: number): number {
  return mod(c + 600, 1200) - 600;
}

/** Reduce a ratio into the octave [1, 2). */
export function octaveReduce(r: number): number {
  let x = r;
  while (x >= 2) x /= 2;
  while (x < 1) x *= 2;
  return x;
}

export const SYNTONIC_COMMA = cents(81 / 80);
export const PYTHAGOREAN_COMMA = cents(Math.pow(3, 12) / Math.pow(2, 19));
export const PURE_FIFTH = cents(3 / 2);
export const PURE_MAJOR_THIRD = cents(5 / 4);
export const PYTHAGOREAN_MAJOR_THIRD = cents(81 / 64);
/** Quarter-comma meantone fifth: a pure fifth narrowed by a quarter of the syntonic comma (ratio 5^(1/4)). */
export const MEANTONE_FIFTH = PURE_FIFTH - SYNTONIC_COMMA / 4;

// ---------- Harmonic series ----------

export interface Partial {
  /** Partial number, 1 = fundamental. */
  n: number;
  freq: number;
  /** Size above the fundamental in cents (1200 * log2 n). */
  centsAbove: number;
  /** Equal-tempered semitones above the fundamental of the nearest note. */
  semis: number;
  /** Deviation of the partial from that nearest equal-tempered note, in cents. */
  deviation: number;
  /** Interval from the fundamental to the nearest note, correctly spelled. */
  interval: Interval;
  /** Nearest note, spelled relative to the fundamental. */
  pitch: Pitch;
  /** MIDI number of the nearest equal-tempered note. */
  midi: number;
}

/**
 * The first `count` partials above a spelled fundamental.
 * Spellings follow the conventional interval for each nearest semitone (the 7th partial is a minor
 * seventh, the 11th an augmented fourth, the 13th a minor sixth).
 */
export function harmonicSeries(fundamental: Pitch, a4: number, count = 16): Partial[] {
  const f0 = midiToFreqA4(toMidi(fundamental), a4);
  const out: Partial[] = [];
  for (let n = 1; n <= count; n++) {
    const c = cents(n);
    const semis = Math.round(c / 100);
    const interval = intervalFromSemis(semis);
    const pitch = transposePitch(fundamental, interval);
    out.push({ n, freq: f0 * n, centsAbove: c, semis, deviation: c - semis * 100, interval, pitch, midi: toMidi(pitch) });
  }
  return out;
}

// ---------- Just intervals ----------

export interface JustInterval {
  id: string;
  name: string;
  short: string;
  /** Ratio as [numerator, denominator] in lowest terms. */
  ratio: [number, number];
  /** Equal-tempered size in semitones. */
  semis: number;
  note?: string;
}

export const JUST_INTERVALS: JustInterval[] = [
  { id: 'm2', name: 'Minor second', short: 'm2', ratio: [16, 15], semis: 1 },
  { id: 'M2', name: 'Major second', short: 'M2', ratio: [9, 8], semis: 2 },
  { id: 'm3', name: 'Minor third', short: 'm3', ratio: [6, 5], semis: 3 },
  { id: 'M3', name: 'Major third', short: 'M3', ratio: [5, 4], semis: 4, note: 'Equal temperament is 13.7 cents wide: the most audible compromise.' },
  { id: 'P4', name: 'Perfect fourth', short: 'P4', ratio: [4, 3], semis: 5 },
  { id: 'A4', name: 'Tritone', short: 'A4', ratio: [45, 32], semis: 6 },
  { id: 'P5', name: 'Perfect fifth', short: 'P5', ratio: [3, 2], semis: 7, note: 'Equal temperament is only 2 cents narrow: a slow, gentle beat.' },
  { id: 'm6', name: 'Minor sixth', short: 'm6', ratio: [8, 5], semis: 8 },
  { id: 'M6', name: 'Major sixth', short: 'M6', ratio: [5, 3], semis: 9 },
  { id: 'h7', name: 'Harmonic seventh', short: '7/4', ratio: [7, 4], semis: 10, note: 'The 7th partial: 31 cents below the tempered minor seventh.' },
  { id: 'm7', name: 'Minor seventh', short: 'm7', ratio: [16, 9], semis: 10 },
  { id: 'M7', name: 'Major seventh', short: 'M7', ratio: [15, 8], semis: 11 },
  { id: 'P8', name: 'Octave', short: 'P8', ratio: [2, 1], semis: 12 },
];

export function justCents(j: JustInterval): number {
  return cents(j.ratio[0] / j.ratio[1]);
}

/**
 * Beat rate (Hz) between two simultaneous tones whose frequency ratio is close to p/q.
 * The q-th partial of the upper tone and the p-th partial of the lower tone nearly coincide
 * (p * lower ≈ q * upper), and they beat at the difference of their frequencies.
 */
export function beatRate(lower: number, upper: number, p: number, q: number): number {
  return Math.abs(p * lower - q * upper);
}

// ---------- Tuning systems ----------

export type TuningId = 'et12' | 'pythagorean' | 'meantone' | 'just' | 'werckmeister3' | 'et19' | 'et31';

export interface TuningSystem {
  id: TuningId;
  name: string;
  short: string;
  description: string;
  /** Size of the generating fifth in cents, for chain-of-fifths systems. */
  fifth?: number;
}

/**
 * Lowest position on the chain of fifths, relative to the tonic, for chain-based systems.
 * -3 gives the classic keyboard layout E♭ to G♯ (for tonic C), so the wolf falls between G♯ and E♭.
 */
export const CHAIN_LOW = -3;

const ET19_FIFTH = (11 * 1200) / 19;
const ET31_FIFTH = (18 * 1200) / 31;

export const TUNING_SYSTEMS: TuningSystem[] = [
  { id: 'et12', name: '12-tone equal temperament', short: '12-TET', fifth: 700, description: 'Every semitone is exactly 100 cents. All keys sound alike; no interval except the octave is pure.' },
  { id: 'pythagorean', name: 'Pythagorean', short: 'Pythagorean', fifth: PURE_FIFTH, description: 'A chain of pure 3:2 fifths. Fifths and fourths are perfect, but major thirds are 22 cents wide and one fifth is a howling wolf.' },
  { id: 'meantone', name: 'Quarter-comma meantone', short: '¼-comma meantone', fifth: MEANTONE_FIFTH, description: 'Fifths narrowed by ¼ of the syntonic comma so that four of them make a pure 5:4 major third. Sweet thirds in common keys; the fifth that closes the chain (G♯ to E♭ on C) is a wolf.' },
  { id: 'just', name: '5-limit just intonation', short: 'Just (5-limit)', description: 'Ratios of small whole numbers built on the tonic (5:4 thirds, 3:2 fifths). I, IV and V are perfectly pure, but ii is out of tune and other keys fall apart.' },
  { id: 'werckmeister3', name: 'Werckmeister III', short: 'Werckmeister III', description: 'A 1691 well temperament: four fifths (C to G, G to D, D to A and B to F♯) narrowed by ¼ Pythagorean comma, the rest pure. Every key is playable, each with its own color.' },
  { id: 'et19', name: '19-tone equal temperament', short: '19-TET', fifth: ET19_FIFTH, description: 'Divides the octave into 19 steps. Its 11-step fifth (694.7 cents) behaves like a meantone; mapped here to the 12 nearest keys.' },
  { id: 'et31', name: '31-tone equal temperament', short: '31-TET', fifth: ET31_FIFTH, description: 'Divides the octave into 31 steps. Its fifth (696.8 cents) is almost exactly quarter-comma meantone; mapped here to 12 keys.' },
];

export const TUNING_BY_ID: Record<TuningId, TuningSystem> = Object.fromEntries(TUNING_SYSTEMS.map((t) => [t.id, t])) as Record<TuningId, TuningSystem>;

/** 5-limit just ratios for the 12 chromatic degrees above the tonic. */
export const JUST_RATIOS: Array<[number, number]> = [
  [1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3], [45, 32], [3, 2], [8, 5], [5, 3], [16, 9], [15, 8],
];

/** Werckmeister III, cents above C for C, C♯, D ... B. */
export const WERCKMEISTER_III = [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18];

/**
 * Cents above the tonic for each chromatic degree 0..11, built from a chain of 12 fifths of the
 * given size, spanning positions `low` .. `low + 11` on the line of fifths.
 */
export function chainOfFifths(fifth: number, low = CHAIN_LOW): number[] {
  const out = new Array<number>(12).fill(0);
  for (let k = low; k < low + 12; k++) {
    const degree = mod(7 * k, 12);
    out[degree] = mod(k * fifth, 1200);
  }
  return out;
}

/**
 * Cents above the tonic for each of the 12 chromatic degrees of a tuning built on that tonic.
 * Werckmeister III is a fixed keyboard temperament defined from C, so it needs the tonic pitch class
 * to rotate it; every other system is built on the tonic itself.
 */
export function degreeCents(id: TuningId, tonicPc = 0): number[] {
  switch (id) {
    case 'just':
      return JUST_RATIOS.map(([a, b]) => cents(a / b));
    case 'werckmeister3': {
      const base = WERCKMEISTER_III[mod(tonicPc, 12)];
      return Array.from({ length: 12 }, (_, d) => mod(WERCKMEISTER_III[mod(tonicPc + d, 12)] - base, 1200));
    }
    default:
      return chainOfFifths(TUNING_BY_ID[id].fifth!);
  }
}

/**
 * Deviation from 12-TET (in cents) of each degree, when the tonic itself is tuned to its 12-TET pitch.
 * Index 0 is the tonic.
 */
export function deviations(id: TuningId, tonicPc = 0): number[] {
  return degreeCents(id, tonicPc).map((c, d) => wrapCents(c - d * 100));
}

/**
 * Frequency of a MIDI key in a tuning. The tonic in every octave is tuned to its 12-TET pitch
 * (relative to `a4`), and every other key is placed by the tuning's cents above that tonic.
 */
export function tunedFrequency(id: TuningId, tonicPc: number, midiNote: number, a4: number): number {
  const degree = mod(midiNote - tonicPc, 12);
  const tonicMidi = midiNote - degree;
  const c = degreeCents(id, tonicPc)[degree];
  return midiToFreqA4(tonicMidi, a4) * ratioFromCents(c);
}

/** Size in cents of the interval from degree a up `semis` semitones in a tuning (degrees relative to the tonic). */
export function intervalSize(id: TuningId, tonicPc: number, fromDegree: number, semis: number): number {
  const table = degreeCents(id, tonicPc);
  const a = table[mod(fromDegree, 12)];
  const toAbs = fromDegree + semis;
  const b = table[mod(toAbs, 12)] + 1200 * Math.floor(toAbs / 12) - 1200 * Math.floor(fromDegree / 12);
  return b - a;
}

/** Major triad quality on each degree: third and fifth sizes and their deviations from pure (5:4 and 3:2). */
export function triadQualities(id: TuningId, tonicPc: number): Array<{ degree: number; third: number; fifth: number; thirdError: number; fifthError: number }> {
  return Array.from({ length: 12 }, (_, d) => {
    const third = intervalSize(id, tonicPc, d, 4);
    const fifth = intervalSize(id, tonicPc, d, 7);
    return { degree: d, third, fifth, thirdError: third - PURE_MAJOR_THIRD, fifthError: fifth - PURE_FIFTH };
  });
}

/**
 * The wolf of a chain-of-fifths system: the one "fifth" that closes the chain
 * (from the highest chain note back to the lowest), equal to 7 octaves minus 11 regular fifths.
 */
export function wolfFifth(fifth: number): number {
  return 7 * 1200 - 11 * fifth;
}

/**
 * Spelled notes at the two ends of the chain of fifths for a tonic: the wolf runs from the
 * top of the chain (e.g. G♯ for tonic C) up to the bottom (E♭).
 */
export function wolfNotes(tonic: Note, low = CHAIN_LOW): { from: Note; to: Note } {
  const high = low + 11;
  return { from: alongFifths(tonic, high), to: alongFifths(tonic, low) };
}

/** Move `k` steps along the line of fifths from a note (negative = flatward), with correct spelling. */
export function alongFifths(n: Note, k: number): Note {
  let out = { ...n };
  const p5 = { num: 5, semis: 7 };
  const p4 = { num: 4, semis: 5 };
  for (let i = 0; i < Math.abs(k); i++) out = transpose(out, k > 0 ? p5 : p4);
  return out;
}

/**
 * Pythagorean comma demo: 12 pure fifths up from a starting frequency, each folded down by octaves
 * to stay within one octave above the start. Returns frequencies (13 values, start included).
 * The last value is a Pythagorean comma (23.46 cents) above the start's octave.
 */
export function circleOfPureFifths(start: number): number[] {
  const out = [start];
  let f = start;
  for (let i = 0; i < 12; i++) {
    f *= 1.5;
    while (f >= start * 2 * 1.02) f /= 2;
    out.push(f);
  }
  return out;
}

// ---------- Additive synthesis ----------

export interface Spectrum {
  /** Amplitudes (0..1) for partials 1..N. */
  amps: number[];
  /** Phases in radians for partials 1..N. */
  phases: number[];
}

export const PARTIAL_COUNT = 16;

export type PresetId = 'sine' | 'square' | 'saw' | 'triangle' | 'clarinet' | 'organ' | 'oboe' | 'hollow';

export const SYNTH_PRESETS: Array<{ id: PresetId; name: string; hint: string }> = [
  { id: 'sine', name: 'Sine', hint: 'The fundamental alone: a pure tone.' },
  { id: 'square', name: 'Square', hint: 'Odd partials at 1/n: hollow and reedy.' },
  { id: 'saw', name: 'Sawtooth', hint: 'Every partial at 1/n: bright and buzzy, like bowed strings or brass.' },
  { id: 'triangle', name: 'Triangle', hint: 'Odd partials at 1/n² with alternating phase: soft and flute-like.' },
  { id: 'clarinet', name: 'Clarinet', hint: 'Strong odd partials, weak even ones in the low register: a cylindrical pipe closed at one end.' },
  { id: 'organ', name: 'Organ', hint: 'Drawbars at 8′, 4′, 2⅔′, 2′ and 1′ (partials 1, 2, 3, 4, 8).' },
  { id: 'oboe', name: 'Oboe', hint: 'Weak fundamental with strong 2nd to 5th partials: nasal and penetrating.' },
  { id: 'hollow', name: 'Octaves only', hint: 'Only partials 1, 2, 4, 8 and 16: every one an octave of the fundamental, so the tone is pure yet bright.' },
];

export function presetSpectrum(id: PresetId, count = PARTIAL_COUNT): Spectrum {
  const amps = new Array<number>(count).fill(0);
  const phases = new Array<number>(count).fill(0);
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    switch (id) {
      case 'sine':
        amps[i] = n === 1 ? 1 : 0;
        break;
      case 'square':
        amps[i] = n % 2 === 1 ? 1 / n : 0;
        break;
      case 'saw':
        amps[i] = 1 / n;
        break;
      case 'triangle':
        amps[i] = n % 2 === 1 ? 1 / (n * n) : 0;
        // sin, -sin(3x)/9, +sin(5x)/25 ... gives the triangle shape.
        phases[i] = n % 4 === 3 ? Math.PI : 0;
        break;
      case 'clarinet': {
        const table = [1, 0.04, 0.75, 0.03, 0.5, 0.03, 0.35, 0.02, 0.22, 0.02, 0.12, 0.01, 0.08, 0.01, 0.05, 0.01];
        amps[i] = table[i] ?? 0;
        break;
      }
      case 'organ': {
        const table: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.55, 4: 0.5, 8: 0.3 };
        amps[i] = table[n] ?? 0;
        break;
      }
      case 'oboe': {
        const table = [0.35, 0.8, 1, 0.75, 0.55, 0.3, 0.25, 0.18, 0.12, 0.1, 0.07, 0.05, 0.04, 0.03, 0.02, 0.02];
        amps[i] = table[i] ?? 0;
        break;
      }
      case 'hollow':
        amps[i] = [1, 2, 4, 8, 16].includes(n) ? 1 / Math.sqrt(n) : 0;
        break;
    }
  }
  return { amps, phases };
}

/** Sample one period of the waveform Σ a_n sin(nθ + φ_n), normalized to peak 1. */
export function sampleWaveform(spec: Spectrum, samples = 256): number[] {
  const out = new Array<number>(samples).fill(0);
  for (let s = 0; s < samples; s++) {
    const th = (2 * Math.PI * s) / samples;
    let v = 0;
    for (let i = 0; i < spec.amps.length; i++) if (spec.amps[i]) v += spec.amps[i] * Math.sin((i + 1) * th + spec.phases[i]);
    out[s] = v;
  }
  const peak = Math.max(1e-9, ...out.map(Math.abs));
  return out.map((v) => v / peak);
}

/**
 * Fourier coefficients for a Web Audio PeriodicWave (index 0 is DC).
 * sin(nθ + φ) = cos φ · sin nθ + sin φ · cos nθ, so real (cosine) = a sin φ, imag (sine) = a cos φ.
 */
export function periodicWaveCoefficients(spec: Spectrum): { real: Float32Array; imag: Float32Array } {
  const n = spec.amps.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  spec.amps.forEach((a, i) => {
    real[i + 1] = a * Math.sin(spec.phases[i]);
    imag[i + 1] = a * Math.cos(spec.phases[i]);
  });
  return { real, imag };
}

const JUST_SPELLING = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'];

/**
 * Spelled note names for the 12 keys of a tuning built on `tonic`, index 0 = tonic.
 * Chain-of-fifths systems are spelled along their chain (E♭ to G♯ on C); just intonation by its ratios
 * (16/15 is a minor second, 8/5 a minor sixth).
 */
export function degreeNotes(id: TuningId, tonic: Note): Note[] {
  if (id === 'just') {
    return JUST_SPELLING.map((name) => {
      const q = name[0];
      const num = Number(name.slice(1));
      const ref = [0, 2, 4, 5, 7, 9, 11][num - 1];
      const semis = q === 'm' ? ref - 1 : q === 'A' ? ref + 1 : ref;
      return transpose(tonic, { num, semis });
    });
  }
  const out: Note[] = new Array(12);
  for (let k = CHAIN_LOW; k < CHAIN_LOW + 12; k++) out[mod(7 * k, 12)] = alongFifths(tonic, k);
  return out;
}
