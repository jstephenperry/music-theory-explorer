import { makeKey } from '../../../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/** Bach, Invention No. 1 in C major, BWV 772: bars 1 to 7. */
export const INVENTION_1: Excerpt = {
  id: 'bwv772',
  composer: 'Johann Sebastian Bach',
  work: 'Invention No. 1 in C major, BWV 772 (1723)',
  bars: 'Bars 1 to 7',
  tempo: 72,
  source: MUTOPIA('Invention No. 1 (BWV 772)'),
  spec: {
    key: makeKey('C'),
    time: [4, 4],
    staves: [
      {
        clef: 'treble',
        voices: [
          'r/16 C4 D4 E4 F4 D4 E4 C4 G4/8 C5 B4 !prall C5 | ' +
            'D5/16 G4 A4 B4 C5 A4 B4 G4 D5/8 G5 F5 !prall G5 | ' +
            'E5/16 A5 G5 F5 E5 G5 F5 A5 G5 F5 E5 D5 C5 E5 D5 F5 | ' +
            'E5 D5 C5 B4 A4 C5 B4 D5 C5 B4 A4 G4 F#4 A4 G4 B4 | ' +
            'A4/8 D4 C5/8. !mordent D5/16 B4 A4 G4 F#4 E4 G4 F#4 A4 | ' +
            'G4/16 B4 A4 C5 B4 D5 C5 E5 D5 B4/32 C5 D5/16 G5 B4/8 !prall A4/16 G4 | ' +
            'G4/8 r r/4 r/16 G4 A4 B4 C5 A4 B4 G4 |',
        ],
      },
      {
        clef: 'bass',
        voices: [
          'r/2 r/16 C3 D3 E3 F3 D3 E3 C3 | ' +
            'G3/8 G2 r/4 r/16 G3 A3 B3 C4 A3 B3 G3 | ' +
            'C4/8 B3 C4 D4 E4 G3 A3 B3 | ' +
            'C4/8 E3 F#3 G3 A3 B3 C4/4~ | ' +
            'C4/16 D3 E3 F#3 G3 E3 F#3 D3 G3/8 B2 C3 D3 | ' +
            'E3/8 F#3 G3 E3 B2/8. C3/16 D3/8 D2 | ' +
            'r/16 G2 A2 B2 C3 A2 B2 G2 D3/8 G3 F#3 G3 |',
        ],
      },
    ],
  },
  layers: [
    {
      id: 'motive',
      label: 'Motive',
      color: 'root',
      // Right hand bar 1, the seven sixteenths after the rest; left hand bar 1 and bar 2 imitations.
      select: '0.0.1-7, 1.0.2-8',
      description: 'Seven sixteenths: a scale run up a fourth, then a turn back down. Everything in the invention grows from it.',
    },
    {
      id: 'transposed',
      label: 'Motive on G',
      color: 'extra',
      select: '0.0.13-19, 1.0.13-19',
      description: 'Bar 2 states the motive again on the dominant, G, in both hands.',
    },
    {
      id: 'inversion',
      label: 'Inversion in sequence',
      color: 'alt',
      select: '0.0.25-31, 0.0.33-39, 0.0.41-47, 0.0.49-55',
      description: 'Bars 3 and 4 turn the motive upside down (the run now descends) and repeat it four times, each a step lower: a descending sequence.',
    },
    {
      id: 'tail',
      label: 'Eighth-note answer',
      color: 'other',
      select: '0.0.8-11, 0.0.20-23',
      description: 'The leaping eighth notes (G C B C) complete the idea and give the left hand room to imitate.',
    },
  ],
  brackets: [
    { first: '0.0.1', last: '0.0.7', label: 'Motive', color: 'root', layer: 'motive' },
    { first: '0.0.13', last: '0.0.19', label: 'Transposed', color: 'extra', layer: 'transposed' },
    { first: '0.0.25', last: '0.0.55', label: 'Inversion, sequenced down by step', color: 'alt', layer: 'inversion' },
  ],
  commentary: [
    'Bach builds the whole invention from a seven-note motive. The right hand states it, the left hand imitates it an octave lower half a bar later, and in bar 2 both hands repeat the exchange on G.',
    'In bars 3 and 4 the motive appears upside down. Each statement starts a step lower than the last, a descending sequence that carries the music to G major by bar 7.',
  ],
};

const wtcBar = (a: string, b: string, c: string) => `r/8 ${a}/16 ${b} ${c} ${a} ${b} ${c} r/8 ${a}/16 ${b} ${c} ${a} ${b} ${c} |`;
const wtcHold = (p: string) => `r/16 ${p}/8.~ ${p}/4 r/16 ${p}/8.~ ${p}/4 |`;

/** Bach, The Well-Tempered Clavier, Book I, Prelude in C major, BWV 846: bars 1 to 4. */
export const WTC_C_PRELUDE: Excerpt = {
  id: 'bwv846',
  composer: 'Johann Sebastian Bach',
  work: 'Prelude in C major, BWV 846, from The Well-Tempered Clavier, Book I (1722)',
  bars: 'Bars 1 to 4',
  tempo: 66,
  source: MUTOPIA('Well-Tempered Clavier I, Prelude 1'),
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
  layers: [
    { id: 'bass', label: 'Bass', color: 'root', select: '1.1.0-7', description: 'One bass note per bar, struck twice: C, C, B, C. The bass and the four voices above it make a five-part chord progression.' },
    { id: 'held', label: 'Held voice', color: 'alt', select: '1.0.0-23', description: 'The second note of each chord, struck just after the bass and held: a voice of the chorale hidden inside the figuration.' },
    { id: 'figure', label: 'Broken chord', color: 'extra', select: '0.0.0-55', description: 'The upper three notes of the chord, broken into the same rising figure twice per bar.' },
  ],
  brackets: [{ first: '0.0.1', last: '0.0.6', label: 'One figure', color: 'extra', layer: 'figure' }],
  barsPerLine: 2,
  commentary: [
    'Every bar of this prelude is one five-note chord played as the same pattern: the bass, a held inner voice, then the upper three notes rising twice. Bach composes the piece as a slow progression of chords and lets one figuration carry it from start to finish.',
    'The figure stays constant, so the ear follows the harmony: tonic, a supertonic seventh over the held C, a dominant seventh over B, and back to the tonic. Try reading the four bars as block chords: the voice leading is smooth, with each voice moving by step or holding.',
  ],
};

/** Bach, chorale "Aus meines Herzens Grunde", BWV 269: the first section (two phrases). */
export const CHORALE_269: Excerpt = {
  id: 'bwv269',
  composer: 'Johann Sebastian Bach',
  work: 'Chorale "Aus meines Herzens Grunde", BWV 269',
  bars: 'The upbeat and bars 1 to 7, the first two phrases',
  tempo: 76,
  source: MUTOPIA('Aus meines Herzens Grunde, BWV 269'),
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
};
