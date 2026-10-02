/**
 * Phrase building: eight-bar periods and sentences assembled from short units (a basic idea, its
 * repetition, fragments and a cadential unit), harmonized and accompanied, then analyzed.
 *
 * Every unit is written in C major and transposed to the chosen key. Harmony is written as roman
 * numerals with their length in beats ("I:4 V7:4"), so the cadences can be recognized by the same
 * analysis the Progression Lab uses.
 */
import { pitchInterval, transposePitch, transposePitchDown, type Interval } from '../../theory/intervals';
import { makeKey, type Key } from '../../theory/keys';
import { letterIndex, midi, pc, type Note, type Pitch } from '../../theory/notes';
import { parseRoman, type RomanChord } from '../../theory/roman';
import { notateVoice, parseVoice, scoreFromVoices, type PlainNote, type Score, type ScoreNote } from '../../theory/score';
import type { ScoreBracket } from '../../components/ScoreView';
import { stepPitch } from '../../theory/composition/motive';
import { detectCadence, type Cadence } from '../progressions/harmony';

export const PHRASE_TIME: [number, number] = [4, 4];
const BAR = 4;

export interface Unit {
  /** Melody in the score text format, in C major. */
  melody: string;
  /** Roman numerals with their length in beats, e.g. "I:4 V7:4". */
  harmony: string;
}

export interface BasicIdea {
  id: string;
  name: string;
  /** What the idea is modeled on. */
  after: string;
  tonic: Unit;
  /** The same idea answered on the dominant (statement and response). */
  response: Unit;
}

export const BASIC_IDEAS: BasicIdea[] = [
  {
    id: 'arpeggio',
    name: 'Rising arpeggio',
    after: 'a tonic arpeggio that turns back down to the leading tone',
    tonic: { melody: 'C5/4 E5 G5/4. E5/8 | D5/4. C5/8 B4/4 r/4', harmony: 'I:4 V:4' },
    response: { melody: 'B4/4 D5 G5/4. D5/8 | C5/4. D5/8 E5/4 r/4', harmony: 'V:4 I:4' },
  },
  {
    id: 'lilting',
    name: 'Lilting neighbor',
    after: 'the opening of Mozart’s K. 331: a neighbor-note figure, then the same a step lower',
    tonic: { melody: 'E5/4. F5/8 E5/4 G5/4 | D5/4. E5/8 D5/4 F5/4', harmony: 'I:4 V7:4' },
    response: { melody: 'D5/4. E5/8 D5/4 F5/4 | C5/4. D5/8 C5/4 E5/4', harmony: 'V7:4 I:4' },
  },
  {
    id: 'rocket',
    name: 'Rocket and turn',
    after: 'the opening of Beethoven’s Op. 2 No. 1: an arpeggio rising from the fifth, then a falling turn',
    tonic: { melody: 'G4/4 C5 E5 G5 | E5/4. D5/8 C5/4 r/4', harmony: 'I:8' },
    response: { melody: 'G4/4 B4 D5 G5 | F5/4. E5/8 D5/4 r/4', harmony: 'V:4 V7:4' },
  },
];

export type CadenceKind = 'pac' | 'iac' | 'hc' | 'dc';

export const CADENCE_KINDS: Array<{ id: CadenceKind; name: string; short: string }> = [
  { id: 'pac', name: 'Perfect authentic cadence', short: 'PAC' },
  { id: 'iac', name: 'Imperfect authentic cadence', short: 'IAC' },
  { id: 'hc', name: 'Half cadence', short: 'HC' },
  { id: 'dc', name: 'Deceptive cadence', short: 'Deceptive' },
];

/** The bar before the cadence: I6 and ii6, approaching the dominant. */
const APPROACH: Unit = { melody: 'E5/4 C5/4 F5/4 D5/4', harmony: 'I6:2 ii6:2' };

/** The cadence bar itself. The PAC and the deceptive cadence share a melody: only the bass differs. */
const CADENCE_BAR: Record<CadenceKind, Unit> = {
  pac: { melody: 'D5/4 B4/4 C5/2', harmony: 'V7:2 I:2' },
  iac: { melody: 'D5/4 F5/4 E5/2', harmony: 'V7:2 I:2' },
  hc: { melody: 'B4/4 C5/4 D5/2', harmony: 'V:4' },
  dc: { melody: 'D5/4 B4/4 C5/2', harmony: 'V7:2 vi:2' },
};

export function cadentialUnit(kind: CadenceKind): Unit {
  return { melody: `${APPROACH.melody} | ${CADENCE_BAR[kind].melody}`, harmony: `${APPROACH.harmony} ${CADENCE_BAR[kind].harmony}` };
}

export type PhraseForm = 'period' | 'sentence';
export type Repetition = 'exact' | 'response';
export type AccompStyleId = 'block' | 'alberti';

export interface PhraseChoice {
  form: PhraseForm;
  idea: string;
  /** Sentence: how the basic idea is repeated in bars 3 and 4. */
  repetition: Repetition;
  /** Period: the cadence that ends the antecedent in bar 4. */
  first: CadenceKind;
  /** The cadence that ends the phrase in bar 8. */
  last: CadenceKind;
  /** Tonic of the major key, e.g. "C", "Eb". */
  tonic: string;
  accomp: AccompStyleId;
}

export const PHRASE_TONICS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

export interface Section {
  label: string;
  color: string;
  start: number;
  end: number;
  /** Bracket row: 0 for the units, 1 for the phrase members. */
  row: number;
}

export interface FoundCadence {
  bar: number;
  cadence: Cadence;
}

export interface Verdict {
  title: string;
  text: string;
  /** True when the result is the form the builder set out to make. */
  ok: boolean;
}

export interface BuiltPhrase {
  score: Score;
  brackets: ScoreBracket[];
  colors: Record<string, string>;
  cadences: FoundCadence[];
  verdict: Verdict;
}

// ---------------------------------------------------------------------------
// Units to notes
// ---------------------------------------------------------------------------

interface Harm {
  rn: string;
  start: number;
  dur: number;
}

function plainMelody(text: string): PlainNote[] {
  return parseVoice(text, { time: PHRASE_TIME }).map((n: ScoreNote) => ({ pitches: n.pitches, dur: n.dur }));
}

function parseHarmony(text: string, offset: number): Harm[] {
  let t = offset;
  return text
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [rn, beats] = tok.split(':');
      const h = { rn, start: t, dur: Number(beats) };
      t += h.dur;
      return h;
    });
}

/** Move the first bar of a unit by scale steps: the fragments of a sentence's continuation. */
function shiftedHead(unit: Unit, steps: number, rn: string): Unit {
  const C = makeKey('C');
  const head = plainMelody(unit.melody.split('|')[0]);
  const text = head.map((n) => (n.pitches.length ? `${pitchText(stepPitch(n.pitches[0], steps, C))}/${durText(n.dur)}` : `r/${durText(n.dur)}`)).join(' ');
  return { melody: text, harmony: `${rn}:4` };
}

function pitchText(p: Pitch): string {
  return `${p.letter}${p.acc > 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc)}${p.octave}`;
}

function durText(d: number): string {
  const table: Record<string, string> = { '4': '1', '2': '2', '3': '2.', '1': '4', '1.5': '4.', '0.5': '8', '0.75': '8.', '0.25': '16' };
  return table[String(d)] ?? '4';
}

/** Interval from C to the key's tonic, and whether to move up or down to stay in a singable range. */
function keyShift(tonic: string): { iv: Interval; down: boolean } {
  const key = makeKey(tonic);
  const C4: Pitch = { letter: 'C', acc: 0, octave: 4 };
  const up = letterIndex(key.tonic.letter) <= 3;
  const target: Pitch = { ...key.tonic, octave: up ? 4 : 3 };
  return { iv: pitchInterval(C4, target), down: !up };
}

function transposeNotes(notes: PlainNote[], tonic: string): PlainNote[] {
  const { iv, down } = keyShift(tonic);
  return notes.map((n) => ({ ...n, pitches: n.pitches.map((p) => (down ? transposePitchDown(p, iv) : transposePitch(p, iv))) }));
}

/** A pitch for a chord tone at a given MIDI number, spelled as the chord spells it. */
function atMidi(n: Note, m: number): Pitch {
  for (const octave of [Math.floor(m / 12) - 2, Math.floor(m / 12) - 1, Math.floor(m / 12)]) {
    const p = { ...n, octave };
    if (midi(p) === m) return p;
  }
  return { ...n, octave: Math.floor(m / 12) - 1 };
}

/** The lowest MIDI number at or above `floor` with the note's pitch class. */
function lowestFrom(n: Note, floor: number): number {
  return floor + ((((pc(n) - floor) % 12) + 12) % 12);
}

/** Chord tones for a three-note texture: a seventh chord drops its fifth. */
function threeTones(rc: RomanChord): Note[] {
  const distinct = rc.notes.filter((n, i) => rc.notes.findIndex((x) => pc(x) === pc(n)) === i);
  const upper = distinct.filter((n) => pc(n) !== pc(rc.bass));
  if (upper.length > 2) return [rc.bass, ...upper.filter((n) => pc(n) !== pc(rc.notes[2]))].slice(0, 3);
  return [rc.bass, ...upper];
}

/** The accompaniment for a list of chords, as notated notes with the roman numerals below. */
export function accompaniment(harms: Harm[], key: Key, style: AccompStyleId): PlainNote[] {
  const out: PlainNote[] = [];
  for (const h of harms) {
    const rc = parseRoman(h.rn, key);
    const [bass, ...upper] = threeTones(rc);
    const label = rc.display;
    if (style === 'block') {
      const b = atMidi(bass, lowestFrom(bass, 40));
      const chord = [b, ...upper.map((n) => atMidi(n, lowestFrom(n, 55)))].sort((x, y) => midi(x) - midi(y));
      for (let t = 0; t < h.dur; t += 2) out.push({ pitches: chord, dur: Math.min(2, h.dur - t), below: t === 0 ? label : undefined });
    } else {
      const lowM = lowestFrom(bass, 48);
      const others = upper.map((n) => atMidi(n, lowestFrom(n, lowM + 1))).sort((x, y) => midi(x) - midi(y));
      const low = atMidi(bass, lowM);
      const [mid, high] = others.length >= 2 ? others : [others[0], others[0]];
      const pattern = [low, high, mid, high];
      for (let i = 0; i < h.dur * 2; i++) out.push({ pitches: [pattern[i % 4]], dur: 0.5, below: i === 0 ? label : undefined });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Building and analysis
// ---------------------------------------------------------------------------

const STRENGTH: Record<string, number> = { pac: 3, iac: 2, half: 1, phrygian: 1, deceptive: 1, plagal: 2 };

function plan(choice: PhraseChoice): { units: Unit[]; sections: Section[] } {
  const idea = BASIC_IDEAS.find((b) => b.id === choice.idea) ?? BASIC_IDEAS[0];
  const bars = (a: number, b: number) => ({ start: (a - 1) * BAR, end: b * BAR });
  if (choice.form === 'period') {
    return {
      units: [idea.tonic, cadentialUnit(choice.first), idea.tonic, cadentialUnit(choice.last)],
      sections: [
        { label: 'Basic idea', color: 'root', row: 0, ...bars(1, 2) },
        { label: `Contrasting idea, ${short(choice.first)}`, color: 'alt', row: 0, ...bars(3, 4) },
        { label: 'Basic idea', color: 'root', row: 0, ...bars(5, 6) },
        { label: `Contrasting idea, ${short(choice.last)}`, color: 'alt', row: 0, ...bars(7, 8) },
        { label: 'Antecedent', color: '', row: 1, ...bars(1, 4) },
        { label: 'Consequent', color: '', row: 1, ...bars(5, 8) },
      ],
    };
  }
  const repeat = choice.repetition === 'exact' ? idea.tonic : idea.response;
  return {
    units: [idea.tonic, repeat, shiftedHead(idea.tonic, -2, 'vi'), shiftedHead(idea.tonic, -4, 'IV'), cadentialUnit(choice.last)],
    sections: [
      { label: 'Basic idea', color: 'root', row: 0, ...bars(1, 2) },
      { label: choice.repetition === 'exact' ? 'Repetition' : 'Response on V', color: 'alt', row: 0, ...bars(3, 4) },
      { label: 'Fragment', color: 'extra', row: 0, ...bars(5, 5) },
      { label: 'Fragment', color: 'extra', row: 0, ...bars(6, 6) },
      { label: `Cadence, ${short(choice.last)}`, color: 'other', row: 0, ...bars(7, 8) },
      { label: 'Presentation', color: '', row: 1, ...bars(1, 4) },
      { label: 'Continuation', color: '', row: 1, ...bars(5, 8) },
    ],
  };
}

const short = (k: CadenceKind) => CADENCE_KINDS.find((c) => c.id === k)!.short;

/** The cadence that ends at a given time: the last two chords before it and the soprano on the last. */
function cadenceAt(harms: Harm[], melody: PlainNote[], end: number, key: Key): Cadence {
  const before = harms.filter((h) => h.start < end - 1e-6);
  const chords = before.slice(-2).map((h) => parseRoman(h.rn, key));
  const lastStart = before[before.length - 1]?.start ?? 0;
  let t = 0;
  let soprano: number | undefined;
  for (const n of melody) {
    if (t <= lastStart + 1e-6 && t + n.dur > lastStart + 1e-6 && n.pitches.length) soprano = pc(n.pitches[n.pitches.length - 1]);
    t += n.dur;
  }
  return detectCadence(chords, key, soprano);
}

/** "a half cadence", "an imperfect authentic cadence". */
const withArticle = (label: string) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()}`;

function verdictFor(choice: PhraseChoice, cadences: FoundCadence[]): Verdict {
  const last = cadences[cadences.length - 1].cadence;
  if (choice.form === 'sentence') {
    const how = choice.repetition === 'exact' ? 'The basic idea is repeated exactly' : 'The basic idea is answered on the dominant (statement and response)';
    if (last.id === 'pac' || last.id === 'iac')
      return { ok: true, title: 'A sentence that closes', text: `${how}, the continuation fragments it into one-bar units, and the phrase ends with ${withArticle(last.label)}: complete in itself.` };
    if (last.id === 'half')
      return { ok: true, title: 'A sentence that ends open', text: `${how}, then fragments it and stops on V, like Beethoven’s Op. 2 No. 1. The half cadence asks for more music to follow.` };
    return { ok: false, title: 'A sentence that is evaded', text: `${how}, but the cadence is deceptive: vi replaces the expected tonic, so a composer would extend the phrase to reach a real authentic cadence.` };
  }
  const a = cadences[0].cadence;
  const sa = STRENGTH[a.id] ?? 0;
  const sb = STRENGTH[last.id] ?? 0;
  if (last.id === 'deceptive')
    return { ok: false, title: 'Not yet a period', text: 'The consequent is deceptive: vi replaces the tonic. Classical composers use this to extend a period, adding bars until a true authentic cadence arrives.' };
  if (a.id === 'pac')
    return { ok: false, title: 'Not a period', text: 'The first phrase already ends with a perfect authentic cadence, so the second cannot answer it: the result is two complete phrases in a row (a phrase group), not a question and answer.' };
  if (sb > sa && (last.id === 'pac' || last.id === 'iac')) {
    const kind = last.id === 'pac' ? 'A parallel period' : 'A parallel period with a light close';
    return { ok: true, title: kind, text: `The antecedent ends with ${withArticle(a.label)} and the consequent, which starts with the same basic idea, answers with ${withArticle(last.label)}. The stronger second cadence is what makes the two phrases a period.` };
  }
  if (a.id === 'half' && last.id === 'half')
    return { ok: false, title: 'Two antecedents', text: 'Both phrases end on V. Neither answers the other, so the music still needs a phrase that closes on the tonic.' };
  return { ok: false, title: 'Not a period', text: `The consequent’s cadence (${last.label.toLowerCase()}) is not stronger than the antecedent’s (${a.label.toLowerCase()}), so the second phrase does not sound like an answer.` };
}

export function buildPhrase(choice: PhraseChoice): BuiltPhrase {
  const key = makeKey(choice.tonic);
  const { units, sections } = plan(choice);
  let t = 0;
  const melodyC: PlainNote[] = [];
  const harms: Harm[] = [];
  for (const u of units) {
    const mel = plainMelody(u.melody);
    melodyC.push(...mel);
    harms.push(...parseHarmony(u.harmony, t));
    t += mel.reduce((a, n) => a + n.dur, 0);
  }
  const melody = transposeNotes(melodyC, choice.tonic);
  const acc = accompaniment(harms, key, choice.accomp);
  const score = scoreFromVoices(key, PHRASE_TIME, [
    { clef: 'treble', voices: [notateVoice(melody, { time: PHRASE_TIME, staff: 0 })] },
    { clef: 'bass', voices: [notateVoice(acc, { time: PHRASE_TIME, staff: 1 })] },
  ]);

  const melNotes = score.staves[0].voices[0].notes;
  const brackets: ScoreBracket[] = [];
  const colors: Record<string, string> = {};
  for (const sec of sections) {
    const inSec = melNotes.filter((n) => !n.rest && n.start >= sec.start - 1e-6 && n.start < sec.end - 1e-6);
    if (!inSec.length) continue;
    brackets.push({ first: inSec[0].id, last: inSec[inSec.length - 1].id, label: sec.label, color: sec.color || undefined, row: sec.row });
    if (sec.color) inSec.forEach((n) => (colors[n.id] = sec.color));
  }

  const ends = choice.form === 'period' ? [4, 8] : [8];
  const cadences = ends.map((bar) => ({ bar, cadence: cadenceAt(harms, melody, bar * BAR, key) }));
  return { score, brackets, colors, cadences, verdict: verdictFor(choice, cadences) };
}
