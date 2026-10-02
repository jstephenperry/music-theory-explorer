import { makeKey } from '../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/**
 * Mozart, Piano Sonata in A major, K. 331, first movement: the theme, bars 1 to 8, a parallel period
 * (antecedent to a half cadence, consequent to a perfect authentic cadence).
 */
export const K331_THEME: Excerpt = {
  work: {
    id: 'k331',
    composer: 'Wolfgang Amadeus Mozart',
    title: 'Piano Sonata in A major, K. 331 (1783)',
    bars: 'First movement, theme (Andante grazioso), bars 1 to 8',
    tempo: 56,
    provenance: MUTOPIA('Sonata K. 331, theme'),
    spec: {
      key: makeKey('A'),
      time: [6, 8],
      staves: [
        {
          clef: 'treble',
          voices: [
            'C#5/8. D5/16 C#5/8 E5/4 E5/8 | B4/8. C#5/16 B4/8 D5/4 D5/8 | A4/4 A4/8 B4/4 B4/8 | C#5/4 E5/16 D5 C#5/4 B4/8 | ' +
              'C#5/8. D5/16 C#5/8 E5/4 E5/8 | B4/8. C#5/16 B4/8 D5/4 D5/8 | A4/4 B4/8 C#5/4 (F#4 B4 D5)/8 | (E4 A4 C#5)/4 (D4 E4 G#4 B4)/8 (C#4 E4 A4)/4 r/8 |',
            's/2. | s/2. | s/2. | s/4 B4/8 A4/4 G#4/8 | s/2. | s/2. | s/2. | s/2. |',
          ],
        },
        {
          clef: 'bass',
          voices: [
            'E4/4 E4/8 E4/4 E4/8 | E4/4 E4/8 E4/4 E4/8 | E4/4 E4/8 E4/4 E4/8 | E4/4 s/2 | ' +
              'E4/4 E4/8 E4/4 E4/8 | E4/4 E4/8 E4/4 E4/8 | E4/4 E4/8 E4/4 s/8 | s/4 E2/8 _"V⁷" A2/4 _"I" r/8 |',
            'A3/8. _"I" B3/16 A3/8 C#4/4 C#4/8 | G#3/8. _"V⁶₅" A3/16 G#3/8 B3/4 B3/8 | F#3/4 _"vi" F#3/8 G#3/4 _"V⁶" G#3/8 | A3/4 _"I" D3/8 _"ii⁶" E3/4. _"V" | ' +
              'A3/8. _"I" B3/16 A3/8 C#4/4 C#4/8 | G#3/8. _"V⁶₅" A3/16 G#3/8 B3/4 B3/8 | F#3/4 _"vi" G#3/8 _"V⁶" A3/4 _"I" D3/8 _"ii⁶" | E3/4 _"I⁶₄" s/2 |',
          ],
        },
      ],
    },
    barsPerLine: 4,
  },
  analysis: {
    layers: [
      { id: 'bi', label: 'Basic idea', color: 'root', select: '0.0.0-9, 0.0.19-28', description: 'Two bars: a lilting figure on C sharp, repeated a step lower on B. The consequent begins with exactly the same two bars.' },
      { id: 'ci', label: 'Contrasting idea', color: 'alt', select: '0.0.10-13, 0.0.29-32', description: 'Different material that leads each phrase to its cadence.' },
      { id: 'hc', label: 'Half cadence', color: 'extra', select: '0.0.14-18, 0.1.4-6', description: 'The antecedent stops on V (E major) in bar 4: an open, questioning close.' },
      { id: 'pac', label: 'Authentic cadence', color: 'other', select: '0.0.33-35', description: 'The consequent closes on I with the tonic on top, a perfect authentic cadence: the answer.' },
    ],
    brackets: [
      { first: '0.0.0', last: '0.0.9', label: 'Basic idea', color: 'root', layer: 'bi' },
      { first: '0.0.10', last: '0.0.18', label: 'Contrasting idea to HC', color: 'alt', layer: 'ci' },
      { first: '0.0.19', last: '0.0.28', label: 'Basic idea', color: 'root', layer: 'bi' },
      { first: '0.0.29', last: '0.0.35', label: 'Contrasting idea to PAC', color: 'alt', layer: 'ci' },
      { first: '0.0.0', last: '0.0.18', label: 'Antecedent (4 bars)', row: 1 },
      { first: '0.0.19', last: '0.0.35', label: 'Consequent (4 bars)', row: 1 },
    ],
    commentary: [
      'A period is a question and its answer. The antecedent phrase ends on a half cadence; the consequent starts the same way and ends with an authentic cadence on the tonic. Because the consequent repeats the opening, the listener hears the second ending as the stronger reply.',
      'Mozart keeps the left hand nearly the same throughout: a held E on top, with the bass moving underneath. The harmony that matters most is at the end of each phrase: E major (V) in bar 4, A major (I) in bar 8.',
    ],
  },
};
