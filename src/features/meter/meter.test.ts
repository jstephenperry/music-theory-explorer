import { describe, expect, it } from 'vitest';
import {
  analyzeBar,
  buildTimeline,
  defaultAccents,
  defaultGroups,
  indexAt,
  isValidBar,
  makeBar,
  METER_PRESETS,
  noteValue,
  parseBars,
  serializeBars,
  subdivisionOffsets,
  tapTempo,
  tempoMarking,
  tempoUnit,
  timeSigSpec,
  toggleBoundary,
  twosAndThrees,
} from './meter';

describe('default grouping', () => {
  it('groups simple meters one pulse per beat', () => {
    expect(defaultGroups(4, 4)).toEqual([1, 1, 1, 1]);
    expect(defaultGroups(3, 4)).toEqual([1, 1, 1]);
    expect(defaultGroups(2, 2)).toEqual([1, 1]);
    expect(defaultGroups(3, 8)).toEqual([1, 1, 1]);
  });
  it('groups compound meters in threes', () => {
    expect(defaultGroups(6, 8)).toEqual([3, 3]);
    expect(defaultGroups(9, 8)).toEqual([3, 3, 3]);
    expect(defaultGroups(12, 8)).toEqual([3, 3, 3, 3]);
    expect(defaultGroups(6, 4)).toEqual([3, 3]);
  });
  it('groups fast irregular meters in twos and threes', () => {
    expect(defaultGroups(5, 8)).toEqual([2, 3]);
    expect(defaultGroups(7, 8)).toEqual([2, 2, 3]);
    expect(defaultGroups(11, 8)).toEqual([2, 2, 2, 2, 3]);
    expect(defaultGroups(5, 4)).toEqual([1, 1, 1, 1, 1]);
    expect(twosAndThrees(8)).toEqual([2, 2, 2, 2]);
  });
});

describe('classification', () => {
  it('classifies simple meters', () => {
    const a = analyzeBar(makeBar(3, 4));
    expect(a.kind).toBe('simple');
    expect(a.label).toBe('Simple triple');
    expect(a.beatUnitText).toBe('quarter');
    expect(a.divisionText).toContain('2 eighths');
    expect(analyzeBar(makeBar(4, 4)).label).toBe('Simple quadruple');
    const cut = analyzeBar(makeBar(2, 2));
    expect(cut.label).toBe('Simple duple');
    expect(cut.beatUnitText).toBe('half');
    expect(cut.divisionText).toContain('quarters');
  });
  it('classifies compound meters with dotted beats', () => {
    const a = analyzeBar(makeBar(6, 8));
    expect(a.kind).toBe('compound');
    expect(a.label).toBe('Compound duple');
    expect(a.beatUnitText).toBe('dotted quarter');
    expect(a.pulsesPerBeat).toEqual([3, 3]);
    expect(analyzeBar(makeBar(9, 8)).label).toBe('Compound triple');
    expect(analyzeBar(makeBar(12, 8)).label).toBe('Compound quadruple');
    expect(analyzeBar(makeBar(6, 4)).beatUnitText).toBe('dotted half');
    expect(analyzeBar(makeBar(12, 16)).beatUnitText).toBe('dotted eighth');
  });
  it('classifies irregular and asymmetric meters', () => {
    const five = analyzeBar(makeBar(5, 4));
    expect(five.kind).toBe('irregular');
    expect(five.equalBeats).toBe(true);
    expect(five.countName).toBe('quintuple');
    const seven = analyzeBar(makeBar(7, 8, [2, 2, 3]));
    expect(seven.kind).toBe('irregular');
    expect(seven.asymmetric).toBe(true);
    expect(seven.countName).toBe('triple');
    expect(seven.beats.map((b) => b.name)).toEqual(['quarter', 'quarter', 'dotted quarter']);
    expect(seven.grouping).toBe('2+2+3');
    const fifteen = analyzeBar(makeBar(15, 16, [3, 3, 3, 3, 3]));
    expect(fifteen.kind).toBe('irregular');
    expect(fifteen.beatUnitText).toBe('dotted eighth');
  });
  it('treats one-group bars as one beat per bar', () => {
    expect(analyzeBar(makeBar(3, 8, [3])).label).toContain('one beat');
  });
});

describe('note values', () => {
  it('names plain and dotted values', () => {
    expect(noteValue(1 / 4).name).toBe('quarter');
    expect(noteValue(3 / 8).name).toBe('dotted quarter');
    expect(noteValue(3 / 16).name).toBe('dotted eighth');
    expect(noteValue(7 / 16).name).toBe('double-dotted quarter');
    expect(noteValue(5 / 8).name).toBe('5 eighths');
  });
});

describe('accents and grouping edits', () => {
  it('builds default accents', () => {
    expect(defaultAccents(makeBar(4, 4))).toEqual([2, 0, 1, 0]);
    expect(defaultAccents(makeBar(5, 4))).toEqual([2, 0, 0, 1, 0]);
    expect(defaultAccents(makeBar(6, 8))).toEqual([2, 0, 0, 1, 0, 0]);
    expect(defaultAccents(makeBar(7, 8, [2, 2, 3]))).toEqual([2, 0, 1, 0, 1, 0, 0]);
  });
  it('splits and merges groups at boundaries', () => {
    expect(toggleBoundary([2, 2, 3], 2)).toEqual([4, 3]);
    expect(toggleBoundary([4, 3], 2)).toEqual([2, 2, 3]);
    expect(toggleBoundary([7], 3)).toEqual([3, 4]);
    expect(toggleBoundary([3, 4], 5)).toEqual([3, 2, 2]);
    expect(toggleBoundary([3, 4], 0)).toEqual([3, 4]);
  });
});

describe('time signatures and tempo', () => {
  it('formats additive time signatures', () => {
    expect(timeSigSpec(makeBar(7, 8, [2, 2, 3]), true)).toBe('2+2+3/8');
    expect(timeSigSpec(makeBar(7, 8, [2, 2, 3]), false)).toBe('7/8');
    expect(timeSigSpec(makeBar(6, 8), true)).toBe('6/8');
  });
  it('chooses a tempo unit', () => {
    expect(tempoUnit(makeBar(4, 4))).toBe(1 / 4);
    expect(tempoUnit(makeBar(6, 8))).toBe(3 / 8);
    expect(tempoUnit(makeBar(7, 8, [2, 2, 3]))).toBe(1 / 4);
    expect(tempoUnit(makeBar(2, 2))).toBe(1 / 2);
  });
  it('names tempo markings', () => {
    expect(tempoMarking(30).name).toBe('Grave');
    expect(tempoMarking(72).name).toBe('Adagio');
    expect(tempoMarking(100).name).toBe('Andante');
    expect(tempoMarking(132).name).toBe('Allegro');
    expect(tempoMarking(240).name).toBe('Prestissimo');
  });
  it('computes tap tempo', () => {
    expect(tapTempo([0])).toBeNull();
    expect(tapTempo([0, 500, 1000, 1500])).toBeCloseTo(120);
    // A long gap restarts the measurement.
    expect(tapTempo([0, 300, 5000, 6000, 7000])).toBeCloseTo(60);
  });
});

describe('timeline', () => {
  it('places pulses and swung subdivisions', () => {
    expect(subdivisionOffsets(2, 0)).toEqual([0.5]);
    expect(subdivisionOffsets(2, 1)[0]).toBeCloseTo(2 / 3);
    expect(subdivisionOffsets(3, 0)).toEqual([1 / 3, 2 / 3]);
    const bar = makeBar(4, 4);
    const tl = buildTimeline([bar], [defaultAccents(bar)], 1 / 4, 2, 1);
    expect(tl.length).toBe(4);
    expect(tl.events.length).toBe(8);
    expect(tl.events[0].role).toBe('strong');
    expect(tl.events[1].role).toBe('sub');
    expect(tl.events[1].time).toBeCloseTo(2 / 3);
    expect(tl.events[4].role).toBe('medium');
  });
  it('handles mixed meters with a shared pulse', () => {
    const bars = [makeBar(7, 8, [2, 2, 3]), makeBar(4, 4)];
    const tl = buildTimeline(bars, bars.map(defaultAccents), 1 / 4);
    expect(tl.length).toBeCloseTo(3.5 + 4);
    expect(tl.barStarts).toEqual([0, 3.5, 7.5]);
    expect(tl.beatStarts.slice(0, 4)).toEqual([0, 1, 2, 3.5]);
    expect(indexAt(tl.pulseStarts, 3.6)).toBe(7);
    expect(indexAt(tl.pulseStarts, -0.1)).toBe(-1);
  });
});

describe('presets and URL format', () => {
  it('has valid presets', () => {
    for (const p of METER_PRESETS) for (const bar of p.bars) expect(isValidBar(bar)).toBe(true);
  });
  it('round-trips bars', () => {
    const bars = [makeBar(7, 8, [3, 2, 2]), makeBar(4, 4)];
    const s = serializeBars(bars);
    expect(s).toBe('7/8:3+2+2,4/4');
    expect(parseBars(s)).toEqual(bars);
    expect(parseBars('7/8:2+2')).toBeNull();
    expect(parseBars('5/3')).toBeNull();
  });
});
