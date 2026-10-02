/**
 * Variation techniques applied to the first eight bars of the K. 265 theme. Each technique keeps the
 * theme's phrase and harmony and changes one aspect of the surface: melodic figuration, rhythm,
 * meter, mode or accompaniment. The results are generated, in the manner of Mozart's variations,
 * not quotations of them.
 */
import { makeKey, type Key } from '../keys';
import { midi, type Pitch } from '../notes';
import { parseRoman } from '../roman';
import { notateVoice, scoreFromVoices, type PlainNote, type Score } from '../score';
import { stepPitch } from '../composition/motive';
import { accompaniment } from './phrase';
import { quarterEntries } from '../../repertoire';

export type MelodyTechnique = 'plain' | 'neighbor' | 'runs' | 'triplets' | 'dotted' | 'syncopated' | 'triple';
export type ModeChoice = 'major' | 'minor';
export type BassChoice = 'theme' | 'alberti' | 'block' | 'none';

export const MELODY_TECHNIQUES: Array<{ id: MelodyTechnique; name: string; description: string }> = [
  { id: 'plain', name: 'Theme as written', description: 'The melody in quarter notes, as Mozart states it.' },
  { id: 'neighbor', name: 'Neighbor-note figuration', description: 'Each quarter note becomes four sixteenths circling it: upper neighbor, note, lower neighbor (a half step below), note. Mozart’s first variation works this way.' },
  { id: 'runs', name: 'Passing-note runs', description: 'Sixteenth-note scales fill the space between the theme’s notes, so the line flows from one to the next.' },
  { id: 'triplets', name: 'Triplet arpeggios', description: 'Each note is followed by two chord tones below it in triplet eighths: the melody is broken into the harmony.' },
  { id: 'dotted', name: 'Dotted rhythm', description: 'Every quarter note becomes a dotted eighth and a sixteenth, which gives the theme a march-like snap.' },
  { id: 'syncopated', name: 'Syncopation', description: 'The second note of each bar arrives half a beat early and is held across the beat, against the steady bass.' },
  { id: 'triple', name: 'Triple meter', description: 'The theme is recast in 3/4: the first note of each bar is lengthened, as in Mozart’s last variation.' },
];

export const MODE_CHOICES: Array<{ id: ModeChoice; name: string; description: string }> = [
  { id: 'major', name: 'Major', description: 'The theme’s own key, C major.' },
  { id: 'minor', name: 'Minor', description: 'The parallel minor: E and A are lowered, and the chords become minor (Mozart’s eighth variation is in C minor).' },
];

export const BASS_CHOICES: Array<{ id: BassChoice; name: string }> = [
  { id: 'theme', name: 'Theme’s bass' },
  { id: 'alberti', name: 'Alberti bass' },
  { id: 'block', name: 'Block chords' },
  { id: 'none', name: 'Melody alone' },
];

/** The work the theme is taken from, a repertoire id. */
export const THEME_WORK = 'k265theme';

/**
 * The theme, bars 1 to 8, read beat by beat from the encoded score: one entry per note that starts
 * on a quarter (the last bar is one half note). Bar 7's dotted figure contributes its two beats.
 */
const MELODY_ENTRIES = quarterEntries(THEME_WORK, 0, 0);
const BASS_ENTRIES = quarterEntries(THEME_WORK, 1, 0);
export const THEME = MELODY_ENTRIES.map((e) => e.pitch);
export const THEME_BASS = BASS_ENTRIES.map((e) => e.pitch);
export const HARMONY_MAJOR = BASS_ENTRIES.map((e) => e.numeral!);
/** The parallel minor is not in the score: the same plan with the quality of each chord changed. */
const HARMONY_MINOR = ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'V43', 'V65', 'i', 'VI', 'iio6', 'V', 'i'];

export interface VariationChoice {
  melody: MelodyTechnique;
  mode: ModeChoice;
  bass: BassChoice;
}

export const THEME_CHOICE: VariationChoice = { melody: 'plain', mode: 'major', bass: 'theme' };

/** Lower the third and sixth degrees for the parallel minor (the seventh stays raised, as in harmonic minor). */
function toMinor(p: Pitch): Pitch {
  return p.letter === 'E' || p.letter === 'A' ? { ...p, acc: p.acc - 1 } : p;
}

/** The note a half step below, spelled on the letter below (F sharp below G, B below C). */
function halfStepBelow(p: Pitch): Pitch {
  const below = stepPitch({ ...p, acc: 0 }, -1, makeKey('C'));
  return { ...below, acc: midi(p) - 1 - midi({ ...below, acc: 0 }) };
}

export interface BuiltVariation {
  score: Score;
  /** Ids of melody notes that are the theme's own notes, at their own beat. */
  themeIds: string[];
  key: Key;
}

export function buildVariation(choice: VariationChoice): BuiltVariation {
  const minor = choice.mode === 'minor';
  const key = minor ? makeKey('C', 'minor') : makeKey('C');
  const mel = minor ? THEME.map(toMinor) : THEME;
  const bass = minor ? THEME_BASS.map(toMinor) : THEME_BASS;
  const harmony = minor ? HARMONY_MINOR : HARMONY_MAJOR;
  const triple = choice.melody === 'triple';
  const time: [number, number] = triple ? [3, 4] : [2, 4];
  // Length of each theme quarter in the variation: in 3/4 the first of each pair becomes a half note.
  const lens = mel.map((_, k) => (k === mel.length - 1 ? (triple ? 3 : 2) : triple ? (k % 2 === 0 ? 2 : 1) : 1));
  const step = (p: Pitch, d: number) => stepPitch(p, d, key);

  const melody: PlainNote[] = [];
  const themeStarts: number[] = [];
  let t = 0;
  mel.forEach((x, k) => {
    const len = lens[k];
    const next = mel[k + 1];
    const last = k === mel.length - 1;
    themeStarts.push(t);
    const push = (ps: Pitch[], dur: number) => ps.forEach((p) => melody.push({ pitches: [p], dur }));
    if (last || choice.melody === 'plain' || triple) {
      melody.push({ pitches: [x], dur: len });
    } else if (choice.melody === 'neighbor') {
      push([step(x, 1), x, halfStepBelow(x), x], 0.25);
    } else if (choice.melody === 'runs') {
      const d = Math.sign(midi(next) - midi(x));
      const gap = Math.abs(stepsBetween(x, next));
      if (gap === 0) push([x, step(x, 1), x, step(x, -1)], 0.25);
      else if (gap >= 3) push([x, step(x, d), step(x, 2 * d), step(x, 3 * d)], 0.25);
      else push([x, step(x, -d), x, step(x, d)], 0.25);
    } else if (choice.melody === 'triplets') {
      const tones = parseRoman(harmony[k], key).notes;
      const below: Pitch[] = [];
      let cur = x;
      while (below.length < 2) {
        cur = step(cur, -1);
        if (tones.some((n) => n.letter === cur.letter && n.acc === cur.acc)) below.push(cur);
      }
      [x, ...below].forEach((p) => melody.push({ pitches: [p], dur: 1 / 3, triplet: true }));
    } else if (choice.melody === 'dotted') {
      const target = next && midi(next) !== midi(x) ? step(x, Math.sign(midi(next) - midi(x))) : step(x, 1);
      melody.push({ pitches: [x], dur: 0.75 }, { pitches: [target], dur: 0.25 });
    } else if (choice.melody === 'syncopated') {
      // Pairs of quarters: eighth, quarter (the second note, early), eighth.
      if (k % 2 === 0) melody.push({ pitches: [x], dur: 0.5 }, { pitches: [next], dur: 1 }, { pitches: [step(next, 1)], dur: 0.5 });
    }
    t += len;
  });

  const lower: PlainNote[] =
    choice.bass === 'theme'
      ? bass.map((p, k) => ({ pitches: [p], dur: lens[k], below: k > 0 && harmony[k] === harmony[k - 1] ? undefined : parseRoman(harmony[k], key).display }))
      : choice.bass === 'none'
        ? lens.map((len) => ({ pitches: [], dur: len }))
        : accompaniment(mergeHarmony(harmony, lens), key, choice.bass === 'alberti' ? 'alberti' : 'block');

  const score = scoreFromVoices(key, time, [
    { clef: 'treble', voices: [notateVoice(melody, { time, staff: 0 })] },
    { clef: 'bass', voices: [notateVoice(lower, { time, staff: 1 })] },
  ]);
  const themeIds = score.staves[0].voices[0].notes
    .filter((n) => !n.rest && themeStarts.some((s, k) => n.start >= s - 1e-6 && n.start < s + 0.5 - 1e-6 && midi(n.pitches[0]) === midi(mel[k])))
    .map((n) => n.id);
  return { score, themeIds, key };
}

function stepsBetween(a: Pitch, b: Pitch): number {
  return b.octave * 7 + 'CDEFGAB'.indexOf(b.letter) - (a.octave * 7 + 'CDEFGAB'.indexOf(a.letter));
}

/** Consecutive equal chords become one longer chord, so an Alberti pattern runs across the bar. */
function mergeHarmony(harmony: string[], lens: number[]): Array<{ rn: string; start: number; dur: number }> {
  const out: Array<{ rn: string; start: number; dur: number }> = [];
  let t = 0;
  harmony.forEach((rn, k) => {
    const prev = out[out.length - 1];
    // Never merge across a barline (every second quarter, or the last bar).
    const barStart = k % 2 === 0;
    if (prev && prev.rn === rn && !barStart) prev.dur += lens[k];
    else out.push({ rn, start: t, dur: lens[k] });
    t += lens[k];
  });
  return out;
}
