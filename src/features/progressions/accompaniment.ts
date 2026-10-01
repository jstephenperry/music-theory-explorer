/**
 * Accompaniment patterns: turn voiced chords into sequencer events.
 * Each event carries `data: { chord }` so the UI can follow along.
 */
import type { SeqEvent } from '../../audio/sequencer';

export type AccompStyle = 'block' | 'arpeggio' | 'alberti' | 'strum' | 'waltz' | 'stride' | 'comp';

export const ACCOMP_STYLES: Array<{ id: AccompStyle; name: string; description: string }> = [
  { id: 'block', name: 'Block chords', description: 'All four voices together, held for the chord\'s full duration. Best for hearing voice leading.' },
  { id: 'arpeggio', name: 'Arpeggio', description: 'Eighth notes rolling up and down through the voicing, like a harp or a ballad piano.' },
  { id: 'alberti', name: 'Alberti bass', description: 'Classical-era pattern: low, high, middle, high in eighth notes over the held bass.' },
  { id: 'strum', name: 'Strum', description: 'Guitar-style down and up strums: down, down, up, up, down, up.' },
  { id: 'waltz', name: 'Waltz', description: 'Bass on the downbeat, then chord, chord. Use 3-beat chords for a true waltz.' },
  { id: 'stride', name: 'Stride', description: 'Left hand alternates a low bass and the chord: bass, chord, bass, chord.' },
  { id: 'comp', name: 'Jazz comp', description: 'Walking bass on every beat with chromatic approach notes, and short Charleston chord stabs.' },
];

export interface AccompChord {
  /** MIDI notes of the voicing, bass first (as produced by voiceProgression). */
  voicing: number[];
  beats: number;
  /** Pitch classes of the chord tones, root first (used by the walking bass). */
  tonePcs: number[];
}

export interface AccompOptions {
  click?: boolean;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Pitch with the given pitch class closest to `ref`. */
export function nearestWithPc(pcValue: number, ref: number): number {
  const base = ref - mod(ref - pcValue, 12);
  return ref - base <= 6 ? base : base + 12;
}

function clampBass(m: number, lo = 31, hi = 55): number {
  let x = m;
  while (x < lo) x += 12;
  while (x > hi) x -= 12;
  return x;
}

/** Walking bass line for one chord: chord tones upward, last beat a chromatic approach to the next bass. */
export function walkingLine(chord: AccompChord, nextBass: number): number[] {
  const n = Math.max(1, Math.round(chord.beats));
  const start = clampBass(chord.voicing[0]);
  const line = [start];
  const rootPc = chord.tonePcs[0];
  // Chord tones above the bass in ascending order within one octave (third, fifth, seventh).
  const above = [...chord.tonePcs.slice(1), rootPc]
    .map((p) => start + mod(p - start, 12))
    .filter((m) => m > start)
    .sort((a, b) => a - b);
  for (let i = 1; i < n; i++) {
    if (i === n - 1) {
      const target = nearestWithPc(mod(nextBass, 12), line[i - 1]);
      const prev = line[i - 1];
      // Approach from the side we are coming from, or from below when the target is a repeat.
      const approach = target > prev ? target - 1 : target < prev ? target + 1 : target - 1;
      line.push(clampBass(approach));
    } else {
      const pick = above[(i - 1) % Math.max(1, above.length)] ?? start + 7;
      line.push(clampBass(pick));
    }
  }
  return line;
}

const STRUM_PATTERN: Array<{ t: number; down: boolean; vel: number }> = [
  { t: 0, down: true, vel: 0.78 },
  { t: 1, down: true, vel: 0.62 },
  { t: 1.5, down: false, vel: 0.5 },
  { t: 2.5, down: false, vel: 0.52 },
  { t: 3, down: true, vel: 0.62 },
  { t: 3.5, down: false, vel: 0.5 },
];

/** Build sequencer events for the whole progression in a given style. */
export function buildAccompaniment(chords: AccompChord[], style: AccompStyle, opts: AccompOptions = {}): { events: SeqEvent[]; length: number } {
  const events: SeqEvent[] = [];
  let t0 = 0;
  chords.forEach((ch, idx) => {
    const D = ch.beats;
    const data = { chord: idx };
    const [bass, ...upper] = ch.voicing;
    const push = (time: number, duration: number, midi: number[], velocity: number, strum?: number) => {
      if (time >= D - 1e-6) return;
      events.push({ time: t0 + time, duration: Math.max(0.05, Math.min(duration, D - time)), midi, velocity, strum, data });
    };
    switch (style) {
      case 'block':
        push(0, D * 0.96, ch.voicing, 0.72);
        break;
      case 'arpeggio': {
        const order = [...ch.voicing, ...ch.voicing.slice(1, -1).reverse()];
        for (let i = 0, t = 0; t < D - 1e-6; i++, t += 0.5) push(t, 1.5, [order[i % order.length]], i % order.length === 0 ? 0.72 : 0.58);
        break;
      }
      case 'alberti': {
        const tri = upper.length >= 3 ? upper.slice(-3) : upper;
        const [lo, mid, hi] = [tri[0], tri[Math.min(1, tri.length - 1)], tri[tri.length - 1]];
        const pat = [lo, hi, mid, hi];
        push(0, D * 0.96, [bass], 0.6);
        for (let i = 0, t = 0; t < D - 1e-6; i++, t += 0.5) push(t, 0.5, [pat[i % 4]], i % 4 === 0 ? 0.62 : 0.5);
        break;
      }
      case 'strum': {
        for (let bar = 0; bar < D; bar += 4) {
          for (const s of STRUM_PATTERN) {
            const t = bar + s.t;
            const next = STRUM_PATTERN.find((x) => x.t > s.t);
            const dur = (next ? bar + next.t : bar + 4) - t;
            const notes = s.down ? ch.voicing : [...upper].reverse();
            push(t, dur * 0.95, notes, s.vel, 0.03);
          }
        }
        break;
      }
      case 'waltz': {
        for (let t = 0; t < D - 1e-6; t += 1) {
          if (t % 3 === 0) push(t, 1, [clampBass(bass - 12, 33)], 0.72);
          else push(t, 0.8, upper, 0.5);
        }
        break;
      }
      case 'stride': {
        for (let t = 0; t < D - 1e-6; t += 1) {
          if (t % 2 === 0) push(t, 0.9, [t % 4 === 0 ? clampBass(bass - 12, 31) : bass], 0.72);
          else push(t, 0.6, upper, 0.55);
        }
        break;
      }
      case 'comp': {
        const next = chords[(idx + 1) % chords.length];
        const line = walkingLine(ch, next.voicing[0]);
        line.forEach((m, i) => push(i, 0.92, [m], i === 0 ? 0.75 : 0.62));
        for (let bar = 0; bar < D; bar += 4) {
          push(bar, 0.6, upper, 0.55);
          push(bar + 1.5, 0.45, upper, 0.48);
        }
        break;
      }
    }
    if (opts.click) {
      for (let t = 0; t < D - 1e-6; t += 1) events.push({ time: t0 + t, duration: 0.1, click: t === 0 ? 'strong' : 'weak', data });
    }
    t0 += D;
  });
  return { events, length: t0 };
}
