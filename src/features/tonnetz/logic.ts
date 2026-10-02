/**
 * Tonnetz geometry and neo-Riemannian transformations (pure, no React).
 *
 * Lattice: node (i, j) holds pitch class 7i + 4j (mod 12). Moving right adds a perfect fifth,
 * moving up-right adds a major third, moving up-left (i - 1, j + 1) adds a minor third.
 * Up-pointing triangles (i, j), (i+1, j), (i, j+1) are major triads rooted at (i, j);
 * down-pointing triangles (i+1, j), (i, j+1), (i+1, j+1) are minor triads rooted at (i, j+1).
 */
import { interval, transpose } from '../../theory/intervals';
import { buildScale } from '../../theory/scales';
import { mod, noteFromFifths, noteFromPc, noteName, pc, type Note } from '../../theory/notes';

export type Quality = 'major' | 'minor';
export interface Triad {
  root: number;
  quality: Quality;
}

/** A triangle of the lattice. */
export interface Tri {
  i: number;
  j: number;
  up: boolean;
}

export type BasicOp = 'P' | 'L' | 'R';
export type Op = BasicOp | 'N' | 'S' | 'H';

export const COMPOUND: Record<Exclude<Op, BasicOp>, BasicOp[]> = {
  N: ['R', 'L', 'P'],
  S: ['L', 'P', 'R'],
  H: ['L', 'P', 'L'],
};

export const OP_INFO: Record<Op, { name: string; desc: string }> = {
  P: { name: 'Parallel', desc: 'Keeps root and fifth; the third moves a semitone (C ↔ Cm).' },
  L: { name: 'Leading-tone exchange', desc: 'Keeps the major third; the remaining note moves a semitone (C ↔ Em).' },
  R: { name: 'Relative', desc: 'Keeps the minor third; the remaining note moves a whole step (C ↔ Am).' },
  N: { name: 'Nebenverwandt (RLP)', desc: 'Major to the minor a fourth above: C ↔ Fm. Two voices move by semitone.' },
  S: { name: 'Slide (LPR)', desc: 'Keeps the third, root and fifth slide a semitone: C ↔ C♯m.' },
  H: { name: 'Hexatonic pole (LPL)', desc: 'The most distant triad in the hexatonic cycle: C ↔ G♯m (A♭m). Every voice moves by semitone.' },
};

export function opSteps(op: Op): BasicOp[] {
  return op === 'P' || op === 'L' || op === 'R' ? [op] : COMPOUND[op];
}

// ---------------------------------------------------------------------------
// Lattice
// ---------------------------------------------------------------------------

export function pcAt(i: number, j: number): number {
  return mod(7 * i + 4 * j, 12);
}

/** Usual spelling for a node label (D♭ E♭ F♯ A♭ B♭). */
export function nodeLabel(i: number, j: number): string {
  return noteName(noteFromPc(pcAt(i, j)));
}

export const SQRT3_2 = Math.sqrt(3) / 2;

/** Position of a node in lattice units (x to the right, y downward on screen). */
export function nodePos(i: number, j: number): [number, number] {
  return [i + j / 2, -j * SQRT3_2];
}

export function vertices(t: Tri): Array<[number, number]> {
  return t.up
    ? [
        [t.i, t.j],
        [t.i + 1, t.j],
        [t.i, t.j + 1],
      ]
    : [
        [t.i + 1, t.j],
        [t.i, t.j + 1],
        [t.i + 1, t.j + 1],
      ];
}

export function centroid(t: Tri): [number, number] {
  const ps = vertices(t).map(([i, j]) => nodePos(i, j));
  return [(ps[0][0] + ps[1][0] + ps[2][0]) / 3, (ps[0][1] + ps[1][1] + ps[2][1]) / 3];
}

export function triadOf(t: Tri): Triad {
  return t.up ? { root: pcAt(t.i, t.j), quality: 'major' } : { root: pcAt(t.i, t.j + 1), quality: 'minor' };
}

export function sameTri(a: Tri, b: Tri): boolean {
  return a.i === b.i && a.j === b.j && a.up === b.up;
}

export function triKey(t: Tri): string {
  return `${t.i},${t.j},${t.up ? 'u' : 'd'}`;
}

/** The neighboring triangle across the shared edge. */
export function applyBasic(t: Tri, op: BasicOp): Tri {
  if (t.up) {
    if (op === 'P') return { i: t.i, j: t.j - 1, up: false };
    if (op === 'L') return { i: t.i, j: t.j, up: false };
    return { i: t.i - 1, j: t.j, up: false };
  }
  if (op === 'P') return { i: t.i, j: t.j + 1, up: true };
  if (op === 'L') return { i: t.i, j: t.j, up: true };
  return { i: t.i + 1, j: t.j, up: true };
}

/** Triangles visited when applying a (possibly compound) transformation, excluding the start. */
export function applyOp(t: Tri, op: Op): Tri[] {
  const out: Tri[] = [];
  let cur = t;
  for (const b of opSteps(op)) {
    cur = applyBasic(cur, b);
    out.push(cur);
  }
  return out;
}

/** Triangles of a lattice triangle's vertices shared with another triangle. */
export function sharedVertices(a: Tri, b: Tri): number {
  const va = vertices(a).map((v) => v.join(','));
  return vertices(b).filter((v) => va.includes(v.join(','))).length;
}

/** The triangle nearest to `near` that carries the given triad. */
export function findTri(triad: Triad, near: Tri = { i: 0, j: 0, up: true }): Tri {
  let best: Tri | null = null;
  let bestD = Infinity;
  const [cx, cy] = centroid(near);
  for (let i = near.i - 8; i <= near.i + 8; i++) {
    for (let j = near.j - 6; j <= near.j + 6; j++) {
      for (const up of [true, false]) {
        const t = { i, j, up };
        const td = triadOf(t);
        if (td.root !== triad.root || td.quality !== triad.quality) continue;
        const [x, y] = centroid(t);
        const d = Math.hypot(x - cx, y - cy);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    }
  }
  return best!;
}

// ---------------------------------------------------------------------------
// Abstract triads
// ---------------------------------------------------------------------------

export function triadPcs(t: Triad): number[] {
  return [t.root, mod(t.root + (t.quality === 'major' ? 4 : 3), 12), mod(t.root + 7, 12)];
}

export function transformTriad(t: Triad, op: Op): Triad {
  let cur = t;
  for (const b of opSteps(op)) {
    const r = cur.root;
    if (cur.quality === 'major') {
      cur = b === 'P' ? { root: r, quality: 'minor' } : b === 'L' ? { root: mod(r + 4, 12), quality: 'minor' } : { root: mod(r + 9, 12), quality: 'minor' };
    } else {
      cur = b === 'P' ? { root: r, quality: 'major' } : b === 'L' ? { root: mod(r + 8, 12), quality: 'major' } : { root: mod(r + 3, 12), quality: 'major' };
    }
  }
  return cur;
}

export const ALL_TRIADS: Triad[] = [
  ...Array.from({ length: 12 }, (_, r) => ({ root: r, quality: 'major' as Quality })),
  ...Array.from({ length: 12 }, (_, r) => ({ root: r, quality: 'minor' as Quality })),
];

/** Root spelling: majors from D♭ to F♯, minors from E♭ to G♯ (the common key-signature spellings). */
export function triadRootNote(t: Triad): Note {
  const lo = t.quality === 'major' ? -5 : -3;
  // Position on the line of fifths within [lo, lo + 11].
  const f = mod(t.root * 7 - lo, 12) + lo;
  return noteFromFifths(f);
}

/** Correctly spelled triad: root, third, fifth. */
export function triadNotes(t: Triad): Note[] {
  const root = triadRootNote(t);
  return [root, transpose(root, interval(t.quality === 'major' ? 'M3' : 'm3')), transpose(root, interval('P5'))];
}

export function triadSymbol(t: Triad): string {
  return noteName(triadRootNote(t)) + (t.quality === 'minor' ? 'm' : '');
}

export function triadName(t: Triad): string {
  return `${noteName(triadRootNote(t))} ${t.quality}`;
}

// ---------------------------------------------------------------------------
// Voice leading
// ---------------------------------------------------------------------------

const PERMS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/** Close root-position voicing around middle C. */
export function initialVoices(t: Triad): number[] {
  const r = 55 + mod(t.root - 55, 12);
  const root = r > 64 ? r - 12 : r;
  return [root, root + (t.quality === 'major' ? 4 : 3), root + 7];
}

export interface VoiceMove {
  midis: number[];
  /** Semitones moved by each voice (same order as the previous voicing). */
  moves: number[];
}

/**
 * Move three voices to a new triad with the least total motion; common tones are held.
 * Voices keep their identity (index), so moves[i] says how far voice i traveled.
 */
export function leadVoices(prev: number[], t: Triad, range: [number, number] = [50, 80]): VoiceMove {
  const pcs = triadPcs(t);
  let best: number[] | null = null;
  let bestCost = Infinity;
  for (const perm of PERMS) {
    const deltas = prev.map((m, v) => mod(pcs[perm[v]] - m + 6, 12) - 6);
    const cost = deltas.reduce((a, d) => a + Math.abs(d), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = deltas;
    }
  }
  const midis = prev.map((m, v) => {
    let n = m + best![v];
    if (n < range[0]) n += 12;
    if (n > range[1]) n -= 12;
    return n;
  });
  return { midis, moves: midis.map((m, v) => m - prev[v]) };
}

// ---------------------------------------------------------------------------
// Keys (diatonic overlay)
// ---------------------------------------------------------------------------

export function keyScalePcs(tonicPc: number, mode: 'major' | 'minor'): number[] {
  return buildScale(noteFromPc(tonicPc), mode === 'major' ? 'ionian' : 'aeolian').map(pc);
}

export function isDiatonic(t: Triad, scalePcs: number[]): boolean {
  return triadPcs(t).every((p) => scalePcs.includes(p));
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface Preset {
  id: string;
  name: string;
  desc: string;
  steps: Op[][];
}

const repeat = <T>(xs: T[], n: number): T[] => Array.from({ length: n }, () => xs).flat();

export const PRESETS: Preset[] = [
  {
    id: 'hexatonic',
    name: 'Hexatonic cycle',
    desc: 'P and L alternate: six triads around one augmented triad, every move a semitone.',
    steps: repeat<Op[]>([['P'], ['L']], 3),
  },
  {
    id: 'octatonic',
    name: 'Octatonic cycle',
    desc: 'P and R alternate: eight triads whose roots climb in minor thirds.',
    steps: repeat<Op[]>([['P'], ['R']], 4),
  },
  {
    id: 'lr',
    name: 'LR chain',
    desc: 'L and R alternate: a diatonic chain of thirds (C Em G Bm D ...) drifting along the circle of fifths.',
    steps: repeat<Op[]>([['L'], ['R']], 6),
  },
  {
    id: 'film',
    name: 'Film-score mediants',
    desc: 'Major triads a third apart, common in film scores: down by major thirds (PL), then up by minor thirds (PR).',
    steps: [['P', 'L'], ['P', 'L'], ['P', 'L'], ['P', 'R'], ['P', 'R'], ['P', 'R'], ['P', 'R']],
  },
];

export interface PlannedStep {
  /** Triangles passed through (the last one is the arrival). */
  path: Tri[];
  tri: Tri;
  triad: Triad;
  voices: VoiceMove;
  label: string;
}

/** Plan a preset from a start triangle and voicing. */
export function planPreset(p: Preset, start: Tri, startVoices: number[]): PlannedStep[] {
  const out: PlannedStep[] = [];
  let tri = start;
  let voices = startVoices;
  for (const ops of p.steps) {
    const path: Tri[] = [];
    for (const op of ops) path.push(...applyOp(path.length ? path[path.length - 1] : tri, op));
    tri = path[path.length - 1];
    const triad = triadOf(tri);
    const vm = leadVoices(voices, triad);
    voices = vm.midis;
    out.push({ path, tri, triad, voices: vm, label: ops.join('') });
  }
  return out;
}
