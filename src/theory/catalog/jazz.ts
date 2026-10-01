import { define } from './define';

/** Jazz, blues, rock and popular-music scales. */
export const JAZZ = [
  ...define('jazz', 'Pentatonic', [
  {
    id: 'major-pentatonic', name: 'Major pentatonic',
    intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
    description: 'Five notes with no half steps: impossible to play a harsh clash. Found in folk music worldwide, country, pop and rock.',
    mood: ['open', 'happy', 'folk'], modeOf: { parent: 'major-pentatonic', degree: 1 }, chordId: '6',
  },
  {
    id: 'suspended-pentatonic', name: 'Suspended pentatonic (Egyptian)', aliases: ['egyptian'],
    intervals: ['P1', 'M2', 'P4', 'P5', 'm7'],
    description: 'Second mode of the major pentatonic. No third, so neither major nor minor.',
    mood: ['open', 'ambiguous'], modeOf: { parent: 'major-pentatonic', degree: 2 }, chordId: '7sus4',
  },
  {
    id: 'blues-minor-pentatonic', name: 'Man Gong (Blues minor pentatonic)',
    intervals: ['P1', 'm3', 'P4', 'm6', 'm7'],
    description: 'Third mode of the major pentatonic.',
    mood: ['dark', 'sparse'], modeOf: { parent: 'major-pentatonic', degree: 3 }, chordId: 'm7',
  },
  {
    id: 'ritusen', name: 'Ritusen (Blues major pentatonic)',
    intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
    description: 'Fourth mode of the major pentatonic, used in Japanese court music (gagaku).',
    mood: ['open', 'gentle'], modeOf: { parent: 'major-pentatonic', degree: 4 }, chordId: 'sus2',
  },
  {
    id: 'minor-pentatonic', name: 'Minor pentatonic',
    intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
    description: 'Fifth mode of the major pentatonic. The backbone of blues and rock soloing.',
    mood: ['bluesy', 'rock', 'gritty'], modeOf: { parent: 'major-pentatonic', degree: 5 }, chordId: 'm7',
  },
    {
      id: 'dominant-pentatonic', name: 'Dominant pentatonic',
      intervals: ['P1', 'M2', 'M3', 'P5', 'm7'],
      description: 'Major pentatonic with the 6th replaced by a minor 7th. Outlines a dominant ninth chord.',
      mood: ['bluesy', 'bright'], chordId: '9',
    },
    {
      id: 'minor-6-pentatonic', name: 'Minor 6 pentatonic',
      intervals: ['P1', 'm3', 'P4', 'P5', 'M6'],
      description: 'Minor pentatonic with a major 6th instead of the minor 7th: a Dorian color in five notes.',
      mood: ['cool', 'minor'], chordId: 'm6',
    },
  ]),

  ...define('jazz', 'Blues', [
  {
    id: 'blues', name: 'Blues (minor blues)',
    intervals: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'],
    description: 'Minor pentatonic plus the flat 5th "blue note" that slides between the 4th and 5th.',
    mood: ['bluesy', 'gritty'], characteristic: [3], chordId: '7',
  },
  {
    id: 'major-blues', name: 'Major blues',
    intervals: ['P1', 'M2', 'm3', 'M3', 'P5', 'M6'],
    description: 'Major pentatonic plus the minor 3rd, used to slide into the major 3rd. Common in country and gospel.',
    mood: ['sweet', 'country', 'gospel'], characteristic: [2], chordId: '6',
  },
  ]),

  ...define('jazz', 'Bebop', [
  {
    id: 'bebop-dominant', name: 'Bebop dominant',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
    description: 'Mixolydian with an added major 7th passing tone, so chord tones land on downbeats when playing eighth notes.',
    mood: ['jazzy', 'swinging'], characteristic: [7], chordId: '7',
  },
  {
    id: 'bebop-major', name: 'Bebop major',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M6', 'M7'],
    description: 'Major scale with an added minor 6th passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [5], chordId: '6',
  },
  {
    id: 'bebop-dorian', name: 'Bebop dorian',
    intervals: ['P1', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Dorian with an added major 3rd passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [3], chordId: 'm7',
  },
  {
    id: 'bebop-melodic-minor', name: 'Bebop melodic minor',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M6', 'M7'],
    description: 'Melodic minor with an added minor 6th passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [5], chordId: 'm6',
  },
  ]),
];
