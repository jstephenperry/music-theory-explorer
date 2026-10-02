import { makeKey } from '../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/** Bach, chorale "Aus meines Herzens Grunde", BWV 269: the first section (two phrases). */
export const CHORALE_269: Excerpt = {
  work: {
    id: 'bwv269',
    composer: 'Johann Sebastian Bach',
    title: 'Chorale "Aus meines Herzens Grunde", BWV 269',
    bars: 'The upbeat and bars 1 to 7, the first two phrases',
    tempo: 76,
    provenance: MUTOPIA('Aus meines Herzens Grunde, BWV 269'),
    spec: {
      key: makeKey('G'),
      time: [3, 4],
      pickup: 1,
      ending: 2,
      staves: [
        {
          clef: 'treble',
          voices: [
            'G4/4 | G4/2 D5/4 | B4/4. A4/8 G4/4 | G4/4. A4/8 B4/4 | A4/2 !fermata B4/4 | D5/2 C5/4 | B4/4 A4/2 | G4/2 !fermata',
            'D4/4 | D4/4 E4 D4 | D4/2 B3/4 | E4/8 D4 E4 F#4 G4/4 | F#4/2 G4/4 | D4/4 E4 F#4 | G4/2 F#4/4 | D4/2',
          ],
        },
        {
          clef: 'bass',
          voices: [
            'B3/4 | B3/4 C4/8 B3 A3/4 | G3/4 F#3 G3 | C4/8 B3 C4/4 D4 | D4/2 D4/4 | A3/4 B3 C4 | D4/4 E4 D4/8 C4 | B3/2',
            'G2/4 | G3/4 E3 F#3 | G3 D3 E3 | C3 B2/8 A2 G2/4 | D3/2 _"V" G2/4 | F#2/4 G2 A2 | B2/4 C3 D3 _"V" | G2/2 _"I"',
          ],
        },
      ],
    },
  },
  analysis: {
    layers: [
      { id: 'tune', label: 'Chorale tune', color: 'root', select: '0.0.0-15', description: 'The soprano carries the hymn tune, which the congregation knew; Bach harmonizes it.' },
      { id: 'bass', label: 'Bass', color: 'alt', select: '1.1.0-19', description: 'The bass is the second most important line: it moves mostly against the soprano and defines each chord.' },
      { id: 'inner', label: 'Alto and tenor', color: 'extra', select: '0.1.0-18, 1.0.0-21', description: 'The inner voices fill in the harmony with smooth, mostly stepwise lines and passing eighth notes.' },
    ],
    brackets: [
      { first: '0.0.0', last: '0.0.9', label: 'Phrase 1, to a half cadence' },
      { first: '0.0.10', last: '0.0.15', label: 'Phrase 2, to an authentic cadence' },
    ],
    commentary: [
      'Four voices, soprano, alto, tenor and bass, move together in the same rhythm: one chord per beat, with an occasional passing eighth note. This is homophony, the texture of the hymn and of the four-part harmony exercises that Bach’s chorales became.',
      'Each voice is still a good melody in itself. Switch the layers on one at a time and play the excerpt: the bass moves in contrary motion to the tune, and the inner voices rarely leap. The fermatas mark the ends of the hymn’s lines, a half cadence and then an authentic cadence.',
    ],
  },
};
