import { describe, expect, it } from 'vitest';
import { defaultAccents, makeBar } from './meter';
import { allocateMetronome, allocateSteps, applyMetronome, applySteps, SUB_SLOTS } from './metronome';
import { PATTERNS } from './patterns';

describe('metronome events', () => {
  const bars = [makeBar(3, 4), makeBar(6, 8)];
  const unit = 1 / 4;
  it('allocates one event per pulse plus subdivision slots', () => {
    const { events, length } = allocateMetronome(bars, unit);
    expect(events.length).toBe((3 + 6) * (SUB_SLOTS + 1));
    expect(length).toBeCloseTo(3 + 3);
  });
  it('applies accents, swing and silence to unused slots', () => {
    const { events } = allocateMetronome(bars, unit);
    applyMetronome(events, bars, bars.map(defaultAccents), unit, { subdiv: 2, swing: 1, sound: 'click' });
    expect(events[0].click).toBe('strong');
    expect(events[1].click).toBe('sub');
    expect(events[1].time).toBeCloseTo(2 / 3);
    expect(events[2].click).toBeUndefined();
    expect(events[4].click).toBe('weak');
    // Times stay sorted.
    for (let i = 1; i < events.length; i++) expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time);
    // The 6/8 bar: pulse 3 of that bar is a secondary accent; eighths last half a quarter.
    const sixEight = 3 * (SUB_SLOTS + 1);
    expect(events[sixEight].time).toBeCloseTo(3);
    expect(events[sixEight + 3 * (SUB_SLOTS + 1)].click).toBe('medium');
    expect(events[sixEight + 3 * (SUB_SLOTS + 1)].time).toBeCloseTo(4.5);
    applyMetronome(events, bars, bars.map(defaultAccents), unit, { subdiv: 1, swing: 0, sound: 'wood' });
    expect(events[0].perc?.pitch).toBeGreaterThan(events[4].perc!.pitch);
    expect(events[1].perc).toBeUndefined();
  });
});

describe('step events', () => {
  it('maps cells to percussion hits and respects mutes', () => {
    const p = PATTERNS[0];
    const { events, length } = allocateSteps(p.steps, p.stepsPerBeat, p.voices.length);
    expect(length).toBe(4);
    applySteps(events, p.voices, [false, true, false]);
    const hits = events.filter((e) => e.perc).map((e) => e.data as { step: number; voice: number });
    expect(hits.filter((h) => h.voice === 0).map((h) => h.step)).toEqual([0, 3, 6, 10, 12]);
    expect(hits.some((h) => h.voice === 1)).toBe(false);
  });
});
