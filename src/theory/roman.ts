/**
 * Roman numeral parsing, realization and analysis.
 *
 * Conventions used throughout the app:
 * - Case gives quality: upper case = major, lower case = minor. `°` diminished, `ø` half-diminished, `+` augmented.
 * - Unmarked numerals use the key's own scale (natural minor in minor keys). In minor, a diminished
 *   or half-diminished chord on the 7th degree uses the raised leading tone (vii°, vii°7).
 * - Numerals with an accidental (♭VI, ♯iv°, ♮vi) are measured from the MAJOR scale on the tonic,
 *   the convention used for borrowed chords in jazz and popular music. So ♭VI is A♭ in both C major and C minor.
 * - Figures: 6 and 64 invert triads; 7, 65, 43, 42 (or 2) give seventh chords and their inversions.
 * - Secondary functions: V/V, vii°7/ii, V7/IV, IV/IV ... can be chained (V/V/V).
 * - Special chords: N or N6 (Neapolitan), It+6, Fr+6, Ger+6 (augmented sixths), Cad64.
 * - Explicit chord suffixes: maj7, 9, 11, 13, add9, sus4, sus2, 7sus4, 7♭9, 7♯9, 7alt, 6/9, add6 ...
 */
import { buildChord, chordIntervals, chordQualityClass, chordSymbol, getChord } from './chords';
import { interval, intervalBetween, transpose, referenceSemis } from './intervals';
import { type Key } from './keys';
import { mod, pc, type Note } from './notes';

export interface RomanChord {
  input: string;
  /** Formatted numeral using unicode accidentals and figures. */
  display: string;
  root: Note;
  chordId: string;
  /** 0 = root position; index into chord tones (stacking order) of the bass note. */
  inversion: number;
  bass: Note;
  /** Chord tones in stacking order (root first). */
  notes: Note[];
  symbol: string;
  key: Key;
  /** Temporary key implied by a secondary function (e.g. V/V tonicizes the dominant). */
  tonicized?: Key;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_DEGREE_INTERVALS = ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'];
const MINOR_DEGREE_INTERVALS = ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'];

type Base = 'major' | 'minor' | 'dim' | 'halfdim' | 'aug';

const SUFFIX_TABLE: Record<Base, Record<string, string>> = {
  major: {
    '': 'maj', '7': '7', maj7: 'maj7', M7: 'maj7', 'Δ7': 'maj7', 'Δ': 'maj7', '9': '9', maj9: 'maj9', M9: 'maj9',
    '11': '11', '13': '13', maj13: 'maj13', add9: 'add9', add2: 'add9', add6: '6', '(6)': '6', '69': '69', '6/9': '69',
    sus4: 'sus4', sus: 'sus4', sus2: 'sus2', '7sus4': '7sus4', '7sus': '7sus4', '9sus4': '9sus4',
    '7b9': '7b9', b9: '7b9', '7#9': '7#9', '7#11': '7#11', '7b13': '7b13', '7alt': '7alt', alt: '7alt',
    '7#5': '7#5', '7b5': '7b5', '13b9': '13b9', '13#11': '13#11', '9#11': '9#11', 'maj7#11': 'maj7#11', 'maj9#11': 'maj9#11',
    'add#11': 'addSharp11', '5': '5', b5: 'majb5',
  },
  minor: {
    '': 'min', '7': 'm7', maj7: 'mMaj7', M7: 'mMaj7', '9': 'm9', maj9: 'mMaj9', '11': 'm11', '13': 'm13',
    add9: 'madd9', add2: 'madd9', add6: 'm6', '(6)': 'm6', '69': 'm69', '6/9': 'm69',
  },
  dim: { '': 'dim', '7': 'dim7', maj7: 'dimMaj7', M7: 'dimMaj7' },
  halfdim: { '': 'm7b5', '7': 'm7b5' },
  aug: { '': 'aug', '7': '7#5', maj7: 'maj7#5', M7: 'maj7#5' },
};

const SEVENTH_FOR_BASE: Record<Base, string> = { major: '7', minor: 'm7', dim: 'dim7', halfdim: 'm7b5', aug: '7#5' };

const ROMAN_RE = /^([b#♭♯♮]*)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)([°oø+]?)([^/]*)$/;

function normalize(s: string): string {
  return s
    .trim()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\s+/g, '')
    .replace(/(^|\/)n(?=[b#]*[IViv])/g, '$1♮')
    .replace(/(?<=[IViv])h(?=7?$|7?\/)/g, 'ø');
}

function degreeRoot(k: Key, degree: number, accidental: string, base: Base): Note {
  if (accidental.length > 0) {
    let root = transpose(k.tonic, interval(MAJOR_DEGREE_INTERVALS[degree - 1]));
    for (const ch of accidental) {
      if (ch === 'b') root = { ...root, acc: root.acc - 1 };
      if (ch === '#') root = { ...root, acc: root.acc + 1 };
    }
    return root;
  }
  if (k.mode === 'major') return transpose(k.tonic, interval(MAJOR_DEGREE_INTERVALS[degree - 1]));
  if (degree === 7 && (base === 'dim' || base === 'halfdim')) return transpose(k.tonic, interval('M7'));
  return transpose(k.tonic, interval(MINOR_DEGREE_INTERVALS[degree - 1]));
}

/** Parse a roman numeral in a key. Throws on invalid input; see `tryParseRoman`. */
export function parseRoman(input: string, k: Key): RomanChord {
  const raw = normalize(input);
  if (!raw) throw new Error('Empty numeral');

  // Secondary function: split on the first slash that is not part of "6/9".
  const slashIdx = findSecondarySlash(raw);
  if (slashIdx >= 0) {
    const primary = raw.slice(0, slashIdx);
    const target = raw.slice(slashIdx + 1);
    const targetChord = parseRoman(target, k);
    const targetQuality = chordQualityClass(targetChord.chordId);
    const tonicized: Key = { tonic: targetChord.root, mode: targetQuality === 'minor' || targetQuality === 'diminished' ? 'minor' : 'major' };
    const inner = parseRoman(primary, tonicized);
    return { ...inner, input, display: `${inner.display}/${targetChord.display}`, key: k, tonicized };
  }

  const special = parseSpecial(raw, k);
  if (special) return { ...special, input };

  const m = ROMAN_RE.exec(raw);
  if (!m) throw new Error(`Cannot parse roman numeral "${input}"`);
  const [, accRaw, numeral, qualSym, suffixRaw] = m;
  const degree = NUMERALS.indexOf(numeral.toUpperCase()) + 1;
  const upper = numeral === numeral.toUpperCase();
  let base: Base = upper ? 'major' : 'minor';
  if (qualSym === '°' || qualSym === 'o') base = 'dim';
  if (qualSym === 'ø') base = 'halfdim';
  if (qualSym === '+') base = 'aug';

  const accidental = accRaw.replace(/♮/g, '');
  const hasNatural = accRaw.includes('♮');
  const root = degreeRoot(k, degree, accidental || (hasNatural ? '♮' : ''), base);

  let suffix = suffixRaw;
  let inversion = 0;
  let chordId: string | undefined;

  const triadFigures: Record<string, number> = { '6': 1, '64': 2 };
  const seventhFigures: Record<string, number> = { '65': 1, '43': 2, '42': 3, '2': 3 };
  const majSeventhFigures: Record<string, number> = { maj65: 1, M65: 1, maj43: 2, M43: 2, maj42: 3, M42: 3, maj2: 3 };

  if (suffix in triadFigures && base !== 'halfdim') {
    inversion = triadFigures[suffix];
    chordId = SUFFIX_TABLE[base][''];
  } else if (suffix in seventhFigures) {
    inversion = seventhFigures[suffix];
    chordId = SEVENTH_FOR_BASE[base];
  } else if (suffix in majSeventhFigures) {
    inversion = majSeventhFigures[suffix];
    chordId = base === 'minor' ? 'mMaj7' : base === 'aug' ? 'maj7#5' : 'maj7';
  } else {
    chordId = SUFFIX_TABLE[base][suffix];
    if (chordId === undefined && base === 'halfdim' && suffix in triadFigures) {
      chordId = 'm7b5';
    }
  }
  if (chordId === undefined) throw new Error(`Unknown chord suffix "${suffix}" in "${input}"`);
  suffix = suffix || '';

  return realize(input, k, root, chordId, inversion);
}

function findSecondarySlash(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '/') continue;
    // "6/9" is a chord suffix, not a secondary function.
    if (s[i - 1] === '6' && s[i + 1] === '9') continue;
    return i;
  }
  return -1;
}

function parseSpecial(s: string, k: Key): RomanChord | null {
  const tonic = k.tonic;
  const flat2 = transpose(tonic, interval('m2'));
  const flat6 = transpose(tonic, interval('m6'));
  switch (s) {
    case 'N':
      return realize(s, k, flat2, 'maj', 0, 'N');
    case 'N6':
    case 'bII6':
      return realize(s, k, flat2, 'maj', 1, 'N⁶');
    case 'It+6':
    case 'It6':
    case 'It':
      return realize(s, k, flat6, 'it6', 0, 'It⁺⁶');
    case 'Fr+6':
    case 'Fr6':
    case 'Fr43':
    case 'Fr':
      return realize(s, k, flat6, 'fr6', 0, 'Fr⁺⁶');
    case 'Ger+6':
    case 'Ger6':
    case 'Ger65':
    case 'Ger':
      return realize(s, k, flat6, 'ger6', 0, 'Ger⁺⁶');
    case 'Cad64':
      return realize(s, k, tonic, k.mode === 'major' ? 'maj' : 'min', 2, 'Cad⁶₄');
    default:
      return null;
  }
}

function realize(input: string, k: Key, root: Note, chordId: string, inversion: number, display?: string): RomanChord {
  const notes = buildChord(root, chordId);
  const inv = Math.min(inversion, notes.length - 1);
  const bass = notes[inv];
  return {
    input,
    display: display ?? formatRoman(input),
    root,
    chordId,
    inversion: inv,
    bass,
    notes,
    symbol: chordSymbol(root, chordId, inv > 0 ? bass : null),
    key: k,
  };
}

export function tryParseRoman(input: string, k: Key): RomanChord | null {
  try {
    return parseRoman(input, k);
  } catch {
    return null;
  }
}

/** Split a progression string ("I vi ii V7", "I - V - vi - IV", "I | IV | V") into tokens. */
export function splitProgression(s: string): string[] {
  return s
    .split(/[\s,|–—]+|(?<=\S)\s*-\s*(?=\S)/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t !== '-');
}

const SUPERSCRIPT: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const SUBSCRIPT: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };

/** Format a numeral for display: accidentals to unicode, figures to super/subscript (V65 -> V⁶₅). */
export function formatRoman(s: string): string {
  return s
    .split('/')
    .map((part) => {
      const m = /^([b#♭♯♮]*)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)([°oø+]?)(.*)$/.exec(part);
      if (!m) return part.replace(/b/g, '♭').replace(/#/g, '♯');
      const acc = m[1].replace(/b/g, '♭').replace(/#/g, '♯');
      const qual = m[3] === 'o' ? '°' : m[3];
      let suffix = m[4];
      if (/^(64|65|43|42|6|7|2)$/.test(suffix)) {
        suffix = suffix.length === 2 && suffix !== '42' ? SUPERSCRIPT[suffix[0]] + SUBSCRIPT[suffix[1]] : suffix === '42' ? SUPERSCRIPT['4'] + SUBSCRIPT['2'] : SUPERSCRIPT[suffix];
      } else {
        suffix = suffix.replace(/b/g, '♭').replace(/#/g, '♯');
      }
      return acc + m[2] + qual + suffix;
    })
    .join('/');
}

/**
 * Analyze a chord in a key and produce a roman numeral string (ASCII, parseable by `parseRoman`).
 * Accidentals follow the same major-scale convention as parsing.
 */
export function analyzeChord(root: Note, chordId: string, k: Key, inversion = 0): string {
  const iv = intervalBetween(k.tonic, root);
  const degree = iv.num;
  const quality = chordQualityClass(chordId);
  const refMajor = referenceSemis(degree);
  const scaleSemis = k.mode === 'major' ? refMajor : interval(MINOR_DEGREE_INTERVALS[degree - 1]).semis;
  let acc = '';
  const leadingToneInMinor = k.mode === 'minor' && degree === 7 && iv.semis === 11 && (quality === 'diminished');
  if (iv.semis !== scaleSemis && !leadingToneInMinor) {
    const diff = mod(iv.semis - refMajor + 6, 12) - 6;
    acc = diff < 0 ? 'b'.repeat(-diff) : diff > 0 ? '#'.repeat(diff) : '♮';
  }
  let numeral = NUMERALS[degree - 1];
  const lower = quality === 'minor' || quality === 'diminished';
  if (lower) numeral = numeral.toLowerCase();

  const symbol = getChord(chordId).symbol;
  let suffix = '';
  switch (chordId) {
    case 'maj': case 'min': suffix = ''; break;
    case 'dim': suffix = '°'; break;
    case 'aug': suffix = '+'; break;
    case '7': case 'm7': suffix = '7'; break;
    case 'maj7': suffix = 'maj7'; break;
    case 'mMaj7': suffix = 'maj7'; break;
    case 'm7b5': suffix = 'ø7'; break;
    case 'dim7': suffix = '°7'; break;
    case '7#5': suffix = '+7'; break;
    case 'maj7#5': suffix = '+maj7'; break;
    case 'm6': suffix = 'add6'; break;
    case '6': suffix = 'add6'; break;
    default:
      suffix = symbol.replace(/^m(?!aj)/, '').replace(/♭/g, 'b').replace(/♯/g, '#').trim();
  }

  const isSeventh = chordIntervals(chordId).length === 4 && /7/.test(suffix);
  if (inversion > 0) {
    if (isSeventh) {
      const fig = ['7', '65', '43', '42'][inversion] ?? '';
      suffix = suffix.replace('7', fig);
    } else if (chordIntervals(chordId).length === 3) {
      suffix += ['', '6', '64'][inversion] ?? '';
    }
  }
  return acc + numeral + suffix;
}

/** True when the chord's root and quality match a diatonic chord of the key. */
export function isDiatonicRoman(rc: RomanChord): boolean {
  const scale = rc.key.mode === 'major' ? MAJOR_DEGREE_INTERVALS : MINOR_DEGREE_INTERVALS;
  const scalePcs = new Set(scale.map((i) => mod(pc(rc.key.tonic) + interval(i).semis, 12)));
  return rc.notes.every((n) => scalePcs.has(pc(n)));
}
