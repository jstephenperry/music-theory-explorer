/**
 * Pure helpers for the Scales & Modes room: spelled scale tones, mode relationships,
 * the diatonic brightness ladder, scale-relative roman numerals and scale comparison.
 */
import {
  SCALES,
  SCALE_BY_ID,
  TRADITION_BY_ID,
  buildScale,
  scaleDeviations,
  findScalesByPcs,
  getScale,
  modesOf,
  scaleIntervals,
  scalePcs,
  scalesContaining,
  scalesInFamily,
  hasMicrotones,
  scaleCents,
  type ScaleDef,
  type ScaleForm,
} from '../../theory/scales';
import { microNoteName, microNoteSpoken, microSuffix, vexMicroAccidental } from '../../theory/micro';
import { degreeLabel, interval, intervalName, referenceSemis, simpleNum, simplifyInterval, transposeDown, transposePitch, type Interval } from '../../theory/intervals';
import { midi, mod, noteFromPc, noteName, pc, pitchAtOrAbove, sameNote, tryNote, LETTERS, type Note, type Pitch } from '../../theory/notes';
import { diatonicChordsOfScale } from '../../theory/keys';
import { chordPcs, chordSymbol, identifyChord } from '../../theory/chords';

/** Lowest MIDI note at which the displayed scale starts (A3). The scale root lies in A3..G♯4. */
export const SCALE_BASE_MIDI = 57;

export function rootFromParam(s: string): Note {
  return tryNote(s) ?? { letter: 'C', acc: 0 };
}

export function rootToParam(n: Note): string {
  return noteName(n, false);
}

export function scaleFromParam(id: string): ScaleDef {
  return SCALE_BY_ID[id] ?? SCALE_BY_ID.ionian;
}

export interface ScaleTone {
  note: Note;
  pitch: Pitch;
  /** The nearest piano key (the equal-tempered pitch of the spelled note). */
  midi: number;
  /** The exact pitch, as a fractional MIDI number, for playback. */
  play: number;
  /** Deviation in cents from the equal-tempered pitch of the spelled note. */
  cents: number;
  /** Size in cents above the tonic. */
  rel: number;
  interval: Interval;
  /** Degree label: relative to major (1, ♭3, ♯4 ...), or the tradition's own names (sargam, svaras, phthongoi). */
  degree: string;
  /** Interval above the root: P1, m3, A4 ... */
  intervalName: string;
  /** Note name including any microtonal sign: "E½♭", "F♯↓". */
  name: string;
  /** Screen-reader form of the name. */
  spoken: string;
  /** VexFlow accidental for a microtonal pitch, or null. */
  vex: string | null;
  /** Index into the scale (0-based). The upper tonic repeats index 0. */
  index: number;
  characteristic: boolean;
}

const SARGAM: Record<string, string> = {
  P1: 'S', m2: 'r', M2: 'R', m3: 'g', M3: 'G', P4: 'm', A4: 'M', P5: 'P', m6: 'd', M6: 'D', m7: 'n', M7: 'N',
};
const SVARA: Record<string, string> = {
  P1: 'S', m2: 'R1', M2: 'R2', A2: 'R3', d3: 'G1', m3: 'G2', M3: 'G3', P4: 'M1', A4: 'M2', P5: 'P',
  m6: 'D1', M6: 'D2', A6: 'D3', d7: 'N1', m7: 'N2', M7: 'N3',
};

/** Degree label for a scale degree in the scale's own tradition. */
export function degreeName(def: ScaleDef, index: number, iv: Interval, relDev: number): string {
  if (def.degreeNames?.[index]) return def.degreeNames[index];
  const name = intervalName(simplifyInterval(iv));
  const key = name === 'P8' ? 'P1' : name;
  if (def.tradition === 'hindustani' && SARGAM[key]) return SARGAM[key];
  if (def.tradition === 'carnatic' && SVARA[key]) return SVARA[key];
  // Notes in other octaves keep the label of their degree (the octave above the tonic is 1, not 8).
  const k = Math.floor((iv.num - 1) / 7);
  let simple: Interval = { num: iv.num - 7 * k, semis: iv.semis - 12 * k };
  let dev = relDev;
  // Neutral intervals read from the larger side, as is customary: a minor second plus a quarter tone is "2½♭", not "♭2½♯".
  if (dev >= 35 && dev <= 65 && simple.semis < referenceSemis(simple.num)) {
    simple = { num: simple.num, semis: simple.semis + 1 };
    dev -= 100;
  }
  return degreeLabel(simple) + microSuffix(dev, TRADITION_BY_ID[def.tradition].notation);
}

function toneAt(def: ScaleDef, rootPitch: Pitch, iv: Interval, dev: number, dev0: number, index: number, octave = 0): ScaleTone {
  const notation = TRADITION_BY_ID[def.tradition].notation;
  let p = transposePitch(rootPitch, iv);
  if (octave) p = { ...p, octave: p.octave + octave };
  const n = { letter: p.letter, acc: p.acc };
  const rel = iv.semis * 100 + 1200 * octave + dev - dev0;
  return {
    note: n,
    pitch: p,
    midi: midi(p),
    play: midi(p) + dev / 100,
    cents: dev,
    rel,
    interval: iv,
    degree: degreeName(def, index, iv, dev - dev0),
    intervalName: intervalName(iv),
    name: microNoteName(n, dev, notation),
    spoken: microNoteSpoken(n, dev),
    vex: vexMicroAccidental(n, dev, notation, { letter: rootPitch.letter, acc: rootPitch.acc }, rel),
    index,
    characteristic: (def.characteristic ?? []).includes(index),
  };
}

/** Scale tones ascending through one octave plus the upper tonic, correctly spelled. */
export function scaleTones(root: Note, scaleId: string, baseMidi = SCALE_BASE_MIDI): ScaleTone[] {
  const def = getScale(scaleId);
  const rootPitch = pitchAtOrAbove(root, baseMidi);
  const ivs = scaleIntervals(def);
  const dev = scaleDeviations(def);
  const tones = ivs.map((iv, i) => toneAt(def, rootPitch, iv, dev[i], dev[0], i));
  const top = toneAt(def, rootPitch, interval('P8'), dev[0], dev[0], 0);
  tones.push({ ...top, degree: tones[0].degree, characteristic: tones[0].characteristic });
  return tones;
}

/** Tones of an ascending or descending form (aroha, avaroha, ambitus ...), matched to scale degrees. */
export function formTones(root: Note, scaleId: string, form: ScaleForm, baseMidi = SCALE_BASE_MIDI): ScaleTone[] {
  const def = getScale(scaleId);
  const rootPitch = pitchAtOrAbove(root, baseMidi);
  const ivs = scaleIntervals(def);
  const dev = scaleDeviations(def);
  return form.steps.map((st) => {
    // The scale degree with the same pitch class, for labels and highlighting.
    const pcCents = (((st.interval.semis * 100 + st.cents) % 1200) + 1200) % 1200;
    let index = ivs.findIndex((iv, i) => Math.abs(((((iv.semis * 100 + dev[i]) % 1200) + 1200) % 1200) - pcCents) < 1);
    const t = toneAt(def, rootPitch, st.interval, st.cents, dev[0], Math.max(0, index), st.octave);
    if (index >= 0) return t;
    // A note outside the scale (Rast descends with B♭): label it by its interval, and point at the degree with the same letter.
    const sameLetter = ivs.findIndex((iv) => simpleNum(iv.num) === simpleNum(st.interval.num));
    return {
      ...t,
      index: Math.max(0, sameLetter),
      characteristic: false,
      degree: degreeName(def, -1, st.interval, 0) + microSuffix(st.cents - dev[0], TRADITION_BY_ID[def.tradition].notation),
    };
  });
}

/** Spelled notes of the scale extended over two octaves (for stacking chords). */
export function extendedPitches(root: Note, scaleId: string, baseMidi = SCALE_BASE_MIDI): Pitch[] {
  const rootPitch = pitchAtOrAbove(root, baseMidi);
  const ivs = scaleIntervals(getScale(scaleId));
  const one = ivs.map((iv) => transposePitch(rootPitch, iv));
  const two = one.map((p) => ({ ...p, octave: p.octave + 1 }));
  const three = one.map((p) => ({ ...p, octave: p.octave + 2 }));
  return [...one, ...two, ...three];
}

/** Root of the parent scale, e.g. D Dorian -> C (Ionian). Null when the scale is not a mode of a parent. */
export function parentRoot(root: Note, scaleId: string): { parent: ScaleDef; root: Note } | null {
  const def = getScale(scaleId);
  if (!def.modeOf) return null;
  const parent = getScale(def.modeOf.parent);
  const iv = interval(parent.intervals[def.modeOf.degree - 1]);
  return { parent, root: transposeDown(root, iv) };
}

/** Largest difference in cents for two microtonal scales to count as the same rotation. */
const ROTATION_TOLERANCE = 15;

export interface ModeEntry {
  scale: ScaleDef;
  root: Note;
  /** 1-based degree of the parent (or of the current scale for rotations) this mode starts on. */
  degree: number;
}

/**
 * Relative modes: the same notes started on each degree. Uses the catalog's mode family when the
 * scale has a parent; otherwise rotates the scale and names each rotation found in the catalog.
 */
export function relativeModes(root: Note, scaleId: string): Array<ModeEntry | { scale: null; root: Note; degree: number }> {
  const pr = parentRoot(root, scaleId);
  if (pr) {
    const parentNotes = buildScale(pr.root, pr.parent.id);
    return modesOf(pr.parent.id).map((m) => ({ scale: m, root: parentNotes[m.modeOf!.degree - 1], degree: m.modeOf!.degree }));
  }
  const notes = buildScale(root, scaleId);
  const def = getScale(scaleId);
  if (hasMicrotones(def)) {
    // Match rotations by their intonation, so Rast started on its third degree is found as Sikah.
    const cents = scaleCents(def);
    return notes.map((n, i) => {
      const rot = cents.map((c) => (((c - cents[i]) % 1200) + 1200) % 1200).sort((a, b) => a - b);
      const found = SCALES.find((x) => {
        if (x.intervals.length !== rot.length) return false;
        const xc = scaleCents(x);
        return xc.every((c, k) => Math.abs(c - rot[k]) < ROTATION_TOLERANCE);
      });
      return found ? { scale: found, root: n, degree: i + 1 } : { scale: null, root: n, degree: i + 1 };
    });
  }
  const pcs = notes.map(pc);
  const matches = findScalesByPcs(pcs);
  return notes.map((n, i) => {
    const found = matches.find((m) => m.rootPc === pc(n) && m.scale.intervals.length === notes.length);
    return found ? { scale: found.scale, root: n, degree: i + 1 } : { scale: null, root: n, degree: i + 1 };
  });
}

/**
 * Parallel modes: every mode of the scale's mode family on the same root. Scales that are not
 * modes of a parent (maqamat, ragas ...) get the other members of their catalog family instead.
 */
export function parallelModes(scaleId: string): ScaleDef[] {
  const def = getScale(scaleId);
  if (def.modeOf) return modesOf(def.modeOf.parent);
  const fam = scalesInFamily(def.tradition, def.family);
  return fam.length > 1 ? fam : [];
}

/** Diatonic modes from brightest (Lydian) to darkest (Locrian). */
export const BRIGHTNESS_LADDER: string[] = SCALES.filter((s) => s.family === 'Diatonic modes' && s.brightness !== undefined)
  .sort((a, b) => b.brightness! - a.brightness!)
  .map((s) => s.id);

/** Indices of degrees that are lower in scale `b` than in scale `a` (same root). */
export function loweredDegrees(aId: string, bId: string): number[] {
  const a = scaleIntervals(getScale(aId));
  const b = scaleIntervals(getScale(bId));
  const out: number[] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (b[i].semis < a[i].semis) out.push(i);
  return out;
}

export interface LadderRung {
  scale: ScaleDef;
  /** Degree (0-based) lowered by a semitone compared with the rung above, or null for the top rung. */
  lowered: number | null;
  /** Label of the lowered degree before and after, e.g. "♯4" -> "4". */
  from?: string;
  to?: string;
}

export function brightnessLadder(): LadderRung[] {
  return BRIGHTNESS_LADDER.map((id, i) => {
    const scale = getScale(id);
    if (i === 0) return { scale, lowered: null };
    const prev = BRIGHTNESS_LADDER[i - 1];
    const idx = loweredDegrees(prev, id)[0];
    return {
      scale,
      lowered: idx,
      from: degreeLabel(interval(getScale(prev).intervals[idx])),
      to: degreeLabel(interval(scale.intervals[idx])),
    };
  });
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Case and suffix of a roman numeral for each chord quality found in diatonic harmony. */
const NUMERAL_STYLE: Record<string, { lower: boolean; suffix: string }> = {
  maj: { lower: false, suffix: '' },
  min: { lower: true, suffix: '' },
  dim: { lower: true, suffix: '°' },
  aug: { lower: false, suffix: '+' },
  majb5: { lower: false, suffix: '(♭5)' },
  sus2: { lower: false, suffix: 'sus2' },
  sus4: { lower: false, suffix: 'sus4' },
  maj7: { lower: false, suffix: 'maj7' },
  '7': { lower: false, suffix: '7' },
  m7: { lower: true, suffix: '7' },
  mMaj7: { lower: true, suffix: '(maj7)' },
  m7b5: { lower: true, suffix: 'ø7' },
  dim7: { lower: true, suffix: '°7' },
  '7#5': { lower: false, suffix: '+7' },
  'maj7#5': { lower: false, suffix: '+maj7' },
  '7b5': { lower: false, suffix: '7♭5' },
  maj7b5: { lower: false, suffix: 'maj7♭5' },
  dimMaj7: { lower: true, suffix: '°(maj7)' },
  '7sus4': { lower: false, suffix: '7sus4' },
};

/**
 * Roman numeral for a chord on a scale degree, measured from the scale's own tonic: the accidental
 * compares the degree with the major scale (Dorian: i ii ♭III IV v vi° ♭VII).
 */
export function scaleNumeral(degreeInterval: Interval, degreeIndex: number, chordId: string | null): string {
  const diff = degreeInterval.semis - referenceSemis(degreeInterval.num);
  const acc = diff === 0 ? '' : diff === -2 ? '𝄫' : diff < 0 ? '♭'.repeat(-diff) : '♯'.repeat(diff);
  const style = chordId ? NUMERAL_STYLE[chordId] : undefined;
  const base = NUMERALS[degreeIndex];
  if (!style) return acc + base;
  return acc + (style.lower ? base.toLowerCase() : base) + style.suffix;
}

export interface ScaleChord {
  degree: number;
  root: Note;
  notes: Note[];
  /** Catalog chord id, or null when the stack of thirds has no name in the catalog. */
  chordId: string | null;
  symbol: string;
  numeral: string;
  /** Pitches in close position, for the staff and piano. */
  pitches: Pitch[];
}

/** Diatonic triads or seventh chords of a heptatonic scale, with scale-relative numerals and voicings. */
export function scaleHarmony(root: Note, scaleId: string, sevenths: boolean, maxMidi = 84): ScaleChord[] {
  const def = getScale(scaleId);
  if (def.intervals.length !== 7) return [];
  const ivs = scaleIntervals(def);
  const ext = extendedPitches(root, scaleId);
  return diatonicChordsOfScale(root, scaleId, sevenths).map((c, i) => {
    const notePcs = new Set(c.notes.map(pc));
    const defPcs = chordPcs(pc(c.root), c.chordId);
    const valid = defPcs.length === notePcs.size && defPcs.every((p) => notePcs.has(p));
    const chordId = valid ? c.chordId : null;
    let symbol: string;
    if (chordId) symbol = chordSymbol(c.root, chordId);
    else {
      const guess = identifyChord([...notePcs], { bassPc: pc(c.root), spelled: c.notes, maxResults: 1 })[0];
      symbol = guess ? `≈ ${guess.symbol}` : c.notes.map((n) => noteName(n)).join(' ');
    }
    let pitches = [0, 2, 4, ...(sevenths ? [6] : [])].map((o) => ext[i + o]);
    if (Math.max(...pitches.map(midi)) > maxMidi) pitches = pitches.map((p) => ({ ...p, octave: p.octave - 1 }));
    return { degree: i + 1, root: c.root, notes: c.notes, chordId, symbol, numeral: scaleNumeral(ivs[i], i, chordId), pitches };
  });
}

export interface CompareSide {
  /** Degree relative to major, with any microtonal sign: "♭3", "3½♭". */
  degree: string;
  note: Note;
  /** Display name including any microtonal sign. */
  name: string;
  /** Cents above the tonic. */
  cents: number;
}

export interface CompareRow {
  /** Size above the root in semitones (rounded), for 12-tone scales. */
  semis: number;
  /** Size above the root in cents (of the first scale that has the note). */
  cents: number;
  a?: CompareSide;
  b?: CompareSide;
}

/** Pitches closer than this (in cents) count as the same note when comparing scales. */
const SAME_PITCH = 10;

/** Align two scales on the same root by pitch above the root (in cents, so microtonal scales line up too). */
export function compareScales(root: Note, aId: string, bId: string): CompareRow[] {
  const rows: CompareRow[] = [];
  const add = (id: string, side: 'a' | 'b') => {
    const def = getScale(id);
    const notation = TRADITION_BY_ID[def.tradition].notation;
    const dev0 = scaleDeviations(def)[0];
    for (const t of scaleTones(root, id).slice(0, -1)) {
      const sideData: CompareSide = { degree: degreeLabel(t.interval) + microSuffix(t.cents - dev0, notation), note: t.note, name: t.name, cents: t.rel };
      const row = rows.find((r) => !r[side] && Math.abs(r.cents - t.rel) < SAME_PITCH);
      if (row) row[side] = sideData;
      else rows.push({ semis: Math.round(t.rel / 100), cents: t.rel, [side]: sideData });
    }
  };
  add(aId, 'a');
  add(bId, 'b');
  return rows.sort((x, y) => x.cents - y.cents);
}

/** Spelling candidates for a pitch class with at most one accidental. */
function spellingsOf(p: number): Note[] {
  const out: Note[] = [];
  for (const letter of LETTERS) {
    for (const acc of [0, -1, 1]) {
      const n: Note = { letter, acc };
      if (pc(n) === mod(p, 12)) out.push(n);
    }
  }
  return out;
}

/** Choose the root spelling that gives the scale the fewest accidentals (no double accidentals when possible). */
export function bestRootSpelling(rootPc: number, scaleId: string): Note {
  let best: Note | null = null;
  let bestScore = Infinity;
  for (const cand of spellingsOf(rootPc)) {
    const notes = buildScale(cand, scaleId);
    const score =
      notes.reduce((a, n) => a + Math.abs(n.acc) + (Math.abs(n.acc) > 1 ? 10 : 0), 0) +
      // Prefer conventional roots (no E♯, B♯, F♭, C♭) on ties.
      ((cand.acc === 1 && (cand.letter === 'E' || cand.letter === 'B')) || (cand.acc === -1 && (cand.letter === 'F' || cand.letter === 'C')) ? 0.5 : 0) +
      (sameNote(cand, noteFromPc(rootPc)) ? 0 : 0.01);
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best ?? { letter: 'C', acc: 0 };
}

export interface FinderResult {
  root: Note;
  scale: ScaleDef;
  /** The scale has exactly the selected notes. */
  exact: boolean;
}

/** Every catalog scale (on any root) that contains the selected pitch classes, smallest first. */
export function findScales(pcs: number[]): FinderResult[] {
  const set = new Set(pcs.map((p) => mod(p, 12)));
  if (set.size === 0) return [];
  return scalesContaining([...set]).map((r) => ({
    root: bestRootSpelling(r.rootPc, r.scale.id),
    scale: r.scale,
    exact: new Set(scalePcs(r.rootPc, r.scale.id)).size === set.size,
  }));
}

/** Short description of how scale `b` differs from scale `a` on the same root: "♭3, ♭7 instead of 3, 7". */
export function differenceSummary(root: Note, aId: string, bId: string): { onlyA: string[]; onlyB: string[]; shared: number } {
  const rows = compareScales(root, aId, bId);
  return {
    onlyA: rows.filter((r) => r.a && !r.b).map((r) => r.a!.degree),
    onlyB: rows.filter((r) => r.b && !r.a).map((r) => r.b!.degree),
    shared: rows.filter((r) => r.a && r.b).length,
  };
}

/** Pitch-class set of a scale on a spelled root. */
export function scalePcSet(root: Note, scaleId: string): Set<number> {
  return new Set(scalePcs(pc(root), scaleId));
}
