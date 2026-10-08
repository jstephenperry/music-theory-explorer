/**
 * Carnatic (South Indian) classical music: the 72 melakarta (parent) ragas of Venkatamakhin's
 * system, in twelve chakras of six, plus widely performed janya (derived) ragas.
 *
 * Each melakarta has Sa and Pa, one Ma (M1 shuddha or M2 prati), and one each of Ri, Ga, Dha and
 * Ni chosen so that they stay in order. The svara variants are spelled with their own letters:
 * R3 is an augmented second (same pitch as G2), G1 a diminished third (same pitch as R2), and so on.
 */
import { define, type ScaleInput } from './define';

const NAMES = [
  'Kanakangi', 'Ratnangi', 'Ganamurti', 'Vanaspati', 'Manavati', 'Tanarupi',
  'Senavati', 'Hanumatodi', 'Dhenuka', 'Natakapriya', 'Kokilapriya', 'Rupavati',
  'Gayakapriya', 'Vakulabharanam', 'Mayamalavagowla', 'Chakravakam', 'Suryakantam', 'Hatakambari',
  'Jhankaradhvani', 'Natabhairavi', 'Keeravani', 'Kharaharapriya', 'Gourimanohari', 'Varunapriya',
  'Mararanjani', 'Charukesi', 'Sarasangi', 'Harikambhoji', 'Dheerasankarabharanam', 'Naganandini',
  'Yagapriya', 'Ragavardhini', 'Gangeyabhushani', 'Vagadheeswari', 'Shulini', 'Chalanata',
  'Salagam', 'Jalarnavam', 'Jhalavarali', 'Navaneetam', 'Pavani', 'Raghupriya',
  'Gavambhodi', 'Bhavapriya', 'Shubhapantuvarali', 'Shadvidamargini', 'Suvarnangi', 'Divyamani',
  'Dhavalambari', 'Namanarayani', 'Kamavardhini', 'Ramapriya', 'Gamanashrama', 'Vishwambari',
  'Shamalangi', 'Shanmukhapriya', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Neetimati',
  'Kantamani', 'Rishabhapriya', 'Latangi', 'Vachaspati', 'Mechakalyani', 'Chitrambari',
  'Sucharitra', 'Jyotiswarupini', 'Dhatuvardhani', 'Nasikabhushani', 'Kosalam', 'Rasikapriya',
];

const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];

/** Ri and Ga pairs, by position of the chakra within each half. */
const RG: Array<[string, string, string]> = [
  ['m2', 'd3', 'R1 G1'], ['m2', 'm3', 'R1 G2'], ['m2', 'M3', 'R1 G3'],
  ['M2', 'm3', 'R2 G2'], ['M2', 'M3', 'R2 G3'], ['A2', 'M3', 'R3 G3'],
];
/** Dha and Ni pairs, by position of the raga within its chakra. */
const DN: Array<[string, string, string]> = [
  ['m6', 'd7', 'D1 N1'], ['m6', 'm7', 'D1 N2'], ['m6', 'M7', 'D1 N3'],
  ['M6', 'm7', 'D2 N2'], ['M6', 'M7', 'D2 N3'], ['A6', 'M7', 'D3 N3'],
];

/** Better-known names for some melakartas. */
const COMMON: Record<number, string[]> = {
  8: ['Todi'], 15: ['Mayamalavagaula'], 29: ['Shankarabharanam'], 51: ['Pantuvarali'], 65: ['Kalyani'],
};

const WESTERN: Record<number, string> = {
  8: 'the Phrygian mode', 15: 'the double harmonic scale', 20: 'the Aeolian mode (natural minor)', 21: 'the harmonic minor scale',
  22: 'the Dorian mode', 23: 'the melodic minor scale', 28: 'the Mixolydian mode', 29: 'the major scale (Ionian)',
  14: 'the Phrygian dominant scale', 57: 'the Hungarian minor scale', 58: 'the Ukrainian Dorian mode', 64: 'the Lydian dominant (acoustic) scale', 65: 'the Lydian mode',
};

function melakarta(n: number): ScaleInput {
  const chakraIdx = Math.floor((n - 1) / 6);
  const pos = (n - 1) % 6;
  const ma = n <= 36 ? 'P4' : 'A4';
  const [ri, ga, rgLabel] = RG[chakraIdx % 6];
  const [dha, ni, dnLabel] = DN[pos];
  const svaras = `S ${rgLabel} ${n <= 36 ? 'M1' : 'M2'} P ${dnLabel}`;
  const western = WESTERN[n] ? ` In 12-tone terms it is ${WESTERN[n]}.` : '';
  return {
    id: `melakarta-${n}`,
    name: `${n}. ${NAMES[n - 1]}`,
    intervals: ['P1', ri, ga, ma, 'P5', dha, ni],
    aliases: COMMON[n],
    facts: [['Melakarta number', String(n)], ['Chakra', `${CHAKRAS[chakraIdx]} (${chakraIdx + 1})`], ['Svaras', svaras]],
    description: `Melakarta ${n} of 72, the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][pos]} raga of the ${CHAKRAS[chakraIdx]} chakra. Its name encodes its number by the katapayadi scheme.${western}`,
  };
}

const MELAKARTAS = CHAKRAS.flatMap((c, ci) =>
  define('carnatic', `${c} chakra (${ci * 6 + 1} to ${ci * 6 + 6})`, Array.from({ length: 6 }, (_, k) => melakarta(ci * 6 + k + 1))),
);

const janya = (parent: number, notes: string, aro: string, ava: string, rest: Omit<ScaleInput, 'intervals' | 'forms'>): ScaleInput => ({
  ...rest,
  intervals: notes.split(' '),
  forms: [
    { label: 'Arohanam (ascent)', notes: aro },
    { label: 'Avarohanam (descent)', notes: ava },
  ],
  facts: [['Parent melakarta', `${parent}. ${NAMES[parent - 1]}`], ...(rest.facts ?? [])],
});

export const CARNATIC = [
  ...MELAKARTAS,
  ...define('carnatic', 'Janya ragas', [
    janya(28, 'P1 M2 M3 P5 M6', 'P1 M2 M3 P5 M6 P8', 'P8 M6 P5 M3 M2 P1', {
      id: 'raga-mohanam', name: 'Mohanam', description: 'A pentatonic raga, the Carnatic counterpart of Bhupali and the major pentatonic scale.', mood: ['joyful'],
    }),
    janya(29, 'P1 M2 M3 P5 M7', 'P1 M2 M3 P5 M7 P8', 'P8 M7 P5 M3 M2 P1', {
      id: 'raga-hamsadhwani-carnatic', name: 'Hamsadhwani', description: 'An auspicious pentatonic raga created by Ramaswami Dikshitar and often used for opening pieces.', mood: ['auspicious'],
    }),
    janya(20, 'P1 m3 P4 m6 m7', 'P1 m3 P4 m6 m7 P8', 'P8 m7 m6 P4 m3 P1', {
      id: 'raga-hindolam', name: 'Hindolam', description: 'A pentatonic raga without Ri and Pa; the Carnatic counterpart of Malkauns.', mood: ['meditative'],
    }),
    janya(22, 'P1 M2 m3 P4 M6', 'P1 M2 m3 P4 M6 P8', 'P8 M6 P4 m3 M2 P1', {
      id: 'raga-abhogi', name: 'Abhogi', description: 'A pentatonic raga without Pa and Ni.',
    }),
    janya(22, 'P1 M2 P4 P5 m7', 'P1 M2 P4 P5 m7 P8', 'P8 m7 P5 P4 M2 P1', {
      id: 'raga-madhyamavati', name: 'Madhyamavati', description: 'A pentatonic raga without Ga and Dha, traditionally sung at the end of a concert as an auspicious close.', mood: ['auspicious'],
    }),
    janya(29, 'P1 M2 P4 P5 M6', 'P1 M2 P4 P5 M6 P8', 'P8 M6 P5 P4 M2 P1', {
      id: 'raga-shuddha-saveri', name: 'Shuddha Saveri', description: 'A pentatonic raga without Ga and Ni; the same notes as Durga.',
    }),
    janya(2, 'P1 m2 P4 P5 m7', 'P1 m2 P4 P5 m7 P8', 'P8 m7 P5 P4 m2 P1', {
      id: 'raga-revati', name: 'Revati', description: 'A pentatonic raga used in Vedic chant settings and devotional music.', mood: ['devotional'],
    }),
    janya(66, 'P1 M3 A4 P5 M7', 'P1 M3 A4 P5 M7 P8', 'P8 M7 P5 A4 M3 P1', {
      id: 'raga-amritavarshini', name: 'Amritavarshini', description: 'A pentatonic raga traditionally associated with bringing rain.',
    }),
    janya(15, 'P1 m2 M3 P5 m6', 'P1 m2 M3 P5 m6 P8', 'P8 m6 P5 M3 m2 P1', {
      id: 'raga-revagupti', name: 'Revagupti', description: 'A pentatonic raga with the lower half of Mayamalavagowla, sung in the morning.',
    }),
    janya(29, 'P1 M2 M3 P4 P5 M6 M7', 'P1 M2 M3 P5 M6 P8', 'P8 M7 M6 P5 P4 M3 M2 P1', {
      id: 'raga-bilahari', name: 'Bilahari', description: 'Pentatonic going up, all seven svaras coming down.', mood: ['bright'],
    }),
    janya(29, 'P1 M2 M3 P4 P5 M6 M7', 'P1 M2 P4 P5 M6 P8', 'P8 M7 M6 P5 P4 M3 M2 P1', {
      id: 'raga-arabhi', name: 'Arabhi', description: 'Ascends like Shuddha Saveri and descends through all seven svaras of Shankarabharanam.',
    }),
    janya(28, 'P1 M2 M3 P4 P5 M6 m7 M7', 'P1 M2 M3 P4 P5 M6 P8', 'P8 m7 M6 P5 P4 M3 M2 P1 -M7 -P5 -M6 P1', {
      id: 'raga-kambhoji', name: 'Kambhoji', description: 'A major raga with N2 in the descent and an occasional N3 (a bhashanga, or foreign, note) in characteristic phrases below Sa.',
    }),
    janya(15, 'P1 m2 M3 P4 P5 m6 M7', 'P1 m2 P4 P5 m6 P8', 'P8 M7 m6 P5 P4 M3 m2 P1', {
      id: 'raga-saveri', name: 'Saveri', description: 'A morning raga of pathos. Ga and Ni are left out of the ascent.', mood: ['pathos'],
    }),
    janya(15, 'P1 m2 M3 P4 P5 m6', 'P1 m2 P4 P5 m6 P8', 'P8 m6 P5 P4 M3 m2 P1', {
      id: 'raga-malahari', name: 'Malahari', description: 'A simple raga used in early lessons (the Purandara Dasa geethams).',
    }),
    janya(20, 'P1 M2 m3 P4 P5 m6 M6 m7', 'P1 M2 m3 P4 P5 M6 m7 P8', 'P8 m7 m6 P5 P4 m3 M2 P1', {
      id: 'raga-bhairavi-carnatic', name: 'Bhairavi (Carnatic)', description: 'One of the most important Carnatic ragas. It ascends with D2 and descends with D1; unrelated to the Hindustani Bhairavi.', mood: ['majestic', 'devotional'],
    }),
    janya(28, 'P1 M2 M3 P4 P5 M6 m7', 'P1 M2 P4 P5 m7 P8', 'P8 m7 M6 P5 P4 M3 M2 P1', {
      id: 'raga-kedaragowla', name: 'Kedaragowla', description: 'Pentatonic in ascent, the full Harikambhoji scale in descent.',
    }),
  ]),
];
