/**
 * The eight echoi (Oktoechos) of Byzantine chant as taught in the Chrysanthine "New Method",
 * with the intervals fixed by the Patriarchal Music Committee of Constantinople (1881): the
 * octave has 72 moria (16.7 cents each).
 *
 * - Diatonic: Ni-Pa 12, Pa-Vou 10, Vou-Ga 8, Ga-Di 12, Di-Ke 12, Ke-Zo 10, Zo-Ni 8.
 * - Soft chromatic: 8, 14, 8, 12 (a repeating tetrachord around Di).
 * - Hard chromatic: 6, 20, 4, 12 (Pa to Di, repeated from Ke).
 * - Enharmonic (as used for the third mode): 12, 12, 6, 12.
 *
 * The note names map to letters as Ni = C, Pa = D, Vou = E, Ga = F, Di = G, Ke = A, Zo = B.
 * Pitches are written in cents above Ni.
 */
import { define, fromAbsolute } from './define';

type N = [string, number];
const m = (moria: number) => (moria * 1200) / 72;

// Diatonic scale on Ni.
const NI: N = ['C', 0];
const PA: N = ['D', m(12)];
const VOU: N = ['E', m(22)];
const GA: N = ['F', m(30)];
const DI: N = ['G', m(42)];
const KE: N = ['A', m(54)];
const ZO: N = ['B', m(64)];
const up = ([n, c]: N): N => [n, c + 1200];

export const BYZANTINE = [
  ...define('byzantine', 'The eight echoi', [
    {
      id: 'echos-1', name: 'First mode (Echos Protos)', tonic: 'D',
      intervals: fromAbsolute([PA, VOU, GA, DI, KE, ZO, up(NI)]),
      facts: [['Genus', 'Diatonic'], ['Base', 'Pa'], ['Steps (moria)', '10 8 12 12 10 8 12']],
      description: 'Diatonic, based on Pa: a minor-type scale whose second and sixth degrees (Vou, Zo) are lower than in Western tuning.',
      degreeNames: ['Pa', 'Vou', 'Ga', 'Di', 'Ke', 'Zo', 'Ni'],
    },
    {
      id: 'echos-2', name: 'Second mode (Echos Deuteros)', tonic: 'G',
      intervals: fromAbsolute([DI, ['Ab', 700 + m(8)], ['B', 700 + m(22)], ['C', 700 + m(30)], ['Db', 700 + m(38)], ['E', 700 + m(52)], ['F', 700 + m(60)]]),
      facts: [['Genus', 'Soft chromatic'], ['Base', 'Di'], ['Steps (moria)', '8 14 8 8 14 8 12']],
      description: 'Soft chromatic, based on Di. Built from repeating three-note groups (8 + 14 moria) rather than tetrachords, so it lacks a stable fifth.',
      degreeNames: ['Di', 'Ke', 'Zo', 'Ni', 'Pa', 'Vou', 'Ga'],
      characteristic: [1, 4],
    },
    {
      id: 'echos-3', name: 'Third mode (Echos Tritos)', tonic: 'F',
      intervals: fromAbsolute([GA, ['G', 500 + m(12)], ['A', 500 + m(24)], ['Bb', 500 + m(30)], ['C', 500 + m(42)], ['D', 500 + m(54)], ['E', 500 + m(66)]]),
      facts: [['Genus', 'Enharmonic'], ['Base', 'Ga'], ['Steps (moria)', '12 12 6 12 12 12 6']],
      description: 'Enharmonic, based on Ga, with Zo flattened. In the 1881 tuning its steps match the equal-tempered major scale.',
      degreeNames: ['Ga', 'Di', 'Ke', 'Zo♭', 'Ni', 'Pa', 'Vou'],
    },
    {
      id: 'echos-4', name: 'Fourth mode (Echos Tetartos)', tonic: 'G',
      intervals: fromAbsolute([DI, KE, ZO, up(NI), up(PA), up(VOU), up(GA)]),
      facts: [['Genus', 'Diatonic'], ['Base', 'Di (heirmologic); also Pa and Vou'], ['Steps (moria)', '12 10 8 12 10 8 12']],
      description: 'Diatonic. Its heirmologic form is based on Di; the sticheraric form ends on Pa, and Legetos is based on Vou.',
      degreeNames: ['Di', 'Ke', 'Zo', 'Ni', 'Pa', 'Vou', 'Ga'],
    },
    {
      id: 'echos-legetos', name: 'Legetos (fourth mode on Vou)', tonic: 'E',
      intervals: fromAbsolute([VOU, GA, DI, KE, ZO, up(NI), up(PA)]),
      facts: [['Genus', 'Diatonic'], ['Base', 'Vou'], ['Steps (moria)', '8 12 12 10 8 12 10']],
      description: 'A form of the fourth mode based on Vou, used for many hymns of the Heirmologion.',
      degreeNames: ['Vou', 'Ga', 'Di', 'Ke', 'Zo', 'Ni', 'Pa'],
    },
    {
      id: 'echos-plagal-1', name: 'Plagal of the first mode', tonic: 'D',
      intervals: fromAbsolute([PA, VOU, GA, DI, KE, ZO, up(NI)]),
      facts: [['Genus', 'Diatonic'], ['Base', 'Pa (also Ke)'], ['Steps (moria)', '10 8 12 12 10 8 12']],
      description: 'Diatonic like the first mode and also based on Pa, but with its own melodic formulas and cadences, often reaching down below the base.',
      degreeNames: ['Pa', 'Vou', 'Ga', 'Di', 'Ke', 'Zo', 'Ni'],
    },
    {
      id: 'echos-plagal-2', name: 'Plagal of the second mode', tonic: 'D',
      intervals: fromAbsolute([PA, ['Eb', 200 + m(6)], ['F#', 200 + m(26)], ['G', 200 + m(30)], ['A', 200 + m(42)], ['Bb', 200 + m(48)], ['C#', 200 + m(68)]]),
      facts: [['Genus', 'Hard chromatic'], ['Base', 'Pa'], ['Steps (moria)', '6 20 4 12 6 20 4']],
      description: 'Hard chromatic, based on Pa: a narrow step, a very wide one and a very narrow one in each tetrachord. Close to the Hijaz sound of Arabic and Turkish music.',
      degreeNames: ['Pa', 'Vou', 'Ga', 'Di', 'Ke', 'Zo', 'Ni'],
      characteristic: [1, 2],
    },
    {
      id: 'echos-varys', name: 'Grave mode (Echos Varys)', tonic: 'B',
      intervals: fromAbsolute([ZO, up(NI), up(PA), up(VOU), up(GA), up(DI), up(KE)]),
      facts: [['Genus', 'Diatonic (an enharmonic form is based on Ga)'], ['Base', 'Zo'], ['Steps (moria)', '8 12 10 8 12 12 10']],
      description: 'The diatonic grave mode is based on Zo, so its fifth (Ga) is diminished. Its enharmonic form shares the notes of the third mode and is based on Ga.',
      degreeNames: ['Zo', 'Ni', 'Pa', 'Vou', 'Ga', 'Di', 'Ke'],
      characteristic: [4],
    },
    {
      id: 'echos-plagal-4', name: 'Plagal of the fourth mode', tonic: 'C',
      intervals: fromAbsolute([NI, PA, VOU, GA, DI, KE, ZO]),
      facts: [['Genus', 'Diatonic'], ['Base', 'Ni (also Ga and Di)'], ['Steps (moria)', '12 10 8 12 12 10 8']],
      description: 'Diatonic, based on Ni: the reference scale of Byzantine theory, close to a major scale with a lowered third and seventh.',
      degreeNames: ['Ni', 'Pa', 'Vou', 'Ga', 'Di', 'Ke', 'Zo'],
    },
  ]),
];
