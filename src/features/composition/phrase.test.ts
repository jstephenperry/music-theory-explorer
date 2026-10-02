import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { pitchName } from '../../theory/notes';
import { BASIC_IDEAS, CADENCE_KINDS, PHRASE_TONICS, accompaniment, buildPhrase, type PhraseChoice } from './phrase';

const base: PhraseChoice = { form: 'period', idea: 'lilting', repetition: 'exact', first: 'hc', last: 'pac', tonic: 'C', accomp: 'block' };
const ids = (c: PhraseChoice) => buildPhrase(c).cadences.map((x) => x.cadence.id);

describe('phrase builder', () => {
  it('recognizes the cadence chosen for each phrase ending', () => {
    expect(ids(base)).toEqual(['half', 'pac']);
    expect(ids({ ...base, first: 'iac', last: 'dc' })).toEqual(['iac', 'deceptive']);
    expect(ids({ ...base, form: 'sentence', last: 'hc' })).toEqual(['half']);
  });

  it('calls a half cadence answered by a PAC a parallel period, and two PACs not a period', () => {
    expect(buildPhrase(base).verdict).toMatchObject({ ok: true, title: 'A parallel period' });
    expect(buildPhrase({ ...base, first: 'pac' }).verdict).toMatchObject({ ok: false, title: 'Not a period' });
    expect(buildPhrase({ ...base, first: 'hc', last: 'hc' }).verdict.title).toBe('Two antecedents');
  });

  it('builds eight complete bars for every idea, form, cadence and key', () => {
    for (const idea of BASIC_IDEAS)
      for (const form of ['period', 'sentence'] as const)
        for (const c of CADENCE_KINDS)
          for (const tonic of PHRASE_TONICS) {
            const { score } = buildPhrase({ ...base, idea: idea.id, form, last: c.id, tonic, accomp: tonic === 'C' ? 'alberti' : 'block' });
            expect(score.measures).toBe(8);
            for (const st of score.staves) expect(st.voices[0].notes.reduce((a, n) => a + n.dur, 0)).toBeCloseTo(32);
          }
  });

  it('transposes melodies with correct spelling', () => {
    const { score } = buildPhrase({ ...base, tonic: 'Eb' });
    const first = score.staves[0].voices[0].notes[0].pitches[0];
    expect(pitchName(first, false)).toBe('G5');
    const { score: s2 } = buildPhrase({ ...base, tonic: 'A' });
    expect(pitchName(s2.staves[0].voices[0].notes[0].pitches[0], false)).toBe('C#5');
  });

  it('writes an Alberti bass as low, high, middle, high, dropping the fifth of a seventh chord', () => {
    const notes = accompaniment([{ rn: 'V7', start: 0, dur: 2 }], makeKey('C'), 'alberti');
    expect(notes.map((n) => pitchName(n.pitches[0], false))).toEqual(['G3', 'F4', 'B3', 'F4']);
  });
});
