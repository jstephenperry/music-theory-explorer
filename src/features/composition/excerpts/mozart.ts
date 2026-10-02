import { makeKey } from '../../../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/**
 * Mozart, Piano Sonata in A major, K. 331, first movement: the theme, bars 1 to 8, a parallel period
 * (antecedent to a half cadence, consequent to a perfect authentic cadence).
 */
export const K331_THEME: Excerpt = {
  id: 'k331',
  composer: 'Wolfgang Amadeus Mozart',
  work: 'Piano Sonata in A major, K. 331 (1783)',
  bars: 'First movement, theme (Andante grazioso), bars 1 to 8',
  tempo: 56,
  source: MUTOPIA('Sonata K. 331, theme'),
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
  barsPerLine: 4,
  commentary: [
    'A period is a question and its answer. The antecedent phrase ends on a half cadence; the consequent starts the same way and ends with an authentic cadence on the tonic. Because the consequent repeats the opening, the listener hears the second ending as the stronger reply.',
    'Mozart keeps the left hand nearly the same throughout: a held E on top, with the bass moving underneath. The harmony that matters most is at the end of each phrase: E major (V) in bar 4, A major (I) in bar 8.',
  ],
};

/** Mozart, Piano Sonata in C major, K. 545, first movement: bars 1 to 4. */
export const K545_OPENING: Excerpt = {
  id: 'k545',
  composer: 'Wolfgang Amadeus Mozart',
  work: 'Piano Sonata in C major, K. 545 (1788)',
  bars: 'First movement, bars 1 to 4',
  tempo: 132,
  source: MUTOPIA('Sonata K. 545, first movement'),
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
  layers: [
    { id: 'melody', label: 'Melody', color: 'root', select: '0.0.0-16', description: 'A singing right-hand melody in long notes, ornamented at the cadence with a trill.' },
    { id: 'alberti', label: 'Alberti bass', color: 'alt', select: '1.0.0-31', description: 'The left hand breaks each chord into the pattern low, high, middle, high in steady eighth notes.' },
  ],
  brackets: [{ first: '1.0.0', last: '1.0.3', label: 'Low, high, middle, high', color: 'alt', layer: 'alberti' }],
  commentary: [
    'Melody and accompaniment: the right hand sings, the left hand keeps the harmony moving underneath. The left-hand pattern is called the Alberti bass, after Domenico Alberti, who used it constantly; Classical composers made it the standard accompaniment for keyboard music.',
    'The bass note of each chord comes first in the pattern, so the harmony is always clear, and the moving eighth notes keep the sound alive on the piano, whose notes fade quickly. Notice that the lowest note changes even when the chord does not: C, D, C, C, C, B, C outlines its own simple bass line.',
  ],
};

/** How the K. 265 excerpts were checked: no piano edition of K. 265 is on Mutopia. */
const K265_SOURCE =
  'Encoded from the Mutopia Project edition for two guitars (edited by J. J. Olson after the Paris edition by Porro), undoing the octave changes that edition documents for the guitar. No piano edition was available to check against, so the left-hand octaves are the least certain part of this encoding.';

/** Mozart, Twelve Variations on "Ah vous dirai-je, Maman", K. 265: the theme, bars 1 to 8. */
export const K265_THEME: Excerpt = {
  id: 'k265theme',
  composer: 'Wolfgang Amadeus Mozart',
  work: 'Twelve Variations on “Ah vous dirai-je, Maman”, K. 265 (about 1781)',
  bars: 'Theme, bars 1 to 8',
  tempo: 100,
  source: K265_SOURCE,
  spec: {
    key: makeKey('C'),
    time: [2, 4],
    staves: [
      { clef: 'treble', voices: ['C5/4 C5 | G5 G5 | A5 A5 | G5 G5 | F5 F5 | E5 E5 | D5/4 D5/8. E5/16 | C5/2 |'] },
      { clef: 'bass', voices: ['C3/4 _"I" C4 | E4 C4 | F4 _"IV" C4 | E4 _"I" C4 | D4 _"V⁴₃" B3 _"V⁶₅" | C4 _"I" A3 _"vi" | F3 _"ii⁶" G3 _"V" | C3/2 _"I" |'] },
    ],
  },
  layers: [{ id: 'melody', label: 'Theme', color: 'root', select: '0.0.0-14', description: 'The French song known in English as “Twinkle, Twinkle, Little Star”: steady quarter notes, a leap up a fifth, then a stepwise descent home.' }],
  brackets: [
    { first: '0.0.0', last: '0.0.7', label: 'Rising to G' },
    { first: '0.0.8', last: '0.0.14', label: 'Stepping down to C' },
  ],
  commentary: [
    'A theme for variations should be simple and well known, so that the listener can follow it through every disguise. Mozart chose a French popular song: eight bars of quarter notes over a bass that moves note against note with the melody.',
    'What stays the same through the variations is the plan: the eight-bar phrase, the harmony bar by bar, and the cadence. What changes is the surface: rhythm, figuration, register, mode and texture.',
  ],
};

/** Mozart, K. 265: Variation I, bars 1 to 4. */
export const K265_VAR1: Excerpt = {
  id: 'k265var1',
  composer: 'Wolfgang Amadeus Mozart',
  work: 'Twelve Variations on “Ah vous dirai-je, Maman”, K. 265',
  bars: 'Variation I, bars 1 to 4',
  tempo: 72,
  source: K265_SOURCE,
  spec: {
    key: makeKey('C'),
    time: [2, 4],
    staves: [
      { clef: 'treble', voices: ['D5/16 C5 B4 C5 B4 C5 B4 C5 | A5 G5 F#5 G5 F#5 G5 F#5 G5 | G#5 A5 C6 B5 D6 C6 B5 A5 | A5 G5 E6 D6 C6 B5 A5 G5 |'] },
      { clef: 'bass', voices: ['C3/4 C4 | E4 C4 | F4 C4 | (C4 E4)/4 r/8. C#4/16 |'] },
    ],
  },
  layers: [
    {
      id: 'theme',
      label: 'Theme notes',
      color: 'root',
      select: '0.0.1, 0.0.5, 0.0.9, 0.0.13, 0.0.17, 0.0.23, 0.0.25, 0.0.31',
      description: 'The notes of the theme (C, C, G, G, A, A, G, G) are still there, one on each beat or close to it, wrapped in sixteenth-note neighbor notes.',
    },
    { id: 'bass', label: 'Bass', color: 'alt', select: '1.0.0-6', description: 'The left hand keeps the bass of the theme almost unchanged, so the harmony is the same as before.' },
  ],
  commentary: [
    'The first variation keeps the harmony and the outline of the melody and fills in the time between the theme’s notes. Each quarter note becomes four sixteenths circling it: the note’s upper neighbor, the note, its lower neighbor, the note. The lower neighbors are often chromatic (B below C, F sharp below G).',
    'This is melodic figuration, the oldest and most common way to vary a theme. Switch on “Theme notes” to see the original tune inside the decoration.',
  ],
};
