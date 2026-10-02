/**
 * Registry of the repertoire and helpers for borrowing from it. Rooms look works up by id rather
 * than importing the constants, so a replaced work is found by the type checker and the test.
 */
import type { Motive } from '../theory/composition/motive';
import { buildScore, type PlainNote, type Score, type ScoreNote } from '../theory/score';
import type { Pitch } from '../theory/notes';
import { CHORALE_269 } from './bwv269';
import { INVENTION_1 } from './bwv772';
import { WTC_C_PRELUDE } from './bwv846';
import { K265_THEME, K265_VAR1 } from './k265';
import { K331_THEME } from './k331';
import { K545_OPENING } from './k545';
import { OP2_NO1 } from './op2no1';
import { FIFTH_SYMPHONY } from './op67';
import type { Excerpt } from './types';

export type { Analysis, Bracket, Excerpt, Layer, Work } from './types';
export { MUTOPIA } from './types';

/** Every work, in the order rooms present them. */
export const REPERTOIRE: Excerpt[] = [INVENTION_1, FIFTH_SYMPHONY, K331_THEME, OP2_NO1, CHORALE_269, K545_OPENING, WTC_C_PRELUDE, K265_THEME, K265_VAR1];

const BY_ID = new Map(REPERTOIRE.map((e) => [e.work.id, e]));

/** An excerpt by its work id. Throws on an unknown id so a removed work fails loudly. */
export function excerpt(id: string): Excerpt {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown work "${id}"`);
  return e;
}

const SCORES = new Map<string, Score>();

/** The built score of a work (cached). */
export function score(id: string): Score {
  let s = SCORES.get(id);
  if (!s) {
    s = buildScore(excerpt(id).work.spec);
    SCORES.set(id, s);
  }
  return s;
}

/** Parse a single-range selector "staff.voice.first-last" (or "staff.voice.index"). */
function parseRange(selector: string): { staff: number; voice: number; first: number; last: number } {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(selector.trim());
  if (!m) throw new Error(`fragment selector must be "staff.voice.first-last", got "${selector}"`);
  return { staff: Number(m[1]), voice: Number(m[2]), first: Number(m[3]), last: Number(m[4] ?? m[3]) };
}

/**
 * The notes of one voice between two indices, rests included and tied notes joined, as plain notes
 * ready for a generator. Unlike `selectNotes`, this keeps rests, because a motive may start with one.
 */
export function fragment(id: string, selector: string): PlainNote[] {
  const { staff, voice, first, last } = parseRange(selector);
  const notes = score(id).staves[staff]?.voices[voice]?.notes.slice(first, last + 1) ?? [];
  const out: PlainNote[] = [];
  let open: { note: ScoreNote; plain: PlainNote } | null = null;
  for (const n of notes) {
    if (n.rest === 'space') continue;
    if (open && open.note.tie && open.note.pitches.map(pitchKey).join() === n.pitches.map(pitchKey).join()) {
      open.plain.dur += n.dur;
      open = n.tie ? { note: n, plain: open.plain } : null;
      continue;
    }
    const plain: PlainNote = { pitches: n.rest ? [] : n.pitches, dur: n.dur };
    out.push(plain);
    open = n.tie ? { note: n, plain } : null;
  }
  return out;
}

const pitchKey = (p: Pitch) => `${p.letter}${p.acc}${p.octave}`;

/** A fragment as a motive for the motive workshop: one pitch per note, null for a rest. */
export function motiveFragment(id: string, selector: string): Motive {
  return fragment(id, selector).map((n) => ({ pitch: n.pitches[0] ?? null, dur: n.dur }));
}

export interface QuarterEntry {
  pitch: Pitch;
  /** Length in quarter notes until the next entry. */
  dur: number;
  /** The roman numeral in force, as plain text ("V65"), carried forward from the last label. */
  numeral?: string;
}

const SUPER_SUB: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

/** A displayed numeral ("V⁶₅") as the plain text the roman-numeral parser reads ("V65"). */
export function plainNumeral(display: string): string {
  return display.replace(/[⁰-⁹₀-₉]/g, (c) => SUPER_SUB[c] ?? c);
}

/**
 * One entry per note that starts on a quarter-note beat in a voice, with the numeral in force. A
 * generator that works beat by beat (the variation workshop) reads a theme this way, so the theme
 * is encoded once, in the work's score.
 */
export function quarterEntries(id: string, staff: number, voice: number): QuarterEntry[] {
  const notes = score(id).staves[staff]?.voices[voice]?.notes ?? [];
  const onBeat = (n: ScoreNote) => !n.rest && Math.abs(n.start - Math.round(n.start)) <= 1e-6;
  const out: QuarterEntry[] = [];
  let numeral: string | undefined;
  notes.forEach((n, i) => {
    if (n.below) numeral = plainNumeral(n.below);
    if (!onBeat(n)) return;
    // The entry lasts until the next on-beat note, or to the end of its own note.
    const next = notes.slice(i + 1).find(onBeat);
    out.push({ pitch: n.pitches[n.pitches.length - 1], dur: next ? next.start - n.start : n.dur, numeral });
  });
  return out;
}
