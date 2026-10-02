/**
 * Textures: one chord progression, voiced once with smooth four-part voice leading, then written out
 * as the textures of the Classical and Baroque keyboard: chorale, repeated chords, Alberti bass,
 * Bach's broken-chord prelude figuration, a sweeping arpeggio, and the waltz.
 */
import { makeKey, type Key } from '../../theory/keys';
import { midi, pc, type Note, type Pitch } from '../../theory/notes';
import { parseRoman, type RomanChord } from '../../theory/roman';
import { notateVoice, scoreFromVoices, type PlainNote, type Score, type ScoreNote } from '../../theory/score';
import { voiceProgression } from '../../theory/voicing';
import { diatonicIndex, stepPitch } from '../../theory/composition/motive';

export type TextureId = 'chorale' | 'repeated' | 'alberti' | 'prelude' | 'arpeggio' | 'waltz';

export interface TextureDef {
  id: TextureId;
  name: string;
  /** Short name for buttons and quiz choices. */
  short: string;
  description: string;
  /** Where to hear it in the Western classical repertoire. */
  examples: string;
}

export const TEXTURES: TextureDef[] = [
  {
    id: 'chorale',
    name: 'Chorale (four-part homophony)',
    short: 'Chorale',
    description: 'Four voices move together, one chord at a time. Every voice is a singable line, but the ear hears a succession of chords with the tune on top.',
    examples: 'Bach’s chorale harmonizations; the slow introductions of many Classical works.',
  },
  {
    id: 'repeated',
    name: 'Melody over repeated chords',
    short: 'Repeated chords',
    description: 'The left hand repeats each chord on every beat while the right hand sings above it. The pulse is always audible, and the harmony is fully stated.',
    examples: 'Beethoven’s “Pathétique” sonata (slow movement, accompaniment figures) and countless Schubert songs.',
  },
  {
    id: 'alberti',
    name: 'Melody with Alberti bass',
    short: 'Alberti bass',
    description: 'Each chord is broken into the pattern low, high, middle, high in steady eighth notes, under a melody. The commonest Classical keyboard accompaniment.',
    examples: 'Mozart’s Sonata K. 545; Haydn’s and Clementi’s sonatinas.',
  },
  {
    id: 'prelude',
    name: 'Broken-chord figuration (prelude style)',
    short: 'Prelude figuration',
    description: 'There is no separate melody: the whole chord is played as one repeated figure. The bass and a held inner voice sound first, then the upper notes rise twice per bar.',
    examples: 'Bach’s Prelude in C major, BWV 846, and many Baroque preludes.',
  },
  {
    id: 'arpeggio',
    name: 'Melody over a wide arpeggio',
    short: 'Wide arpeggio',
    description: 'The left hand sweeps up and down through the chord across almost two octaves, with the sustain pedal blending the notes. A Romantic texture that makes the piano sound full.',
    examples: 'Chopin’s nocturnes; Beethoven’s “Moonlight” sonata is a slower relative.',
  },
  {
    id: 'waltz',
    name: 'Waltz accompaniment',
    short: 'Waltz',
    description: 'In triple meter: the bass on the downbeat, the rest of the chord on beats two and three (“oom-pah-pah”), under a melody.',
    examples: 'Schubert’s and Chopin’s waltzes; Johann Strauss.',
  },
];

export interface ProgressionPreset {
  id: string;
  name: string;
  /** One chord per bar. */
  chords: string[];
}

export const TEXTURE_PROGRESSIONS: ProgressionPreset[] = [
  { id: 'cadence', name: 'I IV V⁷ I', chords: ['I', 'IV', 'V7', 'I'] },
  { id: 'prelude', name: 'I ii⁴₂ V⁶₅ I (as in BWV 846)', chords: ['I', 'ii42', 'V65', 'I'] },
  { id: 'circle', name: 'I vi ii⁶ V⁷ I', chords: ['I', 'vi', 'ii6', 'V7', 'I'] },
  { id: 'descending', name: 'I V⁶ vi iii⁶ IV I⁶ ii V', chords: ['I', 'V6', 'vi', 'iii6', 'IV', 'I6', 'ii', 'V'] },
];

export const TEXTURE_TONICS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

/** The lowest MIDI number at or above `floor` with the note's pitch class, spelled as the note. */
function at(n: Note, floor: number): Pitch {
  const m = floor + ((((pc(n) - floor) % 12) + 12) % 12);
  for (const octave of [Math.floor(m / 12) - 2, Math.floor(m / 12) - 1, Math.floor(m / 12)]) {
    const p = { ...n, octave };
    if (midi(p) === m) return p;
  }
  return { ...n, octave: Math.floor(m / 12) - 1 };
}

const up = (p: Pitch, octaves = 1): Pitch => ({ ...p, octave: p.octave + octaves });

/** The chord tone just above a pitch. */
function toneAbove(rc: RomanChord, p: Pitch): Pitch {
  return rc.notes.map((n) => at(n, midi(p) + 1)).sort((a, b) => midi(a) - midi(b))[0];
}

/**
 * A melody from the soprano of the voicing (an octave up when that keeps it on the staff): each bar
 * holds the chord tone, then moves by step toward the next bar's note with passing and neighbor
 * notes. The last bar holds.
 */
function melodyLine(voiced: Pitch[][], key: Key, bar: number): PlainNote[] {
  const lift = Math.max(...voiced.map((v) => midi(v[3]))) + 12 <= 81 ? 1 : 0;
  const sop = voiced.map((v) => up(v[3], lift));
  return sop.flatMap((s, i): PlainNote[] => {
    const next = sop[i + 1];
    if (!next) return [{ pitches: [s], dur: bar }];
    const steps = diatonicIndex(next) - diatonicIndex(s);
    const dir = Math.sign(steps) || 1;
    // Two quarter notes that lead into the next bar by step.
    let lead: Pitch[];
    if (steps === 0) lead = [stepPitch(s, 1, key), s];
    else if (Math.abs(steps) === 1) lead = [stepPitch(s, -dir, key), s];
    else if (Math.abs(steps) === 2) lead = [s, stepPitch(s, dir, key)];
    else lead = [stepPitch(next, -2 * dir, key), stepPitch(next, -dir, key)];
    if (bar === 3) return [{ pitches: [s], dur: 2 }, { pitches: [lead[1]], dur: 1 }];
    return [{ pitches: [s], dur: 2 }, ...lead.map((p) => ({ pitches: [p], dur: 1 }))];
  });
}

export interface BuiltTexture {
  score: Score;
  /** Ids of the melody notes (or the figure, when there is no separate melody). */
  melodyIds: string[];
}

export function buildTexture(texture: TextureId, chords: string[], tonic: string): BuiltTexture {
  const key: Key = makeKey(tonic);
  const rcs = chords.map((c) => parseRoman(c, key));
  // Voice once, then lift the voicing so the soprano sits around the top of the treble staff.
  const voiced = voiceProgression(rcs);
  const time: [number, number] = texture === 'waltz' ? [3, 4] : [4, 4];
  const bar = time[0];
  const label = (i: number) => rcs[i].display;

  let treble: PlainNote[][] = [melodyLine(voiced, key, bar)];
  let bass: PlainNote[][] = [];

  switch (texture) {
    case 'chorale': {
      // Soprano and alto on the treble staff, tenor and bass on the bass staff, as Bach writes them.
      treble = [voiced.map((v) => ({ pitches: [v[3]], dur: bar })), voiced.map((v) => ({ pitches: [v[2]], dur: bar }))];
      bass = [voiced.map((v) => ({ pitches: [v[1]], dur: bar })), voiced.map((v, i) => ({ pitches: [v[0]], dur: bar, below: label(i) }))];
      break;
    }
    case 'repeated': {
      bass = [voiced.flatMap((v, i) => Array.from({ length: bar }, (_, b) => ({ pitches: [v[0], v[1], v[2]].sort((x, y) => midi(x) - midi(y)), dur: 1, below: b === 0 ? label(i) : undefined })))];
      break;
    }
    case 'alberti': {
      bass = [
        rcs.flatMap((rc, i) => {
          const low = at(rc.bass, 48);
          const tones = rc.notes.filter((n) => pc(n) !== pc(rc.bass));
          // A seventh chord leaves out its fifth; the pattern needs only three notes.
          const pick = tones.length > 2 ? tones.filter((n) => pc(n) !== pc(rc.notes[2])).slice(0, 2) : tones;
          const [mid, high] = pick.map((n) => at(n, midi(low) + 1)).sort((x, y) => midi(x) - midi(y));
          const pattern = [low, high ?? mid, mid, high ?? mid];
          return Array.from({ length: bar * 2 }, (_, j) => ({ pitches: [pattern[j % 4]], dur: 0.5, below: j === 0 ? label(i) : undefined }));
        }),
      ];
      break;
    }
    case 'prelude': {
      // Bass held for half a bar, an inner voice entering a sixteenth later, then three upper notes twice.
      const figure = voiced.flatMap((v, i) => {
        const [a, s] = [v[2], v[3]];
        const x = toneAbove(rcs[i], s);
        return [0, 1].flatMap(() => [{ pitches: [], dur: 0.5 }, ...[a, s, x, a, s, x].map((p) => ({ pitches: [p], dur: 0.25 }))]);
      });
      treble = [figure];
      bass = [
        voiced.flatMap((v) => [0, 1].flatMap(() => [{ pitches: [], dur: 0.25 }, { pitches: [v[1]], dur: 1.75 }])),
        voiced.flatMap((v, i) => [{ pitches: [v[0]], dur: 2, below: label(i) }, { pitches: [v[0]], dur: 2 }]),
      ];
      break;
    }
    case 'arpeggio': {
      bass = [
        rcs.flatMap((rc, i) => {
          const b = at(rc.bass, 40);
          // Open spacing: the fifth (or the next tone a fifth or more above), then close chord tones upward.
          const tones: Pitch[] = [b];
          let cur = toneAbove(rc, b);
          while (midi(cur) - midi(b) < 6) cur = toneAbove(rc, cur);
          tones.push(cur);
          while (tones.length < 5) tones.push(toneAbove(rc, tones[tones.length - 1]));
          const order = [0, 1, 2, 3, 4, 3, 2, 1];
          return order.map((k, j) => ({ pitches: [tones[k]], dur: 0.5, below: j === 0 ? label(i) : undefined }));
        }),
      ];
      break;
    }
    case 'waltz': {
      bass = [
        rcs.flatMap((rc, i) => {
          const low = at(rc.bass, 40);
          const chord = rc.notes.filter((n) => pc(n) !== pc(rc.bass) || rc.notes.length === 3).map((n) => at(n, 52)).sort((x, y) => midi(x) - midi(y));
          const top3 = chord.slice(0, 3);
          return [
            { pitches: [low], dur: 1, below: label(i) },
            { pitches: top3, dur: 1 },
            { pitches: top3, dur: 1 },
          ];
        }),
      ];
      break;
    }
  }

  const staffVoices = (voices: PlainNote[][], staff: number) => voices.map((v, vi): ScoreNote[] => notateVoice(v, { time, staff, voice: vi }));
  const score = scoreFromVoices(key, time, [
    { clef: 'treble', voices: staffVoices(treble, 0) },
    { clef: 'bass', voices: staffVoices(bass, 1) },
  ]);
  const melodyIds = score.staves[0].voices[0].notes.filter((n) => !n.rest).map((n) => n.id);
  return { score, melodyIds };
}
