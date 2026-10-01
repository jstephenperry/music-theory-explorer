/**
 * Chord voicing and voice leading.
 */
import { midi, pc, pitchAtOrAbove, pitchNear, type Note, type Pitch } from './notes';

export type VoicingStyle = 'close' | 'open' | 'drop2' | 'drop3' | 'drop24' | 'shell' | 'spread' | 'rootless';

export const VOICING_STYLES: Array<{ id: VoicingStyle; name: string; description: string }> = [
  { id: 'close', name: 'Close', description: 'All notes within an octave, stacked as tightly as possible.' },
  { id: 'open', name: 'Open', description: 'Every other note raised an octave; a wide, orchestral sound.' },
  { id: 'drop2', name: 'Drop 2', description: 'The second-highest note of a close voicing dropped an octave. A staple of jazz guitar and piano.' },
  { id: 'drop3', name: 'Drop 3', description: 'The third-highest note of a close voicing dropped an octave.' },
  { id: 'drop24', name: 'Drop 2 & 4', description: 'The second and fourth notes from the top dropped an octave.' },
  { id: 'shell', name: 'Shell', description: 'Root, third and seventh only: the essential identity of the chord.' },
  { id: 'spread', name: 'Spread (bass + close)', description: 'Bass note low, remaining notes in close position an octave or more above.' },
  { id: 'rootless', name: 'Rootless', description: 'Root omitted (a bassist plays it); color tones stacked in close position.' },
];

export interface VoiceOptions {
  /** Index of the chord tone in the bass (0 = root position). */
  inversion?: number;
  style?: VoicingStyle;
  /** Lowest allowed MIDI note for the bottom of the voicing (default 48, C3). */
  low?: number;
}

/** Stack notes upward in close position, starting at or above `low`. */
export function stackClose(notes: Note[], low: number): Pitch[] {
  const out: Pitch[] = [];
  let floor = low;
  for (const n of notes) {
    const p = pitchAtOrAbove(n, floor);
    out.push(p);
    floor = midi(p) + 1;
  }
  return out;
}

function rotate<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  const s = ((k % n) + n) % n;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

function down(p: Pitch, octaves = 1): Pitch {
  return { ...p, octave: p.octave - octaves };
}

function up(p: Pitch, octaves = 1): Pitch {
  return { ...p, octave: p.octave + octaves };
}

const byMidi = (a: Pitch, b: Pitch) => midi(a) - midi(b);

/** Voice a chord (tones in stacking order, root first). Returns pitches sorted low to high. */
export function voiceChord(tones: Note[], opts: VoiceOptions = {}): Pitch[] {
  const style = opts.style ?? 'close';
  const low = opts.low ?? 48;
  const inv = Math.min(opts.inversion ?? 0, tones.length - 1);
  const rotated = rotate(tones, inv);

  switch (style) {
    case 'close':
      return stackClose(rotated, low);
    case 'open': {
      const close = stackClose(rotated, low);
      return close.map((p, i) => (i % 2 === 1 ? up(p) : p)).sort(byMidi);
    }
    case 'drop2':
    case 'drop3':
    case 'drop24': {
      const close = stackClose(rotated, low + 12);
      const n = close.length;
      const drops = style === 'drop2' ? [n - 2] : style === 'drop3' ? [n - 3] : [n - 2, n - 4];
      return close.map((p, i) => (drops.includes(i) ? down(p) : p)).sort(byMidi);
    }
    case 'shell': {
      const ivs = tones.map((_, i) => i);
      const third = ivs.find((i) => i > 0 && i < tones.length && [3, 4].includes(semisOf(tones, i)));
      const seventh = ivs.find((i) => [9, 10, 11].includes(semisOf(tones, i)) && i >= 3);
      const pick = [0, third, seventh].filter((i): i is number => i !== undefined).map((i) => tones[i]);
      const [root, ...rest] = pick;
      const bass = pitchAtOrAbove(root, low);
      return [bass, ...stackClose(rest, midi(bass) + 1)];
    }
    case 'spread': {
      const bass = pitchAtOrAbove(rotated[0], low - 12);
      const upper = stackClose(tones.filter((t) => pc(t) !== pc(rotated[0]) || tones.length <= 3), Math.max(midi(bass) + 12, low + 7));
      return [bass, ...upper].sort(byMidi);
    }
    case 'rootless': {
      const upper = tones.length > 3 ? tones.slice(1) : tones;
      return stackClose(rotate(upper, inv), low + 4);
    }
  }
}

function semisOf(tones: Note[], i: number): number {
  return ((pc(tones[i]) - pc(tones[0])) % 12 + 12) % 12;
}

/** Convenience: voice a chord from root and chord id. */
export function chordPitches(tones: Note[], inversion = 0, low = 48): Pitch[] {
  return voiceChord(tones, { inversion, low });
}

export interface VoiceLeadOptions {
  /** Number of upper voices (default 3, giving four-part harmony with the bass). */
  upperVoices?: number;
  bassRange?: [number, number];
  upperRange?: [number, number];
}

export interface ChordForVoicing {
  /** Chord tones in stacking order (root first). */
  notes: Note[];
  /** Bass note (root or another tone for inversions/slash chords). */
  bass: Note;
}

/** Choose which chord tones the upper voices must contain, dropping the fifth first when there are too many. */
function requiredTones(chord: ChordForVoicing, voices: number): Note[] {
  let tones = [...chord.notes];
  const rootPc = pc(chord.notes[0]);
  const semis = (n: Note) => ((pc(n) - rootPc) % 12 + 12) % 12;
  const dropOrder: Array<(n: Note) => boolean> = [
    (n) => semis(n) === 7 && tones.length > 3,
    (n) => pc(n) === rootPc && pc(chord.bass) === rootPc,
    (n) => semis(n) === 5 && tones.some((t) => semis(t) === 4),
    (n) => semis(n) === 2,
    (n) => semis(n) === 9,
  ];
  for (const pred of dropOrder) {
    if (tones.length <= voices) break;
    const idx = tones.findIndex(pred);
    if (idx >= 0) tones.splice(idx, 1);
  }
  while (tones.length > voices) tones.pop();
  return tones;
}

/** Initial four-part (or n-part) voicing for the first chord of a progression. */
export function initialVoicing(chord: ChordForVoicing, opts: VoiceLeadOptions = {}): Pitch[] {
  const voices = opts.upperVoices ?? 3;
  const [bLo] = opts.bassRange ?? [40, 55];
  const bass = pitchAtOrAbove(chord.bass, bLo + 3);
  const tones = requiredTones(chord, voices);
  while (tones.length < voices) tones.push(chord.notes[tones.length % chord.notes.length]);
  // Start the upper voices a little above middle C for a balanced sound.
  const upper = stackClose(tones, Math.max(midi(bass) + 7, 57));
  return [bass, ...upper];
}

/**
 * Lead from one voicing to the next chord with minimal total motion,
 * avoiding voice crossing and parallel fifths/octaves where possible.
 * The first element of `prev` is treated as the bass.
 */
export function voiceLead(prev: Pitch[], next: ChordForVoicing, opts: VoiceLeadOptions = {}): Pitch[] {
  const [bLo, bHi] = opts.bassRange ?? [36, 57];
  const [uLo, uHi] = opts.upperRange ?? [52, 81];
  const prevBass = prev[0];
  let bass = pitchNear(next.bass, midi(prevBass));
  if (midi(bass) < bLo) bass = { ...bass, octave: bass.octave + 1 };
  if (midi(bass) > bHi) bass = { ...bass, octave: bass.octave - 1 };

  const prevUpper = prev.slice(1);
  const voices = prevUpper.length;
  const tones = requiredTones(next, voices);
  const needAll = tones.length <= voices;

  let best: Pitch[] | null = null;
  let bestCost = Infinity;
  const choice: number[] = new Array(voices).fill(0);
  const total = Math.pow(tones.length, voices);

  for (let combo = 0; combo < total; combo++) {
    let c = combo;
    for (let v = 0; v < voices; v++) {
      choice[v] = c % tones.length;
      c = Math.floor(c / tones.length);
    }
    if (needAll) {
      const used = new Set(choice);
      if (used.size < tones.length) continue;
    }
    const cand = prevUpper.map((p, v) => pitchNear(tones[choice[v]], midi(p)));
    let cost = 0;
    for (let v = 0; v < voices; v++) {
      const d = Math.abs(midi(cand[v]) - midi(prevUpper[v]));
      cost += d;
      const m = midi(cand[v]);
      if (m < uLo) cost += (uLo - m) * 2;
      if (m > uHi) cost += (m - uHi) * 2;
      if (m <= midi(bass)) cost += 50;
    }
    // Crossing between adjacent upper voices.
    for (let v = 0; v + 1 < voices; v++) {
      if (midi(cand[v]) > midi(cand[v + 1])) cost += 6;
      if (midi(cand[v]) === midi(cand[v + 1])) cost += 3;
    }
    // Spacing: adjacent upper voices more than an octave apart.
    const sorted = [...cand].sort(byMidi);
    for (let v = 0; v + 1 < sorted.length; v++) {
      if (midi(sorted[v + 1]) - midi(sorted[v]) > 12) cost += 4;
    }
    // Parallel perfect fifths and octaves (including against the bass).
    const prevAll = [prevBass, ...prevUpper];
    const nextAll = [bass, ...cand];
    for (let a = 0; a < nextAll.length; a++) {
      for (let b = a + 1; b < nextAll.length; b++) {
        const i1 = Math.abs(midi(prevAll[a]) - midi(prevAll[b])) % 12;
        const i2 = Math.abs(midi(nextAll[a]) - midi(nextAll[b])) % 12;
        const movedA = midi(nextAll[a]) - midi(prevAll[a]);
        const movedB = midi(nextAll[b]) - midi(prevAll[b]);
        if (movedA !== 0 && movedB !== 0 && Math.sign(movedA) === Math.sign(movedB) && i1 === i2 && (i1 === 0 || i1 === 7)) {
          cost += 8;
        }
      }
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = cand;
    }
  }
  const upper = (best ?? stackClose(tones, uLo)).sort(byMidi);
  return [bass, ...upper];
}

/** Voice a whole progression with smooth voice leading. */
export function voiceProgression(chords: ChordForVoicing[], opts: VoiceLeadOptions = {}): Pitch[][] {
  const out: Pitch[][] = [];
  for (const chord of chords) {
    if (out.length === 0) out.push(initialVoicing(chord, opts));
    else out.push(voiceLead(out[out.length - 1], chord, opts));
  }
  return out;
}

/** Total semitone movement between two voicings of equal size (for teaching displays). */
export function voiceMotion(a: Pitch[], b: Pitch[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += Math.abs(midi(a[i]) - midi(b[i]));
  return sum;
}

