import { makeKey } from '../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

const wtcBar = (a: string, b: string, c: string) => `r/8 ${a}/16 ${b} ${c} ${a} ${b} ${c} r/8 ${a}/16 ${b} ${c} ${a} ${b} ${c} |`;
const wtcHold = (p: string) => `r/16 ${p}/8.~ ${p}/4 r/16 ${p}/8.~ ${p}/4 |`;

/** Bach, The Well-Tempered Clavier, Book I, Prelude in C major, BWV 846: bars 1 to 4. */
export const WTC_C_PRELUDE: Excerpt = {
  work: {
    id: 'bwv846',
    composer: 'Johann Sebastian Bach',
    title: 'Prelude in C major, BWV 846, from The Well-Tempered Clavier, Book I (1722)',
    bars: 'Bars 1 to 4',
    tempo: 66,
    provenance: MUTOPIA('Well-Tempered Clavier I, Prelude 1'),
    spec: {
      key: makeKey('C'),
      time: [4, 4],
      staves: [
        { clef: 'treble', voices: [wtcBar('G4', 'C5', 'E5') + wtcBar('A4', 'D5', 'F5') + wtcBar('G4', 'D5', 'F5') + wtcBar('G4', 'C5', 'E5')] },
        {
          clef: 'bass',
          voices: [wtcHold('E4') + wtcHold('D4') + wtcHold('D4') + wtcHold('E4'), 'C4/2 _"I" C4 | C4/2 _"ii⁴₂" C4 | B3/2 _"V⁶₅" B3 | C4/2 _"I" C4 |'],
        },
      ],
    },
    barsPerLine: 2,
  },
  analysis: {
    layers: [
      { id: 'bass', label: 'Bass', color: 'root', select: '1.1.0-7', description: 'One bass note per bar, struck twice: C, C, B, C. The bass and the four voices above it make a five-part chord progression.' },
      { id: 'held', label: 'Held voice', color: 'alt', select: '1.0.0-23', description: 'The second note of each chord, struck just after the bass and held: a voice of the chorale hidden inside the figuration.' },
      { id: 'figure', label: 'Broken chord', color: 'extra', select: '0.0.0-55', description: 'The upper three notes of the chord, broken into the same rising figure twice per bar.' },
    ],
    brackets: [{ first: '0.0.1', last: '0.0.6', label: 'One figure', color: 'extra', layer: 'figure' }],
    commentary: [
      'Every bar of this prelude is one five-note chord played as the same pattern: the bass, a held inner voice, then the upper three notes rising twice. Bach composes the piece as a slow progression of chords and lets one figuration carry it from start to finish.',
      'The figure stays constant, so the ear follows the harmony: tonic, a supertonic seventh over the held C, a dominant seventh over B, and back to the tonic. Try reading the four bars as block chords: the voice leading is smooth, with each voice moving by step or holding.',
    ],
  },
};
