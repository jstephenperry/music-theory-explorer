import { makeKey } from '../../../theory/keys';
import { MUTOPIA, type Excerpt } from './types';

/** Beethoven, Symphony No. 5 in C minor, Op. 67, first movement: bars 1 to 5 (the string and clarinet unison). */
export const FIFTH_SYMPHONY: Excerpt = {
  id: 'op67',
  composer: 'Ludwig van Beethoven',
  work: 'Symphony No. 5 in C minor, Op. 67 (1808)',
  bars: 'First movement, bars 1 to 5 (the first violins; the strings and clarinets play it in octaves)',
  tempo: 108,
  source: MUTOPIA('Symphony No. 5, first movement (full score)'),
  spec: {
    key: makeKey('C', 'minor'),
    time: [2, 4],
    staves: [{ clef: 'treble', voices: ['r/8 G4 G4 G4 | Eb4/2 !fermata | r/8 F4 F4 F4 | D4/2~ | D4/2 !fermata |'] }],
  },
  layers: [
    { id: 'motive', label: 'Motive', color: 'root', select: '0.0.1-4', description: 'Three repeated eighth notes and a held note a third lower: short, short, short, long.' },
    { id: 'sequence', label: 'Sequence', color: 'alt', select: '0.0.6-10', description: 'The same rhythm and contour one step lower (F F F D): a sequence. The interval shrinks from a major third to a minor third because the notes stay in the key.' },
  ],
  brackets: [
    { first: '0.0.1', last: '0.0.4', label: 'Motive', color: 'root', layer: 'motive' },
    { first: '0.0.6', last: '0.0.10', label: 'Sequence, a step lower', color: 'alt', layer: 'sequence' },
  ],
  commentary: [
    'Perhaps the most famous motive ever written is mostly rhythm: three short notes and a long one. Beethoven repeats it a step lower at once, and the whole movement keeps returning to the pattern in every register and instrument.',
  ],
};

const FM_TONIC = '(F3 Ab3 C4)';
const FM_V65 = '(E3 G3 Bb3 C4)';

/**
 * Beethoven, Piano Sonata in F minor, Op. 2 No. 1, first movement: the upbeat and bars 1 to 8, the
 * textbook example of a sentence (presentation, then continuation to a half cadence).
 */
export const OP2_NO1: Excerpt = {
  id: 'op2no1',
  composer: 'Ludwig van Beethoven',
  work: 'Piano Sonata in F minor, Op. 2 No. 1 (1795)',
  bars: 'First movement, the upbeat and bars 1 to 8',
  tempo: 152,
  source: MUTOPIA('Piano Sonata Op. 2 No. 1, first movement'),
  spec: {
    key: makeKey('F', 'minor'),
    time: [4, 4],
    pickup: 1,
    staves: [
      {
        clef: 'treble',
        voices: [
          'C4/4 !stacc | F4 !stacc Ab4 !stacc C5 !stacc F5 !stacc | Ab5/4. 3:2[ G5/16 F5 E5 ] F5/4 !stacc r/4 | ' +
            'G4/4 !stacc C5 !stacc E5 !stacc G5 !stacc | Bb5/4. 3:2[ Ab5/16 G5 F5 ] G5/4 !stacc r/4 | ' +
            '^C5/16 Ab5/4. 3:2[ G5/16 F5 E5 ] F5/4 !stacc r/4 | ^C5/16 Bb5/4. 3:2[ Ab5/16 G5 F5 ] G5/4 !stacc r/4 | ' +
            '(C5 F5 Ab5 C6)/2 Bb5/8 Ab5 G5 F5 | ^E5/16 ^F5 ^G5 F5/4 E5/4 !stacc r/4 !fermata r/4 |',
        ],
      },
      {
        clef: 'bass',
        voices: [
          `r/4 | r/1 | r/4 ${FM_TONIC} !stacc _"i" ${FM_TONIC} !stacc ${FM_TONIC} !stacc | ` +
            `${FM_V65}/4 !stacc _"V⁶₅" r/4 r/2 | r/4 ${FM_V65} !stacc ${FM_V65} !stacc ${FM_V65} !stacc | ` +
            `r/4 ${FM_TONIC} !stacc _"i" ${FM_TONIC} !stacc ${FM_TONIC} !stacc | r/4 (G3 Bb3 E4) !stacc _"vii°⁶" (G3 Bb3 E4) !stacc (G3 Bb3 E4) !stacc | ` +
            'r/4 (Ab3 C4 F4) !stacc _"i⁶" r/4 (Bb3 Db4 G4) !stacc _"ii°⁶" | r/4 (C4 G4) !stacc _"V" r/4 !fermata r/4 |',
        ],
      },
    ],
  },
  layers: [
    { id: 'bi', label: 'Basic idea', color: 'root', select: '0.0.0-9', description: 'Two bars that state the tonic: an arpeggio rising from the upbeat (the "Mannheim rocket") and a turn figure that settles on F.' },
    { id: 'rep', label: 'Repetition', color: 'alt', select: '0.0.11-19', description: 'The basic idea again, on the dominant seventh: a statement and response, like a question and its echo.' },
    { id: 'frag', label: 'Fragmentation', color: 'extra', select: '0.0.21-25, 0.0.27-31', description: 'Only the second bar of the idea, now in one-bar units that alternate tonic and dominant: the music speeds up.' },
    { id: 'cad', label: 'Cadence', color: 'other', select: '0.0.33-39', description: 'A loud chord, a run down and a turn on to C: a half cadence on V, the phrase ends open.' },
  ],
  brackets: [
    { first: '0.0.0', last: '0.0.9', label: 'Basic idea (i)', color: 'root', layer: 'bi' },
    { first: '0.0.11', last: '0.0.19', label: 'Repetition (V⁷)', color: 'alt', layer: 'rep' },
    { first: '0.0.21', last: '0.0.25', label: 'Fragment', color: 'extra', layer: 'frag' },
    { first: '0.0.27', last: '0.0.31', label: 'Fragment', color: 'extra', layer: 'frag' },
    { first: '0.0.33', last: '0.0.39', label: 'Half cadence', color: 'other', layer: 'cad' },
    { first: '0.0.0', last: '0.0.19', label: 'Presentation (4 bars)', row: 1 },
    { first: '0.0.21', last: '0.0.39', label: 'Continuation (4 bars)', row: 1 },
  ],
  barsPerLine: 4,
  commentary: [
    'A sentence states an idea, repeats it, then breaks it into smaller pieces that drive to a cadence. Here the two-bar basic idea is stated on the tonic and answered on the dominant. The continuation keeps only the second bar of the idea, so the units shrink from two bars to one, the harmony changes twice as fast, and the phrase gathers speed into the half cadence in bar 8.',
    'Proportions of 2 + 2 + 4 bars, with the last four bars breaking up and accelerating, are the signature of the sentence. Listen for the same plan in the openings of many Classical sonatas.',
  ],
};
