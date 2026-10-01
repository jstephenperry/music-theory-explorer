/**
 * Progression model: items (numeral + duration), text round trips, and chord-symbol analysis.
 * Pure functions only; the page composes them.
 */
import { buildChord, parseChordSymbol, chordSymbol } from '../../theory/chords';
import type { Key, KeyMode } from '../../theory/keys';
import { makeKey } from '../../theory/keys';
import { noteName, pc, tryNote, type Note } from '../../theory/notes';
import { analyzeChord, parseRoman, splitProgression, type RomanChord } from '../../theory/roman';

export interface ProgItem {
  /** Roman numeral in canonical text form (ASCII b and #, unicode ♮ ° ø where needed). */
  numeral: string;
  /** Duration in beats. */
  beats: number;
}

export const BEAT_CHOICES = [1, 2, 3, 4, 6, 8] as const;
export const DEFAULT_BEATS = 4;

/**
 * Normalize user input for a numeral so it is friendlier to type:
 * "n" before a numeral means natural (nIII becomes ♮III), "h" after a numeral means half-diminished
 * (iih7 becomes iiø7), unicode flats and sharps become ASCII, whitespace is removed.
 */
export function normalizeNumeral(raw: string): string {
  let s = raw.trim().replace(/\s+/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
  // Apply per slash-separated part so secondary targets get the same treatment.
  s = s
    .split('/')
    .map((part) => part.replace(/^n(?=[b#]*[ivIV])/, '♮').replace(/^([b#♮]*(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i))h/, '$1ø'))
    .join('/')
    // "6/9" was split above and rejoined, which is harmless.
    .replace(/dim(?=7|$)/, '°');
  return s;
}

/** Parse a numeral in a key after normalization. Throws with a readable message. */
export function parseNumeral(numeral: string, key: Key): RomanChord {
  const n = normalizeNumeral(numeral);
  if (!n) throw new Error('Empty numeral');
  return parseRoman(n, key);
}

export function tryParseNumeral(numeral: string, key: Key): RomanChord | null {
  try {
    return parseNumeral(numeral, key);
  } catch {
    return null;
  }
}

export interface TokenError {
  index: number;
  token: string;
  message: string;
}

export interface ParsedText {
  items: ProgItem[];
  errors: TokenError[];
  /** Non-fatal notes (e.g. a slash bass that could not be expressed). */
  warnings: TokenError[];
}

/** Split "ii7:2" into numeral and beats. */
export function splitDuration(token: string): { body: string; beats: number; error?: string } {
  const m = /^(.*?)(?::(\d+(?:\.\d+)?))?$/.exec(token);
  const body = m?.[1] ?? token;
  if (m?.[2] === undefined) return { body, beats: DEFAULT_BEATS };
  const beats = Number(m[2]);
  if (!(beats > 0 && beats <= 16)) return { body, beats: DEFAULT_BEATS, error: `Duration must be between 0 and 16 beats (got ${m[2]})` };
  return { body, beats };
}

/** Parse a progression of roman numerals ("ii7 V7 Imaj7:8"). Every token is validated in the key. */
export function parseNumeralText(text: string, key: Key): ParsedText {
  const items: ProgItem[] = [];
  const errors: TokenError[] = [];
  splitProgression(text).forEach((token, index) => {
    const { body, beats, error } = splitDuration(token);
    if (error) {
      errors.push({ index, token, message: error });
      return;
    }
    const numeral = normalizeNumeral(body);
    try {
      parseRoman(numeral, key);
      items.push({ numeral, beats });
    } catch (e) {
      errors.push({ index, token, message: e instanceof Error ? e.message : String(e) });
    }
  });
  return { items, errors, warnings: [] };
}

/** Serialize items to the text form used in the URL and the text box. */
export function serializeItems(items: ProgItem[]): string {
  return items.map((it) => (it.beats === DEFAULT_BEATS ? it.numeral : `${it.numeral}:${it.beats}`)).join(' ');
}

/** Parse from the URL. Invalid tokens are dropped silently (the URL may be hand edited). */
export function itemsFromUrl(text: string, key: Key): ProgItem[] {
  return parseNumeralText(text, key).items;
}

/**
 * Analyze one chord symbol ("Dm7", "G7/B", "Ab7") into a roman numeral in the key.
 * Returns the numeral or throws with a readable reason. A slash bass that is not a chord tone
 * is dropped with a warning (numerals cannot express it).
 */
export function symbolToNumeral(symbol: string, key: Key): { numeral: string; warning?: string } {
  const parsed = parseChordSymbol(symbol);
  if (!parsed) throw new Error(`Cannot read chord symbol "${symbol}"`);
  const tones = buildChord(parsed.root, parsed.chordId);
  let inversion = 0;
  let warning: string | undefined;
  if (parsed.bass && pc(parsed.bass) !== pc(parsed.root)) {
    const idx = tones.findIndex((t) => pc(t) === pc(parsed.bass!));
    if (idx < 0) warning = `Bass ${noteName(parsed.bass)} is not a chord tone of ${chordSymbol(parsed.root, parsed.chordId)}; it was dropped`;
    else inversion = idx;
  }
  const targetPcs = tones.map(pc).sort((a, b) => a - b).join(',');
  const check = (numeral: string, inv: number) => {
    const rc = tryParseNumeral(numeral, key);
    if (!rc) return false;
    const pcs = rc.notes.map(pc).sort((a, b) => a - b).join(',');
    return pcs === targetPcs && pc(rc.root) === pc(parsed.root) && (inv === 0 ? pc(rc.bass) === pc(parsed.root) : pc(rc.bass) === pc(tones[inv]));
  };
  if (inversion > 0) {
    const n = analyzeChord(parsed.root, parsed.chordId, key, inversion);
    if (check(n, inversion)) return { numeral: n, warning };
    warning = `The inversion of ${symbol} cannot be written as a figure for this chord type; shown in root position`;
  }
  const n = analyzeChord(parsed.root, parsed.chordId, key, 0);
  if (check(n, 0)) return { numeral: n, warning };
  throw new Error(`"${symbol}" cannot be expressed as a roman numeral`);
}

/** Parse a progression written in chord symbols ("Dm7 G7 Cmaj7:8"). */
export function parseSymbolText(text: string, key: Key): ParsedText {
  const items: ProgItem[] = [];
  const errors: TokenError[] = [];
  const warnings: TokenError[] = [];
  text
    .split(/[\s,|]+/)
    .filter((t) => t.length > 0)
    .forEach((token, index) => {
      const { body, beats, error } = splitDuration(token);
      if (error) {
        errors.push({ index, token, message: error });
        return;
      }
      try {
        const { numeral, warning } = symbolToNumeral(body, key);
        items.push({ numeral, beats });
        if (warning) warnings.push({ index, token, message: warning });
      } catch (e) {
        errors.push({ index, token, message: e instanceof Error ? e.message : String(e) });
      }
    });
  return { items, errors, warnings };
}

/** Key from URL parameters, with a safe fallback to C major. */
export function keyFromParams(tonic: string, mode: string): Key {
  const n: Note | null = tryNote(tonic);
  const m: KeyMode = mode === 'minor' ? 'minor' : 'major';
  return makeKey(n ?? 'C', m);
}

/** ASCII tonic for the URL (C#, Bb). */
export function tonicParam(n: Note): string {
  return noteName(n, false);
}

/** Readable chord label. The engine's symbols for augmented sixths ("A♭It+6") are relabeled. */
export function chordLabel(rc: RomanChord): string {
  const special: Record<string, string> = { it6: 'It', fr6: 'Fr', ger6: 'Ger' };
  if (special[rc.chordId]) return `${noteName(rc.root)} ${special[rc.chordId]}⁺⁶`;
  return rc.symbol;
}
