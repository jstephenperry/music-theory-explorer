/**
 * Species counterpoint after Fux (Gradus ad Parnassum, 1725): a rule checker for first species
 * (note against note) and second species (two notes against one) in two voices, and a
 * backtracking solver used for hints and model solutions.
 *
 * Intervals are judged by spelling, not only by semitones: C sharp to F is a diminished fourth, a
 * dissonance, although it sounds like a major third.
 */
import { pitchInterval, type Interval } from '../intervals';
import { LETTERS, letterIndex, midi, type Pitch } from '../notes';
import { cap } from '../../lib/format';

export type Species = 1 | 2;

/** A counterpoint slot: a pitch, an opening rest (second species only), or not yet written. */
export type CPNote = Pitch | 'rest' | null;

export interface Exercise {
  cf: Pitch[];
  species: Species;
  /** True when the counterpoint is above the cantus firmus. */
  above: boolean;
}

export type Severity = 'error' | 'warning';

export interface Issue {
  /** Counterpoint slots the issue refers to. */
  slots: number[];
  severity: Severity;
  rule: string;
  message: string;
  /** A matter of taste that the solver may leave unresolved (the single climax). */
  soft?: boolean;
}

export interface CantusFirmus {
  id: string;
  name: string;
  /** Who wrote it. */
  source: string;
  notes: string;
}

/**
 * Cantus firmi. The D (Dorian) melody is the one Fux uses throughout Gradus ad Parnassum; the others
 * are practice melodies in the same style, one for each final.
 */
export const CANTUS_FIRMI: CantusFirmus[] = [
  { id: 'd', name: 'Dorian, on D', source: 'Fux, Gradus ad Parnassum (1725)', notes: 'D4 F4 E4 D4 G4 F4 A4 G4 F4 E4 D4' },
  { id: 'c', name: 'Ionian, on C', source: 'practice melody in the style of Fux', notes: 'C4 E4 F4 G4 E4 A4 G4 E4 F4 E4 D4 C4' },
  { id: 'f', name: 'Lydian, on F', source: 'practice melody in the style of Fux', notes: 'F4 G4 A4 F4 D4 E4 F4 C5 A4 F4 G4 F4' },
  { id: 'g', name: 'Mixolydian, on G', source: 'practice melody in the style of Fux', notes: 'G3 C4 B3 G3 C4 E4 D4 G4 E4 C4 D4 B3 A3 G3' },
  { id: 'a', name: 'Aeolian, on A', source: 'practice melody in the style of Fux', notes: 'A3 C4 B3 D4 C4 E4 F4 E4 D4 C4 B3 A3' },
];

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

const dIndex = (p: Pitch) => p.octave * 7 + letterIndex(p.letter);

/** Simple generic size 1..7 (an octave counts as 1) and its semitones within the octave. */
function simple(iv: Interval): { n: number; s: number } {
  return { n: ((iv.num - 1) % 7) + 1, s: iv.semis - 12 * Math.floor((iv.num - 1) / 7) };
}

type Quality = 'perfect' | 'major' | 'minor' | 'other';
const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];

function quality(iv: Interval): Quality {
  const { n, s } = simple(iv);
  const base = MAJOR_SEMIS[n - 1];
  if (n === 1 || n === 4 || n === 5) return s === base ? 'perfect' : 'other';
  if (s === base) return 'major';
  if (s === base - 1) return 'minor';
  return 'other';
}

/** Perfect consonance: unison, fifth, octave (and compounds). */
export function isPerfect(a: Pitch, b: Pitch): boolean {
  const iv = pitchInterval(a, b);
  const { n } = simple(iv);
  return (n === 1 || n === 5) && quality(iv) === 'perfect';
}

export function isConsonant(a: Pitch, b: Pitch): boolean {
  const iv = pitchInterval(a, b);
  const { n } = simple(iv);
  const q = quality(iv);
  if (n === 1 || n === 5) return q === 'perfect';
  if (n === 3 || n === 6) return q === 'major' || q === 'minor';
  return false;
}

/** Name of the harmonic interval as a number, as written between the staves: 1, 3, 5, 6, 8, 10 ... */
export function intervalNumber(a: Pitch, b: Pitch): number {
  return pitchInterval(a, b).num;
}

const QUALITY_NAME: Record<Quality, string> = { perfect: 'perfect', major: 'major', minor: 'minor', other: 'augmented or diminished' };
const NUM_NAME = ['unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave'];

export function intervalName(a: Pitch, b: Pitch): string {
  const iv = pitchInterval(a, b);
  const q = quality(iv);
  const n = iv.num <= 8 ? NUM_NAME[iv.num - 1] : `compound ${NUM_NAME[simple(iv).n - 1]}`;
  if (iv.num === 8 && q === 'perfect') return 'octave';
  if (iv.num === 1 && q === 'perfect') return 'unison';
  return `${QUALITY_NAME[q]} ${n}`;
}

// ---------------------------------------------------------------------------
// Slots and timing
// ---------------------------------------------------------------------------

/** Number of counterpoint slots: one per bar in first species, two per bar (one in the last) in second. */
export function slotCount(ex: Pick<Exercise, 'cf' | 'species'>): number {
  return ex.species === 1 ? ex.cf.length : ex.cf.length * 2 - 1;
}

/** The cantus firmus note under a slot. */
export function cfIndex(ex: Pick<Exercise, 'species'>, slot: number): number {
  return ex.species === 1 ? slot : Math.floor(slot / 2);
}

export function isDownbeat(ex: Pick<Exercise, 'species'>, slot: number): boolean {
  return ex.species === 1 || slot % 2 === 0;
}

/** Length of a slot in quarter notes (whole notes against the cantus firmus in 4/4). */
export function slotLength(ex: Pick<Exercise, 'cf' | 'species'>, slot: number): number {
  if (ex.species === 1) return 4;
  return slot === slotCount(ex) - 1 ? 4 : 2;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

export const RULES: Array<{ id: string; name: string; text: string }> = [
  { id: 'consonance', name: 'Consonance', text: 'Every note against the cantus firmus is a consonance: unison, third, fifth, sixth or octave (or a compound of these). The fourth counts as a dissonance in two voices. In second species this applies to the first note of each bar.' },
  { id: 'passing', name: 'Passing dissonance', text: 'Second species only: the second note of a bar may be dissonant only as a passing tone, approached and left by step in the same direction.' },
  { id: 'begin', name: 'Beginning', text: 'Begin with a perfect consonance: unison, fifth or octave above the cantus firmus, or unison or octave below it (a fifth below would suggest another mode). In second species the counterpoint may begin after a half rest.' },
  { id: 'end', name: 'Ending', text: 'End on a unison or octave, approached by step in contrary motion. The bar before has a major sixth above the cantus firmus (or a minor third or tenth below it), so the counterpoint uses the leading tone, raised if necessary (musica ficta). In second species the note before it may be raised as well: F sharp, G sharp, A in the Aeolian mode.' },
  { id: 'parallel', name: 'No parallel fifths or octaves', text: 'Two perfect consonances of the same kind in a row (fifth to fifth, octave to octave) destroy the independence of the voices. In second species, fifths or octaves on successive downbeats count as well.' },
  { id: 'direct', name: 'Direct fifths and octaves', text: 'Avoid moving into a perfect consonance by similar motion with a leap in the upper voice.' },
  { id: 'unison', name: 'Unisons', text: 'The unison belongs only at the beginning and the end; elsewhere the two voices lose their identity.' },
  { id: 'crossing', name: 'No voice crossing', text: 'The counterpoint stays on its side of the cantus firmus.' },
  { id: 'leaps', name: 'Melodic intervals', text: 'Allowed: steps, thirds, fourths, fifths, the ascending minor sixth and the octave. Not allowed: augmented and diminished intervals, sevenths, the major sixth, the descending minor sixth, anything larger than an octave.' },
  { id: 'recovery', name: 'Recovery after leaps', text: 'After a leap larger than a fourth, turn back by step. Two leaps in the same direction should not add up to more than an octave.' },
  { id: 'repeat', name: 'Repeated notes', text: 'First species: repeat a note rarely. Second species: never repeat the note within a bar.' },
  { id: 'imperfect', name: 'Variety', text: 'More than three parallel thirds or sixths in a row make the voices sound like one doubled line.' },
  { id: 'range', name: 'Range and climax', text: 'Keep the counterpoint within a tenth, and within a twelfth of the cantus firmus. A good line has one highest note.' },
];

function pitchOf(n: CPNote): Pitch | null {
  return n && n !== 'rest' ? n : null;
}

/** Check a (possibly partial) counterpoint. Rules that need a missing note are skipped. */
export function checkCounterpoint(ex: Exercise, cp: CPNote[]): Issue[] {
  const issues: Issue[] = [];
  const add = (slots: number[], severity: Severity, rule: string, message: string) => issues.push({ slots, severity, rule, message });
  const n = slotCount(ex);
  const cfAt = (slot: number) => ex.cf[cfIndex(ex, slot)];
  const p = (slot: number) => (slot >= 0 && slot < n ? pitchOf(cp[slot] ?? null) : null);
  const upper = (slot: number) => (ex.above ? p(slot)! : cfAt(slot));
  const last = n - 1;
  const firstSounding = ex.species === 2 && cp[0] === 'rest' ? 1 : 0;

  // ---- Vertical intervals ----
  for (let i = 0; i < n; i++) {
    const x = p(i);
    if (!x) {
      if (cp[i] === 'rest' && i !== 0) add([i], 'error', 'begin', 'Only the first note of the counterpoint may be replaced by a rest.');
      continue;
    }
    const c = cfAt(i);
    const crossed = ex.above ? midi(x) < midi(c) : midi(x) > midi(c);
    if (crossed) add([i], 'error', 'crossing', `The counterpoint crosses ${ex.above ? 'below' : 'above'} the cantus firmus.`);
    const cons = isConsonant(c, x);
    if (isDownbeat(ex, i)) {
      if (!cons) add([i], 'error', 'consonance', `${cap(intervalName(c, x))} against the cantus firmus: a dissonance.`);
    } else if (!cons) {
      const a = p(i - 1);
      const b = p(i + 1);
      if (a && b) {
        const s1 = dIndex(x) - dIndex(a);
        const s2 = dIndex(b) - dIndex(x);
        if (Math.abs(s1) === 1 && Math.abs(s2) === 1 && s1 === s2) {
          // A passing tone: fine.
        } else if (Math.abs(s1) === 1 && Math.abs(s2) === 1) {
          add([i], 'error', 'passing', `The dissonant ${intervalName(c, x)} is a neighbor note. Second species allows dissonance only as a passing tone, continuing in the same direction.`);
        } else {
          add([i], 'error', 'passing', `The dissonant ${intervalName(c, x)} must be approached and left by step in the same direction (a passing tone).`);
        }
      } else if (a && Math.abs(dIndex(x) - dIndex(a)) !== 1) {
        add([i], 'error', 'passing', `The dissonant ${intervalName(c, x)} is approached by leap; a passing tone moves by step.`);
      }
    }
    const iv = pitchInterval(c, x);
    if (iv.num === 1 && iv.semis === 0 && i !== firstSounding && i !== last) {
      if (isDownbeat(ex, i)) add([i], 'error', 'unison', 'A unison in the middle of the exercise: keep it for the first and last notes.');
      else add([i], 'warning', 'unison', 'A unison on the weak beat: allowed, but it weakens the independence of the voices.');
    }
    if (iv.semis > 19) add([i], 'warning', 'range', 'The voices are more than a twelfth apart.');
  }

  // ---- Beginning ----
  const f = p(firstSounding);
  if (f) {
    const iv = pitchInterval(ex.cf[0], f);
    const { n: sn } = simple(iv);
    const perfect = isPerfect(ex.cf[0], f);
    if (!perfect || (!ex.above && sn === 5)) add([firstSounding], 'error', 'begin', ex.above ? 'Begin with a unison, fifth or octave above the cantus firmus.' : 'Begin with a unison or octave below the cantus firmus.');
  }

  // ---- Ending ----
  const z = p(last);
  if (z) {
    const c = ex.cf[ex.cf.length - 1];
    const iv = pitchInterval(c, z);
    if (!(simple(iv).n === 1 && quality(iv) === 'perfect')) add([last], 'error', 'end', 'End on a unison or octave with the cantus firmus.');
    const y = p(last - 1);
    if (y) {
      if (Math.abs(dIndex(z) - dIndex(y)) !== 1) add([last - 1, last], 'error', 'end', 'Approach the final note by step.');
      const pc = cfAt(last - 1);
      const piv = pitchInterval(pc, y);
      const sp = simple(piv);
      const ok = ex.above ? sp.n === 6 && quality(piv) === 'major' : sp.n === 3 && quality(piv) === 'minor';
      if (!ok) {
        const want = ex.above ? 'a major sixth above' : 'a minor third (or tenth) below';
        add([last - 1], 'error', 'end', `The next-to-last note should be ${want} the cantus firmus, here ${intervalName(pc, y)}: use the leading tone, a half step below the final${ex.above ? '' : ', or raise it'}.`);
      }
    }
  }

  // ---- Motion between consecutive notes ----
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < n; i++) pairs.push([i, i + 1]);
  for (const [i, j] of pairs) {
    const a = p(i);
    const b = p(j);
    if (!a || !b) continue;
    const ca = cfAt(i);
    const cb = cfAt(j);
    const cpMove = midi(b) - midi(a);
    const cfMove = midi(cb) - midi(ca);
    if (isPerfect(ca, a) && isPerfect(cb, b)) {
      const sa = simple(pitchInterval(ca, a)).n;
      const sb = simple(pitchInterval(cb, b)).n;
      if (sa === sb && (cpMove !== 0 || cfMove !== 0)) {
        const kind = sa === 5 ? 'fifths' : 'octaves or unisons';
        const contrary = Math.sign(cpMove) === -Math.sign(cfMove) && cpMove !== 0 && cfMove !== 0;
        add([i, j], 'error', 'parallel', contrary ? `Consecutive ${kind} by contrary motion: still forbidden in strict counterpoint.` : `Parallel ${kind}.`);
      }
    }
    // Direct (hidden) fifths and octaves: similar motion into a perfect consonance, upper voice leaping.
    if (isPerfect(cb, b) && !(isPerfect(ca, a) && simple(pitchInterval(ca, a)).n === simple(pitchInterval(cb, b)).n) && cpMove !== 0 && cfMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) {
      const upperLeap = Math.abs(dIndex(upper(j)) - dIndex(upper(i))) > 1;
      if (upperLeap) add([i, j], 'warning', 'direct', `Direct ${simple(pitchInterval(cb, b)).n === 5 ? 'fifth' : 'octave'}: similar motion into a perfect consonance with a leap in the upper voice.`);
    }
    // Melodic interval.
    const iv = pitchInterval(a, b);
    const q = quality(iv);
    const up = midi(b) > midi(a);
    const { n: sn } = simple(iv);
    let bad: string | null = null;
    if (q === 'other') bad = `an ${intervalName(a, b)}`;
    else if (iv.num === 7) bad = 'a seventh';
    else if (iv.num > 8) bad = 'a leap larger than an octave';
    else if (iv.num === 6 && q === 'major') bad = 'a major sixth';
    else if (iv.num === 6 && !up) bad = 'a descending minor sixth';
    if (bad) add([i, j], 'error', 'leaps', `The counterpoint leaps ${bad}.`);
    if (iv.semis === 0) {
      if (ex.species === 2 && cfIndex(ex, i) === cfIndex(ex, j)) add([i, j], 'error', 'repeat', 'Second species does not repeat a note within the bar.');
      else if (ex.species === 1) add([i, j], 'warning', 'repeat', 'A repeated note: use sparingly.');
    }
    // Recovery after a large leap.
    const c = p(j + 1);
    if (c && iv.num > 4 && sn !== 1) {
      const next = dIndex(c) - dIndex(b);
      const back = Math.sign(next) === -Math.sign(dIndex(b) - dIndex(a)) && Math.abs(next) === 1;
      if (!back) add([i, j, j + 1], 'warning', 'recovery', 'After a leap larger than a fourth, turn back by step.');
    }
    if (c) {
      const l1 = dIndex(b) - dIndex(a);
      const l2 = dIndex(c) - dIndex(b);
      if (Math.abs(l1) > 1 && Math.abs(l2) > 1 && Math.sign(l1) === Math.sign(l2) && Math.abs(midi(c) - midi(a)) > 12) add([i, j, j + 1], 'warning', 'recovery', 'Two leaps in the same direction span more than an octave.');
    }
  }

  // ---- Second species: fifths or octaves on successive downbeats ----
  if (ex.species === 2) {
    for (let i = 0; i + 2 < n; i += 2) {
      const a = p(i);
      const b = p(i + 2);
      if (!a || !b) continue;
      const ca = cfAt(i);
      const cb = cfAt(i + 2);
      if (isPerfect(ca, a) && isPerfect(cb, b) && simple(pitchInterval(ca, a)).n === simple(pitchInterval(cb, b)).n && midi(b) !== midi(a)) {
        add([i, i + 2], 'error', 'parallel', `${simple(pitchInterval(cb, b)).n === 5 ? 'Fifths' : 'Octaves'} on successive downbeats: the weak beat between them does not hide them.`);
      }
    }
  }

  // ---- Runs of imperfect consonances (first species) ----
  if (ex.species === 1) {
    let run: number[] = [];
    const flush = () => {
      if (run.length > 3) add([...run], 'warning', 'imperfect', `${run.length} parallel ${simple(pitchInterval(cfAt(run[0]), p(run[0])!)).n === 3 ? 'thirds' : 'sixths'} in a row.`);
      run = [];
    };
    for (let i = 0; i < n; i++) {
      const x = p(i);
      if (!x) {
        flush();
        continue;
      }
      const sn = simple(pitchInterval(cfAt(i), x)).n;
      const prev = run.length ? simple(pitchInterval(cfAt(run[0]), p(run[0])!)).n : null;
      if ((sn === 3 || sn === 6) && (prev === null || prev === sn)) run.push(i);
      else {
        flush();
        if (sn === 3 || sn === 6) run.push(i);
      }
    }
    flush();
  }

  // ---- Range and climax (when complete) ----
  const filled = cp.map((x, i) => [pitchOf(x), i] as const).filter((x): x is readonly [Pitch, number] => !!x[0]);
  if (filled.length >= 2) {
    const ms = filled.map(([x]) => midi(x));
    const span = Math.max(...ms) - Math.min(...ms);
    if (span > 16) add(filled.map(([, i]) => i), 'warning', 'range', 'The counterpoint spans more than a tenth.');
  }
  if (isComplete(ex, cp)) {
    const top = Math.max(...filled.map(([x]) => midi(x)));
    const peaks = filled.filter(([x]) => midi(x) === top).map(([, i]) => i);
    if (peaks.length > 1 && !peaks.every((s, k) => k === 0 || s === peaks[k - 1] + 1))
      issues.push({ slots: peaks, severity: 'warning', rule: 'range', message: 'The highest note occurs more than once: a single climax gives the line a clearer shape.', soft: true });
  }
  return issues;
}

export function isComplete(ex: Exercise, cp: CPNote[]): boolean {
  const n = slotCount(ex);
  for (let i = 0; i < n; i++) {
    const x = cp[i];
    if (x === null || x === undefined) return false;
    if (x === 'rest' && !(i === 0 && ex.species === 2)) return false;
  }
  return true;
}


// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

/** Natural pitches (white keys) between two MIDI numbers. */
function naturals(lo: number, hi: number): Pitch[] {
  const out: Pitch[] = [];
  for (let oct = 1; oct <= 7; oct++)
    for (const letter of LETTERS) {
      const x: Pitch = { letter, acc: 0, octave: oct };
      if (midi(x) >= lo && midi(x) <= hi) out.push(x);
    }
  return out;
}

/** The pitch a half step below another, spelled as its leading tone (C sharp below D). */
export function leadingTone(final: Pitch): Pitch {
  return stepBelow(final, 1);
}

/** The pitch one letter below, `semis` semitones lower, with the accidental that takes. */
function stepBelow(p: Pitch, semis: number): Pitch {
  const idx = dIndex(p) - 1;
  const letter = LETTERS[((idx % 7) + 7) % 7];
  const q: Pitch = { letter, acc: 0, octave: Math.floor(idx / 7) };
  return { ...q, acc: midi(p) - semis - midi(q) };
}

function candidates(ex: Exercise, slot: number): Pitch[] {
  const cfMs = ex.cf.map(midi);
  const lo = ex.above ? Math.min(...cfMs) : Math.min(...cfMs) - 12;
  const hi = ex.above ? Math.max(...cfMs) + 12 : Math.max(...cfMs);
  const out = naturals(lo, hi);
  const n = slotCount(ex);
  const finals = out.filter((x) => isPerfect(ex.cf[ex.cf.length - 1], x));
  const add = (x: Pitch) => {
    if (x.acc !== 0 && midi(x) >= lo && midi(x) <= hi) out.push(x);
  };
  // The leading tone below the final, raised where the mode needs it (musica ficta) ...
  if (slot === n - 2) finals.forEach((fin) => add(leadingTone(fin)));
  // ... and in second species the raised sixth that can lead up to it, as in A minor: F sharp, G sharp, A.
  if (ex.species === 2 && slot === n - 3) finals.forEach((fin) => add(stepBelow(leadingTone(fin), 2)));
  return out;
}

export interface SolveOptions {
  /** Slots that must keep their current value. */
  fixed?: CPNote[];
  /** Search budget in visited states. */
  budget?: number;
  /** Random source, for varied solutions. */
  random?: () => number;
  /** Allow warnings in the solution (otherwise only error-free and warning-free lines). */
  allowWarnings?: boolean;
}

/** Find a complete counterpoint with no errors (and, by default, no warnings), or null. */
export function solveCounterpoint(ex: Exercise, opts: SolveOptions = {}): CPNote[] | null {
  const n = slotCount(ex);
  const rnd = opts.random ?? Math.random;
  const fixed = opts.fixed ?? [];
  let budget = opts.budget ?? 60000;
  const cp: CPNote[] = new Array(n).fill(null);
  const pool = Array.from({ length: n }, (_, i) => candidates(ex, i));

  // Every issue among the notes written so far must be tolerable.
  const filledNow = (slot: number) => cp[slot] !== null;
  const acceptable = (issues: Issue[]) => !issues.some((x) => x.slots.every(filledNow) && (x.severity === 'error' || (!opts.allowWarnings && !x.soft)));

  const order = (slot: number): CPNote[] => {
    const f = fixed[slot];
    if (f !== null && f !== undefined) return [f];
    // Neighbor already written: the line is built backward from the cadence.
    const prev = slot + 1 < n ? pitchOf(cp[slot + 1]) : null;
    const scored = pool[slot].map((x) => {
      let score = rnd() * 3;
      if (prev) {
        const step = Math.abs(dIndex(x) - dIndex(prev));
        score += step === 1 ? 0 : step === 2 ? 2 : step <= 4 ? 4 : 7;
        if (step === 0) score += 6;
      }
      const c = ex.cf[cfIndex(ex, slot)];
      if (isPerfect(c, x) && slot !== 0 && slot !== n - 1) score += 2;
      // Stay close to the cantus firmus: within a tenth is the norm.
      const apart = Math.abs(midi(x) - midi(c));
      if (apart > 16) score += 4;
      else if (apart > 12) score += 2;
      return { x, score };
    });
    return scored.sort((a, b) => a.score - b.score).map((s) => s.x);
  };

  // The cadence is the tightest constraint, so the line is written backward from the last note; the
  // opening (any perfect consonance) is the easiest to meet at the end of the search.
  const sequence = Array.from({ length: n }, (_, i) => n - 1 - i);
  const go = (k: number): boolean => {
    if (k === sequence.length) return true;
    const slot = sequence[k];
    const prevOrder = order(slot);
    for (const x of prevOrder) {
      if (--budget < 0) return false;
      cp[slot] = x;
      if (acceptable(checkCounterpoint(ex, cp)) && go(k + 1)) return true;
    }
    cp[slot] = null;
    return false;
  };
  return go(0) ? cp : null;
}
