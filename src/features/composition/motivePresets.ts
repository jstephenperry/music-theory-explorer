import type { DevOp, Motive } from '../../theory/composition/motive';
import { makeKey, type Key } from '../../theory/keys';
import { pitch } from '../../theory/notes';
import { motiveFragment } from '../../repertoire';

export interface Preset {
  id: string;
  name: string;
  /** The work the motive is taken from, a repertoire id. */
  workId: string;
  /** Where in the work, for the caption. */
  source: string;
  key: Key;
  time: [number, number];
  motive: Motive;
  /** A development chain in the composer's manner. */
  recipe: DevOp[];
}

const n = (p: string, dur: number) => ({ pitch: p === 'r' ? null : pitch(p), dur });

/** Motives borrowed from the repertoire: the notes come from the encoded scores, so they cannot drift from what the rooms show. */
export const MOTIVE_PRESETS: Preset[] = [
  {
    id: 'bach',
    name: 'Bach',
    workId: 'bwv772',
    source: 'Invention No. 1, BWV 772, bar 1',
    key: makeKey('C'),
    time: [4, 4],
    motive: motiveFragment('bwv772', '0.0.1-7'),
    recipe: ['original', 'transpose-5', 'invert', 'seq-down', 'seq-down', 'seq-down'],
  },
  {
    id: 'beethoven',
    name: 'Beethoven',
    workId: 'op67',
    source: 'Symphony No. 5, Op. 67, bars 1 to 2',
    key: makeKey('C', 'minor'),
    time: [2, 4],
    motive: motiveFragment('op67', '0.0.0-4'),
    recipe: ['original', 'seq-down', 'seq-up-3', 'seq-up', 'head', 'head'],
  },
  {
    id: 'mozart',
    name: 'Mozart',
    workId: 'k545',
    source: 'Piano Sonata in C, K. 545, bars 1 to 2',
    key: makeKey('C'),
    time: [4, 4],
    motive: motiveFragment('k545', '0.0.0-6'),
    recipe: ['original', 'seq-up-3', 'head', 'seq-down', 'tail', 'seq-down'],
  },
  {
    // Declared rather than borrowed: the theme's two quarter-note Gs are simplified to one half note.
    id: 'twinkle',
    name: 'Twinkle',
    workId: 'k265theme',
    source: '"Ah vous dirai-je, Maman", the theme of Mozart\'s Variations K. 265',
    key: makeKey('C'),
    time: [2, 4],
    motive: [n('C4', 1), n('C4', 1), n('G4', 1), n('G4', 1), n('A4', 1), n('A4', 1), n('G4', 2)],
    recipe: ['original', 'invert', 'retrograde', 'diminish', 'augment'],
  },
];
