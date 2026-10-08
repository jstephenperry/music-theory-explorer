/**
 * Motivic transformations: the classical ways of developing a short idea. Pitch operations are
 * spelled correctly. Tonal operations (sequence, diatonic inversion) move notes by steps of the key,
 * so interval qualities adapt to the scale; real operations keep every interval exact.
 */
import { interval, pitchInterval, transposePitch, transposePitchDown } from '../intervals';
import { keySignatureFifths, signatureAccidentalMap, type Key } from '../keys';
import { LETTERS, letterIndex, midi, type Pitch } from '../notes';

export interface MNote {
  /** Null for a rest. */
  pitch: Pitch | null;
  /** Length in quarter notes. */
  dur: number;
}
export type Motive = MNote[];

/** Position on the staff: one step per letter name. */
export function diatonicIndex(p: Pitch): number {
  return p.octave * 7 + letterIndex(p.letter);
}

function keyAcc(key: Key): Record<string, number> {
  return signatureAccidentalMap(keySignatureFifths(key));
}

/**
 * Move a pitch by scale steps within a key. A note that was altered against the key signature keeps
 * the same alteration (F♯ in C major moved up a step becomes G♯).
 */
export function stepPitch(p: Pitch, steps: number, key: Key): Pitch {
  const sig = keyAcc(key);
  const alteration = p.acc - sig[p.letter];
  const idx = diatonicIndex(p) + steps;
  const letter = LETTERS[((idx % 7) + 7) % 7];
  const octave = Math.floor(idx / 7);
  return { letter, octave, acc: sig[letter] + alteration };
}

const mapPitches = (m: Motive, f: (p: Pitch) => Pitch): Motive => m.map((n) => ({ ...n, pitch: n.pitch ? f(n.pitch) : null }));
const firstPitch = (m: Motive): Pitch | null => m.find((n) => n.pitch)?.pitch ?? null;

/** Tonal sequence: every note moves the same number of steps in the key. */
export function sequence(m: Motive, steps: number, key: Key): Motive {
  return mapPitches(m, (p) => stepPitch(p, steps, key));
}

/** Real transposition by an interval (e.g. 'P5'), up or down: every interval stays exactly the same. */
export function transposeReal(m: Motive, ivName: string, down = false): Motive {
  const iv = interval(ivName);
  return mapPitches(m, (p) => (down ? transposePitchDown(p, iv) : transposePitch(p, iv)));
}

/** Diatonic inversion around a pitch (default the first note): steps up become steps down in the key. */
export function invertDiatonic(m: Motive, key: Key, axis?: Pitch): Motive {
  const a = axis ?? firstPitch(m);
  if (!a) return m;
  const sig = keyAcc(key);
  return mapPitches(m, (p) => {
    const q = stepPitch(a, diatonicIndex(a) - diatonicIndex(p), key);
    // Chromatic alterations are mirrored too (a raised note becomes a lowered one).
    const alteration = p.acc - sig[p.letter];
    return { ...q, acc: q.acc - alteration };
  });
}

/** Chromatic (exact) inversion around a pitch: every interval keeps its size and turns over. */
export function invertChromatic(m: Motive, axis?: Pitch): Motive {
  const a = axis ?? firstPitch(m);
  if (!a) return m;
  return mapPitches(m, (p) => {
    if (midi(p) === midi(a) && p.letter === a.letter) return a;
    const up = midi(p) >= midi(a);
    const iv = up ? pitchInterval(a, p) : pitchInterval(p, a);
    return up ? transposePitchDown(a, iv) : transposePitch(a, iv);
  });
}

/** Retrograde: the notes (and their rhythm) backwards. */
export function retrograde(m: Motive): Motive {
  return [...m].reverse();
}

/** Augmentation (factor 2) or diminution (factor 0.5): the rhythm stretched or compressed. */
export function scaleRhythm(m: Motive, factor: number): Motive {
  return m.map((n) => ({ ...n, dur: n.dur * factor }));
}

/** A fragment: notes from index `from` up to but not including `to`. */
export function fragment(m: Motive, from: number, to: number): Motive {
  return m.slice(from, to);
}

/** Total length in quarter notes. */
export function motiveLength(m: Motive): number {
  return m.reduce((a, n) => a + n.dur, 0);
}

/** Melodic intervals between consecutive pitched notes, in semitones (positive = up). */
export function contour(m: Motive): number[] {
  const ps = m.filter((n) => n.pitch).map((n) => midi(n.pitch!));
  return ps.slice(1).map((x, i) => x - ps[i]);
}

/** Steps between consecutive pitched notes, counted in letter names (positive = up). */
export function stepContour(m: Motive): number[] {
  const ps = m.filter((n) => n.pitch).map((n) => diatonicIndex(n.pitch!));
  return ps.slice(1).map((x, i) => x - ps[i]);
}

// ---------------------------------------------------------------------------
// Development: chains of operations
// ---------------------------------------------------------------------------

export type DevOp =
  | 'original'
  | 'repeat'
  | 'seq-up'
  | 'seq-down'
  | 'seq-up-3'
  | 'seq-down-3'
  | 'transpose-5'
  | 'transpose-4'
  | 'invert'
  | 'invert-chromatic'
  | 'retrograde'
  | 'augment'
  | 'diminish'
  | 'head'
  | 'tail';

export const DEV_OPS: Array<{ id: DevOp; name: string; short: string; description: string }> = [
  { id: 'original', name: 'Original', short: 'Original', description: 'The motive as first stated.' },
  { id: 'repeat', name: 'Repetition', short: 'Repeat', description: 'The previous segment again, unchanged. Repetition fixes an idea in the ear.' },
  { id: 'seq-up', name: 'Sequence up a step', short: 'Seq. up', description: 'Every note one step higher in the key (a tonal sequence): same shape, new pitch level. Interval qualities follow the scale.' },
  { id: 'seq-down', name: 'Sequence down a step', short: 'Seq. down', description: 'Every note one step lower in the key. Descending sequences drive music toward a cadence.' },
  { id: 'seq-up-3', name: 'Sequence up a third', short: 'Up a 3rd', description: 'Every note two steps (a third) higher in the key.' },
  { id: 'seq-down-3', name: 'Sequence down a third', short: 'Down a 3rd', description: 'Every note two steps (a third) lower in the key.' },
  { id: 'transpose-5', name: 'Real transposition up a fifth', short: 'Up a 5th', description: 'Every interval kept exactly, a perfect fifth higher. Notes may leave the key, as in a fugal answer at the dominant.' },
  { id: 'transpose-4', name: 'Real transposition up a fourth', short: 'Up a 4th', description: 'Every interval kept exactly, a perfect fourth higher.' },
  { id: 'invert', name: 'Inversion (in the key)', short: 'Invert', description: 'Turned upside down around its first note: each step up becomes a step down in the key.' },
  { id: 'invert-chromatic', name: 'Inversion (exact)', short: 'Invert exact', description: 'Turned upside down with every interval kept exactly: a major third up becomes a major third down.' },
  { id: 'retrograde', name: 'Retrograde', short: 'Retrograde', description: 'Played backwards, rhythm included.' },
  { id: 'augment', name: 'Augmentation', short: 'Augment', description: 'Every note twice as long: the same idea at half the speed.' },
  { id: 'diminish', name: 'Diminution', short: 'Diminish', description: 'Every note half as long: the same idea at twice the speed.' },
  { id: 'head', name: 'Fragment: the head', short: 'Head', description: 'Only the first half of the previous segment. Repeating ever smaller fragments (liquidation) builds momentum toward a cadence.' },
  { id: 'tail', name: 'Fragment: the tail', short: 'Tail', description: 'Only the second half of the previous segment.' },
];

/** Apply one operation to the previous segment (or, for 'original', to the motive itself). */
export function applyOp(op: DevOp, prev: Motive, original: Motive, key: Key): Motive {
  switch (op) {
    case 'original':
      return original;
    case 'repeat':
      return prev;
    case 'seq-up':
      return sequence(prev, 1, key);
    case 'seq-down':
      return sequence(prev, -1, key);
    case 'seq-up-3':
      return sequence(prev, 2, key);
    case 'seq-down-3':
      return sequence(prev, -2, key);
    case 'transpose-5':
      return transposeReal(prev, 'P5');
    case 'transpose-4':
      return transposeReal(prev, 'P4');
    case 'invert':
      return invertDiatonic(prev, key);
    case 'invert-chromatic':
      return invertChromatic(prev);
    case 'retrograde':
      return retrograde(prev);
    case 'augment':
      return scaleRhythm(prev, 2);
    case 'diminish':
      return scaleRhythm(prev, 0.5);
    case 'head':
      return headOf(prev);
    case 'tail':
      return prev.slice(Math.ceil(prev.length / 2));
  }
}

/** The first half of a segment, rounded to keep at least two notes. */
function headOf(m: Motive): Motive {
  return m.slice(0, Math.max(2, Math.ceil(m.length / 2)));
}

/** Run a chain of operations. Each step works on the result of the step before. */
export function develop(original: Motive, ops: DevOp[], key: Key): Array<{ op: DevOp; motive: Motive }> {
  const out: Array<{ op: DevOp; motive: Motive }> = [];
  let prev = original;
  for (const op of ops) {
    const m = applyOp(op, prev, original, key);
    out.push({ op, motive: m });
    prev = m;
  }
  return out;
}
