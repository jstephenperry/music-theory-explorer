/**
 * Turkish makamlar in the Arel-Ezgi-Uzdilek (AEU) system: the octave is divided into 53 commas
 * (Holdrian commas of about 22.64 cents). Whole tones are 9 commas, and steps of 4, 5, 8, 12 and
 * 13 commas make the characteristic tetrachords and pentachords. Each makam is listed on its
 * customary tonic (durak) with its steps in commas.
 */
import { define, fromSteps } from './define';

const HEPTA_MAJOR = ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'];
const HEPTA_MINOR = ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'];
const commas = (names: string[], steps: number[], tonicCents = 0) => fromSteps(names, steps, 53, tonicCents);
/** Segâh (B with a one-comma flat) lies 17 commas above Rast (G): 15.1 cents below equal-tempered B. */
const SEGAH = (17 * 1200) / 53 - 400;

export const TURKISH = [
  ...define('turkish', 'Çargâh family', [
    {
      id: 'makam-cargah', name: 'Çargâh', tonic: 'C',
      intervals: commas(HEPTA_MAJOR, [9, 9, 4, 9, 9, 9]),
      facts: [['Durak (tonic)', 'Çargâh (C)'], ['Güçlü (dominant)', 'Gerdaniye (G)'], ['Structure', 'Çargâh pentachord + Çargâh tetrachord'], ['Steps (commas)', '9 9 4 9 9 9 4']],
      description: 'The Turkish major scale, built from Pythagorean whole tones (9 commas) and limmas (4 commas). Rare in the classical repertoire, but the reference for the AEU note names.',
    },
    {
      id: 'makam-mahur', name: 'Mahur', tonic: 'G',
      intervals: commas(HEPTA_MAJOR, [9, 9, 4, 9, 9, 9]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Steps (commas)', '9 9 4 9 9 9 4']],
      description: 'Çargâh transposed to G (a şed makam). It opens in the upper register and descends to the tonic.',
    },
  ]),

  ...define('turkish', 'Bûselik family', [
    {
      id: 'makam-buselik', name: 'Bûselik', tonic: 'A',
      intervals: commas(HEPTA_MINOR, [9, 4, 9, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Hüseynî (E)'], ['Structure', 'Bûselik pentachord + Kürdî tetrachord'], ['Steps (commas)', '9 4 9 9 4 9 9']],
      description: 'A natural-minor makam on A. The upper tetrachord is often replaced by Hicaz (with G♯) near cadences.',
    },
    {
      id: 'makam-nihavend', name: 'Nihavend', tonic: 'G',
      intervals: commas(HEPTA_MINOR, [9, 4, 9, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Bûselik pentachord + Kürdî or Hicaz tetrachord'], ['Steps (commas)', '9 4 9 9 4 9 9']],
      description: 'The Turkish minor on G, very common in light classical and popular music. Ascending phrases often use F♯ (Hicaz on D).',
      mood: ['romantic', 'melancholic'],
    },
  ]),

  ...define('turkish', 'Kürdî family', [
    {
      id: 'makam-kurdi', name: 'Kürdî', tonic: 'A',
      intervals: commas(['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'], [4, 9, 9, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Kürdî tetrachord + Bûselik pentachord'], ['Steps (commas)', '4 9 9 9 4 9 9']],
      description: 'A Phrygian-type makam whose second degree is a bakiye flat (4 commas above the tonic).',
    },
    {
      id: 'makam-kurdilihicazkar', name: 'Kürdilihicazkâr', tonic: 'G',
      intervals: commas(['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'], [4, 9, 9, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Steps (commas)', '4 9 9 9 4 9 9']],
      description: 'The Kürdî scale transposed to G (a şed makam), one of the most popular makams of 20th-century Turkish art song.',
    },
  ]),

  ...define('turkish', 'Rast family', [
    {
      id: 'makam-rast', name: 'Rast', tonic: 'G',
      intervals: commas(HEPTA_MAJOR, [9, 8, 5, 9, 9, 8]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Rast pentachord + Rast tetrachord'], ['Steps (commas)', '9 8 5 9 9 8 5']],
      description: 'The foundational Turkish makam. Its third (segâh, B lowered by a comma) and seventh (eviç, F♯ lowered by a comma) are slightly flat of their Western counterparts. In descent the seventh becomes F natural (acem).',
      characteristic: [2, 6],
    },
    {
      id: 'makam-suzinak', name: 'Suzinak', tonic: 'G',
      intervals: commas(['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M7'], [9, 8, 5, 9, 5, 12]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Rast pentachord + Hicaz tetrachord'], ['Steps (commas)', '9 8 5 9 5 12 5']],
      description: 'Rast below and Hicaz above (E♭ and F♯ on the dominant). The counterpart of the Arabic Suznak.',
      characteristic: [2, 5],
    },
  ]),

  ...define('turkish', 'Uşşak family', [
    {
      id: 'makam-ussak', name: 'Uşşak', tonic: 'A',
      intervals: commas(HEPTA_MINOR, [8, 5, 9, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Uşşak tetrachord + Bûselik pentachord'], ['Steps (commas)', '8 5 9 9 4 9 9']],
      description: 'The Turkish relative of Arabic Bayati: the second degree (segâh) is lowered by a comma, making a step of 8 commas followed by one of 5.',
      characteristic: [1],
    },
    {
      id: 'makam-huseyni', name: 'Hüseynî', tonic: 'A',
      intervals: commas(['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'], [8, 5, 9, 9, 8, 5]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Hüseynî (E)'], ['Structure', 'Hüseynî pentachord + Uşşak tetrachord'], ['Steps (commas)', '8 5 9 9 8 5 9']],
      description: 'Like Uşşak with a raised sixth (eviç), and centered on the fifth degree, hüseynî (E). Muhayyer uses the same notes but develops from the upper octave.',
      aliases: ['Muhayyer (same notes, from the upper octave)'],
      characteristic: [1, 5],
    },
    {
      id: 'makam-neva', name: 'Neva', tonic: 'A',
      intervals: commas(['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'], [8, 5, 9, 9, 8, 5]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Uşşak tetrachord + Rast pentachord on D'], ['Steps (commas)', '8 5 9 9 8 5 9']],
      description: 'The same notes as Hüseynî, but built as Uşşak plus a Rast pentachord on the fourth degree, which is its dominant.',
      characteristic: [1, 5],
    },
    {
      id: 'makam-karcigar', name: 'Karcığar', tonic: 'A',
      intervals: commas(['P1', 'M2', 'm3', 'P4', 'd5', 'M6', 'm7'], [8, 5, 9, 5, 12, 5]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Uşşak tetrachord + Hicaz pentachord on D'], ['Steps (commas)', '8 5 9 5 12 5 9']],
      description: 'Uşşak below, Hicaz on the fourth degree above, so the fifth degree is lowered to E♭.',
      characteristic: [1, 4],
    },
  ]),

  ...define('turkish', 'Hicaz family', [
    {
      id: 'makam-hicaz', name: 'Hicaz', tonic: 'A',
      intervals: commas(['P1', 'm2', 'M3', 'P4', 'P5', 'M6', 'm7'], [5, 12, 5, 9, 8, 5]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Hicaz tetrachord + Rast pentachord on D'], ['Steps (commas)', '5 12 5 9 8 5 9']],
      description: 'Hicaz tetrachord on the tonic (a 12-comma augmented second between B♭ and C♯), with Rast on the fourth degree.',
      characteristic: [1, 2],
    },
    {
      id: 'makam-humayun', name: 'Hümayun', tonic: 'A',
      intervals: commas(['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'], [5, 12, 5, 9, 4, 9]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Hicaz tetrachord + Bûselik pentachord on D'], ['Steps (commas)', '5 12 5 9 4 9 9']],
      description: 'Hicaz with a minor upper half (F natural): the closest Turkish makam to Phrygian dominant.',
      characteristic: [1, 2],
    },
    {
      id: 'makam-uzzal', name: 'Uzzal', tonic: 'A',
      intervals: commas(['P1', 'm2', 'M3', 'P4', 'P5', 'M6', 'm7'], [5, 12, 5, 9, 8, 5]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Hüseynî (E)'], ['Structure', 'Hicaz pentachord + Uşşak tetrachord on E'], ['Steps (commas)', '5 12 5 9 8 5 9']],
      description: 'The same steps as Hicaz, but organized around the fifth degree (E), which is its dominant.',
      characteristic: [1, 2],
    },
    {
      id: 'makam-zirguleli-hicaz', name: 'Zirgüleli Hicaz', tonic: 'A',
      intervals: commas(['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'], [5, 12, 5, 9, 5, 12]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Hicaz pentachord + Hicaz tetrachord on E'], ['Steps (commas)', '5 12 5 9 5 12 5']],
      description: 'Two Hicaz tetrachords: the double harmonic scale in Pythagorean-based tuning.',
      characteristic: [1, 5],
    },
    {
      id: 'makam-hicazkar', name: 'Hicazkâr', tonic: 'G',
      intervals: commas(['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'], [5, 12, 5, 9, 5, 12]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Steps (commas)', '5 12 5 9 5 12 5']],
      description: 'Zirgüleli Hicaz transposed to G (a şed makam).',
      characteristic: [1, 5],
    },
  ]),

  ...define('turkish', 'Saba', [
    {
      id: 'makam-saba', name: 'Saba', tonic: 'A',
      intervals: commas(['P1', 'M2', 'm3', 'd4', 'P5', 'm6', 'm7'], [8, 5, 5, 13, 4, 9]),
      facts: [['Durak (tonic)', 'Dügâh (A)'], ['Güçlü (dominant)', 'Çargâh (C)'], ['Structure', 'Saba tetrachord + Hicaz tetrachord on C'], ['Steps (commas)', '8 5 5 13 4 9 9']],
      description: 'A melancholy makam whose diminished fourth (D♭) makes the lower tetrachord narrower than a perfect fourth. Like Arabic Saba, it does not repeat exactly in the upper octave.',
      mood: ['sorrowful'], characteristic: [1, 3],
    },
  ]),

  ...define('turkish', 'Segâh family', [
    {
      id: 'makam-segah', name: 'Segâh', tonic: 'B',
      intervals: commas(['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'], [5, 9, 9, 8, 5, 9], SEGAH),
      facts: [['Durak (tonic)', 'Segâh (B with a one-comma flat)'], ['Güçlü (dominant)', 'Neva (D)'], ['Steps (commas)', '5 9 9 8 5 9 8']],
      description: 'A makam on the segâh note, B lowered by one comma. It uses the notes of Rast, started on the third degree.',
      characteristic: [0],
    },
    {
      id: 'makam-huzzam', name: 'Hüzzam', tonic: 'B',
      intervals: commas(['P1', 'm2', 'm3', 'd4', 'P5', 'm6', 'm7'], [5, 9, 5, 12, 5, 9], SEGAH),
      facts: [['Durak (tonic)', 'Segâh (B with a one-comma flat)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Segâh trichord + Hicaz tetrachord on D'], ['Steps (commas)', '5 9 5 12 5 9 8']],
      description: 'Segâh with a Hicaz tetrachord on its third degree, giving an intense, highly ornamented color.',
      characteristic: [0, 3],
    },
  ]),

  ...define('turkish', 'Nikriz family', [
    {
      id: 'makam-nikriz', name: 'Nikriz', tonic: 'G',
      intervals: commas(['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'M7'], [9, 4, 13, 5, 9, 8]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Güçlü (dominant)', 'Neva (D)'], ['Structure', 'Nikriz pentachord + Rast tetrachord'], ['Steps (commas)', '9 4 13 5 9 8 5']],
      description: 'A minor third followed by a 13-comma augmented second up to the raised fourth, with Rast on the dominant (so the seventh is eviç, F♯ lowered by a comma).',
      characteristic: [3],
    },
    {
      id: 'makam-neveser', name: 'Neveser', tonic: 'G',
      intervals: commas(['P1', 'M2', 'm3', 'A4', 'P5', 'm6', 'M7'], [9, 4, 13, 5, 5, 12]),
      facts: [['Durak (tonic)', 'Rast (G)'], ['Structure', 'Nikriz pentachord + Hicaz tetrachord'], ['Steps (commas)', '9 4 13 5 5 12 5']],
      description: 'Nikriz with a Hicaz tetrachord on the dominant: two augmented seconds.',
      characteristic: [3, 5],
    },
  ]),
];
