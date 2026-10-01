/**
 * Geometry and harmony helpers for the Circle of Fifths room.
 *
 * The circle has twelve slots. Slot 0 is C major / A minor at the top; moving clockwise (in fifths
 * orientation) adds a sharp. The three slots at the bottom hold enharmonic pairs: B / C♭ (slot 5),
 * F♯ / G♭ (slot 6) and D♭ / C♯ (slot 7). The first entry of each slot is its primary spelling.
 */
import {
  buildChord,
  buildScale,
  fifthsFromC,
  keyFromFifths,
  keySignatureFifths,
  mod,
  noteFromFifths,
  relativeKey,
  type Key,
  type KeyMode,
  type Note,
} from '../../theory';

/** Signature fifths for each slot, primary spelling first. */
export const SLOT_FIFTHS: number[][] = [[0], [1], [2], [3], [4], [5, -7], [6, -6], [-5, 7], [-4], [-3], [-2], [-1]];

export function slotKeys(slot: number, mode: KeyMode): Key[] {
  return SLOT_FIFTHS[mod(slot, 12)].map((f) => keyFromFifths(f, mode));
}

/** Slot of a key (by its signature, so A minor shares slot 0 with C major). */
export function slotOfKey(k: Key): number {
  return mod(keySignatureFifths(k), 12);
}

/** Slot of a note read as a major tonic (outer ring). */
export function slotOfMajorRoot(n: Note): number {
  return mod(fifthsFromC(n), 12);
}

/** Slot of a note read as a minor tonic (inner ring). */
export function slotOfMinorRoot(n: Note): number {
  return mod(fifthsFromC(n) - 3, 12);
}

export type Orientation = 'fifths' | 'fourths';

/** Angle in degrees (0 = top, clockwise positive) of a slot center. */
export function slotAngle(slot: number, orientation: Orientation): number {
  return slot * 30 * (orientation === 'fifths' ? 1 : -1);
}

/** Point on a circle for an angle measured clockwise from the top. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/** SVG path of an annular sector between radii r0 < r1 and angles a0 < a1 (degrees). */
export function sectorPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${f2(x0)} ${f2(y0)} A${r1} ${r1} 0 ${large} 1 ${f2(x1)} ${f2(y1)} L${f2(x2)} ${f2(y2)} A${r0} ${r0} 0 ${large} 0 ${f2(x3)} ${f2(y3)} Z`;
}

/** Pick the representation of `target` (mod 360) closest to `prev`, so CSS rotations take the short way round. */
export function nearestAngle(prev: number, target: number): number {
  const d = mod(target - prev + 180, 360) - 180;
  return prev + d;
}

/** Signature label for a slot, e.g. "3♭", "0", "5♯ 7♭". */
export function signatureLabel(fifths: number): string {
  if (fifths === 0) return '0';
  return fifths > 0 ? `${fifths}♯` : `${-fifths}♭`;
}

// ---------------------------------------------------------------------------
// Harmony around the circle
// ---------------------------------------------------------------------------

export const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
/** Ring and slot offset (from the parent major key) of each diatonic degree. */
const DEGREE_PLACES: Array<{ ring: 'major' | 'minor'; offset: number }> = [
  { ring: 'major', offset: 0 },
  { ring: 'minor', offset: -1 },
  { ring: 'minor', offset: 1 },
  { ring: 'major', offset: -1 },
  { ring: 'major', offset: 1 },
  { ring: 'minor', offset: 0 },
  { ring: 'minor', offset: 2 },
];

export interface HarmonyPosition {
  /** 0-based degree of the parent major scale. */
  degree: number;
  slot: number;
  ring: 'major' | 'minor';
  /** Roman numeral relative to the selected key's tonic (natural minor for minor keys). */
  numeral: string;
  /** Mode of the parent major scale that starts on this chord's root. */
  mode: string;
  root: Note;
}

/**
 * Where the diatonic triads of a key sit on the circle: the six consonant triads fill a
 * three-slot wedge, and the diminished triad sits just outside it on the inner ring.
 */
export function harmonyPositions(k: Key): HarmonyPosition[] {
  const parent = k.mode === 'major' ? k : relativeKey(k);
  const s = slotOfKey(parent);
  const scale = buildScale(parent.tonic, 'ionian');
  return DEGREE_PLACES.map((place, d) => ({
    degree: d,
    slot: mod(s + place.offset, 12),
    ring: place.ring,
    numeral: k.mode === 'major' ? MAJOR_NUMERALS[d] : MINOR_NUMERALS[(d + 2) % 7],
    mode: MODE_NAMES[d],
    root: scale[d],
  }));
}

/** Wrap a line-of-fifths position into the readable range G♭ (-6) to B (+5). */
export function normalizeFifths(f: number): number {
  return mod(f + 6, 12) - 6;
}

/**
 * Roots for a walk around the circle in descending fifths (each chord is the dominant of the next).
 * The first root keeps its spelling; later roots use the simplest spelling.
 */
export function circleWalkRoots(start: Note, count = 12): Note[] {
  const f0 = fifthsFromC(start);
  return Array.from({ length: count }, (_, i) => (i === 0 ? { ...start } : noteFromFifths(normalizeFifths(f0 - i))));
}

/** The chain of dominant sevenths around the circle, resolving home to the starting triad (major or minor). */
export function circleWalkChords(start: Note, home: 'maj' | 'min' = 'maj'): Array<{ root: Note; chordId: string; notes: Note[] }> {
  const roots = circleWalkRoots(start, 12);
  const chain = roots.map((r) => ({ root: r, chordId: '7', notes: buildChord(r, '7') }));
  chain.push({ root: { ...start }, chordId: home, notes: buildChord(start, home) });
  return chain;
}

export const SHARP_MNEMONIC = 'Father Charles Goes Down And Ends Battle';
export const FLAT_MNEMONIC = 'Battle Ends And Down Goes Charles’ Father';

/** "3 flats", "1 sharp", "no sharps or flats". */
export function signatureWords(k: Key): string {
  const f = keySignatureFifths(k);
  if (f === 0) return 'no sharps or flats';
  const n = Math.abs(f);
  return `${n} ${f > 0 ? 'sharp' : 'flat'}${n > 1 ? 's' : ''}`;
}
