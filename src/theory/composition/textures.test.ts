import { describe, expect, it } from 'vitest';
import { pitchName } from '../notes';
import { TEXTURES, TEXTURE_PROGRESSIONS, TEXTURE_TONICS, buildTexture } from './textures';

const names = (ps: { pitches: Parameters<typeof pitchName>[0][] }[]) => ps.map((n) => n.pitches.map((p) => pitchName(p, false)).join('+') || 'r');

describe('textures', () => {
  it('builds every texture for every progression and key with complete bars', () => {
    for (const t of TEXTURES)
      for (const p of TEXTURE_PROGRESSIONS)
        for (const tonic of TEXTURE_TONICS) {
          const { score } = buildTexture(t.id, p.chords, tonic);
          expect(score.measures).toBe(p.chords.length);
          const bar = t.id === 'waltz' ? 3 : 4;
          for (const st of score.staves) for (const v of st.voices) expect(v.notes.reduce((a, n) => a + n.dur, 0)).toBeCloseTo(bar * p.chords.length);
        }
  });

  it('writes the opening of BWV 846 as Bach does, an octave lower', () => {
    const { score } = buildTexture('prelude', ['I'], 'C');
    expect(names(score.staves[0].voices[0].notes.slice(0, 7))).toEqual(['r', 'E4', 'G4', 'C5', 'E4', 'G4', 'C5']);
    expect(names(score.staves[1].voices[1].notes)).toEqual(['C3', 'C3']);
  });

  it('writes an Alberti bass low, high, middle, high', () => {
    const { score } = buildTexture('alberti', ['I'], 'C');
    expect(names(score.staves[1].voices[0].notes.slice(0, 4))).toEqual(['C3', 'G3', 'E3', 'G3']);
  });

  it('puts the bass alone on the downbeat of a waltz and the chord on beats 2 and 3', () => {
    const { score } = buildTexture('waltz', ['I'], 'C');
    const n = score.staves[1].voices[0].notes;
    expect(n.map((x) => x.pitches.length)).toEqual([1, 3, 3]);
    expect(score.time).toEqual([3, 4]);
  });
});
