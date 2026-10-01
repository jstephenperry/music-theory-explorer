/**
 * Southeast Asian tunings that lie outside 12-tone equal temperament. Gamelan tunings differ from
 * one ensemble to the next, so the values here are representative rather than definitive.
 */
import { define, fromAbsolute } from './define';

type N = [string, number];
// A representative Central Javanese pelog tuning, tones 1 to 7, in cents above tone 1.
const P1: N = ['C', 0];
const P2: N = ['Db', 120];
const P3: N = ['Eb', 270];
const P4: N = ['F', 540];
const P5: N = ['G', 670];
const P6: N = ['Ab', 785];
const P7: N = ['Bb', 950];

const thai = (k: number) => (k * 1200) / 7;

export const SOUTHEAST_ASIAN = [
  ...define('southeast-asian', 'Javanese and Balinese gamelan', [
    {
      id: 'slendro', name: 'Slendro (idealized)',
      intervals: fromAbsolute([['C', 0], ['D', 240], ['F', 480], ['G', 720], ['Bb', 960]]),
      degreeNames: ['1 (barang)', '2 (gulu)', '3 (dada)', '5 (lima)', '6 (nem)'],
      facts: [['Steps', 'Five nearly equal steps of about 240 cents']],
      description: 'The five-tone gamelan tuning, with steps close to a fifth of an octave. Real gamelans deviate from equal steps, and each ensemble has its own tuning; this is the idealized form.',
      mood: ['gamelan', 'floating'],
    },
    {
      id: 'pelog', name: 'Pelog (seven tones)',
      intervals: fromAbsolute([P1, P2, P3, P4, P5, P6, P7]),
      degreeNames: ['1', '2', '3', '4', '5', '6', '7'],
      facts: [['Tuning', 'Representative Central Javanese values; every gamelan differs']],
      description: 'The seven-tone gamelan tuning, with a mix of small and large steps. Pieces normally use a five-tone subset (pathet), with the other two tones as ornaments.',
      mood: ['gamelan'],
    },
    {
      id: 'pelog-nem', name: 'Pelog pathet lima and nem',
      intervals: fromAbsolute([P1, P2, P3, P5, P6]),
      degreeNames: ['1', '2', '3', '5', '6'],
      description: 'Tones 1, 2, 3, 5 and 6 of pelog, the subset used by pathet lima and pathet nem (which differ in their important tones and register).',
    },
    {
      id: 'pelog-barang', name: 'Pelog pathet barang',
      intervals: fromAbsolute([P2, P3, P5, P6, P7]),
      degreeNames: ['2', '3', '5', '6', '7'],
      description: 'Tones 2, 3, 5, 6 and 7 of pelog, the subset of pathet barang.',
    },
  ]),

  ...define('southeast-asian', 'Thai classical tuning', [
    {
      id: 'thai-7-tet', name: 'Thai seven-tone equal (theoretical)',
      intervals: fromAbsolute([['C', 0], ['D', thai(1)], ['Eb', thai(2)], ['F', thai(3)], ['G', thai(4)], ['A', thai(5)], ['Bb', thai(6)]]),
      facts: [['Step', '171.4 cents (one seventh of an octave)']],
      description: 'Thai classical instruments are often described as tuned to seven equal steps per octave. Measurements of real instruments vary, but the model shows how neither major nor minor thirds exist: every third is neutral.',
    },
  ]),
];
