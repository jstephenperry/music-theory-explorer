/** The four principal qenet (modes) of Ethiopian music, each in a major and a minor form. */
import { define } from './define';

export const ETHIOPIAN = [
  ...define('ethiopian', 'Qenet', [
    {
      id: 'qenet-tizita-major', name: 'Tizita (major)', intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
      description: 'Tizita means nostalgia or longing. The major form has the notes of the major pentatonic scale.',
      mood: ['nostalgic'],
    },
    {
      id: 'qenet-tizita-minor', name: 'Tizita (minor)', intervals: ['P1', 'M2', 'm3', 'P5', 'm6'],
      description: 'The minor form of Tizita, with a minor third and sixth.',
      mood: ['nostalgic', 'sad'],
    },
    {
      id: 'qenet-bati-major', name: 'Bati (major)', intervals: ['P1', 'M3', 'P4', 'P5', 'M7'],
      description: 'Named after the town of Bati. Its major form has no second or sixth.',
    },
    {
      id: 'qenet-bati-minor', name: 'Bati (minor)', intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
      description: 'The minor form of Bati: the notes of the minor pentatonic scale.',
    },
    {
      id: 'qenet-ambassel', name: 'Ambassel', intervals: ['P1', 'm2', 'P4', 'P5', 'm6'],
      description: 'Named after the Ambassel mountains. Its half step above the tonic gives it a dark sound, matching the Japanese miyako-bushi scale.',
    },
    {
      id: 'qenet-anchihoye', name: 'Anchihoye', intervals: ['P1', 'm2', 'P4', 'd5', 'M6'],
      description: 'The most unusual of the four qenet, with a half step above the tonic and a diminished fifth.',
    },
  ]),
];
