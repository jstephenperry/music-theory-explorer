/**
 * Modulation logic: key relationships, pivot chords and playable examples for nine
 * modulation techniques. Pure functions built on the theory engine (no React).
 */
import { buildChord, chordQualityClass, chordSymbol } from '../../theory/chords';
import { interval, intervalBetween, transpose, transposeDown } from '../../theory/intervals';
import {
  enharmonicKeys,
  fifthsDistance,
  keyFromFifths,
  keyName,
  keyNotes,
  keySignatureFifths,
  parallelKey,
  relativeKey,
  sameKey,
  signatureAccidentalMap,
  type Key,
  type KeyMode,
} from '../../theory/keys';
import { LETTER_PC, midi, mod, note, noteName, pc, pitchFromMidi, type Note, type Pitch } from '../../theory/notes';
import { analyzeChord, formatRoman, parseRoman, type RomanChord } from '../../theory/roman';
import { initialVoicing, voiceLead } from '../../theory/voicing';

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

const chordKey = (c: { root: Note; chordId: string }) => `${pc(c.root)}:${c.chordId}`;

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

// ---------------------------------------------------------------------------
// Pivot chords
// ---------------------------------------------------------------------------

export type Rating = 'ideal' | 'good' | 'fair';

export interface Pivot {
  id: string;
  old: KeyChord;
  new: KeyChord;
  score: number;
  rating: Rating;
  why: string;
  symbol: string;
  /** The two keys spell the chord differently (only possible with enharmonically awkward key pairs). */
  respelled: boolean;
}

const NEW_FN_SCORE: Record<Fn, number> = { predominant: 4, submediant: 3, tonic: 1.5, mediant: 1.2, dominant: 1, subtonic: 1 };

function pivotWhy(p: { old: KeyChord; new: KeyChord }): string {
  const nf = p.new.fn;
  if (nf === 'predominant') return `A predominant in the new key, so it leads straight to the new V⁷.`;
  if (nf === 'submediant') return `Submediant in the new key: it moves naturally to a predominant and then to V⁷.`;
  if (nf === 'tonic') return `Already the new tonic: smooth, but the new key arrives before its dominant confirms it.`;
  if (nf === 'dominant') return `The new dominant itself: direct, but there is little time to prepare the turn.`;
  return `Weaker function in the new key; it needs a predominant before the cadence.`;
}

function scorePivot(oldC: KeyChord, newC: KeyChord): number {
  let s = NEW_FN_SCORE[newC.fn];
  // An old-key dominant asserts the old key; other functions leave the door open.
  if (oldC.fn !== 'dominant') s += 1;
  if (!oldC.seventh) s += 0.25;
  if (newC.fn === 'predominant' && /^ii/.test(newC.numeral)) s += 0.1;
  if (newC.source === 'harmonic' || oldC.source === 'harmonic') s -= 0.05;
  return s;
}

function ratingFor(newC: KeyChord): Rating {
  if (newC.fn === 'predominant') return 'ideal';
  if (newC.fn === 'submediant') return 'good';
  return 'fair';
}

function matchPivots(olds: KeyChord[], news: KeyChord[]): Pivot[] {
  const out: Pivot[] = [];
  for (const o of olds) {
    for (const n of news) {
      if (chordKey(o.chord) !== chordKey(n.chord)) continue;
      out.push({
        id: `${o.numeral}=${n.numeral}`,
        old: o,
        new: n,
        score: scorePivot(o, n),
        rating: ratingFor(n),
        why: pivotWhy({ old: o, new: n }),
        symbol: o.chord.symbol,
        respelled: o.chord.root.letter !== n.chord.root.letter || o.chord.root.acc !== n.chord.root.acc,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** All triads and seventh chords diatonic to both keys, best first. */
export function findPivots(from: Key, to: Key): Pivot[] {
  if (enharmonicKeys(from, to)) return [];
  return matchPivots(keyChords(from), keyChords(to));
}

/** Chords borrowed from the parallel of `from` that are diatonic in `to`, best first. */
export function findBorrowedPivots(from: Key, to: Key): Pivot[] {
  if (enharmonicKeys(from, to)) return [];
  return matchPivots(borrowedChords(from), keyChords(to));
}

// ---------------------------------------------------------------------------
// Relationship between two keys
// ---------------------------------------------------------------------------

export interface Relation {
  id: string;
  label: string;
  detail: string;
}

const triadPcs = (k: Key) => parseRoman(k.mode === 'major' ? 'I' : 'i', k).notes.map(pc);

export function keyRelations(a: Key, b: Key): Relation[] {
  const out: Relation[] = [];
  if (sameKey(a, b)) return [{ id: 'same', label: 'Same key', detail: 'Choose a different target key.' }];
  if (enharmonicKeys(a, b)) return [{ id: 'enharmonic', label: 'Enharmonic', detail: `${keyName(a)} and ${keyName(b)} sound identical; only the spelling changes.` }];
  const diff = mod(pc(b.tonic) - pc(a.tonic), 12);
  const sameMode = a.mode === b.mode;
  const rel = relativeKey(a);
  if (rel.mode === b.mode && pc(rel.tonic) === pc(b.tonic)) out.push({ id: 'relative', label: 'Relative', detail: 'Same key signature, different tonic and mode.' });
  if (diff === 0 && !sameMode) out.push({ id: 'parallel', label: 'Parallel', detail: 'Same tonic, opposite mode.' });
  if (diff === 7 && sameMode) out.push({ id: 'dominant', label: 'Dominant', detail: 'The new tonic is the old dominant.' });
  if (diff === 5 && sameMode) out.push({ id: 'subdominant', label: 'Subdominant', detail: 'The new tonic is the old subdominant.' });
  if (fifthsDistance(a, b) <= 1) out.push({ id: 'close', label: 'Closely related', detail: 'Key signatures differ by at most one accidental.' });
  if ([3, 4, 8, 9].includes(diff)) {
    const common = triadPcs(a).filter((p) => triadPcs(b).includes(p)).length;
    const dir = diff === 3 || diff === 4 ? 'upper' : 'lower';
    const size = diff === 3 || diff === 9 ? 'minor third' : 'major third';
    if (sameMode) out.push({ id: 'chromatic-mediant', label: 'Chromatic mediant', detail: `Tonics a ${size} apart (${dir}), same mode, one common tone.` });
    else if (common === 0) out.push({ id: 'doubly-chromatic-mediant', label: 'Doubly chromatic mediant', detail: `Tonics a ${size} apart, opposite modes, no common tones.` });
    else if (!out.some((r) => r.id === 'relative')) out.push({ id: 'diatonic-third', label: 'Diatonic third relation', detail: `Tonics a ${size} apart; the tonic triads share two notes.` });
  }
  if (diff === 6) out.push({ id: 'tritone', label: 'Tritone', detail: 'The most distant key: opposite sides of the circle of fifths.' });
  if (diff === 1) out.push({ id: 'semitone-up', label: 'Semitone up', detail: 'The new tonic is a half step higher.' });
  if (diff === 11) out.push({ id: 'semitone-down', label: 'Semitone down', detail: 'The new tonic is a half step lower.' });
  if (diff === 2) out.push({ id: 'whole-step-up', label: 'Whole step up', detail: 'The new tonic is a whole step higher.' });
  if (diff === 10) out.push({ id: 'whole-step-down', label: 'Whole step down', detail: 'The new tonic is a whole step lower.' });
  return out;
}

export interface KeyComparison {
  /** Signed steps around the circle of fifths between key signatures (-6..6, positive = sharpward). */
  fifthsSteps: number;
  distance: number;
  /** Letters whose accidental differs between the two key signatures. */
  changedLetters: Array<{ letter: string; from: number; to: number }>;
  commonTriadTones: Note[];
  commonScaleTones: Note[];
  /** Spellings of the common scale tones in the new key, when they differ. */
  respelledScaleTones: Array<{ from: Note; to: Note }>;
}

export function compareKeys(a: Key, b: Key): KeyComparison {
  const fa = keySignatureFifths(a);
  const fb = keySignatureFifths(b);
  let steps = mod(fb - fa, 12);
  if (steps > 6) steps -= 12;
  const ma = signatureAccidentalMap(fa);
  const mb = signatureAccidentalMap(fb);
  const changedLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].filter((l) => ma[l] !== mb[l]).map((l) => ({ letter: l, from: ma[l], to: mb[l] }));
  const ta = parseRoman(a.mode === 'major' ? 'I' : 'i', a).notes;
  const tbPcs = triadPcs(b);
  const sa = keyNotes(a);
  const sb = keyNotes(b);
  const commonScaleTones = sa.filter((n) => sb.some((m) => pc(m) === pc(n)));
  const respelledScaleTones = commonScaleTones
    .map((n) => ({ from: n, to: sb.find((m) => pc(m) === pc(n))! }))
    .filter((x) => x.from.letter !== x.to.letter || x.from.acc !== x.to.acc);
  return {
    fifthsSteps: steps,
    distance: Math.abs(steps),
    changedLetters,
    commonTriadTones: ta.filter((n) => tbPcs.includes(pc(n))),
    commonScaleTones,
    respelledScaleTones,
  };
}

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

export type StepRole = 'old' | 'pivot' | 'transition' | 'new' | 'bridge';

export interface Step {
  role: StepRole;
  root: Note;
  chordId: string;
  /** Chord tones (stacking order); for a bridge step, the single held note. */
  notes: Note[];
  bass: Note;
  symbol: string;
  /** Numeral in the old key (formatted). */
  oldLabel?: string;
  /** Numeral in the new key (formatted). */
  newLabel?: string;
  /** Repeats the previous sonority with a new spelling (enharmonic reinterpretation). */
  respell?: boolean;
  /** A new phrase starts here (direct modulation). */
  phraseStart?: boolean;
  beats: number;
}

export interface Example {
  from: Key;
  to: Key;
  steps: Step[];
  pitches: Pitch[][];
  /** Pitch class of the sustained common tone (common-tone modulation). */
  heldPc?: number;
  /** Indices of steps in which the held tone sounds. */
  heldSteps?: number[];
  heldMidi?: number;
  /** Two spellings of the enharmonic pivot sonority. */
  enharmonic?: { oldLabel: string; newLabel: string; oldNotes: Note[]; newNotes: Note[]; oldSymbol: string; newSymbol: string };
  caption: string;
}

const tonicNumeral = (k: Key) => (k.mode === 'major' ? 'I' : 'i');
const predominantNumeral = (k: Key) => (k.mode === 'major' ? 'ii6' : 'iv');

function symbolFor(c: RomanChord): string {
  if (c.chordId === 'ger6') return `${noteName(c.root)} Ger⁺⁶`;
  if (c.chordId === 'it6') return `${noteName(c.root)} It⁺⁶`;
  if (c.chordId === 'fr6') return `${noteName(c.root)} Fr⁺⁶`;
  return c.symbol;
}

function stepFrom(c: RomanChord, role: StepRole, labels: { old?: string; new?: string } = {}, beats = 2): Step {
  return { role, root: c.root, chordId: c.chordId, notes: c.notes, bass: c.bass, symbol: symbolFor(c), oldLabel: labels.old, newLabel: labels.new, beats };
}

function oldStep(numeral: string, k: Key): Step {
  const c = parseRoman(numeral, k);
  return stepFrom(c, 'old', { old: c.display });
}

function newStep(numeral: string, k: Key, beats = 2): Step {
  const c = parseRoman(numeral, k);
  return stepFrom(c, 'new', { new: c.display }, beats);
}

/** I IV V7 I (or i iv V7 i): establishes the old key. */
export function establish(k: Key): Step[] {
  const nums = k.mode === 'major' ? ['I', 'IV', 'V7', 'I'] : ['i', 'iv', 'V7', 'i'];
  return nums.map((n) => oldStep(n, k));
}

/** Numerals that lead from a chord (given as a KeyChord-like description) to a cadence in `k`. */
export function continuation(c: { numeral: string; fn: Fn; chordId: string }, k: Key): string[] {
  const T = tonicNumeral(k);
  if (c.fn === 'predominant') return ['V7', T];
  if (c.fn === 'dominant') {
    if (c.chordId === 'min' || c.chordId === 'm7') return [predominantNumeral(k), 'V7', T];
    if (c.chordId === 'maj') return ['V7', T];
    return [T];
  }
  return [predominantNumeral(k), 'V7', T];
}

function finalize(steps: Step[]): Step[] {
  if (steps.length) steps[steps.length - 1] = { ...steps[steps.length - 1], beats: 4 };
  return steps;
}

/** Same MIDI pitch, new spelling. */
export function respellPitch(p: Pitch, n: Note): Pitch {
  const m = midi(p);
  const octave = Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1;
  return { letter: n.letter, acc: n.acc, octave };
}

function respellAll(ps: Pitch[], notes: Note[]): Pitch[] {
  return ps.map((p) => {
    const n = notes.find((x) => pc(x) === pc(p));
    return n ? respellPitch(p, n) : p;
  });
}

/**
 * Four-part voicing for a list of steps. Respelled steps keep the previous pitches with new
 * spellings; a bridge step sounds only the held tone; the chord after a bridge keeps that tone.
 */
export function voiceSteps(steps: Step[], heldPc?: number): { pitches: Pitch[][]; heldMidi?: number } {
  const out: Pitch[][] = [];
  let last: Pitch[] | null = null;
  let heldMidi: number | undefined;
  let afterBridge = false;
  for (const st of steps) {
    if (st.role === 'bridge' && last) {
      const candidates = last.slice(1).filter((p) => heldPc !== undefined && pc(p) === heldPc);
      const src = candidates.length ? candidates[candidates.length - 1] : last.find((p) => pc(p) === heldPc) ?? last[last.length - 1];
      heldMidi = midi(src);
      out.push([respellPitch(src, st.notes[0])]);
      afterBridge = true;
      continue;
    }
    let ps: Pitch[];
    if (!last) ps = initialVoicing({ notes: st.notes, bass: st.bass });
    else if (st.respell) ps = respellAll(last, st.notes);
    else ps = voiceLead(last, { notes: st.notes, bass: st.bass });
    if (afterBridge && heldMidi !== undefined && heldPc !== undefined) {
      ps = ensureHeld(ps, heldMidi, st.notes.find((n) => pc(n) === heldPc));
      afterBridge = false;
    }
    out.push(ps);
    last = ps;
  }
  return { pitches: out, heldMidi };
}

/** Make sure the chord contains the held MIDI pitch in an upper voice (replacing the closest voice). */
function ensureHeld(ps: Pitch[], heldMidi: number, spelled: Note | undefined): Pitch[] {
  if (!spelled || ps.slice(1).some((p) => midi(p) === heldMidi)) return ps;
  const upper = ps.slice(1);
  let best = 0;
  upper.forEach((p, i) => {
    if (Math.abs(midi(p) - heldMidi) < Math.abs(midi(upper[best]) - heldMidi)) best = i;
  });
  upper[best] = respellPitch(pitchFromMidi(heldMidi), spelled);
  upper.sort((a, b) => midi(a) - midi(b));
  return [ps[0], ...upper];
}

function makeExample(from: Key, to: Key, steps: Step[], caption: string, extra: Partial<Example> = {}): Example {
  const fin = finalize(steps);
  const { pitches, heldMidi } = voiceSteps(fin, extra.heldPc);
  const ex: Example = { from, to, steps: fin, pitches, caption, ...extra };
  if (extra.heldPc !== undefined) {
    ex.heldMidi = heldMidi;
    // The held tone: the contiguous run of steps around the bridge that keep that exact pitch.
    const has = (i: number) => heldMidi !== undefined && i >= 0 && i < pitches.length && pitches[i].some((p) => midi(p) === heldMidi);
    const b = fin.findIndex((st) => st.role === 'bridge');
    const run: number[] = [];
    if (b >= 0) {
      let lo = b;
      let hi = b;
      while (has(lo - 1)) lo--;
      while (has(hi + 1)) hi++;
      for (let i = lo; i <= hi; i++) run.push(i);
    }
    ex.heldSteps = run;
  }
  return ex;
}

// ---------------------------------------------------------------------------
// Techniques
// ---------------------------------------------------------------------------

export type TechniqueId = 'pivot' | 'direct' | 'secondary' | 'commonTone' | 'dim7' | 'ger6' | 'sequential' | 'mixture' | 'truck';

export interface TechniqueInfo {
  id: TechniqueId;
  name: string;
  short: string;
  explanation: string;
  bestFor: string;
}

export const TECHNIQUES: TechniqueInfo[] = [
  {
    id: 'pivot',
    name: 'Common-chord (pivot)',
    short: 'A chord shared by both keys changes meaning.',
    explanation:
      'A chord that belongs to both keys is heard first in the old key and then reinterpreted in the new one. The smoothest pivot is a predominant (ii or IV) in the new key, because it can move straight to the new dominant.',
    bestFor: 'Closely related keys',
  },
  {
    id: 'direct',
    name: 'Direct (phrase)',
    short: 'The new key simply begins with the next phrase.',
    explanation:
      'No shared chord at all: one phrase closes with a cadence in the old key and the next phrase starts in the new key. It relies on the phrase break and a strong new tonic, so it is natural between related keys and a deliberate jolt between distant ones.',
    bestFor: 'Phrase boundaries, any key',
  },
  {
    id: 'secondary',
    name: 'Secondary dominant',
    short: 'The new V⁷ enters as a chromatic chord.',
    explanation:
      'The new key’s V⁷ (or vii°⁷) appears as a chromatic chord. In the old key it sounds like a secondary dominant, but instead of returning it resolves to the new tonic and stays there.',
    bestFor: 'Any key; smoothest when the new V⁷ shares tones with the chord before it',
  },
  {
    id: 'commonTone',
    name: 'Common tone',
    short: 'One sustained note bridges the two harmonies.',
    explanation:
      'A single pitch is held while the harmony shifts underneath it. One shared tone is enough, which makes this the classic route to chromatic mediants (C major to E major or A♭ major).',
    bestFor: 'Chromatic mediants',
  },
  {
    id: 'dim7',
    name: 'Enharmonic diminished seventh',
    short: 'A vii°⁷ is respelled as the new key’s vii°⁷.',
    explanation:
      'A diminished seventh chord divides the octave into four minor thirds, so any of its notes can be respelled as a leading tone. A vii°⁷ heard in the old key is respelled as the vii°⁷ of the new key and resolves there.',
    bestFor: 'Distant keys, dramatic turns',
  },
  {
    id: 'ger6',
    name: 'Enharmonic German sixth',
    short: 'Ger⁺⁶ in one key sounds exactly like V⁷ in another.',
    explanation:
      'A German augmented sixth chord sounds identical to a dominant seventh. Respelling the augmented sixth as a minor seventh (or the reverse) turns a V⁷ of one key into the Ger⁺⁶ of another, typically a semitone away.',
    bestFor: 'Keys a semitone apart',
  },
  {
    id: 'sequential',
    name: 'Sequential',
    short: 'A chain of dominants falls by fifths into the new key.',
    explanation:
      'A repeated pattern carries the music around the circle of fifths. Each chord becomes the dominant of the next until the chain lands on the new key’s V⁷, so the destination feels inevitable rather than abrupt.',
    bestFor: 'Keys several fifths away',
  },
  {
    id: 'mixture',
    name: 'Modal interchange pivot',
    short: 'A borrowed chord is diatonic in the target.',
    explanation:
      'A chord borrowed from the parallel key (♭VI, iv or ♭III in major; IV or the Picardy I in minor) colors the old key and is also diatonic in the target, so it works as a pivot to keys that share no ordinary common chord.',
    bestFor: 'Flat-side mediants and parallel keys',
  },
  {
    id: 'truck',
    name: 'Truck driver',
    short: 'An abrupt shift up a semitone or whole step.',
    explanation:
      'The music jumps up a half or whole step with no preparation, typically for a final chorus. Sometimes the new key’s V⁷ is inserted as a one-chord ramp. Named for the gear change it resembles.',
    bestFor: 'Semitone or whole step up',
  },
];

export const TECHNIQUE_BY_ID = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t])) as Record<TechniqueId, TechniqueInfo>;

export interface TechOption {
  id: string;
  label: string;
  detail?: string;
  rating?: Rating;
}

export interface TechniqueStatus {
  id: TechniqueId;
  available: boolean;
  /** Why it is unavailable, or a short note on how it applies here. */
  reason: string;
  options: TechOption[];
  optionsLabel?: string;
}

// ----- candidate finders -----

function triadChords(k: Key): KeyChord[] {
  return keyChords(k).filter((c) => !c.seventh && chordQualityClass(c.chord.chordId) !== 'diminished');
}

export interface Dim7Candidate {
  id: string;
  oldNumeral: string;
  oldChord: RomanChord;
  newChord: RomanChord;
  score: number;
}

/** Diminished seventh chords heard in the old key (vii°⁷ or vii°⁷/x) that respell as vii°⁷ of the new key. */
export function dim7Candidates(from: Key, to: Key): Dim7Candidate[] {
  if (enharmonicKeys(from, to)) return [];
  const target = parseRoman('vii°7', to);
  const set = target.notes.map(pc).sort((a, b) => a - b).join(',');
  const nums = ['vii°7', ...triadChords(from).filter((c) => c.fn !== 'tonic' && c.numeral !== 'v').map((c) => `vii°7/${c.numeral}`)];
  const out: Dim7Candidate[] = [];
  const seenRoots = new Set<number>();
  for (const n of nums) {
    const c = parseRoman(n, from);
    if (c.notes.map(pc).sort((a, b) => a - b).join(',') !== set) continue;
    if (pc(c.root) === pc(target.root)) continue; // same root: no enharmonic reinterpretation
    if (seenRoots.has(pc(c.root))) continue;
    seenRoots.add(pc(c.root));
    const score = n === 'vii°7' ? 3 : /\/V$/.test(n) ? 2 : 1;
    out.push({ id: n, oldNumeral: n, oldChord: c, newChord: target, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface Ger6Candidate {
  id: string;
  /** 'v7-to-ger': old (secondary) V7 becomes the new Ger+6. 'ger-to-v7': old Ger+6 becomes the new V7. */
  kind: 'v7-to-ger' | 'ger-to-v7';
  oldNumeral: string;
  newNumeral: string;
  oldChord: RomanChord;
  newChord: RomanChord;
  score: number;
}

export function ger6Candidates(from: Key, to: Key): Ger6Candidate[] {
  if (enharmonicKeys(from, to)) return [];
  const out: Ger6Candidate[] = [];
  const targetPc = pc(to.tonic);
  const ger = parseRoman('Ger+6', to);
  const gerSet = ger.notes.map(pc).sort((a, b) => a - b).join(',');
  const seen = new Set<number>();
  const nums = ['V7', ...triadChords(from).filter((c) => c.fn !== 'tonic' && c.numeral !== 'v').map((c) => `V7/${c.numeral}`)];
  for (const n of nums) {
    const c = parseRoman(n, from);
    if (seen.has(pc(c.root))) continue;
    seen.add(pc(c.root));
    if (mod(pc(c.root) + 4, 12) !== targetPc) continue;
    if (c.notes.map(pc).sort((a, b) => a - b).join(',') !== gerSet) continue;
    out.push({ id: `${n}=Ger+6`, kind: 'v7-to-ger', oldNumeral: n, newNumeral: 'Ger+6', oldChord: c, newChord: ger, score: n === 'V7' ? 3 : 2 });
  }
  if (mod(pc(from.tonic) + 1, 12) === targetPc) {
    const og = parseRoman('Ger+6', from);
    const v7 = parseRoman('V7', to);
    out.push({ id: 'Ger+6=V7', kind: 'ger-to-v7', oldNumeral: 'Ger+6', newNumeral: 'V7', oldChord: og, newChord: v7, score: 3 });
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface CommonToneCandidate {
  id: string;
  heldPc: number;
  heldOld: Note;
  heldNew: Note;
  target: KeyChord;
  score: number;
  chromatic: boolean;
}

export function commonToneCandidates(from: Key, to: Key): CommonToneCandidate[] {
  if (enharmonicKeys(from, to)) return [];
  const tonic = parseRoman(tonicNumeral(from), from);
  const oldIds = new Set(keyChords(from).map((c) => chordKey(c.chord)));
  const out: CommonToneCandidate[] = [];
  for (const c of keyChords(to)) {
    if (c.seventh && c.numeral !== 'V7') continue;
    if (chordQualityClass(c.chord.chordId) === 'diminished') continue;
    for (const n of tonic.notes) {
      const match = c.chord.notes.find((m) => pc(m) === pc(n));
      if (!match) continue;
      const chromatic = !oldIds.has(chordKey(c.chord));
      let score = c.fn === 'tonic' ? 4 : c.numeral.startsWith('V') && c.fn === 'dominant' ? 3 : c.fn === 'predominant' ? 2 : 1;
      if (chromatic) score += 2;
      // Holding the new chord's root or third is the most audible.
      const role = intervalBetween(c.chord.root, match).num;
      if (role === 1 || role === 3) score += 0.3;
      out.push({ id: `${noteName(n, false)}:${c.numeral}`, heldPc: pc(n), heldOld: n, heldNew: match, target: c, score, chromatic });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface SequenceChain {
  start: KeyChord;
  /** Dominant seventh chords in order; the last one is V7 of the new key. */
  dominants: Array<{ num: string; chord: RomanChord; newLabel: string; oldLabel?: string; targetPc: number }>;
}

/**
 * A chain of at least two dominant sevenths falling by fifths into the new key's V7.
 * The chain either follows a diatonic chord of the old key a fifth above its first dominant,
 * or begins with a dominant that is already a secondary dominant (V7/x) of the old key.
 * The shorter chain wins.
 */
export function sequentialChain(from: Key, to: Key, maxDominants = 7): SequenceChain | null {
  if (enharmonicKeys(from, to)) return null;
  const vPc = mod(pc(to.tonic) + 7, 12);
  const oldTriads = triadChords(from).filter((c) => c.source === 'natural' || from.mode === 'major');
  const oldTonic = keyChords(from).find((c) => c.numeral === tonicNumeral(from))!;
  const newTriads = triadChords(to);
  let plan: { start: KeyChord; count: number; firstRoot: Note } | null = null;
  for (let m = 2; m <= maxDominants && !plan; m++) {
    const firstPc = mod(vPc + 7 * (m - 1), 12);
    // Rule A: a diatonic chord a fifth above the first dominant.
    const start = oldTriads.find((c) => pc(c.chord.root) === mod(firstPc + 7, 12));
    if (start) {
      plan = { start, count: m, firstRoot: transposeDown(start.chord.root, interval('P5')) };
      break;
    }
    // Rule B: the first dominant is V7/x of the old key; the chain follows the old tonic.
    const x = oldTriads.find((c) => mod(pc(c.chord.root) + 7, 12) === firstPc);
    if (x) plan = { start: oldTonic, count: m, firstRoot: parseRoman(x.fn === 'tonic' ? 'V7' : `V7/${x.numeral}`, from).root };
  }
  if (!plan) return null;
  const { start, count, firstRoot } = plan;
  const dominants: SequenceChain['dominants'] = [];
  let nextNum = '';
  for (let e = 0; e < count; e++) {
    const rootPc = mod(vPc + 7 * e, 12);
    const targetPc = mod(rootPc + 5, 12);
    let num: string;
    if (e === 0) num = 'V7';
    else {
      const t = newTriads.find((c) => pc(c.chord.root) === targetPc && c.fn !== 'tonic');
      // Fallback: the dominant of the next dominant (V7/V7/iii).
      num = t ? `V7/${t.numeral}` : `V7/${nextNum}`;
    }
    nextNum = num;
    const spelledNew = parseRoman(num, to);
    // Spell from whichever side (new key backward, or old key forward) needs fewer accidentals.
    const fwdRoot = Array.from({ length: count - 1 - e }).reduce<Note>((n) => transposeDown(n, interval('P5')), firstRoot);
    const fwd = withRoot(spelledNew, fwdRoot, '7');
    const chord = accidentalWeight(fwd.notes) < accidentalWeight(spelledNew.notes) ? fwd : spelledNew;
    const oldTarget = targetPc === pc(from.tonic) ? null : oldTriads.find((c) => pc(c.chord.root) === targetPc);
    const oldLabel = targetPc === pc(from.tonic) ? parseRoman('V7', from).display : oldTarget ? parseRoman(`V7/${oldTarget.numeral}`, from).display : undefined;
    dominants.unshift({ num, chord, newLabel: chord.display, oldLabel, targetPc });
  }
  return { start, dominants };
}

function accidentalWeight(ns: Note[]): number {
  return ns.reduce((a, n) => a + Math.abs(n.acc), 0);
}

/** The same numeral realized on a differently spelled root. */
function withRoot(c: RomanChord, root: Note, chordId: string): RomanChord {
  const notes = buildChord(root, chordId);
  return { ...c, root, chordId, notes, bass: notes[0], inversion: 0, symbol: chordSymbol(root, chordId) };
}

// ----- status -----

const sameReason = (from: Key, to: Key) =>
  sameKey(from, to) ? 'Source and target are the same key.' : `${keyName(from)} and ${keyName(to)} are the same key spelled differently.`;

function pivotOptions(ps: Pivot[]): TechOption[] {
  return ps.map((p) => ({ id: p.id, label: `${p.old.display} = ${p.new.display}`, detail: `${p.symbol}: ${p.why}`, rating: p.rating }));
}

export function techniqueStatus(id: TechniqueId, from: Key, to: Key): TechniqueStatus {
  const base = { id, options: [] as TechOption[] };
  if (enharmonicKeys(from, to)) return { ...base, available: false, reason: sameReason(from, to) };
  const diff = mod(pc(to.tonic) - pc(from.tonic), 12);
  switch (id) {
    case 'pivot': {
      const ps = findPivots(from, to);
      if (!ps.length) {
        const common = compareKeys(from, to).commonScaleTones.length;
        return { ...base, available: false, reason: `No triad or seventh chord is diatonic to both keys (the scales share only ${common} of 7 notes).` };
      }
      return { ...base, available: true, reason: `${ps.length} shared chord${ps.length === 1 ? '' : 's'}; best: ${ps[0].old.display} = ${ps[0].new.display}.`, options: pivotOptions(ps), optionsLabel: 'Pivot chord' };
    }
    case 'direct': {
      const d = fifthsDistance(from, to);
      return { ...base, available: true, reason: d <= 1 ? 'Smooth here: the keys are closely related.' : `Abrupt here: the key signatures are ${d} steps apart, so the phrase break must carry it.` };
    }
    case 'secondary': {
      const v = parseRoman('V7', to);
      return {
        ...base,
        available: true,
        reason: `${v.symbol} (V⁷ of ${keyName(to)}) enters as a chromatic chord.`,
        options: [
          { id: 'V7', label: 'Via V⁷', detail: `${v.symbol}` },
          { id: 'vii7', label: 'Via vii°⁷', detail: parseRoman('vii°7', to).symbol },
        ],
        optionsLabel: 'Dominant chord',
      };
    }
    case 'commonTone': {
      const cs = commonToneCandidates(from, to);
      if (!cs.length) return { ...base, available: false, reason: `The ${noteName(from.tonic)} tonic triad shares no tone with any diatonic chord of ${keyName(to)}.` };
      return {
        ...base,
        available: true,
        reason: `Hold ${noteName(cs[0].heldOld)}${cs[0].heldOld.letter !== cs[0].heldNew.letter ? ` (= ${noteName(cs[0].heldNew)})` : ''} into ${cs[0].target.chord.symbol} (${cs[0].target.display}).`,
        options: cs.slice(0, 8).map((c) => ({
          id: c.id,
          label: `${noteName(c.heldOld)} → ${c.target.display}`,
          detail: `Hold ${noteName(c.heldOld)}${c.heldOld.letter !== c.heldNew.letter ? ` (respelled ${noteName(c.heldNew)})` : ''} into ${c.target.chord.symbol}${c.chromatic ? ', a chromatic arrival' : ', also diatonic in the old key'}`,
        })),
        optionsLabel: 'Held tone and arrival chord',
      };
    }
    case 'dim7': {
      const cs = dim7Candidates(from, to);
      if (!cs.length) return { ...base, available: false, reason: `No diminished seventh chord of ${keyName(from)} respells as vii°⁷ of ${keyName(to)} (the target's leading tone is the same note).` };
      return {
        ...base,
        available: true,
        reason: `${cs[0].oldChord.display} (${cs[0].oldChord.symbol}) respells as vii°⁷ (${cs[0].newChord.symbol}).`,
        options: cs.map((c) => ({ id: c.id, label: `${c.oldChord.display} = vii°⁷`, detail: `${c.oldChord.symbol} → ${c.newChord.symbol}` })),
        optionsLabel: 'Diminished seventh in the old key',
      };
    }
    case 'ger6': {
      const cs = ger6Candidates(from, to);
      if (!cs.length)
        return {
          ...base,
          available: false,
          reason: `No dominant seventh of ${keyName(from)} is the Ger⁺⁶ of ${keyName(to)}, and its Ger⁺⁶ is not the new V⁷. Works best a semitone up or down.`,
        };
      return {
        ...base,
        available: true,
        reason: `${cs[0].oldChord.display} = ${cs[0].newChord.display} (${cs[0].oldChord.notes.map((n) => noteName(n)).join(' ')} = ${cs[0].newChord.notes.map((n) => noteName(n)).join(' ')}).`,
        options: cs.map((c) => ({ id: c.id, label: `${c.oldChord.display} = ${c.newChord.display}`, detail: c.kind === 'v7-to-ger' ? 'Dominant seventh reinterpreted as a German sixth' : 'German sixth reinterpreted as a dominant seventh' })),
        optionsLabel: 'Reinterpretation',
      };
    }
    case 'sequential': {
      const ch = sequentialChain(from, to);
      if (!ch) return { ...base, available: false, reason: 'The chain of fifths would need more than seven dominant chords.' };
      return {
        ...base,
        available: true,
        reason: `${ch.dominants.length} dominants from ${ch.start.display} (${ch.start.chord.symbol}): ${ch.dominants.map((d) => d.chord.symbol).join(' → ')} → ${noteName(to.tonic)}.`,
        options: [
          { id: 'dominants', label: 'Chain of dominants', detail: 'Each chord is V⁷ of the next' },
          { id: 'iiV', label: 'ii-V units', detail: 'Each dominant is preceded by its own ii⁷' },
        ],
        optionsLabel: 'Pattern',
      };
    }
    case 'mixture': {
      const ps = findBorrowedPivots(from, to);
      if (!ps.length) return { ...base, available: false, reason: `No chord borrowed from ${keyName(parallelKey(from))} is diatonic in ${keyName(to)}.` };
      return { ...base, available: true, reason: `${ps.length} borrowed pivot${ps.length === 1 ? '' : 's'}; best: ${ps[0].old.display} = ${ps[0].new.display}.`, options: pivotOptions(ps), optionsLabel: 'Borrowed pivot' };
    }
    case 'truck': {
      if (diff !== 1 && diff !== 2) return { ...base, available: false, reason: 'Truck driver modulation moves up a semitone or a whole step; this target is elsewhere.' };
      return {
        ...base,
        available: true,
        reason: `Up a ${diff === 1 ? 'semitone' : 'whole step'}${from.mode !== to.mode ? ' (and a change of mode, which is unusual)' : ''}.`,
        options: [
          { id: 'plain', label: 'Abrupt', detail: 'No preparation at all' },
          { id: 'v7', label: 'With new V⁷', detail: 'One dominant chord as a ramp' },
        ],
        optionsLabel: 'Approach',
      };
    }
  }
}

export function allStatuses(from: Key, to: Key): TechniqueStatus[] {
  return TECHNIQUES.map((t) => techniqueStatus(t.id, from, to));
}

export interface MapEntry {
  key: Key;
  pivots: number;
  available: TechniqueId[];
  relations: Relation[];
}

export function mapEntry(from: Key, to: Key): MapEntry {
  const st = allStatuses(from, to);
  return { key: to, pivots: findPivots(from, to).length, available: st.filter((s) => s.available).map((s) => s.id), relations: keyRelations(from, to) };
}

// ----- example builders -----

function pivotExample(from: Key, to: Key, p: Pivot, mixture: boolean): Example {
  const steps = establish(from);
  const pivotStep = stepFrom(p.old.chord, 'pivot', { old: p.old.display, new: p.new.display });
  const tonic = parseRoman(tonicNumeral(from), from);
  if (!mixture && chordKey(p.old.chord) === chordKey(tonic)) steps[steps.length - 1] = pivotStep;
  else steps.push(pivotStep);
  for (const n of continuation({ numeral: p.new.numeral, fn: p.new.fn, chordId: p.new.chord.chordId }, to)) steps.push(newStep(n, to));
  const caption = mixture
    ? `${p.old.chord.symbol} is borrowed from ${keyName(parallelKey(from))} (${p.old.display}) and is ${p.new.display} in ${keyName(to)}.`
    : `${p.old.chord.symbol} is ${p.old.display} in ${keyName(from)} and ${p.new.display} in ${keyName(to)}.`;
  return makeExample(from, to, steps, caption);
}

function directExample(from: Key, to: Key): Example {
  const steps = establish(from);
  const T = tonicNumeral(to);
  const nums = [T, predominantNumeral(to), 'V7', T];
  nums.forEach((n, i) => {
    const st = newStep(n, to);
    if (i === 0) st.phraseStart = true;
    steps.push(st);
  });
  return makeExample(from, to, steps, `A cadence closes ${keyName(from)}; the next phrase simply begins in ${keyName(to)}.`);
}

/** Old-key diatonic triad that leads most smoothly into `target` (most common tones, then least motion). */
function bestApproach(from: Key, target: RomanChord): KeyChord | null {
  const tPcs = target.notes.map(pc);
  let best: KeyChord | null = null;
  let bestScore = -Infinity;
  for (const c of triadChords(from)) {
    if (c.source === 'harmonic' || c.fn === 'tonic') continue;
    const common = c.chord.notes.filter((n) => tPcs.includes(pc(n))).length;
    const pref = c.fn === 'predominant' ? 0.5 : c.fn === 'submediant' ? 0.3 : 0;
    const s = common * 2 + pref;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function secondaryExample(from: Key, to: Key, option: string): Example {
  const steps = establish(from);
  const domNum = option === 'vii7' ? 'vii°7' : 'V7';
  const dom = parseRoman(domNum, to);
  const approach = bestApproach(from, dom);
  if (approach) steps.push(oldStep(approach.numeral, from));
  const newTonicInOld = analyzeChord(to.tonic, to.mode === 'major' ? 'maj' : 'min', from);
  const oldLabel = `${formatRoman(domNum)}/${formatRoman(newTonicInOld)}`;
  steps.push(stepFrom(dom, 'pivot', { old: oldLabel, new: dom.display }));
  steps.push(newStep(tonicNumeral(to), to));
  steps.push(newStep(predominantNumeral(to), to));
  steps.push(newStep('V7', to));
  steps.push(newStep(tonicNumeral(to), to));
  return makeExample(from, to, steps, `${dom.symbol} would be ${oldLabel} in ${keyName(from)}, but here it resolves and the new key stays.`);
}

function commonToneExample(from: Key, to: Key, c: CommonToneCandidate): Example {
  const steps = establish(from);
  const bridge: Step = { role: 'bridge', root: c.heldOld, chordId: 'note', notes: [c.heldOld], bass: c.heldOld, symbol: noteName(c.heldOld), beats: 2 };
  steps.push(bridge);
  steps.push(stepFrom(c.target.chord, 'new', { new: c.target.display }));
  for (const n of continuation({ numeral: c.target.numeral, fn: c.target.fn, chordId: c.target.chord.chordId }, to)) steps.push(newStep(n, to));
  const resp = c.heldOld.letter !== c.heldNew.letter || c.heldOld.acc !== c.heldNew.acc ? ` (respelled ${noteName(c.heldNew)})` : '';
  return makeExample(from, to, steps, `${noteName(c.heldOld)}${resp} sounds alone, then becomes part of ${c.target.chord.symbol}, ${c.target.display} in ${keyName(to)}.`, { heldPc: c.heldPc });
}

function dim7Example(from: Key, to: Key, c: Dim7Candidate): Example {
  const steps = establish(from);
  steps.push(stepFrom(c.oldChord, 'pivot', { old: c.oldChord.display }));
  steps.push({ ...stepFrom(c.newChord, 'pivot', { new: c.newChord.display }), respell: true, bass: respellBass(c.oldChord.bass, c.newChord.notes) });
  const T = tonicNumeral(to);
  [T, predominantNumeral(to), 'V7', T].forEach((n) => steps.push(newStep(n, to)));
  return makeExample(from, to, steps, `${c.oldChord.symbol} (${c.oldChord.display} in ${keyName(from)}) is respelled ${c.newChord.symbol}, vii°⁷ of ${keyName(to)}.`, {
    enharmonic: { oldLabel: c.oldChord.display, newLabel: c.newChord.display, oldNotes: c.oldChord.notes, newNotes: c.newChord.notes, oldSymbol: c.oldChord.symbol, newSymbol: c.newChord.symbol },
  });
}

function respellBass(bass: Note, notes: Note[]): Note {
  return notes.find((n) => pc(n) === pc(bass)) ?? bass;
}

function ger6Example(from: Key, to: Key, c: Ger6Candidate): Example {
  const steps = establish(from);
  steps.push(stepFrom(c.oldChord, 'pivot', { old: c.oldChord.display }));
  steps.push({ ...stepFrom(c.newChord, 'pivot', { new: c.newChord.display }), respell: true, bass: respellBass(c.oldChord.bass, c.newChord.notes) });
  const T = tonicNumeral(to);
  const tail = c.kind === 'v7-to-ger' ? ['Cad64', 'V7', T] : [T, predominantNumeral(to), 'V7', T];
  tail.forEach((n) => steps.push(newStep(n, to)));
  const oldSym = symbolFor(c.oldChord);
  const newSym = symbolFor(c.newChord);
  return makeExample(from, to, steps, `${oldSym} (${c.oldChord.display} in ${keyName(from)}) is respelled as ${newSym} (${c.newChord.display} in ${keyName(to)}).`, {
    enharmonic: { oldLabel: c.oldChord.display, newLabel: c.newChord.display, oldNotes: c.oldChord.notes, newNotes: c.newChord.notes, oldSymbol: oldSym, newSymbol: newSym },
  });
}

function sequentialExample(from: Key, to: Key, ch: SequenceChain, option: string): Example {
  const steps = establish(from);
  const iiV = option === 'iiV';
  const startIsMinor = ch.start.chord.chordId === 'min';
  if (iiV && startIsMinor) {
    // In the ii-V pattern a minor start chord becomes the first ii7 directly.
    const c = parseRoman(ch.start.numeral + '7', from);
    steps.push(stepFrom(c, 'old', { old: c.display }));
  } else if (ch.start.fn !== 'tonic') {
    // A tonic start is the last chord of the opening phrase already.
    steps.push(stepFrom(ch.start.chord, 'old', { old: ch.start.display }));
  }
  ch.dominants.forEach((d, i) => {
    const last = i === ch.dominants.length - 1;
    if (iiV && !(i === 0 && startIsMinor)) {
      const iiNum = d.num === 'V7' ? (to.mode === 'major' ? 'ii7' : 'iiø7') : d.num.replace(/^V7/, 'ii7');
      const iiLabel = parseRoman(iiNum, to);
      const ii = withRoot(iiLabel, transpose(d.chord.root, interval('P5')), iiLabel.chordId);
      steps.push(stepFrom(ii, 'transition', { new: ii.display }));
    }
    steps.push(stepFrom(d.chord, last ? 'new' : 'transition', { old: d.oldLabel, new: d.newLabel }));
  });
  steps.push(newStep(tonicNumeral(to), to));
  const chain = ch.dominants.map((d) => d.chord.symbol).join(' → ');
  return makeExample(from, to, steps, `From ${ch.start.chord.symbol} the roots fall by fifths: ${chain} → ${noteName(to.tonic)}.`);
}

function truckExample(from: Key, to: Key, option: string): Example {
  const oldNums = from.mode === 'major' ? ['I', 'vi', 'IV', 'V'] : ['i', 'VI', 'III', 'VII'];
  const newNums = to.mode === 'major' ? ['I', 'vi', 'IV', 'V', 'I'] : ['i', 'VI', 'III', 'VII', 'i'];
  const steps = oldNums.map((n) => oldStep(n, from));
  if (option === 'v7') steps.push(stepFrom(parseRoman('V7', to), 'transition', { new: parseRoman('V7', to).display }));
  newNums.forEach((n, i) => {
    const st = newStep(n, to);
    if (i === 0 && option !== 'v7') st.phraseStart = true;
    steps.push(st);
  });
  return makeExample(from, to, steps, `The same progression, simply shifted up to ${keyName(to)}.`);
}

/** Build the playable example for a technique (null when unavailable). */
export function buildExample(id: TechniqueId, from: Key, to: Key, optionId?: string): Example | null {
  const st = techniqueStatus(id, from, to);
  if (!st.available) return null;
  const opt = st.options.find((o) => o.id === optionId)?.id ?? st.options[0]?.id;
  switch (id) {
    case 'pivot': {
      const ps = findPivots(from, to);
      return pivotExample(from, to, ps.find((p) => p.id === opt) ?? ps[0], false);
    }
    case 'mixture': {
      const ps = findBorrowedPivots(from, to);
      return pivotExample(from, to, ps.find((p) => p.id === opt) ?? ps[0], true);
    }
    case 'direct':
      return directExample(from, to);
    case 'secondary':
      return secondaryExample(from, to, opt ?? 'V7');
    case 'commonTone': {
      const cs = commonToneCandidates(from, to);
      return commonToneExample(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'dim7': {
      const cs = dim7Candidates(from, to);
      return dim7Example(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'ger6': {
      const cs = ger6Candidates(from, to);
      return ger6Example(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'sequential':
      return sequentialExample(from, to, sequentialChain(from, to)!, opt ?? 'dominants');
    case 'truck':
      return truckExample(from, to, opt ?? 'plain');
  }
}

// ---------------------------------------------------------------------------
// Key lists for pickers and the modulation map
// ---------------------------------------------------------------------------

/** Twelve keys per mode with conventional spellings (6 flats to 5 sharps). */
export function mapKeys(mode: KeyMode): Key[] {
  return Array.from({ length: 12 }, (_, i) => keyFromFifths(i - 6, mode));
}

/**
 * Signature columns for the map, ordered around the circle of fifths and centered on the source key.
 * Each column holds the major key and its relative minor. The source and target keep their own spellings.
 */
export function mapColumns(from: Key, to: Key): Array<{ offset: number; major: Key; minor: Key }> {
  const fa = keySignatureFifths(from);
  const cols: Array<{ offset: number; major: Key; minor: Key }> = [];
  for (let offset = -6; offset <= 5; offset++) {
    const f = fa + offset;
    const cls = mod(f, 12);
    const pick = (mode: KeyMode): Key => {
      for (const k of [from, to]) if (k.mode === mode && mod(keySignatureFifths(k), 12) === cls) return k;
      const norm = mod(f + 6, 12) - 6; // -6..5
      return keyFromFifths(norm, mode);
    };
    cols.push({ offset, major: pick('major'), minor: pick('minor') });
  }
  return cols;
}
