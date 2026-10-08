/**
 * The cadence gallery: each cadence type in four-part harmony, two examples apiece, written in C
 * major (the Phrygian half cadence in A minor) and transposable to any key for the drill.
 */
import { pitchInterval, transposePitch, transposePitchDown } from '../intervals';
import { makeKey, type Key } from '../keys';
import { midi, mod, pc, type Pitch } from '../notes';
import { buildScore, type Score } from '../score';

export type CadenceId = 'pac' | 'iac' | 'half' | 'deceptive' | 'plagal' | 'phrygian';

export interface CadenceType {
  id: CadenceId;
  name: string;
  short: string;
  mode: 'major' | 'minor';
  description: string;
  listenFor: string;
  /** Soprano, alto, tenor and bass, two bars of 4/4 each. Labels below the bass name the chords. */
  examples: Array<[string, string, string, string]>;
}

export const CADENCE_TYPES: CadenceType[] = [
  {
    id: 'pac',
    name: 'Perfect authentic cadence',
    short: 'PAC',
    mode: 'major',
    description: 'V (or V⁷) to I, both in root position, with the tonic in the soprano. The strongest close in tonal music: it ends pieces, sections and consequent phrases.',
    listenFor: 'The bass falls a fifth (or rises a fourth) to the tonic while the leading tone rises to the tonic on top.',
    examples: [
      ['C5/2 B4/2 | C5/1', 'F4/2 F4/2 | E4/1', 'A3/2 D4/2 | C4/1', 'F3/2 _"IV" G3/2 _"V⁷" | C3/1 _"I"'],
      ['E5/2 D5/2 | C5/1', 'G4/2 F4/2 | E4/1', 'C4/2 B3/2 | C4/1', 'G3/2 _"I⁶₄" G3/2 _"V⁷" | C3/1 _"I"'],
    ],
  },
  {
    id: 'iac',
    name: 'Imperfect authentic cadence',
    short: 'IAC',
    mode: 'major',
    description: 'Dominant to tonic, but weakened: the third or fifth is on top, or one of the chords is inverted. It closes, though less finally than a PAC.',
    listenFor: 'The music arrives on the tonic chord, but the melody stops on the third (or the bass on the leading tone), so it sounds settled rather than finished.',
    examples: [
      ['F5/2 D5/2 | E5/1', 'A4/2 G4/2 | G4/1', 'D4/2 B3/2 | C4/1', 'F3/2 _"ii⁶" G3/2 _"V" | C3/1 _"I"'],
      ['E5/2 D5/2 | C5/1', 'G4/2 G4/2 | G4/1', 'C4/2 D4/2 | E4/1', 'C3/2 _"I" B2/2 _"V⁶" | C3/1 _"I"'],
    ],
  },
  {
    id: 'half',
    name: 'Half cadence',
    short: 'HC',
    mode: 'major',
    description: 'The phrase stops on V and is left open, like a question that the next phrase answers.',
    listenFor: 'The last chord is stable but pulls toward the tonic; the melody often stops on the second or seventh degree.',
    examples: [
      ['E5/2 F5/2 | D5/1', 'G4/2 A4/2 | G4/1', 'E4/2 D4/2 | B3/1', 'C3/2 _"I" F3/2 _"ii⁶" | G3/1 _"V"'],
      ['C5/2 C5/2 | B4/1', 'G4/2 A4/2 | G4/1', 'E4/2 F4/2 | D4/1', 'C3/2 _"I" F3/2 _"IV" | G3/1 _"V"'],
    ],
  },
  {
    id: 'deceptive',
    name: 'Deceptive cadence',
    short: 'Deceptive',
    mode: 'major',
    description: 'V goes to vi instead of I. The melody can be the same as in a PAC: only the bass changes, rising a step instead of falling a fifth. Composers use it to extend a phrase before the real cadence.',
    listenFor: 'Everything prepares the tonic, and the bass steps up to a minor chord instead.',
    examples: [
      ['F5/2 D5/2 | C5/1', 'A4/2 G4/2 | E4/1', 'D4/2 B3/2 | C4/1', 'F3/2 _"ii⁶" G3/2 _"V" | A3/1 _"vi"'],
      ['E5/2 D5/2 | C5/1', 'G4/2 F4/2 | E4/1', 'C4/2 B3/2 | C4/1', 'G3/2 _"I⁶₄" G3/2 _"V⁷" | A3/1 _"vi"'],
    ],
  },
  {
    id: 'plagal',
    name: 'Plagal cadence',
    short: 'Plagal',
    mode: 'major',
    description: 'IV (or the minor iv) to I, sung to Amen at the end of hymns. In Classical music it usually follows an authentic cadence as a closing gesture rather than ending a phrase by itself.',
    listenFor: 'No leading tone: the inner voices fall back by step to the tonic chord over a held tonic in the soprano.',
    examples: [
      ['C5/2 C5/2 | C5/1', 'G4/2 A4/2 | G4/1', 'E4/2 F4/2 | E4/1', 'C3/2 _"I" F3/2 _"IV" | C3/1 _"I"'],
      ['C5/2 C5/2 | C5/1', 'G4/2 Ab4/2 | G4/1', 'E4/2 F4/2 | E4/1', 'C3/2 _"I" F3/2 _"iv" | C3/1 _"I"'],
    ],
  },
  {
    id: 'phrygian',
    name: 'Phrygian half cadence',
    short: 'Phrygian',
    mode: 'minor',
    description: 'In minor, iv⁶ to V: the bass falls a half step from the sixth degree to the fifth while the soprano rises a step. Common in Baroque music, often ending a slow movement before the next begins.',
    listenFor: 'The outer voices move in contrary motion to an octave on the dominant, with a half step in the bass.',
    examples: [
      ['C5/2 D5/2 | E5/1', 'A4/2 A4/2 | G#4/1', 'E4/2 D4/2 | B3/1', 'A3/2 _"i" F3/2 _"iv⁶" | E3/1 _"V"'],
      ['E5/2 D5/2 | E5/1', 'A4/2 A4/2 | G#4/1', 'C4/2 D4/2 | B3/1', 'A2/2 _"i" F3/2 _"iv⁶" | E3/1 _"V"'],
    ],
  },
];

export function cadenceType(id: CadenceId): CadenceType {
  return CADENCE_TYPES.find((c) => c.id === id)!;
}

/** The example as a grand-staff score in its home key (C major or A minor). */
export function cadenceScore(type: CadenceType, example: number): Score {
  const [s, a, t, b] = type.examples[example];
  return buildScore({
    key: type.mode === 'major' ? makeKey('C') : makeKey('A', 'minor'),
    time: [4, 4],
    staves: [
      { clef: 'treble', voices: [s, a] },
      { clef: 'bass', voices: [t, b] },
    ],
  });
}

/** Transpose a whole score to a new key by the smallest move (up to a tritone either way). */
export function transposeScore(score: Score, to: Key, options: { keepLabels?: boolean } = {}): Score {
  const from = score.key.tonic;
  const up = mod(pc(to.tonic) - pc(from), 12) <= 6;
  const a: Pitch = { ...from, octave: 4 };
  let b: Pitch = { ...to.tonic, octave: 4 };
  if (up && midi(b) < midi(a)) b = { ...b, octave: 5 };
  if (!up && midi(b) > midi(a)) b = { ...b, octave: 3 };
  const iv = pitchInterval(a, b);
  const move = (p: Pitch) => (up ? transposePitch(p, iv) : transposePitchDown(p, iv));
  return {
    ...score,
    key: to,
    staves: score.staves.map((st) => ({
      ...st,
      voices: st.voices.map((v) => ({
        notes: v.notes.map((n) => ({
          ...n,
          pitches: n.pitches.map(move),
          grace: n.grace?.map((g) => g.map(move)),
          below: options.keepLabels === false ? undefined : n.below,
        })),
      })),
    })),
  };
}
