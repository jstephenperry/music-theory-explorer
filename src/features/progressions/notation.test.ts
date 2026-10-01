import { describe, expect, it } from 'vitest';
import { durationFor, packMeasures } from './notation';

describe('notation helpers', () => {
  it('maps beats to note values', () => {
    expect([1, 2, 3, 4, 6, 8, 0.5, 1.5].map(durationFor)).toEqual(['q', 'h', 'hd', 'w', 'wd', 'w', '8', 'qd']);
  });
  it('packs chords into measures', () => {
    expect(packMeasures([2, 2, 4, 1, 1, 2], 4)).toEqual([[0, 1], [2], [3, 4, 5]]);
    expect(packMeasures([3, 2, 8, 1], 4)).toEqual([[0], [1], [2], [3]]);
    expect(packMeasures([3, 3], 3)).toEqual([[0], [1]]);
    expect(packMeasures([], 4)).toEqual([]);
  });
});
