import { describe, expect, it } from 'vitest';
import { keyName } from '../../theory';
import { finishTake, keyFromParam, keyToParam, notesAt, pushHistory, recNoteOff, recNoteOn, takeEvents, takeLength, type RecNote } from './playLogic';

describe('history', () => {
  it('appends new chords and skips exact repeats', () => {
    let h = pushHistory([], { symbol: 'C', midis: [67, 60, 64] });
    expect(h).toHaveLength(1);
    expect(h[0].midis).toEqual([60, 64, 67]);
    h = pushHistory(h, { symbol: 'C', midis: [60, 64, 67] });
    expect(h).toHaveLength(1);
    h = pushHistory(h, { symbol: 'C', midis: [64, 67, 72] });
    expect(h).toHaveLength(2);
    expect(h[1].id).toBe(2);
  });

  it('keeps only the newest entries', () => {
    let h = pushHistory([], { symbol: 'A', midis: [1] }, 2);
    h = pushHistory(h, { symbol: 'B', midis: [2] }, 2);
    h = pushHistory(h, { symbol: 'C', midis: [3] }, 2);
    expect(h.map((x) => x.symbol)).toEqual(['B', 'C']);
  });
});

describe('recording', () => {
  it('records, closes and trims a take', () => {
    let take: RecNote[] = [];
    take = recNoteOn(take, 60, 1.0);
    take = recNoteOn(take, 64, 1.5);
    take = recNoteOff(take, 60, 2.0);
    const done = finishTake(take, 3.0);
    expect(done).toEqual([
      { midi: 60, start: 0, end: 1, velocity: 0.75 },
      { midi: 64, start: 0.5, end: 2, velocity: 0.75 },
    ]);
    expect(takeLength(done)).toBe(2);
    expect(notesAt(done, 0.75)).toEqual([60, 64]);
    expect(notesAt(done, 1.5)).toEqual([64]);
    expect(takeEvents(done)[1]).toMatchObject({ time: 0.5, duration: 1.5, midi: [64] });
  });

  it('closes only the latest open instance of a repeated note', () => {
    let take: RecNote[] = [];
    take = recNoteOn(take, 60, 0);
    take = recNoteOff(take, 60, 1);
    take = recNoteOn(take, 60, 2);
    take = recNoteOff(take, 60, 3);
    expect(take.map((n) => n.end)).toEqual([1, 3]);
    expect(finishTake([], 1)).toEqual([]);
  });
});

describe('key parameter', () => {
  it('round-trips keys', () => {
    expect(keyName(keyFromParam('Eb')!)).toBe('E♭ major');
    expect(keyName(keyFromParam('F#m')!)).toBe('F♯ minor');
    expect(keyFromParam('')).toBeNull();
    expect(keyFromParam('H')).toBeNull();
    expect(keyToParam(keyFromParam('Bbm'))).toBe('Bbm');
    expect(keyToParam(null)).toBe('');
  });
});
