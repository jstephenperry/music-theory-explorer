/**
 * Modulation: the catalog of nine techniques, the candidate finders behind them, their
 * availability for a pair of keys, and the modulation map.
 */
import { buildChord, chordQualityClass, chordSymbol } from '../../theory/chords';
import { interval, intervalBetween, transposeDown } from '../../theory/intervals';
import { enharmonicKeys, fifthsDistance, keyFromFifths, keyName, keySignatureFifths, parallelKey, sameKey, type Key, type KeyMode } from '../../theory/keys';
import { mod, noteName, pc, type Note } from '../../theory/notes';
import { parseRoman, type RomanChord } from '../../theory/roman';
import { type Rating, type Pivot, findPivots, compareKeys, findBorrowedPivots, type Relation, keyRelations } from './relations';
import { type KeyChord, keyChords, chordKey } from './keys';
import { tonicNumeral } from './examples';

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
    short: 'The new key begins with the next phrase.',
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
      'A repeated pattern carries the music around the circle of fifths. Each chord becomes the dominant of the next until the chain lands on the new key’s V⁷, so the arrival is prepared rather than abrupt.',
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

export function triadChords(k: Key): KeyChord[] {
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
export function withRoot(c: RomanChord, root: Note, chordId: string): RomanChord {
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
