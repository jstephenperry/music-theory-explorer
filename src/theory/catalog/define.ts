/**
 * Building blocks for the scale catalog.
 *
 * Every scale degree is a spelled interval above the root (one letter per degree, so spelling is
 * always correct) plus an optional deviation in cents from the 12-tone equal-tempered size of that
 * interval. "M3-50" is a major third lowered by 50 cents (E half-flat above C); "m2+24" is a minor
 * second raised by 24 cents. The 12-tone tools of the app (keyboard, chords, finder) work on the
 * spelled intervals, while playback and the cents display use the exact deviations.
 *
 * Forms (ascent, descent, ambitus) are written the same way. A leading "-" puts the note an
 * octave lower ("-M7" is the leading tone below the tonic); compound intervals reach above the
 * octave ("P8", "M9").
 */
import { interval, intervalBetween, intervalName } from '../intervals';
import type { Interval } from '../intervals';
import { note, pc } from '../notes';

export type TraditionId =
  | 'western'
  | 'jazz'
  | 'symmetric'
  | 'arabic'
  | 'turkish'
  | 'persian'
  | 'byzantine'
  | 'jewish'
  | 'hindustani'
  | 'carnatic'
  | 'east-asian'
  | 'southeast-asian'
  | 'ethiopian'
  | 'greek';

export interface FormStep {
  interval: Interval;
  /** Interval name without octave shift, e.g. "M7" for "-M7". */
  name: string;
  /** Deviation in cents from 12-tone equal temperament. */
  cents: number;
  /** Octave shift: -1 for notes written with a leading "-". */
  octave: number;
}

export interface ScaleForm {
  /** "Ascending", "Descending", "Aroha", "Ambitus" ... */
  label: string;
  steps: FormStep[];
}

export interface ScaleDef {
  id: string;
  name: string;
  tradition: TraditionId;
  /** Group within the tradition (maqam family, thaat, chakra, mode family ...). */
  family: string;
  /** Spelled intervals above the root, ascending within one octave. */
  intervals: string[];
  /** Deviation in cents from 12-TET for each degree (same order as `intervals`); absent when all are 0. */
  cents?: number[];
  /** Ascending and descending forms, or the customary range, when they differ from the plain scale. */
  forms?: ScaleForm[];
  aliases?: string[];
  /** Short description of sound and usage. */
  description: string;
  /** Mood words, used as tags. */
  mood?: string[];
  /** Indices (0-based) of degrees that define the mode's color compared with its nearest major or minor scale. */
  characteristic?: number[];
  /** Parent scale id and 1-based degree, when the scale is a mode of another. */
  modeOf?: { parent: string; degree: number };
  /** For diatonic modes: 1 (darkest) to 7 (brightest). */
  brightness?: number;
  /** Typical chord to play the scale over, as a chord id from the chord catalog. */
  chordId?: string;
  /** Customary tonic (note name), loaded when the scale is picked from the browser. */
  tonic?: string;
  /** Label and value pairs shown with the scale: vadi, time of day, ajnas, final and so on. */
  facts?: Array<[string, string]>;
  /** Names for each degree, overriding the tradition's automatic labels. */
  degreeNames?: string[];
}

export type ScaleInput = Omit<ScaleDef, 'tradition' | 'family' | 'cents' | 'forms'> & {
  /** Overrides the family given to `define`. */
  family?: string;
  forms?: Array<{ label: string; notes: string }>;
};

const TOKEN_RE = /^(-?)((?:P|M|m|A+|d+)\d+)([+-]\d+(?:\.\d+)?)?$/;

/** Parse "M3-50" into a spelled interval name and a deviation in cents. */
export function parseToken(token: string): { name: string; cents: number; octave: number } {
  const m = TOKEN_RE.exec(token.trim());
  if (!m) throw new Error(`Invalid scale token: "${token}"`);
  return { name: m[2], cents: m[3] ? Number(m[3]) : 0, octave: m[1] ? -1 : 0 };
}

function parseForm(label: string, notes: string): ScaleForm {
  return {
    label,
    steps: notes
      .trim()
      .split(/\s+/)
      .map((t) => {
        const p = parseToken(t);
        return { interval: interval(p.name), name: p.name, cents: p.cents, octave: p.octave };
      }),
  };
}

/** Attach a tradition and family to a list of scale inputs, parsing microtonal tokens. */
export function define(tradition: TraditionId, family: string, inputs: ScaleInput[]): ScaleDef[] {
  return inputs.map((inp) => {
    const parsed = inp.intervals.map(parseToken);
    const cents = parsed.map((p) => p.cents);
    const { forms, ...rest } = inp;
    return {
      ...rest,
      tradition,
      family: inp.family ?? family,
      intervals: parsed.map((p) => p.name),
      ...(cents.some((c) => c !== 0) ? { cents } : {}),
      ...(forms ? { forms: forms.map((f) => parseForm(f.label, f.notes)) } : {}),
    };
  });
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Token for a spelled interval with a deviation: ("M3", -45.2) -> "M3-45.2". */
export function token(name: string, cents: number): string {
  const c = round1(cents);
  if (c === 0) return name;
  return `${name}${c > 0 ? '+' : ''}${c}`;
}

/**
 * Tokens from note names and absolute pitches in cents above C: [['D', 204], ['E', 355], ...].
 * The first note is the tonic. Deviations are measured from each note's equal-tempered pitch, so
 * the tonic may carry one too (maqam Sikah starts on E half-flat). Notes an octave or more above
 * the tonic get compound intervals (P8, M9); notes below it get a leading "-".
 */
export function fromAbsolute(notes: Array<[string, number]>): string[] {
  return absTokens(notes[0], notes);
}

/** Like `fromAbsolute`, but measured from a given tonic, for ascending and descending forms. */
export function absTokens(tonic: [string, number], notes: Array<[string, number]>): string[] {
  const t = note(tonic[0]);
  // Equal-tempered pitch of the tonic, in the octave closest to its given pitch.
  let tonicEt = pc(t) * 100;
  while (tonic[1] - tonicEt > 600) tonicEt += 1200;
  while (tonicEt - tonic[1] > 600) tonicEt -= 1200;
  return notes.map(([name, abs]) => {
    const iv = intervalBetween(t, note(name));
    const et = tonicEt + iv.semis * 100;
    const k = Math.round((abs - et) / 1200);
    const dev = abs - et - 1200 * k;
    if (k < 0) return '-' + token(intervalName(iv), dev);
    return token(intervalName({ num: iv.num + 7 * k, semis: iv.semis + 12 * k }), dev);
  });
}

/** A form's notes as one string, for `forms: [{ label, notes }]`. */
export function absForm(tonic: [string, number], notes: Array<[string, number]>): string {
  return absTokens(tonic, notes).join(' ');
}

/** Tokens from spelled intervals and step sizes in arbitrary units (commas, moria) per octave. */
export function fromSteps(names: string[], steps: number[], unitsPerOctave: number, tonicCents = 0): string[] {
  let acc = 0;
  return names.map((name, i) => {
    if (i > 0) acc += steps[i - 1];
    const cents = (acc * 1200) / unitsPerOctave;
    return token(name, cents - interval(name).semis * 100 + tonicCents);
  });
}
