/**
 * A small score model for notated excerpts and generated music: staves, voices, notes with written
 * durations, ties, tuplets, grace notes and ornaments, organized in measures. Pure data, no DOM.
 *
 * Excerpts are written in a compact text format, one string per voice:
 *
 *   C4/16 D4 E4 F4 | G4/8. A4/16 (C4 E4 G4)/2~ | (C4 E4 G4)/4 r/4
 *
 * - A note is a pitch with its octave (C4 is middle C; F#5, Bb3, Ebb4, Cx5) followed by "/" and a
 *   note value: 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth, 32 thirty-second. Each "."
 *   adds a dot. The value carries over to following notes until a new one is given.
 * - "r" is a rest; "s" is an invisible spacer (for a voice that is silent in part of a bar).
 * - "(C4 E4 G4)" is a chord. A trailing "~" ties the note to the next one in the same voice.
 * - "3:2[ G5/16 F5 E5 ]" is a tuplet: three notes in the time of two.
 * - "^C5/16" is a grace note (acciaccatura) attached to the next note.
 * - "!tr", "!mordent" (lower), "!prall" (upper mordent), "!turn", "!stacc", "!fermata" add an ornament
 *   or articulation to the note before.
 * - '_"V7"' and '="text"' attach a label below or above the note before.
 * - "|" marks a barline; the parser checks that every bar adds up to the time signature.
 */
import { pitch as parsePitch, midi, type Pitch } from './notes';
import type { Key } from './keys';

export type NoteValue = 1 | 2 | 4 | 8 | 16 | 32;
export type Ornament = 'tr' | 'mordent' | 'prall' | 'turn' | 'stacc' | 'fermata';
export type Clef = 'treble' | 'bass';

export interface Tuplet {
  /** Notes written in the group. */
  actual: number;
  /** Notes of the same value they replace. */
  normal: number;
  /** Identifies the group within its voice. */
  group: number;
}

export interface ScoreNote {
  /** "staff.voice.index", stable for highlighting and selection. */
  id: string;
  /** Sounding pitches; empty for rests and spacers. */
  pitches: Pitch[];
  rest?: 'rest' | 'space';
  value: NoteValue;
  dots: number;
  tuplet?: Tuplet;
  /** Actual length in quarter notes (tuplets and dots applied). */
  dur: number;
  /** Offset from the start of the score in quarter notes (a pickup bar starts at 0). */
  start: number;
  /** Measure index, 0-based (the pickup, if any, is measure 0). */
  measure: number;
  /** Tied to the next note of the same voice. */
  tie?: boolean;
  /** Grace notes (each a chord) played just before this note. */
  grace?: Pitch[][];
  orn?: Ornament[];
  below?: string;
  above?: string;
}

export interface ScoreVoice {
  notes: ScoreNote[];
}

export interface ScoreStaff {
  clef: Clef;
  voices: ScoreVoice[];
}

export interface Score {
  key: Key;
  /** Time signature as [beats, beat unit], e.g. [6, 8]. */
  time: [number, number];
  /** Length of the pickup (anacrusis) in quarter notes, 0 for none. */
  pickup: number;
  /** Number of measures, including a pickup measure. */
  measures: number;
  /** Length of a short last measure in quarter notes (completing the pickup), or undefined. */
  ending?: number;
  staves: ScoreStaff[];
}

export interface StaffSpec {
  clef: Clef;
  voices: string[];
}

export interface ScoreSpec {
  key: Key;
  time: [number, number];
  pickup?: number;
  /** Length of a short last measure, usually what the pickup leaves out. Its closing barline is omitted. */
  ending?: number;
  staves: StaffSpec[];
}

const EPS = 1e-6;

/** Length of a full measure in quarter notes. */
export function measureLength(time: [number, number]): number {
  return (time[0] * 4) / time[1];
}

/** Length of a note value with dots, in quarter notes. */
export function valueLength(value: NoteValue, dots = 0): number {
  const base = 4 / value;
  let len = base;
  let add = base;
  for (let i = 0; i < dots; i++) {
    add /= 2;
    len += add;
  }
  return len;
}

/** Start of measure `m` in quarter notes. */
export function measureStart(score: Pick<Score, 'time' | 'pickup'>, m: number): number {
  const len = measureLength(score.time);
  if (score.pickup > 0) return m === 0 ? 0 : score.pickup + (m - 1) * len;
  return m * len;
}

/** Length of measure `m` in quarter notes. */
export function measureLen(score: Pick<Score, 'time' | 'pickup'> & Partial<Pick<Score, 'measures' | 'ending'>>, m: number): number {
  if (score.ending && score.measures !== undefined && m === score.measures - 1) return score.ending;
  return score.pickup > 0 && m === 0 ? score.pickup : measureLength(score.time);
}

/** Number of measures needed to hold `total` quarter notes. */
export function measureCount(score: Pick<Score, 'time' | 'pickup'>, total: number): number {
  if (total <= EPS) return 0;
  const len = measureLength(score.time);
  if (score.pickup > 0) return total <= score.pickup + EPS ? 1 : 1 + Math.ceil((total - score.pickup) / len - EPS);
  return Math.ceil(total / len - EPS);
}

/** Measure index containing a time (quarter notes from the start). */
export function measureAt(score: Pick<Score, 'time' | 'pickup'>, t: number): number {
  const len = measureLength(score.time);
  if (score.pickup > 0) return t < score.pickup - EPS ? 0 : 1 + Math.floor((t - score.pickup + EPS) / len);
  return Math.floor((t + EPS) / len);
}

const ORNAMENTS = new Set<Ornament>(['tr', 'mordent', 'prall', 'turn', 'stacc', 'fermata']);
const VALUES = new Set([1, 2, 4, 8, 16, 32]);

/** Split a voice string into tokens, keeping quoted labels, chords and tuplet brackets intact. */
function tokenize(text: string): string[] {
  const out: string[] = [];
  const re = /\s*(_"[^"]*"|="[^"]*"|\d+:\d+\[|\]|\|\|?|\([^)]*\)\S*|\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) if (m[1].trim()) out.push(m[1].trim());
  return out;
}

const NOTE_RE = /^(\^?)(\([^)]*\)|[rs]|[A-Ga-g](?:#|x|b|n)*-?\d)(?:\/(\d+)(\.*))?(~?)$/;

export class ScoreSyntaxError extends Error {}

/**
 * Parse one voice. `pickup` is the length of the first (partial) measure in quarter notes, or 0.
 * Throws ScoreSyntaxError with a description of the first problem found.
 */
export function parseVoice(text: string, opts: { time: [number, number]; pickup?: number; staff?: number; voice?: number }): ScoreNote[] {
  const time = opts.time;
  const pickup = opts.pickup ?? 0;
  const prefix = `${opts.staff ?? 0}.${opts.voice ?? 0}`;
  const shape = { time, pickup };
  const notes: ScoreNote[] = [];
  let t = 0;
  let value: NoteValue = 4;
  let dots = 0;
  let tuplet: Tuplet | undefined;
  let tupletCount = 0;
  let pendingGrace: Pitch[][] = [];
  const fail = (msg: string, tok: string): never => {
    throw new ScoreSyntaxError(`Voice ${prefix}: ${msg} at "${tok}"`);
  };
  const pitchesOf = (body: string, tok: string): Pitch[] => {
    const inner = body.startsWith('(') ? body.slice(1, -1).trim().split(/\s+/) : [body];
    return inner.map((p) => {
      try {
        // "n" (natural) is accepted for readability and means no accidental.
        return parsePitch(p.replace(/n/g, ''));
      } catch {
        return fail(`bad pitch "${p}"`, tok);
      }
    });
  };

  for (const tok of tokenize(text)) {
    if (tok === '|' || tok === '||') {
      // A barline must fall exactly on a measure boundary.
      const m = measureAt(shape, t);
      if (Math.abs(measureStart(shape, m) - t) > EPS) fail(`bar ${m} has ${roundQ(t - measureStart(shape, m))} quarter notes, expected ${measureLen(shape, m)}`, tok);
      continue;
    }
    const tm = /^(\d+):(\d+)\[$/.exec(tok);
    if (tm) {
      if (tuplet) fail('nested tuplet', tok);
      tuplet = { actual: Number(tm[1]), normal: Number(tm[2]), group: tupletCount++ };
      continue;
    }
    if (tok === ']') {
      if (!tuplet) fail('unmatched "]"', tok);
      tuplet = undefined;
      continue;
    }
    const lab = /^([_=])"([^"]*)"$/.exec(tok);
    if (lab) {
      const last = notes[notes.length - 1];
      if (!last) fail('label before any note', tok);
      if (lab[1] === '_') last.below = lab[2];
      else last.above = lab[2];
      continue;
    }
    if (tok.startsWith('!')) {
      const o = tok.slice(1) as Ornament;
      const last = notes[notes.length - 1];
      if (!ORNAMENTS.has(o)) fail('unknown ornament', tok);
      if (!last) fail('ornament before any note', tok);
      (last.orn ??= []).push(o);
      continue;
    }
    const m = NOTE_RE.exec(tok);
    if (!m) fail('cannot read token', tok);
    const [, grace, body, val, dotStr, tie] = m!;
    if (val !== undefined) {
      const v = Number(val);
      if (!VALUES.has(v)) fail(`unsupported note value ${v}`, tok);
      value = v as NoteValue;
      dots = dotStr.length;
    }
    if (grace) {
      if (body === 'r' || body === 's') fail('a grace note cannot be a rest', tok);
      pendingGrace.push(pitchesOf(body, tok));
      continue;
    }
    let dur = valueLength(value, dots);
    if (tuplet) dur = (dur * tuplet.normal) / tuplet.actual;
    const note: ScoreNote = {
      id: `${prefix}.${notes.length}`,
      pitches: body === 'r' || body === 's' ? [] : pitchesOf(body, tok),
      value,
      dots,
      dur,
      start: t,
      measure: measureAt(shape, t),
    };
    if (body === 'r') note.rest = 'rest';
    if (body === 's') note.rest = 'space';
    if (tuplet) note.tuplet = { ...tuplet };
    if (tie) note.tie = true;
    if (pendingGrace.length) {
      note.grace = pendingGrace;
      pendingGrace = [];
    }
    // A note may not run over a barline: write it as two tied notes instead.
    const end = t + dur;
    const mEnd = measureStart(shape, note.measure) + measureLen(shape, note.measure);
    if (end > mEnd + EPS) fail(`note crosses the barline of bar ${note.measure}; split it with a tie`, tok);
    notes.push(note);
    t = end;
  }
  if (tuplet) throw new ScoreSyntaxError(`Voice ${prefix}: unclosed tuplet`);
  if (pendingGrace.length) throw new ScoreSyntaxError(`Voice ${prefix}: grace note at the end of the voice`);
  return notes;
}

const roundQ = (x: number) => Math.round(x * 1000) / 1000;

/** Total length of a voice in quarter notes. */
export function voiceLength(notes: ScoreNote[]): number {
  const last = notes[notes.length - 1];
  return last ? last.start + last.dur : 0;
}

/** Build a score from text voices. Every voice must fill the same number of whole measures. */
export function buildScore(spec: ScoreSpec): Score {
  const pickup = spec.pickup ?? 0;
  const staves = spec.staves.map((st, si) => ({
    clef: st.clef,
    voices: st.voices.map((v, vi) => ({ notes: parseVoice(v, { time: spec.time, pickup, staff: si, voice: vi }) })),
  }));
  const lengths = staves.flatMap((st) => st.voices.map((v) => voiceLength(v.notes)));
  const total = Math.max(0, ...lengths);
  const shape = { time: spec.time, pickup };
  const measures = measureCount(shape, total);
  const expected = spec.ending ? measureStart(shape, measures - 1) + spec.ending : measureStart(shape, measures);
  staves.forEach((st, si) =>
    st.voices.forEach((v, vi) => {
      const len = voiceLength(v.notes);
      if (Math.abs(len - expected) > EPS) throw new ScoreSyntaxError(`Voice ${si}.${vi} lasts ${roundQ(len)} quarter notes; the score needs ${roundQ(expected)}`);
    }),
  );
  return { key: spec.key, time: spec.time, pickup, measures, ...(spec.ending ? { ending: spec.ending } : {}), staves };
}

/** Every note of the score, in staff and voice order. */
export function allNotes(score: Score): ScoreNote[] {
  return score.staves.flatMap((st) => st.voices.flatMap((v) => v.notes));
}

/** Find a note by id. */
export function noteById(score: Score, id: string): ScoreNote | undefined {
  const [s, v] = id.split('.').map(Number);
  return score.staves[s]?.voices[v]?.notes.find((n) => n.id === id);
}

/**
 * Note ids matching a selector: "1.0" (every note of staff 1, voice 0), "0.0.4-11" (notes 4 to 11)
 * or "0.0.5". Several selectors can be joined with commas. Rests and spacers are left out.
 */
export function selectNotes(score: Score, selector: string): string[] {
  const out: string[] = [];
  for (const part of selector.split(',').map((x) => x.trim()).filter(Boolean)) {
    const [s, v, range] = part.split('.');
    const notes = score.staves[Number(s)]?.voices[Number(v)]?.notes ?? [];
    let lo = 0;
    let hi = notes.length - 1;
    if (range !== undefined) {
      const [a, b] = range.split('-').map(Number);
      lo = a;
      hi = b ?? a;
    }
    for (let i = lo; i <= hi && i < notes.length; i++) if (!notes[i].rest) out.push(notes[i].id);
  }
  return out;
}

export interface PlayNote {
  /** Start in quarter notes. */
  time: number;
  duration: number;
  midi: number[];
  /** Ids of the written notes that make up this sound (tied notes are joined). */
  ids: string[];
  grace?: boolean;
}

/** Grace notes take this many quarter notes from the start of their main note. */
const GRACE_LEN = 0.08;

/**
 * Sounds of the score in time order: tied notes become one sound, rests are skipped and grace
 * notes are played just before the beat (taking a little time from the previous sound).
 */
export function scoreSounds(score: Score): PlayNote[] {
  const out: PlayNote[] = [];
  for (const st of score.staves) {
    for (const v of st.voices) {
      let open: PlayNote | null = null;
      for (const n of v.notes) {
        if (n.rest) {
          open = null;
          continue;
        }
        n.grace?.forEach((g, gi) => {
          const at = n.start - GRACE_LEN * (n.grace!.length - gi);
          out.push({ time: Math.max(0, at), duration: GRACE_LEN, midi: g.map(midi), ids: [n.id], grace: true });
        });
        const ms = n.pitches.map(midi);
        if (open && open.midi.join() === ms.join()) {
          open.duration += n.dur;
          open.ids.push(n.id);
        } else {
          open = { time: n.start, duration: n.dur, midi: ms, ids: [n.id] };
          out.push(open);
        }
        if (!n.tie) open = null;
      }
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

// ---------------------------------------------------------------------------
// Writing generated music into measures
// ---------------------------------------------------------------------------

export interface PlainNote {
  /** Empty for a rest. */
  pitches: Pitch[];
  /** Length in quarter notes. */
  dur: number;
  below?: string;
  above?: string;
  orn?: Ornament[];
  /** Part of a triplet: `dur` is the actual length (1/3 for a triplet eighth). Triplets are grouped in threes. */
  triplet?: boolean;
}

const WRITABLE: Array<{ value: NoteValue; dots: number; len: number }> = [];
for (const value of [1, 2, 4, 8, 16, 32] as NoteValue[]) for (const d of [0, 1, 2]) WRITABLE.push({ value, dots: d, len: valueLength(value, d) });
WRITABLE.sort((a, b) => b.len - a.len);

/** Break a length into note values that can be written, longest first (5 quarters = whole + quarter). */
export function writableParts(len: number): Array<{ value: NoteValue; dots: number; len: number }> {
  const out: Array<{ value: NoteValue; dots: number; len: number }> = [];
  let left = len;
  while (left > EPS) {
    const w = WRITABLE.find((x) => x.len <= left + EPS && x.dots < 2);
    if (!w) break;
    out.push(w);
    left -= w.len;
  }
  return out;
}

/**
 * Write a sequence of notes (lengths in quarter notes) into one voice, splitting notes at
 * barlines (and off-beat notes at the next beat) with ties and breaking lengths into writable values. Returns notes ready for a Score.
 */
export function notateVoice(seq: PlainNote[], opts: { time: [number, number]; pickup?: number; staff?: number; voice?: number }): ScoreNote[] {
  const shape = { time: opts.time, pickup: opts.pickup ?? 0 };
  const prefix = `${opts.staff ?? 0}.${opts.voice ?? 0}`;
  const out: ScoreNote[] = [];
  let t = 0;
  let triplets = 0;
  for (const n of seq) {
    if (n.triplet) {
      // Written as the next longer plain value under a 3:2 bracket (a triplet eighth is an eighth).
      const w = writableParts((n.dur * 3) / 2)[0];
      out.push({
        id: `${prefix}.${out.length}`,
        pitches: n.pitches,
        ...(n.pitches.length === 0 ? { rest: 'rest' as const } : {}),
        value: w.value,
        dots: w.dots,
        tuplet: { actual: 3, normal: 2, group: Math.floor(triplets / 3) },
        dur: n.dur,
        start: t,
        measure: measureAt(shape, t),
        ...(n.below ? { below: n.below } : {}),
        ...(n.above ? { above: n.above } : {}),
        ...(n.orn ? { orn: n.orn } : {}),
      });
      triplets++;
      t += n.dur;
      continue;
    }
    let left = n.dur;
    let first = true;
    while (left > EPS) {
      const m = measureAt(shape, t);
      const room = measureStart(shape, m) + measureLen(shape, m) - t;
      const chunk = Math.min(left, room);
      // A note that starts off the beat and runs past it is written up to the beat, then tied on.
      const beat = opts.time[1] === 8 && opts.time[0] % 3 === 0 ? 1.5 : 4 / opts.time[1];
      const inBeat = (t - measureStart(shape, m)) % beat;
      const toBeat = beat - inBeat;
      const parts = inBeat > EPS && chunk > toBeat + EPS ? [...writableParts(toBeat), ...writableParts(chunk - toBeat)] : writableParts(chunk);
      parts.forEach((p, pi) => {
        const isLastPart = pi === parts.length - 1 && left - chunk < EPS;
        out.push({
          id: `${prefix}.${out.length}`,
          pitches: n.pitches,
          ...(n.pitches.length === 0 ? { rest: 'rest' as const } : {}),
          value: p.value,
          dots: p.dots,
          dur: p.len,
          start: t,
          measure: measureAt(shape, t),
          ...(n.pitches.length && !isLastPart ? { tie: true } : {}),
          ...(first && n.below ? { below: n.below } : {}),
          ...(first && n.above ? { above: n.above } : {}),
          ...(first && n.orn ? { orn: n.orn } : {}),
        });
        t += p.len;
        first = false;
      });
      left -= chunk;
    }
  }
  return out;
}

/** Pad a voice with rests up to a length in quarter notes. */
export function padVoice(notes: ScoreNote[], total: number, opts: { time: [number, number]; pickup?: number; staff?: number; voice?: number }): ScoreNote[] {
  const len = voiceLength(notes);
  if (len >= total - EPS) return notes;
  const rest = notateVoice([{ pitches: [], dur: total - len }], opts).map((r, i) => ({ ...r, id: `${opts.staff ?? 0}.${opts.voice ?? 0}.${notes.length + i}`, start: r.start + len }));
  const shape = { time: opts.time, pickup: opts.pickup ?? 0 };
  return [...notes, ...rest.map((r) => ({ ...r, measure: measureAt(shape, r.start) }))];
}

/** Assemble a score from already notated voices. */
export function scoreFromVoices(key: Key, time: [number, number], staves: Array<{ clef: Clef; voices: ScoreNote[][] }>, pickup = 0): Score {
  const total = Math.max(0, ...staves.flatMap((s) => s.voices.map(voiceLength)));
  const shape = { time, pickup };
  const measures = measureCount(shape, total);
  const full = measureStart(shape, measures);
  return {
    key,
    time,
    pickup,
    measures,
    staves: staves.map((s, si) => ({
      clef: s.clef,
      voices: s.voices.map((v, vi) => ({ notes: padVoice(v, full, { time, pickup, staff: si, voice: vi }) })),
    })),
  };
}
