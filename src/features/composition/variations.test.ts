import { describe, expect, it } from 'vitest';
import { pitchName } from '../../theory/notes';
import { BASS_CHOICES, MELODY_TECHNIQUES, MODE_CHOICES, THEME_CHOICE, buildVariation } from './variations';

const names = (ns: { pitches: Parameters<typeof pitchName>[0][] }[]) => ns.map((n) => n.pitches.map((p) => pitchName(p, false)).join('+') || 'r');

describe('variations', () => {
  it('builds eight complete bars for every combination', () => {
    for (const m of MELODY_TECHNIQUES)
      for (const mode of MODE_CHOICES)
        for (const b of BASS_CHOICES) {
          const { score } = buildVariation({ melody: m.id, mode: mode.id, bass: b.id });
          expect(score.measures).toBe(8);
          const bar = m.id === 'triple' ? 3 : 2;
          for (const st of score.staves) expect(st.voices[0].notes.reduce((a, n) => a + n.dur, 0)).toBeCloseTo(8 * bar);
        }
  });

  it('writes neighbor figuration as Mozart’s first variation begins', () => {
    const { score } = buildVariation({ ...THEME_CHOICE, melody: 'neighbor' });
    expect(names(score.staves[0].voices[0].notes.slice(0, 8))).toEqual(['D5', 'C5', 'B4', 'C5', 'D5', 'C5', 'B4', 'C5']);
    expect(names(score.staves[0].voices[0].notes.slice(8, 12))).toEqual(['A5', 'G5', 'F#5', 'G5']);
  });

  it('lowers E and A in the minor mode', () => {
    const { score } = buildVariation({ ...THEME_CHOICE, mode: 'minor' });
    expect(names(score.staves[0].voices[0].notes.slice(4, 6))).toEqual(['Ab5', 'Ab5']);
  });

  it('marks the theme’s own notes inside a figuration', () => {
    const { themeIds } = buildVariation({ ...THEME_CHOICE, melody: 'neighbor' });
    expect(themeIds.length).toBeGreaterThanOrEqual(15);
  });

  it('groups triplet arpeggios in threes', () => {
    const { score } = buildVariation({ ...THEME_CHOICE, melody: 'triplets' });
    const n = score.staves[0].voices[0].notes;
    expect(n[0].tuplet).toMatchObject({ actual: 3, normal: 2, group: 0 });
    expect(n[3].tuplet?.group).toBe(1);
    expect(names(n.slice(0, 3))).toEqual(['C5', 'G4', 'E4']);
  });
});
