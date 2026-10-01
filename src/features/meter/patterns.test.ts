import { describe, expect, it } from 'vitest';
import { PATTERNS, beatGroups, cells, interOnsetIntervals, onsets } from './patterns';

const byId = (id: string) => PATTERNS.find((p) => p.id === id)!;

describe('rhythm patterns', () => {
  it('are internally consistent', () => {
    for (const p of PATTERNS) {
      expect(p.groups.reduce((a, b) => a + b, 0)).toBe(p.steps);
      expect(p.voices.length).toBeGreaterThanOrEqual(2);
      for (const voice of p.voices) expect(voice.cells.length).toBe(p.steps);
    }
  });
  it('spell the son and rumba claves correctly', () => {
    expect(onsets(byId('son-32').voices[0].cells)).toEqual([0, 3, 6, 10, 12]);
    expect(onsets(byId('son-23').voices[0].cells)).toEqual([2, 4, 8, 11, 14]);
    expect(onsets(byId('rumba-32').voices[0].cells)).toEqual([0, 3, 7, 10, 12]);
  });
  it('2-3 clave is the 3-2 clave rotated by half a cycle', () => {
    const a = byId('son-32').voices[0].cells;
    const b = byId('son-23').voices[0].cells;
    expect(b).toEqual([...a.slice(8), ...a.slice(0, 8)]);
  });
  it('derives the classic duration patterns', () => {
    expect(interOnsetIntervals(byId('tresillo').voices[0].cells)).toEqual([3, 3, 2]);
    expect(interOnsetIntervals(byId('cinquillo').voices[0].cells)).toEqual([2, 1, 2, 1, 2]);
    expect(interOnsetIntervals(byId('habanera').voices[0].cells)).toEqual([3, 1, 2, 2]);
    expect(interOnsetIntervals(byId('son-32').voices[0].cells)).toEqual([3, 3, 4, 2, 4]);
  });
  it('splits steps into beat groups', () => {
    expect(beatGroups(16, 4)).toEqual([4, 4, 4, 4]);
    expect(beatGroups(7, 2)).toEqual([2, 2, 2, 1]);
    expect(cells('x.x')).toEqual([true, false, true]);
  });
});
