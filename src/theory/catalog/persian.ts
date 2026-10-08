/**
 * Persian classical music: the seven dastgāh and the āvāz derived from Shur and Homayun, as
 * listed in the radif of Mirza Abdollah. Notes are those of the common C-based reference table,
 * read from each mode's finalis. Koron (half-flat) and sori (half-sharp) are written here as
 * quarter tones, following Ali-Naqi Vaziri's 24-tone model; performers' intervals vary, and
 * Hormoz Farhat measured neutral steps of roughly 135 to 160 cents.
 */
import { define } from './define';

export const PERSIAN = [
  ...define('persian', 'Dastgāh', [
    {
      id: 'dastgah-shur', name: 'Shur', tonic: 'D',
      intervals: ['P1', 'M2-50', 'm3', 'P4', 'P5', 'm6', 'm7'],
      facts: [['Finalis', 'D'], ['Āghāz (opening note)', 'C'], ['Variable note', 'A or A koron']],
      description: 'The most important dastgāh and the parent of four āvāz (Abu Ata, Bayat-e Tork, Afshari, Dashti). Its second degree is E koron, and its fifth alternates between A and A koron.',
      aliases: ['Šur'],
      mood: ['melancholy'], characteristic: [1],
    },
    {
      id: 'dastgah-segah', name: 'Segah', tonic: 'E',
      intervals: ['P1-50', 'm2', 'm3', 'P4-50', 'd5', 'm6', 'm7'],
      facts: [['Finalis and shāhed', 'E koron'], ['Variable note', 'D or D koron']],
      description: 'Centered on E koron, which serves as opening note, finalis and shāhed (focal note). Related to the Arabic maqam Sikah.',
      aliases: ['Sehgah'],
      characteristic: [0, 3],
    },
    {
      id: 'dastgah-chahargah', name: 'Chahargah', tonic: 'C',
      intervals: ['P1', 'M2-50', 'M3', 'P4', 'P5', 'M6-50', 'M7'],
      facts: [['Finalis', 'C'], ['Āghāz (opening note)', 'A koron']],
      description: 'Two identical tetrachords, each with a koron second and a wide step to the third. In 12-tone tuning it matches the double harmonic scale.',
      aliases: ['Čahārgāh'],
      mood: ['majestic', 'heroic'], characteristic: [1, 5],
    },
    {
      id: 'dastgah-homayun', name: 'Homayun', tonic: 'G',
      intervals: ['P1', 'M2-50', 'M3', 'P4', 'P5', 'm6', 'm7'],
      facts: [['Finalis', 'G'], ['Shāhed', 'A koron'], ['Āghāz (opening note)', 'E♭']],
      description: 'A dastgāh with a koron second and a major third, sometimes compared with the Arabic Hijaz. Bayat-e Esfahan is derived from it.',
      aliases: ['Humayun'],
      characteristic: [1, 2],
    },
    {
      id: 'dastgah-mahur', name: 'Mahur', tonic: 'C',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      facts: [['Finalis', 'C'], ['Shāhed', 'D']],
      description: 'Pitched like the Western major scale; its gushe (melodic models) bring in koron notes when it modulates.',
      mood: ['bright', 'festive'],
    },
    {
      id: 'dastgah-rast-panjgah', name: 'Rast-Panjgah', tonic: 'F',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      facts: [['Finalis', 'F']],
      description: 'Shares its pitches with Mahur but is placed on F in the reference table. It is known for modulating through many gushe of other dastgāh.',
    },
    {
      id: 'dastgah-nava', name: 'Nava', tonic: 'G',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6-50', 'm7'],
      facts: [['Finalis', 'G'], ['Āghāz (opening note)', 'F']],
      description: 'A minor-type scale with a koron sixth (E koron).',
      mood: ['calm', 'contemplative'], characteristic: [5],
    },
  ]),

  ...define('persian', 'Āvāz of Shur', [
    {
      id: 'avaz-abu-ata', name: 'Abu Ata', tonic: 'D',
      intervals: ['P1', 'm2', 'm3', 'P4', 'P5-50', 'm6', 'm7'],
      facts: [['Finalis', 'D'], ['Shāhed', 'G'], ['Variable note', 'B♭ or B koron']],
      description: 'An āvāz of Shur that dwells on the fourth degree (G). It shares its notes with Dashti.',
      characteristic: [4],
    },
    {
      id: 'avaz-bayat-e-tork', name: 'Bayat-e Tork', tonic: 'F',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7-50'],
      facts: [['Finalis and shāhed', 'F'], ['Āghāz (opening note)', 'C']],
      description: 'An āvāz of Shur placed on its third degree, which sounds major until its koron seventh.',
      characteristic: [6],
    },
    {
      id: 'avaz-afshari', name: 'Afshari', tonic: 'C',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6-50', 'm7'],
      facts: [['Finalis', 'C'], ['Shāhed', 'G'], ['Variable note', 'A koron or A']],
      description: 'An āvāz of Shur centered on its fifth degree.',
      mood: ['plaintive'], characteristic: [5],
    },
    {
      id: 'avaz-dashti', name: 'Dashti', tonic: 'D',
      intervals: ['P1', 'm2', 'm3', 'P4', 'P5-50', 'm6', 'm7'],
      facts: [['Finalis', 'D'], ['Shāhed', 'A koron (alternating with A)']],
      description: 'An āvāz of Shur associated with folk song of northern Iran; its focal note is the variable fifth.',
      characteristic: [4],
    },
  ]),

  ...define('persian', 'Āvāz of Homayun', [
    {
      id: 'avaz-bayat-e-esfahan', name: 'Bayat-e Esfahan', tonic: 'G',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6-50', 'M7'],
      facts: [['Finalis, shāhed and āghāz', 'G']],
      description: 'Derived from Homayun. A minor scale with a koron sixth and a raised seventh, often described as wistful.',
      aliases: ['Esfahan'],
      mood: ['wistful'], characteristic: [5, 6],
    },
  ]),
];
