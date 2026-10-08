/**
 * East Asian scales: Chinese pentatonic modes and heptatonic scales, Japanese scales (Koizumi
 * Fumio's tetrachord-based scales, koto tunings, gagaku scales) and Korean modes.
 */
import { define } from './define';

export const EAST_ASIAN = [
  ...define('east-asian', 'Chinese pentatonic modes', [
    {
      id: 'chinese-gong', name: 'Gong mode', intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
      degreeNames: ['gong', 'shang', 'jue', 'zhi', 'yu'],
      description: 'The five tones gong, shang, jue, zhi and yu, started on gong: the major pentatonic. Each of the five tones can serve as the final, giving five modes.',
    },
    {
      id: 'chinese-shang', name: 'Shang mode', intervals: ['P1', 'M2', 'P4', 'P5', 'm7'],
      degreeNames: ['shang', 'jue', 'zhi', 'yu', 'gong'],
      description: 'The pentatonic collection with shang as the final: no third, a suspended sound.',
    },
    {
      id: 'chinese-jue', name: 'Jue mode', intervals: ['P1', 'm3', 'P4', 'm6', 'm7'],
      degreeNames: ['jue', 'zhi', 'yu', 'gong', 'shang'],
      description: 'The pentatonic collection with jue as the final. Rare as a final in practice.',
    },
    {
      id: 'chinese-zhi', name: 'Zhi mode', intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
      degreeNames: ['zhi', 'yu', 'gong', 'shang', 'jue'],
      description: 'The pentatonic collection with zhi as the final, very common in folk song.',
    },
    {
      id: 'chinese-yu', name: 'Yu mode', intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
      degreeNames: ['yu', 'gong', 'shang', 'jue', 'zhi'],
      description: 'The pentatonic collection with yu as the final: the minor pentatonic.',
    },
  ]),

  ...define('east-asian', 'Chinese heptatonic scales', [
    {
      id: 'chinese-qingyue', name: 'Qingyue (Qing music)', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
      description: 'The pentatonic collection with qingjue (the fourth) and biangong (the seventh) added: the same notes as the major scale.',
    },
    {
      id: 'chinese-yayue', name: 'Yayue (Elegant music)', intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
      description: 'The pentatonic collection with bianzhi (a raised fourth) and biangong: the "old" scale of court ritual music, with the notes of the Lydian mode.',
    },
    {
      id: 'chinese-yanyue', name: 'Yanyue (Banquet music)', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      description: 'The pentatonic collection with qingjue (the fourth) and run (a lowered seventh): the notes of the Mixolydian mode.',
    },
  ]),

  ...define('east-asian', 'Japanese scales', [
    {
      id: 'japanese-minyo', name: 'Min\'yō', intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
      description: 'The scale of folk song in Koizumi Fumio\'s theory: two fourths, each filled by a minor third (min\'yō tetrachords). The same notes as the minor pentatonic.',
    },
    {
      id: 'japanese-miyako-bushi', name: 'Miyako-bushi (In)', intervals: ['P1', 'm2', 'P4', 'P5', 'm6'],
      description: 'The urban scale of koto and shamisen music: each fourth is filled with a half step at the bottom. Called the in scale by Uehara Rokushirō; heard in Sakura Sakura.',
      aliases: ['In scale', 'Sakura scale'], mood: ['Japanese', 'melancholic'],
    },
    {
      id: 'japanese-ritsu', name: 'Ritsu (Yo)', intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
      description: 'Koizumi\'s ritsu scale: each fourth filled with a major second. Called the yo scale by Uehara and used in gagaku, shōmyō and folk song.',
      aliases: ['Yo scale'], mood: ['Japanese', 'bright'],
    },
    {
      id: 'japanese-ryukyu', name: 'Ryūkyū', intervals: ['P1', 'M3', 'P4', 'P5', 'M7'],
      description: 'The scale of Okinawan folk music: each fourth is filled with a major third, leaving a half step at the top.',
      aliases: ['Okinawan scale'], mood: ['bright', 'Okinawan'],
    },

  {
    id: 'hirajoshi', name: 'Hirajōshi',
    intervals: ['P1', 'M2', 'm3', 'P5', 'm6'],
    description: 'A Japanese pentatonic scale used in koto music, containing half steps.',
    mood: ['Japanese', 'melancholic'],
  },
  {
    id: 'in-sen', name: 'In sen',
    intervals: ['P1', 'm2', 'P4', 'P5', 'm7'],
    description: 'A Japanese pentatonic scale associated with the shakuhachi.',
    mood: ['Japanese', 'shakuhachi'],
  },
  {
    id: 'iwato', name: 'Iwato',
    intervals: ['P1', 'm2', 'P4', 'd5', 'm7'],
    description: 'A dark Japanese pentatonic with a minor second and a diminished fifth.',
    mood: ['Japanese', 'dark'],
  },
  {
    id: 'kumoi', name: 'Kumoi',
    intervals: ['P1', 'M2', 'm3', 'P5', 'M6'],
    description: 'A Japanese pentatonic resembling melodic minor with notes removed.',
    mood: ['Japanese'],
  },
    {
      id: 'gagaku-ryo', name: 'Ryo (gagaku)', intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
      description: 'One of the two heptatonic scale types of gagaku court music, inherited from Chinese theory. It has the notes of the Lydian mode.',
    },
    {
      id: 'gagaku-ritsu', name: 'Ritsu (gagaku)', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
      description: 'The other heptatonic scale type of gagaku, with the notes of the Dorian mode.',
    },
  ]),

  ...define('east-asian', 'Korean modes', [
    {
      id: 'korean-pyeongjo', name: 'Pyeongjo', intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
      description: 'The "plain" mode of Korean court music, a pentatonic mode with no third.',
      mood: ['bright'],
    },
    {
      id: 'korean-gyemyeonjo', name: 'Gyemyeonjo', intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
      description: 'The plaintive mode of Korean music, a minor-type pentatonic mode heard in court music and in many folk songs.',
      mood: ['plaintive'],
    },
  ]),
];
