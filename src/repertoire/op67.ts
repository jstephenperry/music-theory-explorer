import { makeKey } from '../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/** Beethoven, Symphony No. 5 in C minor, Op. 67, first movement: bars 1 to 5 (the string and clarinet unison). */
export const FIFTH_SYMPHONY: Excerpt = {
  work: {
    id: 'op67',
    composer: 'Ludwig van Beethoven',
    title: 'Symphony No. 5 in C minor, Op. 67 (1808)',
    bars: 'First movement, bars 1 to 5 (the first violins; the strings and clarinets play it in octaves)',
    tempo: 108,
    provenance: MUTOPIA('Symphony No. 5, first movement (full score)'),
    spec: {
      key: makeKey('C', 'minor'),
      time: [2, 4],
      staves: [{ clef: 'treble', voices: ['r/8 G4 G4 G4 | Eb4/2 !fermata | r/8 F4 F4 F4 | D4/2~ | D4/2 !fermata |'] }],
    },
  },
  analysis: {
    layers: [
      { id: 'motive', label: 'Motive', color: 'root', select: '0.0.1-4', description: 'Three repeated eighth notes and a held note a third lower: short, short, short, long.' },
      { id: 'sequence', label: 'Sequence', color: 'alt', select: '0.0.6-10', description: 'The same rhythm and contour one step lower (F F F D): a sequence. The interval shrinks from a major third to a minor third because the notes stay in the key.' },
    ],
    brackets: [
      { first: '0.0.1', last: '0.0.4', label: 'Motive', color: 'root', layer: 'motive' },
      { first: '0.0.6', last: '0.0.10', label: 'Sequence, a step lower', color: 'alt', layer: 'sequence' },
    ],
    commentary: [
      'The motive is mostly rhythm: three short notes and a long one. Beethoven repeats it a step lower at once, and the whole movement keeps returning to the pattern in every register and instrument.',
    ],
  },
};
