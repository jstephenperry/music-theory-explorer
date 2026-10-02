import type { DevOp, Motive } from '../../theory/composition/motive';
import { makeKey, type Key } from '../../theory/keys';
import { pitch } from '../../theory/notes';

export interface Preset {
  id: string;
  name: string;
  source: string;
  key: Key;
  time: [number, number];
  motive: Motive;
  /** A development chain in the composer's manner. */
  recipe: DevOp[];
}

const n = (p: string, dur: number) => ({ pitch: p === 'r' ? null : pitch(p), dur });

export const MOTIVE_PRESETS: Preset[] = [
  {
    id: 'bach',
    name: 'Bach',
    source: 'Invention No. 1, BWV 772, bar 1',
    key: makeKey('C'),
    time: [4, 4],
    motive: ['C4', 'D4', 'E4', 'F4', 'D4', 'E4', 'C4'].map((p) => n(p, 0.25)),
    recipe: ['original', 'transpose-5', 'invert', 'seq-down', 'seq-down', 'seq-down'],
  },
  {
    id: 'beethoven',
    name: 'Beethoven',
    source: 'Symphony No. 5, Op. 67, bars 1 to 2',
    key: makeKey('C', 'minor'),
    time: [2, 4],
    motive: [n('r', 0.5), n('G4', 0.5), n('G4', 0.5), n('G4', 0.5), n('Eb4', 2)],
    recipe: ['original', 'seq-down', 'seq-up-3', 'seq-up', 'head', 'head'],
  },
  {
    id: 'mozart',
    name: 'Mozart',
    source: 'Piano Sonata in C, K. 545, bars 1 to 2',
    key: makeKey('C'),
    time: [4, 4],
    motive: [n('C5', 2), n('E5', 1), n('G5', 1), n('B4', 1.5), n('C5', 0.25), n('D5', 0.25), n('C5', 1)],
    recipe: ['original', 'seq-up-3', 'head', 'seq-down', 'tail', 'seq-down'],
  },
  {
    id: 'twinkle',
    name: 'Twinkle',
    source: '"Ah vous dirai-je, Maman", the theme of Mozart\'s Variations K. 265',
    key: makeKey('C'),
    time: [2, 4],
    motive: [n('C4', 1), n('C4', 1), n('G4', 1), n('G4', 1), n('A4', 1), n('A4', 1), n('G4', 2)],
    recipe: ['original', 'invert', 'retrograde', 'diminish', 'augment'],
  },
];

