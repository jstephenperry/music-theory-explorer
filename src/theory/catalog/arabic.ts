/**
 * Arabic maqamat, grouped by the jins (tetrachord or trichord) on their tonic, following the
 * families of MaqamWorld (Johnny Farraj and Sami Abu Shumays). Pitches are the intonation that
 * MaqamWorld uses for its playable examples, in cents above C (its C is 260.7 Hz, close to equal-
 * tempered middle C). Half-flat notes sit roughly a quarter tone below the natural; Pythagorean
 * whole tones (204 cents) are slightly wider than equal-tempered ones.
 */
import { absForm, define, fromAbsolute } from './define';

type N = [string, number];
const C: N = ['C', 0];
const D: N = ['D', 204];
const C8: N = ['C', 1200];

export const ARABIC = [
  ...define('arabic', 'Rast family', [
    {
      id: 'rast', name: 'Rast', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 355], ['F', 498], ['G', 702], ['A', 906], ['B', 1064]]),
      forms: [
        { label: 'Ascending', notes: absForm(C, [C, D, ['E', 355], ['F', 498], ['G', 702], ['A', 906], ['B', 1064], C8]) },
        { label: 'Descending', notes: absForm(C, [C8, ['Bb', 996], ['A', 906], ['G', 702], ['F', 498], ['E', 355], D, C]) },
      ],
      facts: [['Lower jins', 'Rast on C'], ['Upper jins', 'Rast on G ascending, Nahawand on G descending'], ['Ghammaz (pivot)', 'G']],
      description: 'The principal maqam of the Rast family and one of the most common in Arabic music. Its half-flat third and seventh sit between major and minor. The seventh is usually B half-flat going up and B♭ coming down.',
      mood: ['noble', 'proud', 'warm'], characteristic: [2, 6],
    },
    {
      id: 'mahur', name: 'Mahur', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 355], ['F', 498], ['G', 702], ['A', 906], ['B', 1110]]),
      facts: [['Lower jins', 'Rast on C'], ['Upper jins', 'ʿAjam on G']],
      description: 'Rast with a natural (major) seventh. It favors the upper register and resolves through the leading tone.',
      mood: ['bright', 'festive'], characteristic: [2, 6],
    },
    {
      id: 'suzdalara', name: 'Suzdalara', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 355], ['F', 498], ['G', 702], ['A', 906], ['Bb', 996]]),
      description: 'A member of the Rast family that uses B♭ throughout, the form of the upper octave that Rast takes when it descends.',
      characteristic: [2, 6],
    },
    {
      id: 'suznak', name: 'Suznak', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 355], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100]]),
      facts: [['Lower jins', 'Rast on C'], ['Upper jins', 'Hijaz on G']],
      description: 'Rast below and Hijaz above: the augmented second between A♭ and B gives the upper half a strong pull toward the octave.',
      mood: ['yearning'], characteristic: [2, 5],
    },
    {
      id: 'nairuz', name: 'Nairuz', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 355], ['F', 498], ['G', 702], ['A', 853], ['Bb', 996]]),
      facts: [['Lower jins', 'Rast on C'], ['Upper jins', 'Bayati on G']],
      description: 'Rast with a Bayati tetrachord on the fifth, which adds a second half-flat note (A half-flat).',
      characteristic: [2, 5],
    },
  ]),

  ...define('arabic', 'Bayati family', [
    {
      id: 'bayati', name: 'Bayati', tonic: 'D',
      intervals: fromAbsolute([D, ['E', 355], ['F', 485], ['G', 702], ['A', 906], ['Bb', 996], C8]),
      facts: [['Lower jins', 'Bayati on D'], ['Upper jins', 'Nahawand on G (also Rast on G)'], ['Ghammaz (pivot)', 'G']],
      description: 'The most common maqam of everyday Arabic music. The half-flat second makes a three-quarter-tone step from the tonic, giving its typical gentle, plaintive sound. Muhayyar is Bayati developed from the upper octave.',
      aliases: ['Muhayyar (from the upper octave)'],
      mood: ['plaintive', 'earthy', 'warm'], characteristic: [1],
    },
    {
      id: 'bayati-shuri', name: 'Bayati Shuri', tonic: 'D',
      intervals: fromAbsolute([D, ['E', 355], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100], C8]),
      facts: [['Lower jins', 'Bayati on D'], ['Upper jins', 'Hijaz on G']],
      description: 'Bayati below with Hijaz on the fourth degree, so the fifth is lowered to A♭.',
      characteristic: [1, 4, 5],
    },
    {
      id: 'husayni', name: 'Husayni', tonic: 'D',
      intervals: fromAbsolute([D, ['E', 355], ['F', 498], ['G', 702], ['A', 906], ['B', 1057], C8]),
      facts: [['Lower jins', 'Bayati on D'], ['Upper jins', 'Bayati on A']],
      description: 'Bayati with a second Bayati tetrachord on the fifth, adding B half-flat. It dwells on the fifth (A, the note called husayni).',
      characteristic: [1, 5],
    },
  ]),

  ...define('arabic', 'Hijaz family', [
    {
      id: 'hijaz', name: 'Hijaz', tonic: 'D',
      intervals: fromAbsolute([D, ['Eb', 328], ['F#', 629], ['G', 702], ['A', 906], ['Bb', 996], C8]),
      facts: [['Lower jins', 'Hijaz on D'], ['Upper jins', 'Nahawand on G (also Rast on G)'], ['Ghammaz (pivot)', 'G']],
      description: 'Named after the Hijaz region of Arabia. The augmented second between E♭ and F♯ gives it the sound most outsiders associate with Middle Eastern music. In 12-tone tuning it equals Phrygian dominant, but the E♭ is sung slightly high and the F♯ slightly low.',
      mood: ['dramatic', 'longing'], characteristic: [1, 2],
    },
    {
      id: 'hijazkar', name: 'Hijazkar', tonic: 'C',
      intervals: fromAbsolute([C, ['Db', 105], ['E', 398], ['F', 498], ['G', 702], ['Ab', 826], ['B', 1104]]),
      facts: [['Lower jins', 'Hijaz on C'], ['Upper jins', 'Hijaz on G']],
      description: 'Two Hijaz tetrachords a fifth apart: the double harmonic scale. Shahnaz is the same maqam on D.',
      aliases: ['Shahnaz (on D)'],
      mood: ['dramatic', 'exotic'], characteristic: [1, 5],
    },
    {
      id: 'zanjaran', name: 'Zanjaran', tonic: 'C',
      intervals: fromAbsolute([C, ['Db', 105], ['E', 398], ['F', 498], ['G', 702], ['A', 906], ['Bb', 996]]),
      facts: [['Lower jins', 'Hijaz on C'], ['Upper jins', 'ʿAjam on F']],
      description: 'Hijaz on the tonic with a major tetrachord on the fourth.',
      characteristic: [1, 2],
    },
  ]),

  ...define('arabic', 'Kurd family', [
    {
      id: 'kurd', name: 'Kurd', tonic: 'D',
      intervals: fromAbsolute([D, ['Eb', 290], ['F', 498], ['G', 702], ['A', 906], ['Bb', 996], C8]),
      facts: [['Lower jins', 'Kurd on D'], ['Upper jins', 'Nahawand on G']],
      description: 'The Arabic counterpart of the Phrygian mode, with a narrow half step above the tonic.',
      mood: ['dark', 'tender'], characteristic: [1],
    },
    {
      id: 'hijazkar-kurd', name: 'Hijazkar Kurd', tonic: 'C',
      intervals: fromAbsolute([C, ['Db', 86], ['Eb', 290], ['F', 498], ['G', 702], ['Ab', 826], ['B', 1104]]),
      facts: [['Lower jins', 'Kurd on C'], ['Upper jins', 'Hijaz on G']],
      description: 'Kurd below and Hijaz above, so the scale ends with a leading tone after an augmented second.',
      characteristic: [1, 6],
    },
    {
      id: 'lami', name: 'Lami', tonic: 'D',
      intervals: fromAbsolute([D, ['Eb', 290], ['F', 498], ['G', 702], ['Ab', 826], ['Bb', 996], C8]),
      facts: [['Lower jins', 'Lami on D (Kurd with a lowered fifth)']],
      description: 'A Kurd-type maqam with a diminished fifth, close to the Locrian mode.',
      characteristic: [1, 4],
    },
  ]),

  ...define('arabic', 'Nahawand family', [
    {
      id: 'nahawand', name: 'Nahawand', tonic: 'C',
      intervals: fromAbsolute([C, D, ['Eb', 290], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100]]),
      forms: [
        { label: 'Ascending', notes: absForm(C, [C, D, ['Eb', 290], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100], C8]) },
        { label: 'Descending', notes: absForm(C, [C8, ['Bb', 996], ['Ab', 826], ['G', 702], ['F', 498], ['Eb', 290], D, C]) },
      ],
      facts: [['Lower jins', 'Nahawand on C'], ['Upper jins', 'Hijaz on G ascending, Kurd on G descending']],
      description: 'The Arabic minor: harmonic minor going up and natural minor coming down, much like the melodic minor of Western classical practice in reverse. Farahfaza is the same maqam on G.',
      aliases: ['Farahfaza (on G)'],
      mood: ['romantic', 'melancholic'], characteristic: [5, 6],
    },
    {
      id: 'nahawand-murassa', name: 'Nahawand Murassaʿ', tonic: 'C',
      intervals: fromAbsolute([C, D, ['Eb', 290], ['F', 498], ['Gb', 597], ['A', 894], ['Bb', 996]]),
      description: 'Nahawand with a diminished fifth and a major sixth: a minor scale whose upper half is bent by a tritone.',
      characteristic: [4, 5],
    },
    {
      id: 'ushaq-masri', name: 'ʿUshaq Masri', tonic: 'D',
      intervals: fromAbsolute([D, ['E', 408], ['F', 498], ['G', 702], ['A', 906], ['B', 1057], C8]),
      facts: [['Lower jins', 'Nahawand on D'], ['Upper jins', 'Bayati on A']],
      description: 'Egyptian ʿUshaq: a minor tetrachord on the tonic and a Bayati tetrachord on the fifth.',
      characteristic: [5],
    },
  ]),

  ...define('arabic', 'Nikriz family', [
    {
      id: 'nikriz', name: 'Nikriz', tonic: 'C',
      intervals: fromAbsolute([C, D, ['Eb', 328], ['F#', 629], ['G', 702], ['A', 906], ['Bb', 996]]),
      facts: [['Lower jins', 'Nikriz on C (a pentachord with an augmented second)'], ['Upper jins', 'Nahawand on G']],
      description: 'A minor third followed by an augmented second up to a raised fourth. In 12-tone tuning it matches the Ukrainian Dorian mode used in Jewish and Eastern European music.',
      characteristic: [3],
    },
    {
      id: 'nawa-athar', name: 'Nawa Athar', tonic: 'C',
      intervals: fromAbsolute([C, D, ['Eb', 328], ['F#', 629], ['G', 702], ['Ab', 838], ['B', 1100]]),
      facts: [['Lower jins', 'Nikriz on C'], ['Upper jins', 'Hijaz on G']],
      description: 'Nikriz with a Hijaz tetrachord on top: two augmented seconds, equal to the Hungarian minor scale in 12-tone tuning.',
      characteristic: [3, 5],
    },
    {
      id: 'athar-kurd', name: 'Athar Kurd', tonic: 'C',
      intervals: fromAbsolute([C, ['Db', 86], ['Eb', 290], ['F#', 629], ['G', 702], ['Ab', 838], ['B', 1100]]),
      description: 'Like Nawa Athar, with a Kurd half step above the tonic.',
      characteristic: [1, 3],
    },
  ]),

  ...define('arabic', 'ʿAjam family', [
    {
      id: 'ajam', name: 'ʿAjam',
      intervals: fromAbsolute([C, D, ['E', 398], ['F', 498], ['G', 702], ['A', 906], ['B', 1110]]),
      forms: [
        { label: 'Ascending', notes: absForm(C, [C, D, ['E', 398], ['F', 498], ['G', 702], ['A', 906], ['B', 1110], C8]) },
        { label: 'Descending', notes: absForm(C, [C8, ['Bb', 996], ['A', 906], ['G', 702], ['F', 498], ['E', 398], D, C]) },
      ],
      description: 'The Arabic major mode. It is often heard with B♭ in descent, and is traditionally placed on B♭ (ʿAjam ʿUshayran).',
      mood: ['bright', 'festive'],
    },
    {
      id: 'ajam-ushayran', name: 'ʿAjam ʿUshayran', tonic: 'Bb',
      intervals: fromAbsolute([['Bb', 996], ['C', 1200], ['D', 1404], ['Eb', 1494], ['F', 1698], ['G', 1902], ['A', 2106]]),
      description: 'ʿAjam on its traditional low tonic B♭ (the note ʿushayran in the Arabic scale names), with Pythagorean whole tones.',
    },
    {
      id: 'shawq-afza', name: 'Shawq Afza', tonic: 'C',
      intervals: fromAbsolute([C, D, ['E', 398], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100]]),
      facts: [['Lower jins', 'ʿAjam on C'], ['Upper jins', 'Hijaz on G']],
      description: 'A major tetrachord below and Hijaz above: the harmonic major scale of Western theory.',
      characteristic: [5],
    },
    {
      id: 'jiharkah', name: 'Jiharkah', tonic: 'F',
      intervals: fromAbsolute([['F', 498], ['G', 702], ['A', 878], ['Bb', 960], ['C', 1200], ['D', 1404], ['E', 1562]]),
      facts: [['Lower jins', 'Jiharkah on F']],
      description: 'A major-type maqam on F whose third and fourth are lowered by a small amount, and whose seventh is E half-flat. The flattened fourth is its signature.',
      characteristic: [2, 3, 6],
    },
  ]),

  ...define('arabic', 'Sikah family', [
    {
      id: 'sikah', name: 'Sikah', tonic: 'E',
      intervals: fromAbsolute([['E', 366], ['F', 498], ['G', 702], ['A', 906], ['B', 1064], C8, ['D', 1404]]),
      facts: [['Tonic', 'E half-flat'], ['Lower jins', 'Sikah on E half-flat (a three-note jins)'], ['Upper jins', 'Rast on G']],
      description: 'Built on the third degree of Rast, so its tonic is itself a half-flat note and its first step is a three-quarter tone. Sephardic and Syrian Jewish communities chant the Torah in Sikah.',
      aliases: ['Sigah', 'Segah'],
      mood: ['mystical', 'devotional'], characteristic: [0, 4],
    },
    {
      id: 'huzam', name: 'Huzam', tonic: 'E',
      intervals: fromAbsolute([['E', 366], ['F', 498], ['G', 702], ['Ab', 838], ['B', 1100], C8, ['D', 1404]]),
      facts: [['Tonic', 'E half-flat'], ['Lower jins', 'Sikah on E half-flat'], ['Upper jins', 'Hijaz on G']],
      description: 'Sikah with Hijaz on its third degree. Rahat al-Arwah is the same maqam on B half-flat.',
      aliases: ['Rahat al-Arwah (on B half-flat)'],
      mood: ['intense', 'devotional'], characteristic: [0, 3],
    },
    {
      id: 'iraq', name: 'ʿIraq', tonic: 'B',
      intervals: fromAbsolute([['B', 1064], C8, ['D', 1404], ['E', 1555], ['F', 1698], ['G', 1902], ['A', 2106]]),
      facts: [['Tonic', 'B half-flat'], ['Lower jins', 'Sikah on B half-flat'], ['Upper jins', 'Bayati on D']],
      description: 'Sikah placed on B half-flat, continuing into Bayati on D.',
      characteristic: [0, 3],
    },
    {
      id: 'mustaar', name: 'Mustaʿar', tonic: 'E',
      intervals: fromAbsolute([['E', 355], ['F#', 629], ['G', 702], ['A', 906], ['Bb', 996], C8, ['D', 1404]]),
      facts: [['Tonic', 'E half-flat']],
      description: 'A rare Sikah-family maqam whose first step is unusually wide (from E half-flat to F♯).',
      characteristic: [1, 4],
    },
  ]),

  ...define('arabic', 'Saba family', [
    {
      id: 'saba', name: 'Saba', tonic: 'D',
      intervals: fromAbsolute([D, ['E', 355], ['F', 498], ['Gb', 597], ['A', 894], ['Bb', 996], C8]),
      forms: [{ label: 'Ascending (the octave is D♭)', notes: absForm(D, [D, ['E', 355], ['F', 498], ['Gb', 597], ['A', 894], ['Bb', 996], C8, ['Db', 1286]]) }],
      facts: [['Lower jins', 'Saba on D'], ['Upper jins', 'Hijaz on F']],
      description: 'Deeply sorrowful. The fourth is lowered to G♭, and the scale does not repeat at the octave: the note an octave above the tonic is D♭, not D.',
      mood: ['sorrowful', 'grieving'], characteristic: [1, 3],
    },
    {
      id: 'saba-zamzam', name: 'Saba Zamzam', tonic: 'D',
      intervals: fromAbsolute([D, ['Eb', 290], ['F', 498], ['Gb', 597], ['A', 894], ['Bb', 996], C8]),
      forms: [{ label: 'Ascending (the octave is D♭)', notes: absForm(D, [D, ['Eb', 290], ['F', 498], ['Gb', 597], ['A', 894], ['Bb', 996], C8, ['Db', 1286]]) }],
      description: 'Saba with a Kurd half step (E♭) instead of the half-flat second.',
      characteristic: [1, 3],
    },
  ]),
];
