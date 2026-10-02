/**
 * Modulation: pivot chords between two keys, and how two keys are related.
 */
import { enharmonicKeys, fifthsDistance, keyName, keyNotes, keySignatureFifths, relativeKey, sameKey, signatureAccidentalMap, type Key } from '../../theory/keys';
import { mod, pc, type Note } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { type KeyChord, type Fn, chordKey, keyChords, borrowedChords } from './keys';

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
  if (nf === 'submediant') return `Submediant in the new key: it moves to a predominant and then to V⁷.`;
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
