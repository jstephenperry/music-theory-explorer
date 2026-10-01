/**
 * Names and notation for pitches that fall between the keys of the piano.
 *
 * A microtonal pitch is a spelled note plus a deviation in cents from its equal-tempered pitch.
 * How the deviation is written depends on the tradition:
 * - quarter: Arabic-style half-flat and half-sharp signs; smaller deviations are not written.
 * - persian: koron and sori on the staff (shown as half-flat and half-sharp in text).
 * - turkish: Arel-Ezgi-Uzdilek comma accidentals on the staff; arrows in text.
 * - arrows: arrow accidentals (raised or lowered by a small amount), quarter-tone signs near 50 cents.
 */
import type { MicroNotation } from './scales';
import { accidentalString, fifthsFromC, type Note } from './notes';

/** Half-flat and half-sharp in text. The Unicode quarter-tone signs (U+1D133, U+1D132) are missing from most fonts. */
export const QUARTER_FLAT = '½♭';
export const QUARTER_SHARP = '½♯';

/** Deviations smaller than this are not shown in names (Pythagorean and similar shadings). */
const SHOW_ARROW = 12;

type Band = 'none' | 'arrow-down' | 'arrow-up' | 'quarter-down' | 'quarter-up' | 'large';

function band(dev: number): Band {
  const a = Math.abs(dev);
  if (a < SHOW_ARROW) return 'none';
  if (a < 35) return dev < 0 ? 'arrow-down' : 'arrow-up';
  if (a <= 65) return dev < 0 ? 'quarter-down' : 'quarter-up';
  return 'large';
}

/** Text suffix for a deviation: "½♭" (about a quarter tone low), "↑" (slightly high) or "" when negligible. */
export function microSuffix(dev: number, notation: MicroNotation = 'arrows'): string {
  const b = band(dev);
  if (b === 'none') return '';
  if (b === 'quarter-down') return QUARTER_FLAT;
  if (b === 'quarter-up') return QUARTER_SHARP;
  if (notation === 'quarter' || notation === 'persian') return '';
  if (b === 'arrow-down') return '↓';
  if (b === 'arrow-up') return '↑';
  return `${dev > 0 ? '+' : '−'}${Math.round(Math.abs(dev))}¢`;
}

/** "E½♭", "F♯↓", "B♭" */
export function microNoteName(n: Note, dev: number, notation: MicroNotation = 'arrows'): string {
  return n.letter + accidentalString(n.acc) + microSuffix(dev, notation);
}

/** Spoken form for screen readers: "E half-flat", "F sharp, 13 cents low". */
export function microNoteSpoken(n: Note, dev: number): string {
  const acc = n.acc === 0 ? '' : n.acc === 1 ? ' sharp' : n.acc === -1 ? ' flat' : n.acc === 2 ? ' double sharp' : n.acc === -2 ? ' double flat' : '';
  const b = band(dev);
  if (b === 'none') return n.letter + acc;
  if (b === 'quarter-down' && n.acc === 0) return `${n.letter} half-flat`;
  if (b === 'quarter-up' && n.acc === 0) return `${n.letter} half-sharp`;
  return `${n.letter}${acc}, ${Math.round(Math.abs(dev))} cents ${dev < 0 ? 'low' : 'high'}`;
}

// SMuFL code points for accidentals VexFlow has no short code for.
const ARROW_DOWN: Record<number, string> = { [-2]: '', [-1]: '', 0: '', 1: '', 2: '' };
const ARROW_UP: Record<number, string> = { [-2]: '', [-1]: '', 0: '', 1: '', 2: '' };
const KOMA_FLAT = '';
const KOMA_SHARP = '';
const BAKIYE_SHARP = '';
const KUCUK_MUCENNEB_FLAT = '';
const PLAIN: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' };

/** Arel-Ezgi-Uzdilek accidentals by commas above or below the natural note. */
const AEU: Record<number, string> = {
  [-8]: 'bss', [-5]: KUCUK_MUCENNEB_FLAT, [-4]: 'bs', [-1]: KOMA_FLAT,
  1: KOMA_SHARP, 4: BAKIYE_SHARP, 5: '+-', 8: 'bbs',
};
const COMMA = 1200 / 53;
const PYTHAGOREAN_FIFTH = 1200 * Math.log2(3 / 2);

/**
 * VexFlow accidental for a microtonal note, or null when the ordinary accidental is right.
 * `relCents` is the note's size in cents above the tonic and `tonic` the tonic's spelling; the
 * Turkish system needs them because its accidentals count commas from Pythagorean naturals.
 */
export function vexMicroAccidental(n: Note, dev: number, notation: MicroNotation, tonic?: Note, relCents?: number): string | null {
  const b = band(dev);
  if (notation === 'turkish' && tonic && relCents !== undefined) {
    // Pythagorean size of the spelled interval from the tonic, then the remaining commas.
    let pyth = (((fifthsFromC(n) - fifthsFromC(tonic)) * PYTHAGOREAN_FIFTH) % 1200 + 1200) % 1200;
    while (pyth - relCents > 600) pyth -= 1200;
    while (relCents - pyth > 600) pyth += 1200;
    const offset = Math.round((relCents - pyth) / COMMA);
    if (offset === 0) return null;
    // An AEU sharp or flat is about 5 commas (the Pythagorean apotome).
    const total = n.acc * 5 + offset;
    return AEU[total] ?? null;
  }
  if (b === 'none') return null;
  if (b === 'quarter-down') {
    if (notation === 'persian' && n.acc === 0) return 'k';
    if (n.acc === 0) return 'd';
    if (n.acc === -1) return 'db';
    if (n.acc === 1) return '+';
  }
  if (b === 'quarter-up') {
    if (notation === 'persian' && n.acc === 0) return 'o';
    if (n.acc === 0) return '+';
    if (n.acc === 1) return '++';
    if (n.acc === -1) return 'd';
  }
  if (notation === 'quarter' || notation === 'persian') return null;
  if (b === 'arrow-down') return ARROW_DOWN[n.acc] ?? null;
  if (b === 'arrow-up') return ARROW_UP[n.acc] ?? null;
  return PLAIN[n.acc] ?? null;
}
