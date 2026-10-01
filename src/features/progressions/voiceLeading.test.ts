import { describe, expect, it } from 'vitest';
import { pitch } from '../../theory/notes';
import { makeKey } from '../../theory/keys';
import { parseRoman } from '../../theory/roman';
import { voiceProgression } from '../../theory/voicing';
import { analyzeTransition, analyzeVoiceLeading, formatSemis } from './voiceLeading';

const v = (s: string) => s.split(' ').map(pitch);

describe('analyzeTransition', () => {
  it('measures motion and common tones', () => {
    const t = analyzeTransition(v('C3 E4 G4 C5'), v('F3 F4 A4 C5'));
    expect(t.moves.map((m) => m.semis)).toEqual([5, 1, 2, 0]);
    expect(t.commonTones).toBe(1);
    expect(t.total).toBe(8);
    expect(t.moves[1].interval).toBe('m2');
    expect(t.warnings).toEqual([]);
  });
  it('flags parallel fifths and octaves', () => {
    const t = analyzeTransition(v('C3 G3 E4 C5'), v('D3 A3 F4 D5'));
    const kinds = t.warnings.map((w) => w.kind);
    expect(kinds).toContain('parallel5');
    expect(kinds).toContain('parallel8');
  });
  it('flags augmented seconds, leaps and crossing', () => {
    const t = analyzeTransition(v('C3 Ab3 C4 E5'), v('C3 B3 D4 C4'));
    const kinds = t.warnings.map((w) => w.kind);
    expect(kinds).toContain('augmented');
    expect(kinds).toContain('leap');
    expect(kinds).toContain('crossing');
  });
});

describe('analyzeVoiceLeading', () => {
  it('finds no parallels in voiceProgression output for a common progression', () => {
    const key = makeKey('C');
    const chords = ['I', 'vi', 'ii65', 'V7', 'I'].map((n) => parseRoman(n, key));
    const voicings = voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass })));
    const ts = analyzeVoiceLeading(voicings);
    expect(ts).toHaveLength(4);
    expect(ts.flatMap((t) => t.warnings.filter((w) => w.kind === 'parallel5' || w.kind === 'parallel8'))).toEqual([]);
    expect(analyzeVoiceLeading(voicings, true)).toHaveLength(5);
  });
  it('formats signed semitones', () => {
    expect(formatSemis(3)).toBe('+3');
    expect(formatSemis(-2)).toBe('−2');
    expect(formatSemis(0)).toBe('0');
  });
});
