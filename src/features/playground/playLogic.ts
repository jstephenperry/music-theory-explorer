/**
 * Pure helpers for the Free Play room: chord history, phrase recording and key parameters.
 */
import { makeKey, noteName, tryNote, keySignatureFifths, type Key } from '../../theory';

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: number;
  symbol: string;
  midis: number[];
}

const sameMidis = (a: number[], b: number[]) => a.length === b.length && a.every((m, i) => m === b[i]);

/** Append a recognized chord unless it repeats the last entry exactly. Keeps the newest `max` entries. */
export function pushHistory(list: HistoryEntry[], entry: Omit<HistoryEntry, 'id'>, max = 32): HistoryEntry[] {
  const midis = [...entry.midis].sort((a, b) => a - b);
  const last = list[list.length - 1];
  if (last && last.symbol === entry.symbol && sameMidis(last.midis, midis)) return list;
  const id = (last?.id ?? 0) + 1;
  return [...list, { id, symbol: entry.symbol, midis }].slice(-max);
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export interface RecNote {
  midi: number;
  /** Seconds from the start of the take. */
  start: number;
  /** Seconds from the start of the take, or null while the note is still sounding. */
  end: number | null;
  velocity: number;
}

/** Start a note in a take. */
export function recNoteOn(take: RecNote[], midiNote: number, t: number, velocity = 0.75): RecNote[] {
  return [...take, { midi: midiNote, start: t, end: null, velocity }];
}

/** End the most recent open instance of a note. */
export function recNoteOff(take: RecNote[], midiNote: number, t: number): RecNote[] {
  for (let i = take.length - 1; i >= 0; i--) {
    if (take[i].midi === midiNote && take[i].end === null) {
      const next = [...take];
      next[i] = { ...take[i], end: Math.max(t, take[i].start + 0.05) };
      return next;
    }
  }
  return take;
}

/** Close every open note at time t and trim leading silence so the take starts at 0. */
export function finishTake(take: RecNote[], t: number): RecNote[] {
  if (take.length === 0) return [];
  const closed = take.map((n) => (n.end === null ? { ...n, end: Math.max(t, n.start + 0.05) } : n));
  const t0 = Math.min(...closed.map((n) => n.start));
  return closed.map((n) => ({ ...n, start: n.start - t0, end: (n.end as number) - t0 }));
}

/** Length of a finished take in seconds. */
export function takeLength(take: RecNote[]): number {
  return take.reduce((a, n) => Math.max(a, n.end ?? n.start), 0);
}

/** Sequencer events for a finished take (at 60 bpm one beat equals one second). */
export function takeEvents(take: RecNote[]): Array<{ time: number; duration: number; midi: number[]; velocity: number; data: number }> {
  return take.map((n, i) => ({ time: n.start, duration: Math.max(0.05, (n.end ?? n.start + 0.3) - n.start), midi: [n.midi], velocity: n.velocity, data: i }));
}

/** Notes of a take sounding at time t (seconds). */
export function notesAt(take: RecNote[], t: number): number[] {
  const out = new Set<number>();
  for (const n of take) if (n.start <= t && (n.end ?? Infinity) > t) out.add(n.midi);
  return [...out].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Key parameter ("Eb", "F#m", "" for none)
// ---------------------------------------------------------------------------

export function keyFromParam(s: string): Key | null {
  if (!s) return null;
  const minor = s.endsWith('m');
  const tonic = tryNote(minor ? s.slice(0, -1) : s);
  if (!tonic) return null;
  const k = makeKey(tonic, minor ? 'minor' : 'major');
  return Math.abs(keySignatureFifths(k)) <= 7 ? k : null;
}

export function keyToParam(k: Key | null): string {
  if (!k) return '';
  return noteName(k.tonic, false) + (k.mode === 'minor' ? 'm' : '');
}

// ---------------------------------------------------------------------------
// Computer keyboard legend (mirrors the shared useComputerKeyboard mapping)
// ---------------------------------------------------------------------------

export const COMPUTER_KEYS: Array<{ key: string; offset: number }> = [
  { key: 'A', offset: 0 },
  { key: 'W', offset: 1 },
  { key: 'S', offset: 2 },
  { key: 'E', offset: 3 },
  { key: 'D', offset: 4 },
  { key: 'F', offset: 5 },
  { key: 'T', offset: 6 },
  { key: 'G', offset: 7 },
  { key: 'Y', offset: 8 },
  { key: 'H', offset: 9 },
  { key: 'U', offset: 10 },
  { key: 'J', offset: 11 },
  { key: 'K', offset: 12 },
  { key: 'O', offset: 13 },
  { key: 'L', offset: 14 },
  { key: 'P', offset: 15 },
  { key: ';', offset: 16 },
  { key: "'", offset: 17 },
];
