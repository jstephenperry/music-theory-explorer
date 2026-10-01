/**
 * Pure chord logic for the Chords room (and reused by Free Play):
 * spelling helpers, identification of played notes, the chord neighborhood,
 * stacked-interval anatomy and chord-scale suggestions.
 */
import {
  CHORDS,
  analyzeChord,
  formatRoman,
  voiceChord,
  type VoicingStyle,
  SCALE_FAMILIES,
  LETTER_PC,
  buildChord,
  buildScale,
  chordIntervals,
  chordPcs,
  chordSymbol,
  chordToneLabels,
  getChord,
  identifyChord,
  intervalLongName,
  intervalName,
  inversionName,
  keyNotes,
  keySignatureFifths,
  mod,
  noteFromPc,
  noteName,
  pc,
  scalesContaining,
  type Interval,
  type Key,
  type Note,
  type Pitch,
  type ScaleDef,
} from '../../theory';

// ---------------------------------------------------------------------------
// Spelling helpers
// ---------------------------------------------------------------------------

/** E♯, B♯, F♭ and C♭ are correct in context but awkward as free-standing names. */
export function isOddSpelling(n: Note): boolean {
  return (n.acc === 1 && (n.letter === 'E' || n.letter === 'B')) || (n.acc === -1 && (n.letter === 'F' || n.letter === 'C'));
}

/** Readability cost of a set of spelled notes: accidentals, double accidentals and odd spellings. */
export function spellingCost(notes: Note[]): number {
  return notes.reduce((a, n) => a + (Math.abs(n.acc) > 1 ? 3 * Math.abs(n.acc) : Math.abs(n.acc)) + (isOddSpelling(n) ? 1 : 0), 0);
}

/** Replace double accidentals and odd spellings with the plain enharmonic name. */
export function plainSpelling(n: Note): Note {
  if (Math.abs(n.acc) <= 1 && !isOddSpelling(n)) return { ...n };
  return noteFromPc(pc(n), n.acc > 0 ? 'sharps' : 'flats');
}

/** A pitch with a given spelling that sounds at MIDI note `m` (the octave belongs to the letter). */
export function pitchWithSpelling(n: Note, m: number): Pitch {
  const octave = Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1;
  return { letter: n.letter, acc: n.acc, octave };
}

/**
 * Choose the most readable root spelling for a chord on a pitch class.
 * When a key is given, spellings that belong to the key are preferred (G♯ in A major, A♭ in E♭ major).
 */
export function bestRootSpelling(rootPc: number, chordId: string, key?: Key | null): Note {
  const options: Note[] = [noteFromPc(rootPc, 'default')];
  for (const pref of ['sharps', 'flats'] as const) {
    const n = noteFromPc(rootPc, pref);
    if (!options.some((o) => o.letter === n.letter && o.acc === n.acc)) options.push(n);
  }
  if (options.length === 1) return options[0];
  const scale = key ? keyNotes(key) : null;
  const sigSign = key ? Math.sign(keySignatureFifths(key)) : 0;
  let best = options[0];
  let bestCost = Infinity;
  for (const root of options) {
    const tones = buildChord(root, chordId);
    let cost = spellingCost(tones) + spellingCost([root]) * 2;
    if (scale) {
      if (scale.some((s) => s.letter === root.letter && s.acc === root.acc)) cost -= 4;
      cost -= tones.filter((t) => scale.some((s) => s.letter === t.letter && s.acc === t.acc)).length * 0.5;
      if (sigSign !== 0 && Math.sign(root.acc) === sigSign) cost -= 0.25;
    }
    if (cost < bestCost - 1e-9) {
      best = root;
      bestCost = cost;
    }
  }
  return best;
}

/** Spell a single MIDI note when no chord context exists (uses the key when given). */
export function spellLoose(m: number, key?: Key | null): Pitch {
  if (key) {
    const hit = keyNotes(key).find((n) => pc(n) === mod(m, 12));
    if (hit) return pitchWithSpelling(hit, m);
    const pref = keySignatureFifths(key) < 0 ? 'flats' : 'sharps';
    return pitchWithSpelling(noteFromPc(m, pref), m);
  }
  return pitchWithSpelling(noteFromPc(m, 'default'), m);
}

/** Spell MIDI notes using the spelled tones of a chord (falls back to key or default spelling). */
export function spellMidis(midis: number[], tones?: Note[] | null, key?: Key | null): Pitch[] {
  return [...midis]
    .sort((a, b) => a - b)
    .map((m) => {
      const t = tones?.find((n) => pc(n) === mod(m, 12));
      return t ? pitchWithSpelling(t, m) : spellLoose(m, key);
    });
}

/**
 * Chord symbol for display. Named and augmented-sixth chords read as "C Ger+6" or "G quartal"
 * rather than gluing a word onto the root.
 */
export function displaySymbol(root: Note, chordId: string, bass?: Note | null): string {
  const def = getChord(chordId);
  if (def.category === 'Quartal & named' || def.category === 'Augmented sixths') {
    const base = `${noteName(root)} ${def.symbol.trim()}`;
    return bass && pc(bass) !== pc(root) ? `${base}/${noteName(bass)}` : base;
  }
  return chordSymbol(root, chordId, bass);
}

// ---------------------------------------------------------------------------
// Identification
// ---------------------------------------------------------------------------

export interface Candidate {
  root: Note;
  chordId: string;
  /** Bass note when it is not the root. */
  bass: Note | null;
  bassLabel: string;
  omittedFifth: boolean;
  symbol: string;
  /** Symbol without the slash bass. */
  baseSymbol: string;
  name: string;
  inversion: number;
  /** Spelled chord tones, root first. */
  tones: Note[];
  score: number;
}

/**
 * Name the chord formed by a set of MIDI notes. The lowest note is treated as the bass.
 * Candidates are ranked by `identifyChord` and respelled for readability (or to fit a key).
 */
export function identifyMidi(midis: number[], opts: { key?: Key | null; max?: number } = {}): Candidate[] {
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  if (sorted.length < 2) return [];
  const pcs = sorted.map((m) => mod(m, 12));
  const bassPc = pcs[0];
  const matches = identifyChord(pcs, { bassPc, maxResults: (opts.max ?? 8) + 4 });
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const root = bestRootSpelling(pc(m.root), m.chordId, opts.key);
    const tones = buildChord(root, m.chordId);
    const labels = chordToneLabels(m.chordId);
    const bassIdx = tones.findIndex((t) => pc(t) === bassPc);
    const bassTone = tones[bassIdx];
    const bass = bassTone && pc(bassTone) !== pc(root) ? bassTone : null;
    const omittedFifth = m.omitted.length > 0;
    const baseSymbol = displaySymbol(root, m.chordId) + (omittedFifth ? '(no5)' : '');
    const symbol = displaySymbol(root, m.chordId, bass) + (omittedFifth ? '(no5)' : '');
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      root,
      chordId: m.chordId,
      bass,
      bassLabel: labels[bassIdx] ?? '',
      omittedFifth,
      symbol,
      baseSymbol,
      name: `${noteName(root)} ${getChord(m.chordId).name.toLowerCase()}${omittedFifth ? ' (no fifth)' : ''}`,
      inversion: Math.max(0, bassIdx),
      tones,
      score: m.score,
    });
    if (out.length >= (opts.max ?? 8)) break;
  }
  return out;
}

const ORDINAL_TONE: Record<string, string> = { R: 'root', '3': 'third', '♭3': 'third', '5': 'fifth', '♭5': 'fifth', '♯5': 'fifth' };

/** "Root position", "First inversion (E, the 3, in the bass)". */
export function describeInversion(c: Candidate): string {
  if (c.inversion === 0) return 'Root position';
  const bass = c.bass ? noteName(c.bass) : '';
  const role = ORDINAL_TONE[c.bassLabel] ?? c.bassLabel;
  return `${inversionName(c.inversion)} (${bass}, the ${role}, in the bass)`;
}

/** Explain an alternative reading relative to the top candidate. */
export function describeAlternative(c: Candidate, top: Candidate): string {
  const inv = c.inversion === 0 ? 'in root position' : `in ${inversionName(c.inversion).toLowerCase()}`;
  const parts = [`Same notes heard as ${c.baseSymbol} ${inv}`];
  if (c.omittedFifth && !top.omittedFifth) parts.push('with its fifth left out');
  return parts.join(', ') + '.';
}

// ---------------------------------------------------------------------------
// Anatomy: stacked intervals
// ---------------------------------------------------------------------------

export interface StackTone {
  note: Note;
  label: string;
  interval: Interval;
}

export interface StackStep {
  interval: Interval;
  name: string;
  longName: string;
  isThird: boolean;
}

/** Chord tones from the bottom up (root first, by size) and the intervals between adjacent tones. */
export function chordStack(root: Note, chordId: string): { tones: StackTone[]; steps: StackStep[] } {
  const ivs = chordIntervals(chordId);
  const labels = chordToneLabels(chordId);
  const notes = buildChord(root, chordId);
  const order = ivs.map((_, i) => i).sort((a, b) => ivs[a].semis - ivs[b].semis || ivs[a].num - ivs[b].num);
  const tones = order.map((i) => ({ note: notes[i], label: labels[i], interval: ivs[i] }));
  const steps: StackStep[] = [];
  for (let k = 0; k + 1 < tones.length; k++) {
    const a = tones[k].interval;
    const b = tones[k + 1].interval;
    const step: Interval = { num: b.num - a.num + 1, semis: b.semis - a.semis };
    let name = `${step.semis} st`;
    let longName = `${step.semis} semitones`;
    try {
      name = intervalName(step);
      longName = intervalLongName(step);
    } catch {
      /* unusual quality: keep the semitone description */
    }
    steps.push({ interval: step, name, longName, isThird: step.num === 3 });
  }
  return { tones, steps };
}

// ---------------------------------------------------------------------------
// Neighborhood
// ---------------------------------------------------------------------------

export type NeighborKind = 'add' | 'remove' | 'move' | 'same';

export interface Neighbor {
  kind: NeighborKind;
  root: Note;
  chordId: string;
  symbol: string;
  /** Short description of the change, e.g. "add ♭7", "5 → ♯5", "C → B". */
  detail: string;
  /** Other names for the same pitch-class set (symmetric chords such as + and °7). */
  aka: string[];
  /** For "same": true when every note keeps its spelling; false when the chord is an enharmonic respelling. */
  sameSpelling?: boolean;
}

const setKey = (s: Iterable<number>) => [...s].sort((a, b) => a - b).join(',');

/** Spell a note moved by one semitone: same letter when tidy (G → G♯, E → E♭), otherwise the plain neighbor (E → F). */
export function movedSpelling(from: Note, dir: 1 | -1): Note {
  const same = { letter: from.letter, acc: from.acc + dir };
  if (Math.abs(same.acc) <= 1 && !isOddSpelling(same)) return same;
  return noteFromPc(pc(from) + dir, dir > 0 ? 'sharps' : 'flats');
}

/**
 * Chords one step away from a given chord:
 * - add: same root, one more pitch class;
 * - remove: same root, one pitch class fewer;
 * - move: any root, one note moved by a semitone;
 * - same: the identical pitch-class set under another name or root (C6 = Am7, C7 = Ger+6).
 */
export function chordNeighborhood(root: Note, chordId: string): Record<NeighborKind, Neighbor[]> {
  const rootPc = pc(root);
  const tones = buildChord(root, chordId);
  const labels = chordToneLabels(chordId);
  const ownPcs = chordPcs(rootPc, chordId);
  const own = new Set(ownPcs);
  const toneFor = (p: number) => tones.find((t) => pc(t) === p);
  const labelFor = (p: number) => labels[ownPcs.indexOf(p)];

  const result: Record<NeighborKind, Neighbor[]> = { add: [], remove: [], move: [], same: [] };
  // "move" candidates grouped by pitch-class set so symmetric chords appear once.
  const moveGroups = new Map<string, Array<Neighbor & { rank: number }>>();

  CHORDS.forEach((def, defIndex) => {
    for (let r = 0; r < 12; r++) {
      const pcsList = chordPcs(r, def.id);
      const s2 = new Set(pcsList);
      const added = [...s2].filter((p) => !own.has(p));
      const removed = [...own].filter((p) => !s2.has(p));

      // Same notes, different name or root.
      if (added.length === 0 && removed.length === 0 && s2.size === own.size) {
        if (r === rootPc && def.id === chordId) continue;
        const newRoot = plainSpelling(toneFor(r)!);
        const newTones = buildChord(newRoot, def.id);
        const sameSpelling = newTones.every((t) => tones.some((o) => o.letter === t.letter && o.acc === t.acc));
        const detail =
          r === rootPc
            ? sameSpelling
              ? 'same root, new name'
              : 'respelled on the same root'
            : `${displaySymbol(newRoot, def.id, root)}: ${noteName(newRoot)} as root`;
        result.same.push({ kind: 'same', root: newRoot, chordId: def.id, symbol: displaySymbol(newRoot, def.id), detail, aka: [], sameSpelling });
        continue;
      }
      if (def.noIdentify) continue;

      if (r === rootPc && removed.length === 0 && added.length === 1 && s2.size === own.size + 1) {
        const newTones = buildChord(root, def.id);
        const newLabels = chordToneLabels(def.id);
        const idx = pcsList.indexOf(added[0]);
        result.add.push({
          kind: 'add',
          root,
          chordId: def.id,
          symbol: displaySymbol(root, def.id),
          detail: `add ${newLabels[idx]} (${noteName(newTones[idx])})`,
          aka: [],
        });
      } else if (r === rootPc && added.length === 0 && removed.length === 1 && s2.size === own.size - 1) {
        result.remove.push({
          kind: 'remove',
          root,
          chordId: def.id,
          symbol: displaySymbol(root, def.id),
          detail: `drop ${labelFor(removed[0])} (${noteName(toneFor(removed[0])!)})`,
          aka: [],
        });
      } else if (added.length === 1 && removed.length === 1 && s2.size === own.size) {
        const delta = mod(added[0] - removed[0], 12);
        if (delta !== 1 && delta !== 11) continue;
        const dir: 1 | -1 = delta === 1 ? 1 : -1;
        const fromNote = toneFor(removed[0])!;
        const moved = movedSpelling(fromNote, dir);
        const newRoot = r === added[0] ? moved : plainSpelling(toneFor(r)!);
        const newTones = buildChord(newRoot, def.id);
        const toNote = newTones[pcsList.indexOf(added[0])];
        const detail =
          r === rootPc ? `${labelFor(removed[0])} → ${chordToneLabels(def.id)[pcsList.indexOf(added[0])]}` : `${noteName(fromNote)} → ${noteName(toNote)}`;
        const key = setKey(s2);
        const entry = {
          kind: 'move' as const,
          root: newRoot,
          chordId: def.id,
          symbol: displaySymbol(newRoot, def.id),
          detail,
          aka: [],
          // Prefer same root, then catalog order, then readable spelling.
          rank: (r === rootPc ? 0 : 1000) + defIndex * 10 + spellingCost(newTones),
        };
        const list = moveGroups.get(key) ?? [];
        list.push(entry);
        moveGroups.set(key, list);
      }
    }
  });

  const moves: Array<Neighbor & { rank: number }> = [];
  for (const list of moveGroups.values()) {
    list.sort((a, b) => a.rank - b.rank);
    const [first, ...rest] = list;
    moves.push({ ...first, aka: rest.map((n) => n.symbol) });
  }
  moves.sort((a, b) => a.rank - b.rank);
  result.move = moves.map(({ rank: _rank, ...n }) => n);
  result.same.sort((a, b) => Number(pc(b.root) === rootPc) - Number(pc(a.root) === rootPc));
  return result;
}

// ---------------------------------------------------------------------------
// Chord scales
// ---------------------------------------------------------------------------

export interface ChordScale {
  scale: ScaleDef;
  notes: Note[];
  /** Role of each scale note: chord tone, available tension, or avoid note (a half step above a chord tone). */
  roles: Array<'chord' | 'tension' | 'avoid'>;
  /** True when the catalog names this chord as the scale's typical chord. */
  primary: boolean;
}

/** Scales on the chord's root that contain every chord tone, most idiomatic first. */
export function chordScales(root: Note, chordId: string): ChordScale[] {
  const rootPc = pc(root);
  const cps = new Set(chordPcs(rootPc, chordId));
  const familyIndex = (s: ScaleDef) => SCALE_FAMILIES.indexOf(s.family);
  return scalesContaining([...cps])
    .filter((r) => r.rootPc === rootPc && r.scale.intervals.length >= 5)
    .map(({ scale }) => {
      const notes = buildScale(root, scale.id);
      const roles = notes.map((n) => {
        const p = pc(n);
        if (cps.has(p)) return 'chord' as const;
        return cps.has(mod(p - 1, 12)) ? ('avoid' as const) : ('tension' as const);
      });
      return { scale, notes, roles, primary: scale.chordId === chordId };
    })
    .sort((a, b) => Number(b.primary) - Number(a.primary) || familyIndex(a.scale) - familyIndex(b.scale) || a.notes.length - b.notes.length);
}

// ---------------------------------------------------------------------------
// Tone roles for color coding
// ---------------------------------------------------------------------------

/** Piano mark role for a chord-tone label: root, core tone, extension, or altered tone. */
export function toneRole(label: string): 'root' | 'tone' | 'extra' | 'alt' {
  if (label === 'R') return 'root';
  const num = parseInt(label.replace(/[^\d]/g, ''), 10);
  const altered = /♭|♯|𝄫|b|#/.test(label);
  if (num >= 9) return altered ? 'alt' : 'extra';
  if (num === 5 && altered) return 'alt';
  return 'tone';
}

/** Figured-bass string rendered with superscript and subscript digits ("⁶₅"). */
export function figureText(fig: string): string {
  const sup: Record<string, string> = { '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷' };
  const sub: Record<string, string> = { '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇' };
  if (fig.length === 2) return sup[fig[0]] + sub[fig[1]];
  return fig;
}

// ---------------------------------------------------------------------------
// Roman numerals and voicing helpers
// ---------------------------------------------------------------------------

/** Roman numeral of a candidate in a key, formatted with figures. Empty when analysis fails. */
export function romanFor(c: Candidate, key: Key | null | undefined): string {
  if (!key) return '';
  try {
    return formatRoman(analyzeChord(c.root, c.chordId, key, c.inversion));
  } catch {
    return '';
  }
}

/** Number of selectable inversions for a voicing style. */
export function inversionCount(chordId: string, voicing: VoicingStyle): number {
  const n = getChord(chordId).intervals.length;
  if (voicing === 'shell') return 1;
  if (voicing === 'rootless' && n > 3) return n - 1;
  return n;
}

export interface BuildState {
  root: Note;
  chordId: string;
  inv: number;
  voicing: VoicingStyle;
  oct: number;
}

/** Pitches of a chord for the builder's root, type, inversion, voicing style and register. */
export function voicingFor(st: BuildState): Pitch[] {
  const tones = buildChord(st.root, st.chordId);
  const inv = Math.min(st.inv, inversionCount(st.chordId, st.voicing) - 1);
  return voiceChord(tones, { style: st.voicing, inversion: inv, low: (st.oct + 1) * 12 });
}
