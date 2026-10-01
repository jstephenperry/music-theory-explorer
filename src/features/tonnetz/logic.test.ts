import { describe, expect, it } from 'vitest';
import { noteName } from '../../theory/notes';
import {
  ALL_TRIADS,
  applyBasic,
  applyOp,
  findTri,
  initialVoices,
  isDiatonic,
  keyScalePcs,
  leadVoices,
  nodeLabel,
  pcAt,
  planPreset,
  PRESETS,
  sameTri,
  sharedVertices,
  transformTriad,
  triadNotes,
  triadOf,
  triadPcs,
  triadSymbol,
  vertices,
  type BasicOp,
  type Op,
  type Tri,
  type Triad,
} from './logic';

const C: Triad = { root: 0, quality: 'major' };
const sym = (t: Triad) => triadSymbol(t);
const origin: Tri = { i: 0, j: 0, up: true };

describe('lattice geometry', () => {
  it('places fifths horizontally and thirds on the diagonals', () => {
    expect(pcAt(0, 0)).toBe(0);
    expect(pcAt(1, 0)).toBe(7); // perfect fifth to the right
    expect(pcAt(0, 1)).toBe(4); // major third up-right
    expect(pcAt(-1, 1)).toBe(9); // minor third below C: A is up-left of C... C to A is a minor third down
    expect((pcAt(-1, 1) - pcAt(0, 0) + 12) % 12).toBe(9);
    expect((pcAt(1, 0) - pcAt(0, 1) + 12) % 12).toBe(3); // E to G: minor third along the other diagonal
    expect(nodeLabel(5, 0)).toBe('B');
    expect(nodeLabel(-1, 0)).toBe('F');
    expect(nodeLabel(-2, 0)).toBe('B♭');
  });
  it('up triangles are major triads and down triangles minor triads', () => {
    expect(sym(triadOf(origin))).toBe('C');
    expect(sym(triadOf({ i: 0, j: 0, up: false }))).toBe('Em');
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++)
        for (const up of [true, false]) {
          const t = { i, j, up };
          const pcs = vertices(t).map(([a, b]) => pcAt(a, b)).sort((x, y) => x - y);
          expect(pcs).toEqual([...triadPcs(triadOf(t))].sort((x, y) => x - y));
        }
  });
});

describe('neo-Riemannian transformations', () => {
  it('P, L and R of C major', () => {
    expect(sym(transformTriad(C, 'P'))).toBe('Cm');
    expect(sym(transformTriad(C, 'L'))).toBe('Em');
    expect(sym(transformTriad(C, 'R'))).toBe('Am');
  });
  it('P, L and R of A minor', () => {
    const am: Triad = { root: 9, quality: 'minor' };
    expect(sym(transformTriad(am, 'P'))).toBe('A');
    expect(sym(transformTriad(am, 'L'))).toBe('F');
    expect(sym(transformTriad(am, 'R'))).toBe('C');
  });
  it('compound transformations', () => {
    expect(sym(transformTriad(C, 'N'))).toBe('Fm');
    expect(sym(transformTriad(C, 'S'))).toBe('C♯m');
    expect(sym(transformTriad(C, 'H'))).toBe('G♯m');
  });
  it('every transformation is an involution on all 24 triads', () => {
    for (const t of ALL_TRIADS) {
      for (const op of ['P', 'L', 'R', 'N', 'S', 'H'] as Op[]) {
        const back = transformTriad(transformTriad(t, op), op);
        expect(back).toEqual(t);
      }
    }
  });
  it('P, L, R keep exactly two common tones and change the mode', () => {
    for (const t of ALL_TRIADS) {
      for (const op of ['P', 'L', 'R'] as BasicOp[]) {
        const u = transformTriad(t, op);
        expect(u.quality).not.toBe(t.quality);
        expect(triadPcs(u).filter((p) => triadPcs(t).includes(p))).toHaveLength(2);
      }
    }
  });
  it('lattice moves match abstract transformations and are involutions', () => {
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++)
        for (const up of [true, false]) {
          const t = { i, j, up };
          for (const op of ['P', 'L', 'R'] as BasicOp[]) {
            const n = applyBasic(t, op);
            expect(triadOf(n)).toEqual(transformTriad(triadOf(t), op));
            expect(sharedVertices(t, n)).toBe(2);
            expect(sameTri(applyBasic(n, op), t)).toBe(true);
          }
          for (const op of ['N', 'S', 'H'] as Op[]) {
            const path = applyOp(t, op);
            expect(path).toHaveLength(3);
            expect(triadOf(path[2])).toEqual(transformTriad(triadOf(t), op));
          }
        }
  });
  it('finds the nearest triangle for a triad', () => {
    const t = findTri({ root: 9, quality: 'minor' }, origin);
    expect(sym(triadOf(t))).toBe('Am');
    expect(sharedVertices(t, origin)).toBe(2);
  });
});

describe('spelling', () => {
  it('spells triads from conventional roots', () => {
    const names = (t: Triad) => triadNotes(t).map((n) => noteName(n, false)).join(' ');
    expect(names({ root: 3, quality: 'major' })).toBe('Eb G Bb');
    expect(names({ root: 6, quality: 'major' })).toBe('F# A# C#');
    expect(names({ root: 1, quality: 'major' })).toBe('Db F Ab');
    expect(names({ root: 8, quality: 'minor' })).toBe('G# B D#');
    expect(names({ root: 1, quality: 'minor' })).toBe('C# E G#');
    expect(names({ root: 3, quality: 'minor' })).toBe('Eb Gb Bb');
    expect(names({ root: 10, quality: 'minor' })).toBe('Bb Db F');
  });
});

describe('voice leading', () => {
  it('holds common tones and moves one voice for P, L, R', () => {
    const start = initialVoices(C);
    expect(start).toEqual([60, 64, 67]);
    const p = leadVoices(start, transformTriad(C, 'P'));
    expect(p.moves).toEqual([0, -1, 0]);
    const l = leadVoices(start, transformTriad(C, 'L'));
    expect(l.moves).toEqual([-1, 0, 0]);
    const r = leadVoices(start, transformTriad(C, 'R'));
    expect(r.moves).toEqual([0, 0, 2]);
  });
  it('the hexatonic pole moves all three voices by a semitone', () => {
    const h = leadVoices([60, 64, 67], transformTriad(C, 'H'));
    expect(h.moves.map(Math.abs)).toEqual([1, 1, 1]);
  });
  it('stays in register over long chains', () => {
    let v = initialVoices(C);
    let t = C;
    for (let k = 0; k < 48; k++) {
      t = transformTriad(t, k % 2 ? 'R' : 'L');
      v = leadVoices(v, t).midis;
      v.forEach((m) => {
        expect(m).toBeGreaterThanOrEqual(50);
        expect(m).toBeLessThanOrEqual(80);
      });
      expect(v.map((m) => m % 12).sort((a, b) => a - b)).toEqual([...triadPcs(t)].sort((a, b) => a - b));
    }
  });
});

describe('presets and keys', () => {
  it('cycles return to the start', () => {
    const start = initialVoices(C);
    for (const id of ['hexatonic', 'octatonic']) {
      const plan = planPreset(PRESETS.find((p) => p.id === id)!, origin, start);
      expect(sym(plan[plan.length - 1].triad)).toBe('C');
      // On the unrolled (infinite) lattice the cycles travel; the Tonnetz itself is a torus.
      if (id === 'hexatonic') expect(plan.every((st) => st.tri.i === 0)).toBe(true);
    }
    const hex = planPreset(PRESETS[0], origin, start).map((s) => sym(s.triad));
    expect(hex).toEqual(['Cm', 'A♭', 'G♯m', 'E', 'Em', 'C']);
    const lr = planPreset(PRESETS.find((p) => p.id === 'lr')!, origin, start).map((s) => sym(s.triad));
    expect(lr.slice(0, 4)).toEqual(['Em', 'G', 'Bm', 'D']);
    const film = planPreset(PRESETS.find((p) => p.id === 'film')!, origin, start).map((s) => sym(s.triad));
    expect(film).toEqual(['A♭', 'E', 'C', 'E♭', 'F♯', 'A', 'C']);
  });
  it('the diatonic triads of C major form a connected strip of six', () => {
    const scale = keyScalePcs(0, 'major');
    const diatonic = ALL_TRIADS.filter((t) => isDiatonic(t, scale)).map(sym).sort();
    expect(diatonic).toEqual(['Am', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(ALL_TRIADS.filter((t) => isDiatonic(t, keyScalePcs(9, 'minor'))).map(sym).sort()).toEqual(diatonic);
  });
});
