/**
 * Hindustani (North Indian) classical music: the ten thaats of V. N. Bhatkhande and representative
 * ragas of each. Sa is movable, so ragas are not tied to a pitch. Forms give the aroha (ascent)
 * and avaroha (descent), which often skip or zigzag through notes. Vadi and samvadi are the most
 * and second most important notes; times follow the traditional eight watches (prahar).
 *
 * Several ragas use shrutis (microtonal shadings) and oscillations (andolan) that 12-tone
 * notation cannot show; these are mentioned in the descriptions.
 */
import { define, type ScaleInput } from './define';

const THAAT = {
  bilawal: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
  kalyan: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
  khamaj: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
  kafi: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
  asavari: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  bhairavi: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  bhairav: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'],
  purvi: ['P1', 'm2', 'M3', 'A4', 'P5', 'm6', 'M7'],
  marwa: ['P1', 'm2', 'M3', 'A4', 'P5', 'M6', 'M7'],
  todi: ['P1', 'm2', 'm3', 'A4', 'P5', 'm6', 'M7'],
};

const up = (s: string) => `${s} P8`;
const down = (s: string) => `P8 ${s}`;
const aroha = (notes: string, avaroha: string) => [
  { label: 'Aroha (ascent)', notes },
  { label: 'Avaroha (descent)', notes: avaroha },
];
const facts = (vadi: string | null, samvadi: string | null, time: string, thaat: string): Array<[string, string]> => [
  ['Thaat', thaat],
  ...(vadi ? ([['Vadi', vadi]] as Array<[string, string]>) : []),
  ...(samvadi ? ([['Samvadi', samvadi]] as Array<[string, string]>) : []),
  ['Time', time],
];

const THAATS: ScaleInput[] = [
  { id: 'thaat-bilawal', name: 'Bilawal thaat', intervals: THAAT.bilawal, description: 'All shuddha (natural) svaras. The reference scale of Bhatkhande\'s system, equal to the major scale.' },
  { id: 'thaat-kalyan', name: 'Kalyan thaat', intervals: THAAT.kalyan, description: 'Tivra (raised) Ma, all other svaras shuddha. Equal to the Lydian mode.' },
  { id: 'thaat-khamaj', name: 'Khamaj thaat', intervals: THAAT.khamaj, description: 'Komal (flat) Ni. Equal to the Mixolydian mode.' },
  { id: 'thaat-kafi', name: 'Kafi thaat', intervals: THAAT.kafi, description: 'Komal Ga and Ni. Equal to the Dorian mode.' },
  { id: 'thaat-asavari', name: 'Asavari thaat', intervals: THAAT.asavari, description: 'Komal Ga, Dha and Ni. Equal to the Aeolian mode (natural minor).' },
  { id: 'thaat-bhairavi', name: 'Bhairavi thaat', intervals: THAAT.bhairavi, description: 'Komal Re, Ga, Dha and Ni. Equal to the Phrygian mode.' },
  { id: 'thaat-bhairav', name: 'Bhairav thaat', intervals: THAAT.bhairav, description: 'Komal Re and Dha: two augmented seconds. Equal to the double harmonic scale.' },
  { id: 'thaat-purvi', name: 'Purvi thaat', intervals: THAAT.purvi, description: 'Komal Re and Dha with tivra Ma.' },
  { id: 'thaat-marwa', name: 'Marwa thaat', intervals: THAAT.marwa, description: 'Komal Re and tivra Ma.' },
  { id: 'thaat-todi', name: 'Todi thaat', intervals: THAAT.todi, description: 'Komal Re, Ga and Dha with tivra Ma.' },
];

export const HINDUSTANI = [
  ...define('hindustani', 'The ten thaats', THAATS),

  ...define('hindustani', 'Kalyan thaat ragas', [
    {
      id: 'raga-yaman', name: 'Yaman', intervals: THAAT.kalyan,
      forms: aroha('-M7 M2 M3 A4 M6 M7 P8', down('M7 M6 P5 A4 M3 M2 P1')),
      facts: facts('Ga', 'Ni', 'First watch of the night (about 6 to 9 pm)', 'Kalyan'),
      description: 'One of the first ragas taught and one of the most performed. It uses tivra Ma; Sa and Pa are often skipped in the ascent.',
      aliases: ['Iman', 'Kalyan'], mood: ['serene', 'devotional'], characteristic: [3],
    },
    {
      id: 'raga-bhupali', name: 'Bhupali', intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
      forms: aroha(up('P1 M2 M3 P5 M6'), down('M6 P5 M3 M2 P1')),
      facts: facts('Ga', 'Dha', 'First watch of the night', 'Kalyan'),
      description: 'A pentatonic raga omitting Ma and Ni: the major pentatonic scale. Calm, with Ga as the focal note.',
      aliases: ['Bhoop'], mood: ['calm', 'open'],
    },
    {
      id: 'raga-shuddh-kalyan', name: 'Shuddh Kalyan', intervals: THAAT.kalyan,
      forms: aroha(up('P1 M2 M3 P5 M6'), down('M7 M6 P5 A4 M3 M2 P1')),
      facts: facts('Ga', 'Dha', 'First watch of the night', 'Kalyan'),
      description: 'Ascends like Bhupali and descends like Yaman, with tivra Ma and Ni only in the descent.',
      characteristic: [3, 6],
    },
  ]),

  ...define('hindustani', 'Bilawal thaat ragas', [
    {
      id: 'raga-alhaiya-bilawal', name: 'Alhaiya Bilawal', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
      forms: aroha(up('P1 M2 M3 P5 M6 M7'), down('M7 M6 m7 M6 P5 P4 M3 M2 P1')),
      facts: facts('Dha', 'Ga', 'First watch of the day (morning)', 'Bilawal'),
      description: 'The principal raga of Bilawal thaat. Ma is skipped in the ascent, and a touch of komal Ni appears in the descent.',
      characteristic: [6],
    },
    {
      id: 'raga-durga', name: 'Durga', intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
      forms: aroha(up('P1 M2 P4 P5 M6'), down('M6 P5 P4 M2 P1')),
      facts: facts(null, null, 'Second watch of the night', 'Bilawal'),
      description: 'A pentatonic raga without Ga and Ni, bright and simple.',
    },
    {
      id: 'raga-hamsadhwani', name: 'Hamsadhwani', intervals: ['P1', 'M2', 'M3', 'P5', 'M7'],
      forms: aroha(up('P1 M2 M3 P5 M7'), down('M7 P5 M3 M2 P1')),
      facts: facts(null, null, 'First watch of the night', 'Bilawal'),
      description: 'A pentatonic raga borrowed from Carnatic music (created by Ramaswami Dikshitar).',
      mood: ['joyful', 'auspicious'],
    },
  ]),

  ...define('hindustani', 'Khamaj thaat ragas', [
    {
      id: 'raga-khamaj', name: 'Khamaj', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
      forms: aroha(up('P1 M3 P4 P5 M6 M7'), down('m7 M6 P5 P4 M3 M2 P1')),
      facts: facts('Ga', 'Ni', 'Second watch of the night', 'Khamaj'),
      description: 'Common in thumri and other light classical forms. Shuddha Ni in the ascent, komal Ni in the descent; Re is skipped going up.',
      mood: ['romantic', 'playful'], characteristic: [6],
    },
    {
      id: 'raga-desh', name: 'Desh', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
      forms: aroha(up('P1 M2 P4 P5 M7'), down('m7 M6 P5 P4 M3 M2 M3 -M7 P1')),
      facts: facts('Re', 'Pa', 'Second watch of the night', 'Khamaj'),
      description: 'Associated with the monsoon. The ascent is pentatonic (S R M P N), the descent winds back through Ga.',
      mood: ['romantic', 'monsoon'],
    },
    {
      id: 'raga-tilang', name: 'Tilang', intervals: ['P1', 'M3', 'P4', 'P5', 'm7', 'M7'],
      forms: aroha(up('P1 M3 P4 P5 M7'), down('m7 P5 P4 M3 P1')),
      facts: facts('Ga', 'Ni', 'Second watch of the night', 'Khamaj'),
      description: 'Omits Re and Dha. Shuddha Ni rising, komal Ni falling.',
    },
  ]),

  ...define('hindustani', 'Kafi thaat ragas', [
    {
      id: 'raga-kafi', name: 'Kafi', intervals: THAAT.kafi,
      forms: aroha(up('P1 M2 m3 P4 P5 M6 m7'), down('m7 M6 P5 P4 m3 M2 P1')),
      facts: facts('Pa', 'Sa', 'Second watch of the night', 'Kafi'),
      description: 'The parent raga of its thaat, close to the Dorian mode. Associated with spring and the Holi festival.',
      mood: ['folk', 'spring'],
    },
    {
      id: 'raga-bageshri', name: 'Bageshri', intervals: THAAT.kafi,
      forms: aroha('-m7 P1 m3 P4 M6 m7 P8', down('m7 M6 P4 m3 M2 P1')),
      facts: facts('Ma', 'Sa', 'Second watch of the night (around midnight)', 'Kafi'),
      description: 'A late-night raga of longing. Re and Pa are left out of the ascent, and Pa is used sparingly.',
      aliases: ['Bageshree'], mood: ['longing', 'romantic'],
    },
    {
      id: 'raga-bhimpalasi', name: 'Bhimpalasi', intervals: THAAT.kafi,
      forms: aroha('-m7 P1 m3 P4 P5 m7 P8', down('m7 M6 P5 P4 m3 M2 P1')),
      facts: facts('Ma', 'Sa', 'Third watch of the day (afternoon)', 'Kafi'),
      description: 'An afternoon raga. Re and Dha are omitted in the ascent; Ma is the resting note.',
      mood: ['tender', 'yearning'],
    },
    {
      id: 'raga-brindavani-sarang', name: 'Brindavani Sarang', intervals: ['P1', 'M2', 'P4', 'P5', 'm7', 'M7'],
      forms: aroha('-M7 P1 M2 P4 P5 M7 P8', down('m7 P5 P4 M2 P1')),
      facts: facts('Re', 'Pa', 'Second watch of the day (midday)', 'Kafi'),
      description: 'A midday raga without Ga and Dha, using shuddha Ni rising and komal Ni falling.',
    },
  ]),

  ...define('hindustani', 'Asavari thaat ragas', [
    {
      id: 'raga-asavari', name: 'Asavari', intervals: THAAT.asavari,
      forms: aroha(up('P1 M2 P4 P5 m6'), down('m7 m6 P5 P4 m3 M2 P1')),
      facts: facts('Dha', 'Ga', 'Second watch of the day', 'Asavari'),
      description: 'A serious morning raga. Ga and Ni are omitted in the ascent.',
      mood: ['serious', 'renunciation'],
    },
    {
      id: 'raga-jaunpuri', name: 'Jaunpuri', intervals: THAAT.asavari,
      forms: aroha(up('P1 M2 P4 P5 m6 m7'), down('m7 m6 P5 P4 m3 M2 P1')),
      facts: facts('Dha', 'Ga', 'Second watch of the day', 'Asavari'),
      description: 'Close to Asavari, but with komal Ni in the ascent.',
    },
    {
      id: 'raga-darbari-kanada', name: 'Darbari Kanada', intervals: THAAT.asavari,
      forms: aroha('-m7 P1 M2 m3 P4 P5 m6 m7 P8', down('m6 m7 P5 P4 P5 m3 P4 M2 P1')),
      facts: facts('Re', 'Pa', 'Third watch of the night (after midnight)', 'Asavari'),
      description: 'A raga of the Mughal court. Its komal Ga and komal Dha are sung slightly lower than the tempered notes, with a slow oscillation (andolan) that defines the raga.',
      mood: ['grave', 'majestic'], characteristic: [2, 5],
    },
  ]),

  ...define('hindustani', 'Bhairavi thaat ragas', [
    {
      id: 'raga-bhairavi', name: 'Bhairavi', intervals: THAAT.bhairavi,
      forms: aroha(up('P1 m2 m3 P4 P5 m6 m7'), down('m7 m6 P5 P4 m3 m2 P1')),
      facts: facts('Ma', 'Sa', 'Morning; also the customary closing piece of a concert', 'Bhairavi'),
      description: 'All four movable svaras komal; in practice musicians freely add other svaras.',
      mood: ['devotional', 'poignant'],
    },
    {
      id: 'raga-malkauns', name: 'Malkauns', intervals: ['P1', 'm3', 'P4', 'm6', 'm7'],
      forms: aroha(up('P1 m3 P4 m6 m7'), down('m7 m6 P4 m3 P1')),
      facts: facts('Ma', 'Sa', 'Third watch of the night', 'Bhairavi'),
      description: 'A meditative pentatonic raga without Re and Pa, and one of the oldest ragas.',
      aliases: ['Malkosh'], mood: ['meditative'],
    },
  ]),

  ...define('hindustani', 'Bhairav thaat ragas', [
    {
      id: 'raga-bhairav', name: 'Bhairav', intervals: THAAT.bhairav,
      forms: aroha(up('P1 m2 M3 P4 P5 m6 M7'), down('M7 m6 P5 P4 M3 m2 P1')),
      facts: facts('Dha', 'Re', 'Dawn', 'Bhairav'),
      description: 'A solemn dawn raga named after Shiva. Komal Re and komal Dha are sung with a slow oscillation (andolan).',
      mood: ['solemn', 'devotional'], characteristic: [1, 5],
    },
    {
      id: 'raga-ahir-bhairav', name: 'Ahir Bhairav', intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      forms: aroha(up('P1 m2 M3 P4 P5 M6 m7'), down('m7 M6 P5 P4 M3 m2 P1')),
      facts: facts(null, null, 'Early morning', 'Bhairav'),
      description: 'Bhairav in the lower tetrachord combined with a Kafi-like upper tetrachord (shuddha Dha, komal Ni).',
      characteristic: [1, 6],
    },
  ]),

  ...define('hindustani', 'Purvi thaat ragas', [
    {
      id: 'raga-purvi', name: 'Purvi', intervals: ['P1', 'm2', 'M3', 'P4', 'A4', 'P5', 'm6', 'M7'],
      forms: aroha('-M7 P1 m2 M3 A4 P5 m6 M7 P8', down('M7 m6 P5 A4 M3 P4 M3 m2 P1')),
      facts: facts('Ga', 'Ni', 'Sunset', 'Purvi'),
      description: 'A sunset raga using both Ma: tivra Ma in phrases, shuddha Ma touched in the descent.',
      characteristic: [1, 4, 6],
    },
    {
      id: 'raga-puriya-dhanashri', name: 'Puriya Dhanashri', intervals: THAAT.purvi,
      forms: aroha('-M7 m2 M3 A4 P5 m6 P5 M7 P8', down('M7 m6 P5 A4 M3 A4 m2 M3 m2 P1')),
      facts: facts('Pa', 'Re', 'Sunset', 'Purvi'),
      description: 'An evening raga with a zigzag (vakra) movement; Pa is the resting note.',
      characteristic: [1, 3, 5],
    },
  ]),

  ...define('hindustani', 'Marwa thaat ragas', [
    {
      id: 'raga-marwa', name: 'Marwa', intervals: ['P1', 'm2', 'M3', 'A4', 'M6', 'M7'],
      forms: aroha('-M7 m2 M3 A4 M6 M7 M6 P8', down('M7 M6 A4 M3 m2 P1')),
      facts: facts('Re', 'Dha', 'Sunset', 'Marwa'),
      description: 'A tense, unsettled sunset raga without Pa. Sa is avoided for long stretches, so komal Re and Dha carry the weight.',
      mood: ['tense', 'restless'], characteristic: [1, 3],
    },
    {
      id: 'raga-puriya', name: 'Puriya', intervals: ['P1', 'm2', 'M3', 'A4', 'M6', 'M7'],
      forms: aroha('-M7 m2 M3 A4 M6 M7 P8', down('M7 M6 A4 M3 m2 P1')),
      facts: facts('Ga', 'Ni', 'First watch of the night', 'Marwa'),
      description: 'The same notes as Marwa, but focused on Ga and Ni and the lower register, which makes it calmer.',
      characteristic: [1, 3],
    },
    {
      id: 'raga-sohini', name: 'Sohini', intervals: ['P1', 'm2', 'M3', 'A4', 'M6', 'M7'],
      forms: aroha(up('P1 M3 A4 M6 M7'), down('M7 M6 M3 A4 M6 M3 m2 P1')),
      facts: facts('Dha', 'Ga', 'Last watch of the night', 'Marwa'),
      description: 'The notes of Marwa, but focused on the upper tetrachord and the high Sa.',
      characteristic: [1, 3],
    },
  ]),

  ...define('hindustani', 'Todi thaat ragas', [
    {
      id: 'raga-todi', name: 'Miyan ki Todi', intervals: THAAT.todi,
      forms: aroha(up('P1 m2 m3 A4 m6 M7'), down('M7 m6 P5 A4 m3 m2 P1')),
      facts: facts('Dha', 'Ga', 'Second watch of the day', 'Todi'),
      description: 'One of the principal morning ragas. Its komal Re and komal Ga are sung lower than their tempered pitches; Pa is weak and often skipped.',
      aliases: ['Todi'], mood: ['serious'], characteristic: [1, 2, 3],
    },
    {
      id: 'raga-multani', name: 'Multani', intervals: THAAT.todi,
      forms: aroha('-M7 P1 m3 A4 P5 M7 P8', down('M7 m6 P5 A4 m3 m2 P1')),
      facts: facts('Pa', 'Sa', 'Third watch of the day (afternoon)', 'Todi'),
      description: 'An afternoon raga with the notes of Todi but a different shape: Re and Dha are omitted in the ascent.',
      characteristic: [2, 3],
    },
    {
      id: 'raga-gurjari-todi', name: 'Gurjari Todi', intervals: ['P1', 'm2', 'm3', 'A4', 'm6', 'M7'],
      forms: aroha(up('P1 m2 m3 A4 m6 M7'), down('M7 m6 A4 m3 m2 P1')),
      facts: facts(null, null, 'Morning', 'Todi'),
      description: 'Todi without Pa.',
      characteristic: [1, 2, 3],
    },
  ]),
];
