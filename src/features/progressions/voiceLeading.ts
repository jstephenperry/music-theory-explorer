/**
 * Voice-leading analysis between consecutive four-part voicings (bass first, upper voices ascending).
 */
import { intervalName, pitchInterval } from '../../theory/intervals';
import { midi, pitchName, type Pitch } from '../../theory/notes';

export const VOICE_NAMES = ['Bass', 'Tenor', 'Alto', 'Soprano'];

export interface VoiceMove {
  voice: number;
  from: Pitch;
  to: Pitch;
  /** Signed semitones. */
  semis: number;
  /** Melodic interval name (P1, m2, A2 ...). */
  interval: string;
  common: boolean;
}

export type WarningKind = 'parallel5' | 'parallel8' | 'crossing' | 'leap' | 'augmented';

export interface VoiceWarning {
  kind: WarningKind;
  voices: number[];
  message: string;
}

export interface Transition {
  from: number;
  to: number;
  moves: VoiceMove[];
  /** Total absolute semitone motion. */
  total: number;
  commonTones: number;
  warnings: VoiceWarning[];
}

export function voiceName(i: number, count: number): string {
  if (count === 4) return VOICE_NAMES[i];
  if (i === 0) return 'Bass';
  return `Voice ${i + 1}`;
}

/** Analyze the motion between two voicings of equal size. */
export function analyzeTransition(a: Pitch[], b: Pitch[], from = 0, to = 1): Transition {
  const n = Math.min(a.length, b.length);
  const moves: VoiceMove[] = [];
  for (let v = 0; v < n; v++) {
    const semis = midi(b[v]) - midi(a[v]);
    moves.push({ voice: v, from: a[v], to: b[v], semis, interval: intervalName(pitchInterval(a[v], b[v])), common: semis === 0 });
  }
  const warnings: VoiceWarning[] = [];
  const name = (v: number) => voiceName(v, n);
  for (let x = 0; x < n; x++) {
    for (let y = x + 1; y < n; y++) {
      const i1 = Math.abs(midi(a[y]) - midi(a[x]));
      const i2 = Math.abs(midi(b[y]) - midi(b[x]));
      const mx = moves[x].semis;
      const my = moves[y].semis;
      if (mx === 0 || my === 0 || Math.sign(mx) !== Math.sign(my)) continue;
      if (i1 % 12 === 7 && i2 % 12 === 7 && i1 > 0) {
        warnings.push({ kind: 'parallel5', voices: [x, y], message: `Parallel fifths between ${name(x)} and ${name(y)} (${pitchName(a[x])} and ${pitchName(a[y])} to ${pitchName(b[x])} and ${pitchName(b[y])})` });
      } else if (i1 % 12 === 0 && i2 % 12 === 0) {
        warnings.push({ kind: 'parallel8', voices: [x, y], message: `Parallel ${i1 === 0 ? 'unisons' : 'octaves'} between ${name(x)} and ${name(y)}` });
      }
    }
  }
  for (let v = 0; v + 1 < n; v++) {
    if (midi(b[v]) > midi(b[v + 1])) warnings.push({ kind: 'crossing', voices: [v, v + 1], message: `${name(v)} crosses above ${name(v + 1)}` });
  }
  moves.forEach((m) => {
    if (m.voice > 0 && Math.abs(m.semis) > 7) warnings.push({ kind: 'leap', voices: [m.voice], message: `${name(m.voice)} leaps a ${m.interval} (${Math.abs(m.semis)} semitones)` });
    if (m.voice > 0 && /^A/.test(m.interval) && m.interval !== 'A1') warnings.push({ kind: 'augmented', voices: [m.voice], message: `${name(m.voice)} moves by an augmented interval (${m.interval})` });
  });
  return {
    from,
    to,
    moves,
    total: moves.reduce((s, m) => s + Math.abs(m.semis), 0),
    commonTones: moves.filter((m) => m.common).length,
    warnings,
  };
}

/** Analyze every consecutive pair; with `wrap`, also the move from the last chord back to the first. */
export function analyzeVoiceLeading(voicings: Pitch[][], wrap = false): Transition[] {
  const out: Transition[] = [];
  for (let i = 0; i + 1 < voicings.length; i++) out.push(analyzeTransition(voicings[i], voicings[i + 1], i, i + 1));
  if (wrap && voicings.length > 1) out.push(analyzeTransition(voicings[voicings.length - 1], voicings[0], voicings.length - 1, 0));
  return out;
}

export function formatSemis(s: number): string {
  if (s === 0) return '0';
  return s > 0 ? `+${s}` : `−${Math.abs(s)}`;
}
