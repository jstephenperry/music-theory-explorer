import { makeKey } from '../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/** Mozart, Piano Sonata in C major, K. 545, first movement: bars 1 to 4. */
export const K545_OPENING: Excerpt = {
  work: {
    id: 'k545',
    composer: 'Wolfgang Amadeus Mozart',
    title: 'Piano Sonata in C major, K. 545 (1788)',
    bars: 'First movement, bars 1 to 4',
    tempo: 132,
    provenance: MUTOPIA('Sonata K. 545, first movement'),
    spec: {
      key: makeKey('C'),
      time: [4, 4],
      staves: [
        { clef: 'treble', voices: ['C5/2 E5/4 G5 | B4/4. C5/16 D5 C5/4 r/4 | A5/2 G5/4 C6 | G5/4 F5/8 !tr E5/16 F5 E5/4 r/4 |'] },
        {
          clef: 'treble',
          voices: ['C4/8 _"I" G4 E4 G4 C4 G4 E4 G4 | D4 _"V⁴₃" G4 F4 G4 C4 _"I" G4 E4 G4 | C4 _"IV⁶₄" A4 F4 A4 C4 _"I" G4 E4 G4 | B3 _"V⁶" G4 D4 G4 C4 _"I" G4 E4 G4 |'],
        },
      ],
    },
  },
  analysis: {
    layers: [
      { id: 'melody', label: 'Melody', color: 'root', select: '0.0.0-16', description: 'A right-hand melody in long notes, ornamented at the cadence with a trill.' },
      { id: 'alberti', label: 'Alberti bass', color: 'alt', select: '1.0.0-31', description: 'The left hand breaks each chord into the pattern low, high, middle, high in steady eighth notes.' },
    ],
    brackets: [{ first: '1.0.0', last: '1.0.3', label: 'Low, high, middle, high', color: 'alt', layer: 'alberti' }],
    commentary: [
      'Melody and accompaniment: the right hand has the tune and the left hand keeps the harmony moving underneath. The left-hand pattern is called the Alberti bass, after Domenico Alberti, who used it constantly; Classical composers made it the standard accompaniment for keyboard music.',
      'The bass note of each chord comes first in the pattern, so the harmony is always clear, and the moving eighth notes keep the sound going on the piano, whose notes fade quickly. The inversions keep the lowest note close to C: C, D, C, C, C, B, C, upper and lower neighbors around the tonic.',
    ],
  },
};
