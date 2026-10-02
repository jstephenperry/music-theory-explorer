import { describe, expect, it } from 'vitest';
import { makeKey } from '../../theory/keys';
import { pc, pitchName } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { analyzeTransition } from '../progressions/voiceLeading';
import { detectCadence } from '../progressions/harmony';
import { CADENCE_TYPES, cadenceScore, transposeScore } from './cadences';

const plainFigures = (s: string) => s.replace('⁶₄', '64').replace('⁶₅', '65').replace('⁷', '7').replace('⁶', '6');

describe('cadence gallery', () => {
  for (const type of CADENCE_TYPES)
    type.examples.forEach((_, ex) => {
      const score = cadenceScore(type, ex);
      // Chords at beats 0, 2 and 4, voices from the bass up.
      const chords = [0, 2, 4].map((t) =>
        [score.staves[1].voices[1], score.staves[1].voices[0], score.staves[0].voices[1], score.staves[0].voices[0]].map((v) => v.notes.find((n) => Math.abs(n.start - t) < 1e-6)!),
      );

      it(`${type.short} example ${ex + 1} has no parallel fifths or octaves`, () => {
        for (let i = 0; i < 2; i++) {
          const tr = analyzeTransition(chords[i].map((n) => n.pitches[0]), chords[i + 1].map((n) => n.pitches[0]));
          expect(tr.warnings.filter((w) => w.kind === 'parallel5' || w.kind === 'parallel8')).toEqual([]);
        }
      });

      it(`${type.short} example ${ex + 1} is recognized as a ${type.name.toLowerCase()}`, () => {
        const romans = chords.slice(1).map((c) => parseRoman(plainFigures(c[0].below!), score.key));
        const soprano = pc(chords[2][3].pitches[0]);
        expect(detectCadence(romans, score.key, soprano).id).toBe(type.id);
      });
    });

  it('transposes by the smallest move with correct spelling', () => {
    const s = transposeScore(cadenceScore(CADENCE_TYPES[0], 0), makeKey('Bb'));
    expect(pitchName(s.staves[0].voices[0].notes[0].pitches[0], false)).toBe('Bb4');
    const e = transposeScore(cadenceScore(CADENCE_TYPES[0], 0), makeKey('E'));
    expect(pitchName(e.staves[0].voices[0].notes[1].pitches[0], false)).toBe('D#5');
  });
});
