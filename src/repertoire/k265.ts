import { makeKey } from '../theory/keys';
import type { Excerpt } from './types';

/** How the K. 265 excerpts were checked: no piano edition of K. 265 is on Mutopia. */
const K265_SOURCE =
  'Encoded from the Mutopia Project edition for two guitars (edited by J. J. Olson after the Paris edition by Porro), undoing the octave changes that edition documents for the guitar. No piano edition was available to check against, so the left-hand octaves are the least certain part of this encoding.';

/** Mozart, Twelve Variations on "Ah vous dirai-je, Maman", K. 265: the theme, bars 1 to 8. */
export const K265_THEME: Excerpt = {
  work: {
    id: 'k265theme',
    composer: 'Wolfgang Amadeus Mozart',
    title: 'Twelve Variations on “Ah vous dirai-je, Maman”, K. 265 (about 1781)',
    bars: 'Theme, bars 1 to 8',
    tempo: 100,
    provenance: K265_SOURCE,
    spec: {
      key: makeKey('C'),
      time: [2, 4],
      staves: [
        { clef: 'treble', voices: ['C5/4 C5 | G5 G5 | A5 A5 | G5 G5 | F5 F5 | E5 E5 | D5/4 D5/8. E5/16 | C5/2 |'] },
        { clef: 'bass', voices: ['C3/4 _"I" C4 | E4 C4 | F4 _"IV" C4 | E4 _"I" C4 | D4 _"V⁴₃" B3 _"V⁶₅" | C4 _"I" A3 _"vi" | F3 _"ii⁶" G3 _"V" | C3/2 _"I" |'] },
      ],
    },
  },
  analysis: {
    layers: [{ id: 'melody', label: 'Theme', color: 'root', select: '0.0.0-14', description: 'The French song known in English as “Twinkle, Twinkle, Little Star”: steady quarter notes, a leap up a fifth, then a stepwise descent home.' }],
    brackets: [
      { first: '0.0.0', last: '0.0.7', label: 'Rising to G' },
      { first: '0.0.8', last: '0.0.14', label: 'Stepping down to C' },
    ],
    commentary: [
      'A theme for variations should be simple and well known, so that the listener can follow it through every disguise. Mozart chose a French popular song: eight bars of quarter notes over a bass that moves note against note with the melody.',
      'What stays the same through the variations is the plan: the eight-bar phrase, the harmony bar by bar, and the cadence. What changes is the surface: rhythm, figuration, register, mode and texture.',
    ],
  },
};

/** Mozart, K. 265: Variation I, bars 1 to 4. */
export const K265_VAR1: Excerpt = {
  work: {
    id: 'k265var1',
    composer: 'Wolfgang Amadeus Mozart',
    title: 'Twelve Variations on “Ah vous dirai-je, Maman”, K. 265',
    bars: 'Variation I, bars 1 to 4',
    tempo: 72,
    provenance: K265_SOURCE,
    spec: {
      key: makeKey('C'),
      time: [2, 4],
      staves: [
        { clef: 'treble', voices: ['D5/16 C5 B4 C5 B4 C5 B4 C5 | A5 G5 F#5 G5 F#5 G5 F#5 G5 | G#5 A5 C6 B5 D6 C6 B5 A5 | A5 G5 E6 D6 C6 B5 A5 G5 |'] },
        { clef: 'bass', voices: ['C3/4 C4 | E4 C4 | F4 C4 | (C4 E4)/4 r/8. C#4/16 |'] },
      ],
    },
  },
  analysis: {
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
  },
};
