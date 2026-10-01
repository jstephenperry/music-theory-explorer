import { describe, expect, it } from 'vitest';
import { ACCOMP_STYLES, buildAccompaniment, nearestWithPc, walkingLine, type AccompChord } from './accompaniment';

const chords: AccompChord[] = [
  { voicing: [48, 64, 67, 72], beats: 4, tonePcs: [0, 4, 7] },
  { voicing: [43, 62, 65, 71], beats: 4, tonePcs: [7, 11, 2, 5] },
  { voicing: [48, 64, 67, 72], beats: 2, tonePcs: [0, 4, 7] },
];

describe('buildAccompaniment', () => {
  it('every style stays inside each chord and tags the chord index', () => {
    for (const s of ACCOMP_STYLES) {
      const { events, length } = buildAccompaniment(chords, s.id);
      expect(length).toBe(10);
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        const idx = (e.data as { chord: number }).chord;
        const start = [0, 4, 8][idx];
        const end = start + chords[idx].beats;
        expect(e.time).toBeGreaterThanOrEqual(start);
        expect(e.time + e.duration).toBeLessThanOrEqual(end + 1e-9);
      }
    }
  });
  it('block chords give one event per chord', () => {
    const { events } = buildAccompaniment(chords, 'block');
    expect(events.map((e) => e.midi)).toEqual(chords.map((c) => c.voicing));
  });
  it('alberti plays low, high, middle, high', () => {
    const { events } = buildAccompaniment([chords[0]], 'alberti');
    const upper = events.filter((e) => e.midi!.length === 1 && e.midi![0] !== 48).slice(0, 4).map((e) => e.midi![0]);
    expect(upper).toEqual([64, 72, 67, 72]);
  });
  it('adds clicks on every beat', () => {
    const { events } = buildAccompaniment(chords, 'block', { click: true });
    expect(events.filter((e) => e.click).length).toBe(10);
  });
});

describe('walking bass', () => {
  it('finds the nearest pitch of a pitch class', () => {
    expect(nearestWithPc(0, 50)).toBe(48);
    expect(nearestWithPc(7, 48)).toBe(43);
    expect(nearestWithPc(5, 48)).toBe(53);
  });
  it('approaches the next bass by half step', () => {
    const line = walkingLine(chords[0], 43);
    expect(line).toHaveLength(4);
    expect(line[0]).toBe(48);
    expect(Math.abs((line[3] % 12) - 7)).toBe(1);
  });
});
