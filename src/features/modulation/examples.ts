/**
 * Modulation: the example model (steps voiced in four parts) and the example builder for each
 * technique.
 */
import { interval, transpose } from '../../theory/intervals';
import { keyName, parallelKey, type Key } from '../../theory/keys';
import { LETTER_PC, midi, noteName, pc, pitchFromMidi, type Note, type Pitch } from '../../theory/notes';
import { analyzeChord, formatRoman, parseRoman, type RomanChord } from '../../theory/roman';
import { type Fn, chordKey, type KeyChord } from './keys';
import { type Pivot, findPivots, findBorrowedPivots } from './relations';
import { triadChords, type CommonToneCandidate, type Dim7Candidate, type Ger6Candidate, type SequenceChain, withRoot, type TechniqueId, techniqueStatus, commonToneCandidates, dim7Candidates, ger6Candidates, sequentialChain } from './techniques';
import { initialVoicing, voiceLead } from '../../theory/voicing';

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

export type StepRole = 'old' | 'pivot' | 'transition' | 'new' | 'bridge';

export interface Step {
  role: StepRole;
  root: Note;
  chordId: string;
  /** Chord tones (stacking order); for a bridge step, the single held note. */
  notes: Note[];
  bass: Note;
  symbol: string;
  /** Numeral in the old key (formatted). */
  oldLabel?: string;
  /** Numeral in the new key (formatted). */
  newLabel?: string;
  /** Repeats the previous sonority with a new spelling (enharmonic reinterpretation). */
  respell?: boolean;
  /** A new phrase starts here (direct modulation). */
  phraseStart?: boolean;
  beats: number;
}

export interface Example {
  from: Key;
  to: Key;
  steps: Step[];
  pitches: Pitch[][];
  /** Pitch class of the sustained common tone (common-tone modulation). */
  heldPc?: number;
  /** Indices of steps in which the held tone sounds. */
  heldSteps?: number[];
  heldMidi?: number;
  /** Two spellings of the enharmonic pivot sonority. */
  enharmonic?: { oldLabel: string; newLabel: string; oldNotes: Note[]; newNotes: Note[]; oldSymbol: string; newSymbol: string };
  caption: string;
}

export const tonicNumeral = (k: Key) => (k.mode === 'major' ? 'I' : 'i');
const predominantNumeral = (k: Key) => (k.mode === 'major' ? 'ii6' : 'iv');

function symbolFor(c: RomanChord): string {
  if (c.chordId === 'ger6') return `${noteName(c.root)} Ger⁺⁶`;
  if (c.chordId === 'it6') return `${noteName(c.root)} It⁺⁶`;
  if (c.chordId === 'fr6') return `${noteName(c.root)} Fr⁺⁶`;
  return c.symbol;
}

function stepFrom(c: RomanChord, role: StepRole, labels: { old?: string; new?: string } = {}, beats = 2): Step {
  return { role, root: c.root, chordId: c.chordId, notes: c.notes, bass: c.bass, symbol: symbolFor(c), oldLabel: labels.old, newLabel: labels.new, beats };
}

function oldStep(numeral: string, k: Key): Step {
  const c = parseRoman(numeral, k);
  return stepFrom(c, 'old', { old: c.display });
}

function newStep(numeral: string, k: Key, beats = 2): Step {
  const c = parseRoman(numeral, k);
  return stepFrom(c, 'new', { new: c.display }, beats);
}

/** I IV V7 I (or i iv V7 i): establishes the old key. */
export function establish(k: Key): Step[] {
  const nums = k.mode === 'major' ? ['I', 'IV', 'V7', 'I'] : ['i', 'iv', 'V7', 'i'];
  return nums.map((n) => oldStep(n, k));
}

/** Numerals that lead from a chord (given as a KeyChord-like description) to a cadence in `k`. */
export function continuation(c: { numeral: string; fn: Fn; chordId: string }, k: Key): string[] {
  const T = tonicNumeral(k);
  if (c.fn === 'predominant') return ['V7', T];
  if (c.fn === 'dominant') {
    if (c.chordId === 'min' || c.chordId === 'm7') return [predominantNumeral(k), 'V7', T];
    if (c.chordId === 'maj') return ['V7', T];
    return [T];
  }
  return [predominantNumeral(k), 'V7', T];
}

function finalize(steps: Step[]): Step[] {
  if (steps.length) steps[steps.length - 1] = { ...steps[steps.length - 1], beats: 4 };
  return steps;
}

/** Same MIDI pitch, new spelling. */
export function respellPitch(p: Pitch, n: Note): Pitch {
  const m = midi(p);
  const octave = Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1;
  return { letter: n.letter, acc: n.acc, octave };
}

function respellAll(ps: Pitch[], notes: Note[]): Pitch[] {
  return ps.map((p) => {
    const n = notes.find((x) => pc(x) === pc(p));
    return n ? respellPitch(p, n) : p;
  });
}

/**
 * Four-part voicing for a list of steps. Respelled steps keep the previous pitches with new
 * spellings; a bridge step sounds only the held tone; the chord after a bridge keeps that tone.
 */
export function voiceSteps(steps: Step[], heldPc?: number): { pitches: Pitch[][]; heldMidi?: number } {
  const out: Pitch[][] = [];
  let last: Pitch[] | null = null;
  let heldMidi: number | undefined;
  let afterBridge = false;
  for (const st of steps) {
    if (st.role === 'bridge' && last) {
      const candidates = last.slice(1).filter((p) => heldPc !== undefined && pc(p) === heldPc);
      const src = candidates.length ? candidates[candidates.length - 1] : last.find((p) => pc(p) === heldPc) ?? last[last.length - 1];
      heldMidi = midi(src);
      out.push([respellPitch(src, st.notes[0])]);
      afterBridge = true;
      continue;
    }
    let ps: Pitch[];
    if (!last) ps = initialVoicing({ notes: st.notes, bass: st.bass });
    else if (st.respell) ps = respellAll(last, st.notes);
    else ps = voiceLead(last, { notes: st.notes, bass: st.bass });
    if (afterBridge && heldMidi !== undefined && heldPc !== undefined) {
      ps = ensureHeld(ps, heldMidi, st.notes.find((n) => pc(n) === heldPc));
      afterBridge = false;
    }
    out.push(ps);
    last = ps;
  }
  return { pitches: out, heldMidi };
}

/** Make sure the chord contains the held MIDI pitch in an upper voice (replacing the closest voice). */
function ensureHeld(ps: Pitch[], heldMidi: number, spelled: Note | undefined): Pitch[] {
  if (!spelled || ps.slice(1).some((p) => midi(p) === heldMidi)) return ps;
  const upper = ps.slice(1);
  let best = 0;
  upper.forEach((p, i) => {
    if (Math.abs(midi(p) - heldMidi) < Math.abs(midi(upper[best]) - heldMidi)) best = i;
  });
  upper[best] = respellPitch(pitchFromMidi(heldMidi), spelled);
  upper.sort((a, b) => midi(a) - midi(b));
  return [ps[0], ...upper];
}

function makeExample(from: Key, to: Key, steps: Step[], caption: string, extra: Partial<Example> = {}): Example {
  const fin = finalize(steps);
  const { pitches, heldMidi } = voiceSteps(fin, extra.heldPc);
  const ex: Example = { from, to, steps: fin, pitches, caption, ...extra };
  if (extra.heldPc !== undefined) {
    ex.heldMidi = heldMidi;
    // The held tone: the contiguous run of steps around the bridge that keep that exact pitch.
    const has = (i: number) => heldMidi !== undefined && i >= 0 && i < pitches.length && pitches[i].some((p) => midi(p) === heldMidi);
    const b = fin.findIndex((st) => st.role === 'bridge');
    const run: number[] = [];
    if (b >= 0) {
      let lo = b;
      let hi = b;
      while (has(lo - 1)) lo--;
      while (has(hi + 1)) hi++;
      for (let i = lo; i <= hi; i++) run.push(i);
    }
    ex.heldSteps = run;
  }
  return ex;
}


// ----- example builders -----

function pivotExample(from: Key, to: Key, p: Pivot, mixture: boolean): Example {
  const steps = establish(from);
  const pivotStep = stepFrom(p.old.chord, 'pivot', { old: p.old.display, new: p.new.display });
  const tonic = parseRoman(tonicNumeral(from), from);
  if (!mixture && chordKey(p.old.chord) === chordKey(tonic)) steps[steps.length - 1] = pivotStep;
  else steps.push(pivotStep);
  for (const n of continuation({ numeral: p.new.numeral, fn: p.new.fn, chordId: p.new.chord.chordId }, to)) steps.push(newStep(n, to));
  const caption = mixture
    ? `${p.old.chord.symbol} is borrowed from ${keyName(parallelKey(from))} (${p.old.display}) and is ${p.new.display} in ${keyName(to)}.`
    : `${p.old.chord.symbol} is ${p.old.display} in ${keyName(from)} and ${p.new.display} in ${keyName(to)}.`;
  return makeExample(from, to, steps, caption);
}

function directExample(from: Key, to: Key): Example {
  const steps = establish(from);
  const T = tonicNumeral(to);
  const nums = [T, predominantNumeral(to), 'V7', T];
  nums.forEach((n, i) => {
    const st = newStep(n, to);
    if (i === 0) st.phraseStart = true;
    steps.push(st);
  });
  return makeExample(from, to, steps, `A cadence closes ${keyName(from)}; the next phrase begins in ${keyName(to)}.`);
}

/** Old-key diatonic triad that leads most smoothly into `target` (most common tones, then least motion). */
function bestApproach(from: Key, target: RomanChord): KeyChord | null {
  const tPcs = target.notes.map(pc);
  let best: KeyChord | null = null;
  let bestScore = -Infinity;
  for (const c of triadChords(from)) {
    if (c.source === 'harmonic' || c.fn === 'tonic') continue;
    const common = c.chord.notes.filter((n) => tPcs.includes(pc(n))).length;
    const pref = c.fn === 'predominant' ? 0.5 : c.fn === 'submediant' ? 0.3 : 0;
    const s = common * 2 + pref;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function secondaryExample(from: Key, to: Key, option: string): Example {
  const steps = establish(from);
  const domNum = option === 'vii7' ? 'vii°7' : 'V7';
  const dom = parseRoman(domNum, to);
  const approach = bestApproach(from, dom);
  if (approach) steps.push(oldStep(approach.numeral, from));
  const newTonicInOld = analyzeChord(to.tonic, to.mode === 'major' ? 'maj' : 'min', from);
  const oldLabel = `${formatRoman(domNum)}/${formatRoman(newTonicInOld)}`;
  steps.push(stepFrom(dom, 'pivot', { old: oldLabel, new: dom.display }));
  steps.push(newStep(tonicNumeral(to), to));
  steps.push(newStep(predominantNumeral(to), to));
  steps.push(newStep('V7', to));
  steps.push(newStep(tonicNumeral(to), to));
  return makeExample(from, to, steps, `${dom.symbol} would be ${oldLabel} in ${keyName(from)}, but here it resolves and the new key stays.`);
}

function commonToneExample(from: Key, to: Key, c: CommonToneCandidate): Example {
  const steps = establish(from);
  const bridge: Step = { role: 'bridge', root: c.heldOld, chordId: 'note', notes: [c.heldOld], bass: c.heldOld, symbol: noteName(c.heldOld), beats: 2 };
  steps.push(bridge);
  steps.push(stepFrom(c.target.chord, 'new', { new: c.target.display }));
  for (const n of continuation({ numeral: c.target.numeral, fn: c.target.fn, chordId: c.target.chord.chordId }, to)) steps.push(newStep(n, to));
  const resp = c.heldOld.letter !== c.heldNew.letter || c.heldOld.acc !== c.heldNew.acc ? ` (respelled ${noteName(c.heldNew)})` : '';
  return makeExample(from, to, steps, `${noteName(c.heldOld)}${resp} sounds alone, then becomes part of ${c.target.chord.symbol}, ${c.target.display} in ${keyName(to)}.`, { heldPc: c.heldPc });
}

function dim7Example(from: Key, to: Key, c: Dim7Candidate): Example {
  const steps = establish(from);
  steps.push(stepFrom(c.oldChord, 'pivot', { old: c.oldChord.display }));
  steps.push({ ...stepFrom(c.newChord, 'pivot', { new: c.newChord.display }), respell: true, bass: respellBass(c.oldChord.bass, c.newChord.notes) });
  const T = tonicNumeral(to);
  [T, predominantNumeral(to), 'V7', T].forEach((n) => steps.push(newStep(n, to)));
  return makeExample(from, to, steps, `${c.oldChord.symbol} (${c.oldChord.display} in ${keyName(from)}) is respelled ${c.newChord.symbol}, vii°⁷ of ${keyName(to)}.`, {
    enharmonic: { oldLabel: c.oldChord.display, newLabel: c.newChord.display, oldNotes: c.oldChord.notes, newNotes: c.newChord.notes, oldSymbol: c.oldChord.symbol, newSymbol: c.newChord.symbol },
  });
}

function respellBass(bass: Note, notes: Note[]): Note {
  return notes.find((n) => pc(n) === pc(bass)) ?? bass;
}

function ger6Example(from: Key, to: Key, c: Ger6Candidate): Example {
  const steps = establish(from);
  steps.push(stepFrom(c.oldChord, 'pivot', { old: c.oldChord.display }));
  steps.push({ ...stepFrom(c.newChord, 'pivot', { new: c.newChord.display }), respell: true, bass: respellBass(c.oldChord.bass, c.newChord.notes) });
  const T = tonicNumeral(to);
  const tail = c.kind === 'v7-to-ger' ? ['Cad64', 'V7', T] : [T, predominantNumeral(to), 'V7', T];
  tail.forEach((n) => steps.push(newStep(n, to)));
  const oldSym = symbolFor(c.oldChord);
  const newSym = symbolFor(c.newChord);
  return makeExample(from, to, steps, `${oldSym} (${c.oldChord.display} in ${keyName(from)}) is respelled as ${newSym} (${c.newChord.display} in ${keyName(to)}).`, {
    enharmonic: { oldLabel: c.oldChord.display, newLabel: c.newChord.display, oldNotes: c.oldChord.notes, newNotes: c.newChord.notes, oldSymbol: oldSym, newSymbol: newSym },
  });
}

function sequentialExample(from: Key, to: Key, ch: SequenceChain, option: string): Example {
  const steps = establish(from);
  const iiV = option === 'iiV';
  const startIsMinor = ch.start.chord.chordId === 'min';
  if (iiV && startIsMinor) {
    // In the ii-V pattern a minor start chord becomes the first ii7 directly.
    const c = parseRoman(ch.start.numeral + '7', from);
    steps.push(stepFrom(c, 'old', { old: c.display }));
  } else if (ch.start.fn !== 'tonic') {
    // A tonic start is the last chord of the opening phrase already.
    steps.push(stepFrom(ch.start.chord, 'old', { old: ch.start.display }));
  }
  ch.dominants.forEach((d, i) => {
    const last = i === ch.dominants.length - 1;
    if (iiV && !(i === 0 && startIsMinor)) {
      const iiNum = d.num === 'V7' ? (to.mode === 'major' ? 'ii7' : 'iiø7') : d.num.replace(/^V7/, 'ii7');
      const iiLabel = parseRoman(iiNum, to);
      const ii = withRoot(iiLabel, transpose(d.chord.root, interval('P5')), iiLabel.chordId);
      steps.push(stepFrom(ii, 'transition', { new: ii.display }));
    }
    steps.push(stepFrom(d.chord, last ? 'new' : 'transition', { old: d.oldLabel, new: d.newLabel }));
  });
  steps.push(newStep(tonicNumeral(to), to));
  const chain = ch.dominants.map((d) => d.chord.symbol).join(' → ');
  return makeExample(from, to, steps, `From ${ch.start.chord.symbol} the roots fall by fifths: ${chain} → ${noteName(to.tonic)}.`);
}

function truckExample(from: Key, to: Key, option: string): Example {
  const oldNums = from.mode === 'major' ? ['I', 'vi', 'IV', 'V'] : ['i', 'VI', 'III', 'VII'];
  const newNums = to.mode === 'major' ? ['I', 'vi', 'IV', 'V', 'I'] : ['i', 'VI', 'III', 'VII', 'i'];
  const steps = oldNums.map((n) => oldStep(n, from));
  if (option === 'v7') steps.push(stepFrom(parseRoman('V7', to), 'transition', { new: parseRoman('V7', to).display }));
  newNums.forEach((n, i) => {
    const st = newStep(n, to);
    if (i === 0 && option !== 'v7') st.phraseStart = true;
    steps.push(st);
  });
  return makeExample(from, to, steps, `The same progression, shifted up to ${keyName(to)}.`);
}

/** Build the playable example for a technique (null when unavailable). */
export function buildExample(id: TechniqueId, from: Key, to: Key, optionId?: string): Example | null {
  const st = techniqueStatus(id, from, to);
  if (!st.available) return null;
  const opt = st.options.find((o) => o.id === optionId)?.id ?? st.options[0]?.id;
  switch (id) {
    case 'pivot': {
      const ps = findPivots(from, to);
      return pivotExample(from, to, ps.find((p) => p.id === opt) ?? ps[0], false);
    }
    case 'mixture': {
      const ps = findBorrowedPivots(from, to);
      return pivotExample(from, to, ps.find((p) => p.id === opt) ?? ps[0], true);
    }
    case 'direct':
      return directExample(from, to);
    case 'secondary':
      return secondaryExample(from, to, opt ?? 'V7');
    case 'commonTone': {
      const cs = commonToneCandidates(from, to);
      return commonToneExample(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'dim7': {
      const cs = dim7Candidates(from, to);
      return dim7Example(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'ger6': {
      const cs = ger6Candidates(from, to);
      return ger6Example(from, to, cs.find((c) => c.id === opt) ?? cs[0]);
    }
    case 'sequential':
      return sequentialExample(from, to, sequentialChain(from, to)!, opt ?? 'dominants');
    case 'truck':
      return truckExample(from, to, opt ?? 'plain');
  }
}

// ---------------------------------------------------------------------------
// Key lists for pickers and the modulation map
// ---------------------------------------------------------------------------

/** Twelve keys per mode with conventional spellings (6 flats to 5 sharps). */
