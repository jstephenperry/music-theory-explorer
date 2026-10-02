import { describe, expect, it } from 'vitest';
import { buildScore, measureStart, notateVoice, parseVoice, scoreFromVoices, scoreSounds, selectNotes, writableParts, ScoreSyntaxError } from '../score';
import { makeKey } from '../keys';
import { pitch } from '../notes';

const C = makeKey('C');

describe('parseVoice', () => {
  it('reads notes, sticky values, dots, rests and chords', () => {
    const n = parseVoice('C4/8. D4/16 E4/4 (C4 E4 G4)/2 | r/1', { time: [4, 4] });
    expect(n.map((x) => x.dur)).toEqual([0.75, 0.25, 1, 2, 4]);
    expect(n.map((x) => x.start)).toEqual([0, 0.75, 1, 2, 4]);
    expect(n[3].pitches.map((p) => p.letter)).toEqual(['C', 'E', 'G']);
    expect(n[4].rest).toBe('rest');
    expect(n[4].measure).toBe(1);
  });

  it('keeps the note value until a new one is given', () => {
    const n = parseVoice('C4/16 D4 E4 F4 G4/4 A4 B4', { time: [4, 4] });
    expect(n.map((x) => x.value)).toEqual([16, 16, 16, 16, 4, 4, 4]);
  });

  it('reads accidentals and octaves', () => {
    const n = parseVoice('F#5/4 Bb3 Ebb4 Cx5', { time: [4, 4] });
    expect(n.map((x) => [x.pitches[0].letter, x.pitches[0].acc, x.pitches[0].octave])).toEqual([
      ['F', 1, 5],
      ['B', -1, 3],
      ['E', -2, 4],
      ['C', 2, 5],
    ]);
  });

  it('handles tuplets, ties, grace notes, ornaments and labels', () => {
    const n = parseVoice('Ab5/4.~ 3:2[ G5/16 F5 E5 ] ^C5/16 F5/4 !tr _"V" ="climax" r/4', { time: [4, 4] });
    expect(n[0].tie).toBe(true);
    expect(n[1].tuplet).toEqual({ actual: 3, normal: 2, group: 0 });
    expect(n[1].dur).toBeCloseTo(1 / 6);
    expect(n[4].grace?.[0][0]).toEqual(pitch('C5'));
    expect(n[4].orn).toEqual(['tr']);
    expect(n[4].below).toBe('V');
    expect(n[4].above).toBe('climax');
    expect(n[4].start).toBeCloseTo(2);
  });

  it('respects a pickup and checks every barline', () => {
    const n = parseVoice('C4/4 | F4 Ab4 C5 F5 |', { time: [4, 4], pickup: 1 });
    expect(n.map((x) => x.measure)).toEqual([0, 1, 1, 1, 1]);
    expect(() => parseVoice('C4/4 D4 | E4', { time: [4, 4] })).toThrow(ScoreSyntaxError);
    expect(() => parseVoice('C4/2 D4/1', { time: [4, 4] })).toThrow(/crosses the barline/);
    expect(() => parseVoice('H4/4', { time: [4, 4] })).toThrow(/cannot read/);
  });
});

describe('buildScore', () => {
  it('builds a two-staff score and checks that voices have equal length', () => {
    const s = buildScore({
      key: C,
      time: [3, 4],
      staves: [
        { clef: 'treble', voices: ['E5/4 D5 C5 | G4/2.'] },
        { clef: 'bass', voices: ['C3/2. | G2/2.'] },
      ],
    });
    expect(s.measures).toBe(2);
    expect(measureStart(s, 1)).toBe(3);
    expect(() =>
      buildScore({ key: C, time: [3, 4], staves: [{ clef: 'treble', voices: ['E5/2.', 'C4/2. | C4'] }] }),
    ).toThrow(/lasts/);
  });

  it('selects notes by staff, voice and range', () => {
    const s = buildScore({ key: C, time: [4, 4], staves: [{ clef: 'treble', voices: ['C4/4 r D4 E4'] }] });
    expect(selectNotes(s, '0.0')).toEqual(['0.0.0', '0.0.2', '0.0.3']);
    expect(selectNotes(s, '0.0.2-3')).toEqual(['0.0.2', '0.0.3']);
  });
});

describe('scoreSounds', () => {
  it('joins tied notes, skips rests and places grace notes before the beat', () => {
    const s = buildScore({ key: C, time: [4, 4], staves: [{ clef: 'treble', voices: ['C4/2~ C4/4 ^D4/16 E4/4'] }] });
    const snd = scoreSounds(s);
    expect(snd[0]).toMatchObject({ time: 0, duration: 3, midi: [60], ids: ['0.0.0', '0.0.1'] });
    expect(snd[1].grace).toBe(true);
    expect(snd[1].time).toBeLessThan(3);
    expect(snd[2]).toMatchObject({ time: 3, midi: [64] });
  });
});

describe('notateVoice', () => {
  it('splits notes at barlines with ties and writes awkward lengths as tied values', () => {
    const n = notateVoice([{ pitches: [pitch('C4')], dur: 3 }, { pitches: [pitch('D4')], dur: 2 }], { time: [4, 4] });
    // D4 starts on beat 4: one quarter in bar 1, tied to a quarter in bar 2.
    expect(n.map((x) => [x.pitches[0].letter, x.dur, x.measure, !!x.tie])).toEqual([
      ['C', 3, 0, false],
      ['D', 1, 0, true],
      ['D', 1, 1, false],
    ]);
    expect(writableParts(1.25).map((p) => [p.value, p.dots])).toEqual([[4, 0], [16, 0]]);
  });

  it('pads voices to whole measures when assembling a score', () => {
    const v = notateVoice([{ pitches: [pitch('C4')], dur: 1 }], { time: [4, 4] });
    const s = scoreFromVoices(C, [4, 4], [{ clef: 'treble', voices: [v] }]);
    expect(s.measures).toBe(1);
    expect(s.staves[0].voices[0].notes.reduce((a, n) => a + n.dur, 0)).toBe(4);
  });

  it('accepts a short last bar that completes the pickup', () => {
    const s = buildScore({ key: C, time: [3, 4], pickup: 1, ending: 2, staves: [{ clef: 'treble', voices: ['G4/4 | C5/2 D5/4 | E5/2'] }] });
    expect(s.measures).toBe(3);
    expect(s.ending).toBe(2);
    expect(() => buildScore({ key: C, time: [3, 4], pickup: 1, staves: [{ clef: 'treble', voices: ['G4/4 | C5/2 D5/4 | E5/2'] }] })).toThrow(ScoreSyntaxError);
  });

  it('writes an off-beat note up to the beat, then ties it on', () => {
    const v = notateVoice([{ pitches: [], dur: 0.25 }, { pitches: [pitch('E4')], dur: 1.75 }], { time: [4, 4] });
    expect(v.map((n) => [n.value, n.dots, !!n.tie])).toEqual([
      [16, 0, false],
      [8, 1, true],
      [4, 0, false],
    ]);
  });
});

describe('ornament realization', () => {
  const sounds = (voice: string, key = C) => scoreSounds(buildScore({ key, time: [4, 4], staves: [{ clef: 'treble', voices: [voice] }] }));
  const span = (s: ReturnType<typeof sounds>) => Math.max(...s.map((x) => x.time + x.duration));

  it('plays a trill from the main note with the diatonic upper neighbor, ending on the main note', () => {
    const s = sounds('F5/8 !tr E5/16 F5 E5/4 r/2');
    const trill = s.filter((x) => x.ornament);
    expect(trill.map((x) => x.midi[0])).toEqual([77, 79, 77, 79, 77]);
    expect(trill.reduce((a, x) => a + x.duration, 0)).toBeCloseTo(0.5);
    expect(trill[trill.length - 1].time + trill[trill.length - 1].duration).toBeCloseTo(0.5);
    expect(s.find((x) => x.midi[0] === 76)!.time).toBeCloseTo(0.5);
    expect(trill.every((x) => x.ids[0] === '0.0.0')).toBe(true);
  });

  it('plays a prall as main, upper, main and a mordent as main, lower, main', () => {
    const prall = sounds('B4/8 !prall r/8 r/2.');
    expect(prall.map((x) => x.midi[0])).toEqual([71, 72, 71]);
    expect(prall.map((x) => x.duration)).toEqual([0.125, 0.125, 0.25]);
    const mordent = sounds('C5/4 !mordent r/2.');
    expect(mordent.map((x) => x.midi[0])).toEqual([72, 71, 72]);
    expect(span(mordent)).toBeCloseTo(1);
  });

  it('uses the raised leading tone below the tonic in minor and natural neighbors elsewhere', () => {
    const cm = makeKey('C', 'minor');
    expect(sounds('C5/4 !mordent r/2.', cm).map((x) => x.midi[0])).toEqual([72, 71, 72]);
    expect(sounds('G4/4 !tr r/2.', cm).map((x) => x.midi[0]).slice(0, 2)).toEqual([67, 68]);
    expect(sounds('D4/4 !mordent r/2.', cm).map((x) => x.midi[0])).toEqual([62, 60, 62]);
  });

  it('plays a turn as upper, main, lower, main', () => {
    const s = sounds('G4/4 !turn r/2.');
    expect(s.map((x) => x.midi[0])).toEqual([69, 67, 65, 67]);
    expect(s.map((x) => x.duration)).toEqual([0.125, 0.125, 0.125, 0.625]);
  });

  it('repeats a tremolo at the written rate, chords included', () => {
    const s = sounds('(C4 E4)/2 !trem r/2');
    expect(s).toHaveLength(16);
    expect(s.every((x) => x.midi.join() === '60,64' && Math.abs(x.duration - 0.125) < 1e-9)).toBe(true);
    expect(sounds('C4/2 !trem16 r/2')).toHaveLength(8);
    expect(sounds('C4/2 !trem8 r/2')).toHaveLength(4);
  });

  it('ornaments the top note of a chord while the others hold, and spans tied notes', () => {
    const chord = sounds('(C4 E4 G4)/4 !prall r/2.');
    expect(chord[0]).toMatchObject({ midi: [60, 64], duration: 1 });
    expect(chord.filter((x) => x.ornament).map((x) => x.midi[0])).toEqual([67, 69, 67]);
    const tied = sounds('C4/4~ !tr C4/4 r/2');
    expect(tied).toHaveLength(17);
    expect(span(tied)).toBeCloseTo(2);
  });

  it('halves a staccato note and leaves a fermata alone', () => {
    expect(sounds('C4/4 !stacc r/2.')[0].duration).toBe(0.5);
    expect(sounds('C4/4 !fermata r/2.')[0].duration).toBe(1);
  });
});
