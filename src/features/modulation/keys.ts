/**
 * Modulation: keys in the URL, chord functions and the chords of a key. Pure functions on the
 * theory engine (no React).
 */
import { intervalBetween } from '../../theory/intervals';
import { keyFromFifths, keyName, keySignatureFifths, parallelKey, type Key } from '../../theory/keys';
import { note, noteName, pc, type Note } from '../../theory/notes';
import { analyzeChord, formatRoman, parseRoman, type RomanChord } from '../../theory/roman';

// ---------------------------------------------------------------------------
// Keys in the URL
// ---------------------------------------------------------------------------

/** "C", "F#m", "Ebm" -> Key. Returns null for invalid input. */
export function parseKeyParam(s: string): Key | null {
  const m = /^([A-Ga-g](?:#|b|x|bb)?)(m?)$/.exec(s.trim());
  if (!m) return null;
  try {
    return { tonic: note(m[1]), mode: m[2] === 'm' ? 'minor' : 'major' };
  } catch {
    return null;
  }
}

export function keyParam(k: Key): string {
  return noteName(k.tonic, false) + (k.mode === 'minor' ? 'm' : '');
}

export function keyLabel(k: Key): string {
  return keyName(k);
}

/** Short label for grids: "E♭" for major, "c♯" style for minor. */
export function keyShort(k: Key): string {
  const n = noteName(k.tonic);
  return k.mode === 'major' ? n : n.charAt(0).toLowerCase() + n.slice(1);
}

/** Keys that need more than seven sharps or flats. */
export function isTheoreticalKey(k: Key): boolean {
  return Math.abs(keySignatureFifths(k)) > 7;
}

/** The usual enharmonic respelling of a theoretical key (D♯ major -> E♭ major). */
export function practicalSpelling(k: Key): Key {
  const f = keySignatureFifths(k);
  if (Math.abs(f) <= 7) return k;
  return keyFromFifths(f > 0 ? f - 12 : f + 12, k.mode);
}

// ---------------------------------------------------------------------------
// Diatonic chords of a key
// ---------------------------------------------------------------------------

export type Fn = 'tonic' | 'predominant' | 'dominant' | 'mediant' | 'submediant' | 'subtonic';

export const FN_LABEL: Record<Fn, string> = {
  tonic: 'tonic',
  predominant: 'predominant',
  dominant: 'dominant',
  mediant: 'mediant',
  submediant: 'submediant',
  subtonic: 'subtonic',
};

export interface KeyChord {
  /** ASCII numeral accepted by parseRoman in `key`. */
  numeral: string;
  /** Formatted numeral (unicode, superscripts). */
  display: string;
  key: Key;
  chord: RomanChord;
  seventh: boolean;
  /** natural scale, harmonic-minor only (V, vii° in minor), or borrowed from the parallel key. */
  source: 'natural' | 'harmonic' | 'borrowed';
  fn: Fn;
}

const MAJOR_TRIADS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MAJOR_SEVENTHS = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'];
const MINOR_TRIADS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const MINOR_SEVENTHS = ['i7', 'iiø7', 'IIImaj7', 'iv7', 'v7', 'VImaj7', 'VII7'];
const MINOR_HARMONIC = ['V', 'vii°', 'V7', 'vii°7'];

export function chordFunction(root: Note, k: Key): Fn {
  const iv = intervalBetween(k.tonic, root);
  switch (iv.num) {
    case 1:
      return 'tonic';
    case 2:
    case 4:
      return 'predominant';
    case 5:
      return 'dominant';
    case 3:
      return 'mediant';
    case 6:
      return 'submediant';
    default:
      return iv.semis === 11 ? 'dominant' : 'subtonic';
  }
}

function makeKeyChord(numeral: string, k: Key, source: KeyChord['source'], display?: string): KeyChord {
  const chord = parseRoman(numeral, k);
  return {
    numeral,
    display: display ?? chord.display,
    key: k,
    chord,
    seventh: chord.notes.length === 4,
    source,
    fn: chordFunction(chord.root, k),
  };
}

const chordCache = new Map<string, KeyChord[]>();

/** Diatonic triads and seventh chords of a key (minor keys include harmonic-minor V, V7, vii°, vii°7). */
export function keyChords(k: Key): KeyChord[] {
  const id = keyParam(k);
  const hit = chordCache.get(id);
  if (hit) return hit;
  let list: KeyChord[];
  if (k.mode === 'major') {
    list = [...MAJOR_TRIADS, ...MAJOR_SEVENTHS].map((n) => makeKeyChord(n, k, 'natural'));
  } else {
    list = [
      ...[...MINOR_TRIADS, ...MINOR_SEVENTHS].map((n) => makeKeyChord(n, k, 'natural')),
      ...MINOR_HARMONIC.map((n) => makeKeyChord(n, k, 'harmonic')),
    ];
  }
  chordCache.set(id, list);
  return list;
}

export const chordKey = (c: { root: Note; chordId: string }) => `${pc(c.root)}:${c.chordId}`;

/** Chords of the parallel key that are not already diatonic to `k`, labeled in `k` (♭VI, iv, ♭VII ...). */
export function borrowedChords(k: Key): KeyChord[] {
  const own = new Set(keyChords(k).map((c) => chordKey(c.chord)));
  const seen = new Set<string>();
  const out: KeyChord[] = [];
  for (const c of keyChords(parallelKey(k))) {
    const id = chordKey(c.chord);
    if (own.has(id) || seen.has(id)) continue;
    seen.add(id);
    const numeral = analyzeChord(c.chord.root, c.chord.chordId, k);
    const chord = parseRoman(numeral, k);
    out.push({ numeral, display: formatRoman(numeral), key: k, chord, seventh: chord.notes.length === 4, source: 'borrowed', fn: chordFunction(chord.root, k) });
  }
  return out;
}
