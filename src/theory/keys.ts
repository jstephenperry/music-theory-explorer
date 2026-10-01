/**
 * Keys, key signatures, diatonic harmony and key relationships.
 */
import { CHORDS, chordIntervals } from './chords';
import { intervalBetween, interval, transpose } from './intervals';
import { buildScale } from './scales';
import { fifthsFromC, mod, note, noteFromFifths, noteName, pc, type Note } from './notes';

export type KeyMode = 'major' | 'minor';

export interface Key {
  tonic: Note;
  mode: KeyMode;
}

export function makeKey(tonic: string | Note, mode: KeyMode = 'major'): Key {
  return { tonic: typeof tonic === 'string' ? note(tonic) : { ...tonic }, mode };
}

export function keyName(k: Key, unicode = true): string {
  return `${noteName(k.tonic, unicode)} ${k.mode}`;
}

/** Short label: "E♭" for major, "c♯" style lower-case for minor is ambiguous, so use "C♯m". */
export function keyShortName(k: Key, unicode = true): string {
  return noteName(k.tonic, unicode) + (k.mode === 'minor' ? 'm' : '');
}

export function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && a.tonic.letter === b.tonic.letter && a.tonic.acc === b.tonic.acc;
}

export function enharmonicKeys(a: Key, b: Key): boolean {
  return a.mode === b.mode && pc(a.tonic) === pc(b.tonic);
}

export function keyScaleId(k: Key): string {
  return k.mode === 'major' ? 'ionian' : 'aeolian';
}

/** Scale notes (natural minor for minor keys). */
export function keyNotes(k: Key): Note[] {
  return buildScale(k.tonic, keyScaleId(k));
}

/** Position on the circle of fifths: number of sharps (positive) or flats (negative). */
export function keySignatureFifths(k: Key): number {
  return fifthsFromC(k.tonic) - (k.mode === 'minor' ? 3 : 0);
}

export interface KeySignature {
  fifths: number;
  /** Altered notes in signature order (F C G D A E B for sharps, B E A D G C F for flats). */
  accidentals: Note[];
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const;
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const;

export function keySignature(k: Key): KeySignature {
  return signatureFromFifths(keySignatureFifths(k));
}

export function signatureFromFifths(fifths: number): KeySignature {
  const accidentals: Note[] = [];
  if (fifths > 0) {
    for (let i = 0; i < fifths; i++) accidentals.push({ letter: SHARP_ORDER[i % 7], acc: 1 + Math.floor(i / 7) });
  } else if (fifths < 0) {
    for (let i = 0; i < -fifths; i++) accidentals.push({ letter: FLAT_ORDER[i % 7], acc: -1 - Math.floor(i / 7) });
  }
  return { fifths, accidentals };
}

/** Accidental applied by the key signature to each letter. */
export function signatureAccidentalMap(fifths: number): Record<string, number> {
  const map: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  for (const n of signatureFromFifths(fifths).accidentals) map[n.letter] = n.acc;
  return map;
}

/** VexFlow key signature spec ("Eb", "F#m"), or null when the key needs more than 7 accidentals. */
export function vexKeySpec(k: Key): string | null {
  const f = keySignatureFifths(k);
  if (Math.abs(f) > 7) return null;
  return noteName(k.tonic, false) + (k.mode === 'minor' ? 'm' : '');
}

export function keyFromFifths(fifths: number, mode: KeyMode = 'major'): Key {
  const tonic = noteFromFifths(fifths + (mode === 'minor' ? 3 : 0));
  return { tonic, mode };
}

export function relativeKey(k: Key): Key {
  return k.mode === 'major'
    ? { tonic: transpose(k.tonic, interval('M6')), mode: 'minor' }
    : { tonic: transpose(k.tonic, interval('m3')), mode: 'major' };
}

export function parallelKey(k: Key): Key {
  return { tonic: { ...k.tonic }, mode: k.mode === 'major' ? 'minor' : 'major' };
}

export function dominantKey(k: Key): Key {
  return { tonic: transpose(k.tonic, interval('P5')), mode: k.mode };
}

export function subdominantKey(k: Key): Key {
  return { tonic: transpose(k.tonic, interval('P4')), mode: k.mode };
}

/** The five closely related keys (key signatures differ by at most one accidental). */
export function closelyRelatedKeys(k: Key): Array<{ key: Key; relation: string }> {
  const f = keySignatureFifths(k);
  const rel = relativeKey(k);
  const out: Array<{ key: Key; relation: string }> = [{ key: rel, relation: 'relative' }];
  const dom = keyFromFifths(f + 1, k.mode);
  const sub = keyFromFifths(f - 1, k.mode);
  out.push({ key: dom, relation: 'dominant' });
  out.push({ key: relativeKey(dom), relation: 'relative of dominant' });
  out.push({ key: sub, relation: 'subdominant' });
  out.push({ key: relativeKey(sub), relation: 'relative of subdominant' });
  return out;
}

/** Major keys from 7 flats to 7 sharps, in circle-of-fifths order. */
export const MAJOR_KEYS: Key[] = Array.from({ length: 15 }, (_, i) => keyFromFifths(i - 7, 'major'));
export const MINOR_KEYS: Key[] = Array.from({ length: 15 }, (_, i) => keyFromFifths(i - 7, 'minor'));

/** Twelve practical keys per mode (at most 6 accidentals; F# and Gb both included for majors). */
export const PRACTICAL_MAJOR_KEYS: Key[] = MAJOR_KEYS.filter((k) => Math.abs(keySignatureFifths(k)) <= 6);
export const PRACTICAL_MINOR_KEYS: Key[] = MINOR_KEYS.filter((k) => Math.abs(keySignatureFifths(k)) <= 6);

/** Match a chord stacked from intervals (semitones above root) to a catalog chord id. */
export function chordIdFromSemis(semis: number[]): string | null {
  const key = semis.join(',');
  for (const c of CHORDS) {
    if (c.noIdentify) continue;
    if (chordIntervals(c.id).map((i) => i.semis).join(',') === key) return c.id;
  }
  return null;
}

export interface DiatonicChord {
  /** 1-based scale degree. */
  degree: number;
  root: Note;
  chordId: string;
  notes: Note[];
}

/**
 * Diatonic chords built by stacking thirds within a scale (any heptatonic scale id).
 */
export function diatonicChordsOfScale(tonic: Note, scaleId: string, sevenths = false): DiatonicChord[] {
  const scale = buildScale(tonic, scaleId);
  if (scale.length !== 7) return [];
  return scale.map((root, i) => {
    const tones = [0, 2, 4, ...(sevenths ? [6] : [])].map((o) => scale[(i + o) % 7]);
    const semis = tones.map((t) => {
      const iv = intervalBetween(root, t);
      return iv.semis;
    });
    const chordId = chordIdFromSemis(semis) ?? (sevenths ? '7' : 'maj');
    return { degree: i + 1, root, chordId, notes: tones };
  });
}

export function diatonicChords(k: Key, sevenths = false, minorVariant: 'natural' | 'harmonic' | 'melodic' = 'natural'): DiatonicChord[] {
  const scaleId = k.mode === 'major' ? 'ionian' : minorVariant === 'natural' ? 'aeolian' : minorVariant === 'harmonic' ? 'harmonic-minor' : 'melodic-minor';
  return diatonicChordsOfScale(k.tonic, scaleId, sevenths);
}

/** Does every pitch class of the chord belong to the key (natural scale, or harmonic minor variants)? */
export function chordIsDiatonic(chordPcs: number[], k: Key): boolean {
  const scalePcs = new Set(keyNotes(k).map(pc));
  if (chordPcs.every((p) => scalePcs.has(mod(p, 12)))) return true;
  if (k.mode === 'minor') {
    const harmonic = new Set(buildScale(k.tonic, 'harmonic-minor').map(pc));
    if (chordPcs.every((p) => harmonic.has(mod(p, 12)))) return true;
  }
  return false;
}

/** Distance between two keys on the circle of fifths (0..6), comparing signatures. */
export function fifthsDistance(a: Key, b: Key): number {
  const d = mod(keySignatureFifths(a) - keySignatureFifths(b), 12);
  return Math.min(d, 12 - d);
}
