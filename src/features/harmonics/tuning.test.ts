import { describe, expect, it } from 'vitest';
import { noteName, pitch, note } from '../../theory/notes';
import {
  beatRate,
  cents,
  chainOfFifths,
  circleOfPureFifths,
  degreeCents,
  deviations,
  harmonicSeries,
  intervalSize,
  MEANTONE_FIFTH,
  nearestTempered,
  periodicWaveCoefficients,
  presetSpectrum,
  PURE_FIFTH,
  PURE_MAJOR_THIRD,
  PYTHAGOREAN_COMMA,
  PYTHAGOREAN_MAJOR_THIRD,
  sampleWaveform,
  SYNTONIC_COMMA,
  triadQualities,
  tunedFrequency,
  wolfFifth,
  wolfNotes,
} from './tuning';

describe('known tuning constants', () => {
  it('matches textbook values', () => {
    expect(PYTHAGOREAN_MAJOR_THIRD).toBeCloseTo(407.82, 2);
    expect(PURE_MAJOR_THIRD).toBeCloseTo(386.31, 2);
    expect(MEANTONE_FIFTH).toBeCloseTo(696.58, 2);
    expect(SYNTONIC_COMMA).toBeCloseTo(21.51, 2);
    expect(PYTHAGOREAN_COMMA).toBeCloseTo(23.46, 2);
    expect(PURE_FIFTH).toBeCloseTo(701.96, 2);
    expect(cents(2)).toBe(1200);
  });

  it('meantone fifth equals the fourth root of 5', () => {
    expect(MEANTONE_FIFTH).toBeCloseTo(cents(Math.pow(5, 0.25)), 9);
  });
});

describe('harmonic series', () => {
  const series = harmonicSeries(pitch('C2'), 440);
  it('spells and measures partials', () => {
    expect(series).toHaveLength(16);
    expect(series[0].freq).toBeCloseTo(65.406, 2);
    expect(series.map((p) => noteName(p.pitch) + p.pitch.octave)).toEqual([
      'C2', 'C3', 'G3', 'C4', 'E4', 'G4', 'B♭4', 'C5', 'D5', 'E5', 'F♯5', 'G5', 'A♭5', 'B♭5', 'B5', 'C6',
    ]);
  });
  it('gives the classic deviations', () => {
    expect(series[6].deviation).toBeCloseTo(-31.17, 1); // 7th partial
    expect(series[4].deviation).toBeCloseTo(-13.69, 1); // 5th partial
    expect(series[2].deviation).toBeCloseTo(1.96, 1); // 3rd partial
    expect(series[10].deviation).toBeCloseTo(-48.68, 1); // 11th partial
    expect(series[12].deviation).toBeCloseTo(40.53, 1); // 13th partial
  });
  it('finds the nearest tempered note', () => {
    const r = nearestTempered(440 * 7 / 4, 440);
    expect(r.midi).toBe(79);
    expect(r.cents).toBeCloseTo(-31.17, 1);
  });
});

describe('tuning systems', () => {
  it('12-TET has no deviations', () => {
    expect(deviations('et12').every((d) => Math.abs(d) < 1e-9)).toBe(true);
  });
  it('Pythagorean thirds and fifths', () => {
    const p = degreeCents('pythagorean');
    expect(p[7]).toBeCloseTo(701.96, 2);
    expect(p[4]).toBeCloseTo(407.82, 2);
    // G# (k = +8) and Eb (k = -3) are the chain ends.
    expect(p[8]).toBeCloseTo(cents(Math.pow(1.5, 8) / 16), 6);
    expect(p[3]).toBeCloseTo(cents(Math.pow(2 / 3, 3) * 4), 6);
  });
  it('quarter-comma meantone has pure major thirds', () => {
    const m = degreeCents('meantone');
    expect(m[4]).toBeCloseTo(386.31, 2);
    expect(m[7]).toBeCloseTo(696.58, 2);
    // Wolf from G# up to Eb.
    expect(intervalSize('meantone', 0, 8, 7)).toBeCloseTo(wolfFifth(MEANTONE_FIFTH), 6);
    expect(wolfFifth(MEANTONE_FIFTH)).toBeCloseTo(737.64, 2);
    expect(wolfFifth(PURE_FIFTH)).toBeCloseTo(678.49, 2);
  });
  it('wolf notes are spelled from the tonic', () => {
    const w = wolfNotes(note('C'));
    expect(noteName(w.from)).toBe('G♯');
    expect(noteName(w.to)).toBe('E♭');
    const d = wolfNotes(note('D'));
    expect(noteName(d.from)).toBe('A♯');
    expect(noteName(d.to)).toBe('F');
  });
  it('just intonation has pure I, IV and V but a narrow ii fifth', () => {
    const q = triadQualities('just', 0);
    for (const d of [0, 5, 7]) {
      expect(q[d].thirdError).toBeCloseTo(0, 9);
      expect(q[d].fifthError).toBeCloseTo(0, 9);
    }
    expect(intervalSize('just', 0, 2, 7)).toBeCloseTo(cents(40 / 27), 6);
    expect(intervalSize('just', 0, 2, 7) - PURE_FIFTH).toBeCloseTo(-SYNTONIC_COMMA, 6);
  });
  it('Werckmeister III: tempered fifths on C, G, D, B and rotation by tonic', () => {
    const q = triadQualities('werckmeister3', 0);
    const comma4 = PYTHAGOREAN_COMMA / 4;
    expect(q[0].fifthError).toBeCloseTo(-comma4, 2);
    expect(q[7].fifthError).toBeCloseTo(-comma4, 2);
    expect(q[2].fifthError).toBeCloseTo(-comma4, 2);
    expect(q[11].fifthError).toBeCloseTo(-comma4, 2);
    expect(q[9].fifthError).toBeCloseTo(0, 2);
    // Building on G: the absolute pitch classes stay the same keyboard temperament.
    const onG = degreeCents('werckmeister3', 7);
    expect(onG[0]).toBe(0);
    expect(onG[2]).toBeCloseTo(888.27 - 696.09, 2);
    expect(onG[5]).toBeCloseTo(1200 + 0 - 696.09, 2);
    expect(tunedFrequency('werckmeister3', 7, 69, 440) / tunedFrequency('werckmeister3', 7, 67, 440)).toBeCloseTo(Math.pow(2, (888.27 - 696.09) / 1200), 6);
  });
  it('31-TET is very close to quarter-comma meantone', () => {
    const a = degreeCents('et31');
    const b = degreeCents('meantone');
    a.forEach((c, i) => expect(Math.abs(c - b[i])).toBeLessThan(6));
    expect(degreeCents('et19')[7]).toBeCloseTo(694.74, 2);
  });
  it('chain of fifths covers each degree once', () => {
    const c = chainOfFifths(700);
    expect(c.map((x) => Math.round(x))).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]);
  });
  it('tunes frequencies around a 12-TET tonic', () => {
    expect(tunedFrequency('just', 0, 60, 440)).toBeCloseTo(261.626, 2);
    expect(tunedFrequency('just', 0, 64, 440)).toBeCloseTo(261.626 * 1.25, 2);
    expect(tunedFrequency('just', 0, 55, 440)).toBeCloseTo(261.626 * 0.75, 2);
    expect(tunedFrequency('et12', 0, 69, 432)).toBeCloseTo(432, 6);
  });
  it('circle of pure fifths overshoots by a Pythagorean comma', () => {
    const f = circleOfPureFifths(100);
    expect(f).toHaveLength(13);
    expect(cents(f[12] / 200)).toBeCloseTo(PYTHAGOREAN_COMMA, 6);
  });
});

describe('beats', () => {
  it('equal-tempered major third on A3 beats about 8.7 times per second', () => {
    const lower = 220;
    const upper = 220 * Math.pow(2, 4 / 12);
    expect(beatRate(lower, upper, 5, 4)).toBeCloseTo(8.73, 1);
    expect(beatRate(lower, lower * 1.25, 5, 4)).toBeCloseTo(0, 9);
  });
});

describe('additive synthesis', () => {
  it('builds presets', () => {
    const saw = presetSpectrum('saw');
    expect(saw.amps[3]).toBeCloseTo(0.25);
    const sq = presetSpectrum('square');
    expect(sq.amps[1]).toBe(0);
    expect(sq.amps[2]).toBeCloseTo(1 / 3);
  });
  it('samples a normalized waveform', () => {
    const w = sampleWaveform(presetSpectrum('sine'), 4);
    expect(w[0]).toBeCloseTo(0);
    expect(w[1]).toBeCloseTo(1);
    expect(w[3]).toBeCloseTo(-1);
    const tri = sampleWaveform(presetSpectrum('triangle'), 400);
    // A triangle is nearly linear between its peaks: at a quarter of the way to the peak it is near 0.25.
    expect(tri[25]).toBeCloseTo(0.25, 1);
  });
  it('produces PeriodicWave coefficients', () => {
    const { real, imag } = periodicWaveCoefficients(presetSpectrum('triangle', 4));
    expect(real[0]).toBe(0);
    expect(imag[1]).toBeCloseTo(1);
    expect(imag[3]).toBeCloseTo(-1 / 9);
    expect(real[3]).toBeCloseTo(0);
  });
});

describe('spelling', () => {
  it('spells chain and just systems', async () => {
    const { degreeNotes } = await import('./tuning');
    expect(degreeNotes('meantone', note('C')).map((n) => noteName(n)).join(' ')).toBe('C C♯ D E♭ E F F♯ G G♯ A B♭ B');
    expect(degreeNotes('just', note('C')).map((n) => noteName(n)).join(' ')).toBe('C D♭ D E♭ E F F♯ G A♭ A B♭ B');
    expect(degreeNotes('pythagorean', note('Eb')).map((n) => noteName(n)).join(' ')).toBe('E♭ E F G♭ G A♭ A B♭ B C D♭ D');
  });
});

describe('formatting', () => {
  it('names compound intervals and signs cents', async () => {
    const { compoundName, formatCents } = await import('./format');
    const s = harmonicSeries(pitch('C2'), 440);
    expect(compoundName(s[6].interval)).toBe('minor seventh plus two octaves');
    expect(compoundName(s[1].interval)).toBe('octave');
    expect(compoundName(s[3].interval)).toBe('two octaves');
    expect(compoundName(s[2].interval)).toBe('perfect fifth plus an octave');
    expect(formatCents(-31.17)).toBe('−31');
    expect(formatCents(0.2)).toBe('0');
    expect(formatCents(3.94, 1)).toBe('+3.9');
  });
});
