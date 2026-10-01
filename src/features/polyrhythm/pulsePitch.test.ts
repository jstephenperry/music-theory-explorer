import { describe, expect, it } from 'vitest';
import { CLICK_TO_TONE, toneMix } from './pulsePitch';

describe('click to tone crossfade', () => {
  it('is clicks when slow and tone when fast', () => {
    expect(toneMix(2)).toBe(0);
    expect(toneMix(CLICK_TO_TONE.from)).toBe(0);
    expect(toneMix(200)).toBe(1);
    const mid = toneMix(Math.sqrt(CLICK_TO_TONE.from * CLICK_TO_TONE.to));
    expect(mid).toBeCloseTo(0.5);
  });
});
