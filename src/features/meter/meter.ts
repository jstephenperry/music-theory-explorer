/**
 * Meter analysis: classification of time signatures, beat grouping, accent patterns,
 * metronome timelines, tempo markings and tap tempo. Pure functions, no DOM.
 *
 * Model: a bar has `num` pulses of the note value 1/den. Pulses are grouped into beats
 * (`groups`, sizes in pulses, summing to `num`). Each pulse carries an accent level:
 * 2 = downbeat, 1 = secondary (beat) accent, 0 = weak pulse.
 */

export type AccentLevel = 0 | 1 | 2;

export interface Bar {
  num: number;
  den: number;
  /** Beat groups in pulses; must sum to num. */
  groups: number[];
}

export const DENOMINATORS = [2, 4, 8, 16] as const;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function isValidBar(b: Bar): boolean {
  return (
    Number.isInteger(b.num) &&
    b.num >= 1 &&
    b.num <= 32 &&
    (DENOMINATORS as readonly number[]).includes(b.den) &&
    b.groups.length > 0 &&
    b.groups.every((g) => Number.isInteger(g) && g >= 1) &&
    sum(b.groups) === b.num
  );
}

/** Split n into 2s and 3s (3s at the end), e.g. 7 → [2, 2, 3], 11 → [2, 2, 2, 2, 3]. */
export function twosAndThrees(n: number): number[] {
  if (n <= 3) return [n];
  const out: number[] = [];
  let rest = n;
  // Use one 3 when odd, otherwise all 2s.
  if (rest % 2 === 1) rest -= 3;
  while (rest > 0) {
    out.push(2);
    rest -= 2;
  }
  if (n % 2 === 1) out.push(3);
  return out;
}

/** The conventional beat grouping for a time signature. */
export function defaultGroups(num: number, den: number): number[] {
  // Compound: numerator divisible by 3 and larger than 3 (6/8, 9/8, 12/8, 6/4, 9/16 ...).
  if (num > 3 && num % 3 === 0) return Array(num / 3).fill(3);
  // Fast irregular meters with eighth or sixteenth pulses group into 2s and 3s.
  if (den >= 8 && num > 4) return twosAndThrees(num);
  // Simple meters (and quarter- or half-pulse irregular meters such as 5/4): one pulse per beat.
  return Array(num).fill(1);
}

export function makeBar(num: number, den: number, groups?: number[]): Bar {
  return { num, den, groups: groups && sum(groups) === num ? [...groups] : defaultGroups(num, den) };
}

/**
 * Larger-scale grouping of beats used for secondary accents when every pulse is a beat:
 * 4 → 2+2 (strong, weak, medium, weak), 5 → 3+2, 6 → 3+3, 7 → 4+3.
 */
export function beatHypergroups(n: number): number[] {
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  if (n === 5) return [3, 2];
  if (n === 6) return [3, 3];
  if (n === 7) return [4, 3];
  if (n === 8) return [4, 4];
  return twosAndThrees(n);
}

/** Starting offsets of each group. */
export function groupStarts(groups: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const g of groups) {
    out.push(acc);
    acc += g;
  }
  return out;
}

/** Default accent pattern of a bar: downbeat, secondary accents at beat (or hypergroup) starts, weak elsewhere. */
export function defaultAccents(bar: Bar): AccentLevel[] {
  const acc: AccentLevel[] = Array(bar.num).fill(0);
  const starts = bar.groups.every((g) => g === 1) ? groupStarts(beatHypergroups(bar.num)) : groupStarts(bar.groups);
  for (const s of starts) acc[s] = 1;
  acc[0] = 2;
  return acc;
}

/** Cycle an accent level: weak → secondary → downbeat → weak. */
export function nextAccent(a: AccentLevel): AccentLevel {
  return a === 0 ? 1 : a === 1 ? 2 : 0;
}

// ---------- Grouping edits ----------

/** Index of the group containing a pulse, and the offset within it. */
export function locatePulse(groups: number[], pulse: number): { group: number; offset: number } {
  let acc = 0;
  for (let g = 0; g < groups.length; g++) {
    if (pulse < acc + groups[g]) return { group: g, offset: pulse - acc };
    acc += groups[g];
  }
  return { group: groups.length - 1, offset: groups[groups.length - 1] - 1 };
}

/**
 * Toggle the boundary before pulse `p` (1 ≤ p < num): if a group starts at p, merge it into the
 * previous group; otherwise split the group containing p so that a new group starts at p.
 */
export function toggleBoundary(groups: number[], p: number): number[] {
  const total = sum(groups);
  if (p <= 0 || p >= total) return [...groups];
  const starts = groupStarts(groups);
  const gi = starts.indexOf(p);
  if (gi > 0) {
    const out = [...groups];
    out.splice(gi - 1, 2, groups[gi - 1] + groups[gi]);
    return out;
  }
  const { group, offset } = locatePulse(groups, p);
  const out = [...groups];
  out.splice(group, 1, offset, groups[group] - offset);
  return out;
}

export function groupingLabel(groups: number[]): string {
  return groups.join('+');
}

// ---------- Note values ----------

export interface NoteValue {
  /** Duration as a fraction of a whole note. */
  whole: number;
  name: string;
  /** Short form such as "♩." for compact UI. */
  symbol: string;
}

const BASE_VALUES: Array<{ whole: number; name: string; symbol: string }> = [
  { whole: 1, name: 'whole', symbol: '𝅝' },
  { whole: 1 / 2, name: 'half', symbol: '𝅗𝅥' },
  { whole: 1 / 4, name: 'quarter', symbol: '♩' },
  { whole: 1 / 8, name: 'eighth', symbol: '♪' },
  { whole: 1 / 16, name: 'sixteenth', symbol: '𝅘𝅥𝅯' },
  { whole: 1 / 32, name: 'thirty-second', symbol: '𝅘𝅥𝅰' },
];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Name a duration (fraction of a whole note), with dots where applicable. */
export function noteValue(whole: number): NoteValue {
  for (const b of BASE_VALUES) {
    if (near(whole, b.whole)) return { whole, name: b.name, symbol: b.symbol };
    if (near(whole, b.whole * 1.5)) return { whole, name: `dotted ${b.name}`, symbol: `${b.symbol}.` };
    if (near(whole, b.whole * 1.75)) return { whole, name: `double-dotted ${b.name}`, symbol: `${b.symbol}..` };
  }
  // Fall back to a count of the smallest fitting value, e.g. "5 eighths".
  for (const b of BASE_VALUES) {
    const n = whole / b.whole;
    if (near(n, Math.round(n))) return { whole, name: `${Math.round(n)} ${b.name}s`, symbol: `${Math.round(n)}×${b.symbol}` };
  }
  return { whole, name: `${whole} whole`, symbol: '?' };
}

export function pulseValue(den: number): NoteValue {
  return noteValue(1 / den);
}

// ---------- Classification ----------

export type MeterKind = 'simple' | 'compound' | 'irregular';

const COUNT_NAMES: Record<number, string> = {
  1: 'single',
  2: 'duple',
  3: 'triple',
  4: 'quadruple',
  5: 'quintuple',
  6: 'sextuple',
  7: 'septuple',
  8: 'octuple',
  9: 'nonuple',
};

export function beatCountName(n: number): string {
  return COUNT_NAMES[n] ?? `${n}-beat`;
}

export interface MeterAnalysis {
  kind: MeterKind;
  /** e.g. "Simple triple", "Compound duple", "Irregular (asymmetric) triple". */
  label: string;
  beatCount: number;
  countName: string;
  equalBeats: boolean;
  /** Additive: unequal beats of 2 and 3 pulses (aksak). */
  asymmetric: boolean;
  beats: NoteValue[];
  /** Plain-language beat unit, e.g. "dotted quarter" or "quarter, quarter, dotted quarter". */
  beatUnitText: string;
  pulse: NoteValue;
  /** Pulses (notated 1/den notes) per beat, one entry per beat. */
  pulsesPerBeat: number[];
  /** How each beat divides at the next level down. */
  divisionText: string;
  grouping: string;
  /** One or two sentences explaining the classification. */
  summary: string;
}

const isPow2 = (n: number) => n >= 1 && (n & (n - 1)) === 0;

export function analyzeBar(bar: Bar): MeterAnalysis {
  const { num, den, groups } = bar;
  const pulse = pulseValue(den);
  const beats = groups.map((g) => noteValue(g / den));
  const beatCount = groups.length;
  const countName = beatCountName(beatCount);
  const equalBeats = groups.every((g) => g === groups[0]);
  const g0 = groups[0];
  const regularCount = beatCount >= 2 && beatCount <= 4;
  const asymmetric = !equalBeats && groups.every((g) => g === 2 || g === 3);
  const grouping = groupingLabel(groups);

  let kind: MeterKind;
  let label: string;
  let divisionText: string;
  let summary: string;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (equalBeats && (isPow2(g0) || g0 === 3)) {
    const compound = g0 === 3;
    const beatValue = beats[0];
    if (beatCount === 1) {
      kind = compound ? 'compound' : 'simple';
      label = `${cap(kind)}, one beat per bar`;
    } else if (regularCount) {
      kind = compound ? 'compound' : 'simple';
      label = `${cap(kind)} ${countName}`;
    } else {
      kind = 'irregular';
      label = `Irregular ${countName}${compound ? ' (compound beats)' : ''}`;
    }
    const divCount = compound ? 3 : 2;
    const subName = compound ? pulse.name : noteValue(g0 / den / 2).name;
    divisionText = `Each ${beatValue.name} beat divides into ${divCount} ${subName}s`;
    if (kind === 'simple') {
      summary = `${beatCount} ${beatValue.name}-note beat${beatCount === 1 ? '' : 's'} per bar, each dividing in two. The top number counts beats.`;
    } else if (kind === 'compound') {
      summary = `${num} ${pulse.name}s grouped in threes: ${beatCount === 1 ? 'a single' : beatCount} dotted beat${beatCount === 1 ? '' : 's'}, each dividing in three. The top number counts divisions, not beats.`;
    } else {
      summary = `${beatCount} equal ${beatValue.name} beats per bar: a beat count other than 2, 3 or 4 makes the meter irregular, though every beat is the same length.`;
    }
  } else {
    kind = 'irregular';
    label = asymmetric ? `Irregular ${countName}, asymmetric ${grouping}` : `Irregular ${countName}, grouped ${grouping}`;
    divisionText = `Beats of ${[...new Set(groups)].sort((a, b) => a - b).join(' and ')} ${pulse.name}s: long and short beats`;
    summary = asymmetric
      ? `${num} ${pulse.name}s in unequal beats of two and three (additive or aksak rhythm). The ${beatCount} beats are ${beats.map((b) => b.name).join(', ')}.`
      : `${num} ${pulse.name}s in ${beatCount} unequal groups (${grouping}).`;
  }

  const distinctBeatNames = [...new Set(beats.map((b) => b.name))];
  const beatUnitText = distinctBeatNames.length === 1 ? distinctBeatNames[0] : beats.map((b) => b.name).join(', ');

  return {
    kind,
    label,
    beatCount,
    countName,
    equalBeats,
    asymmetric,
    beats,
    beatUnitText,
    pulse,
    pulsesPerBeat: [...groups],
    divisionText,
    grouping,
    summary,
  };
}

/** Time signature string for VexFlow, optionally additive ("2+2+3/8"). */
export function timeSigSpec(bar: Bar, additive = false): string {
  const showAdditive = additive && bar.groups.length > 1 && !bar.groups.every((g) => g === bar.groups[0]);
  return `${showAdditive ? bar.groups.join('+') : bar.num}/${bar.den}`;
}

// ---------- Tempo ----------

/**
 * The note value (fraction of a whole) that the metronome's BPM refers to:
 * the beat for simple and compound meters, the short (two-pulse) beat for asymmetric meters.
 */
export function tempoUnit(bar: Bar): number {
  const { groups, den } = bar;
  const equal = groups.every((g) => g === groups[0]);
  if (equal && (isPow2(groups[0]) || groups[0] === 3)) return groups[0] / den;
  return Math.min(...groups) / den;
}

export interface TempoMarking {
  name: string;
  meaning: string;
  min: number;
  /** Exclusive upper bound; Infinity for the last. */
  max: number;
}

/** A non-overlapping ladder of common Italian tempo markings (beats per minute). */
export const TEMPO_MARKINGS: TempoMarking[] = [
  { name: 'Larghissimo', meaning: 'as slow as possible', min: 0, max: 25 },
  { name: 'Grave', meaning: 'slow and solemn', min: 25, max: 40 },
  { name: 'Largo', meaning: 'broadly', min: 40, max: 60 },
  { name: 'Larghetto', meaning: 'rather broadly', min: 60, max: 66 },
  { name: 'Adagio', meaning: 'slowly, at ease', min: 66, max: 76 },
  { name: 'Andante', meaning: 'at a walking pace', min: 76, max: 108 },
  { name: 'Moderato', meaning: 'moderately', min: 108, max: 120 },
  { name: 'Allegro', meaning: 'fast, bright', min: 120, max: 156 },
  { name: 'Vivace', meaning: 'lively', min: 156, max: 176 },
  { name: 'Presto', meaning: 'very fast', min: 176, max: 200 },
  { name: 'Prestissimo', meaning: 'as fast as possible', min: 200, max: Infinity },
];

export function tempoMarking(bpm: number): TempoMarking {
  return TEMPO_MARKINGS.find((m) => bpm >= m.min && bpm < m.max) ?? TEMPO_MARKINGS[TEMPO_MARKINGS.length - 1];
}

/**
 * Tap tempo: BPM from a list of tap times in milliseconds (ascending).
 * Uses the taps after the last gap longer than `resetMs`, averaging up to the last `window` intervals.
 */
export function tapTempo(taps: number[], resetMs = 2000, window = 6): number | null {
  if (taps.length < 2) return null;
  let start = 0;
  for (let i = 1; i < taps.length; i++) if (taps[i] - taps[i - 1] > resetMs) start = i;
  const recent = taps.slice(start).slice(-(window + 1));
  if (recent.length < 2) return null;
  const avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  if (avg <= 0) return null;
  return 60000 / avg;
}

// ---------- Metronome timeline ----------

export type ClickRole = 'strong' | 'medium' | 'weak' | 'sub';

export interface TimelineEvent {
  /** Time in tempo units (beats of the tempo reference value). */
  time: number;
  duration: number;
  role: ClickRole;
  bar: number;
  /** Global pulse index across the whole sequence. */
  pulse: number;
  /** Subdivision slot (0 = the pulse itself). */
  slot: number;
}

export interface Timeline {
  events: TimelineEvent[];
  /** Total length in tempo units. */
  length: number;
  /** Start time (tempo units) of every pulse, plus the end. */
  pulseStarts: number[];
  /** Start time of every beat group, plus the end. */
  beatStarts: number[];
  /** Global pulse index where each bar starts, plus the total. */
  barPulseStarts: number[];
  /** Start time of every bar, plus the end. */
  barStarts: number[];
}

export function accentRole(a: AccentLevel): ClickRole {
  return a === 2 ? 'strong' : a === 1 ? 'medium' : 'weak';
}

/**
 * Offsets (fractions of a pulse) of subdivision clicks. `swing` 0..1 moves the off-beat of a
 * two-way division from 1/2 (straight) to 2/3 (triplet swing).
 */
export function subdivisionOffsets(subdiv: number, swing: number): number[] {
  if (subdiv <= 1) return [];
  if (subdiv === 2) return [0.5 + Math.max(0, Math.min(1, swing)) / 6];
  return Array.from({ length: subdiv - 1 }, (_, i) => (i + 1) / subdiv);
}

/** Build a metronome timeline for a sequence of bars, in units of `unit` (fraction of a whole note). */
export function buildTimeline(bars: Bar[], accents: AccentLevel[][], unit: number, subdiv = 1, swing = 0): Timeline {
  const events: TimelineEvent[] = [];
  const pulseStarts: number[] = [];
  const beatStarts: number[] = [];
  const barPulseStarts: number[] = [];
  const barStarts: number[] = [];
  let t = 0;
  let pulse = 0;
  const offs = subdivisionOffsets(subdiv, swing);
  bars.forEach((bar, bi) => {
    barPulseStarts.push(pulse);
    barStarts.push(t);
    const pDur = 1 / bar.den / unit;
    const starts = new Set(groupStarts(bar.groups));
    for (let p = 0; p < bar.num; p++) {
      pulseStarts.push(t);
      if (starts.has(p)) beatStarts.push(t);
      const level = accents[bi]?.[p] ?? 0;
      events.push({ time: t, duration: pDur, role: accentRole(level), bar: bi, pulse, slot: 0 });
      offs.forEach((o, k) => events.push({ time: t + o * pDur, duration: pDur / (offs.length + 1), role: 'sub', bar: bi, pulse, slot: k + 1 }));
      t += pDur;
      pulse++;
    }
  });
  pulseStarts.push(t);
  beatStarts.push(t);
  barPulseStarts.push(pulse);
  barStarts.push(t);
  return { events, length: t, pulseStarts, beatStarts, barPulseStarts, barStarts };
}

/** Index i such that starts[i] <= t < starts[i+1] (binary search); -1 before the start. */
export function indexAt(starts: number[], t: number): number {
  if (t < starts[0]) return -1;
  let lo = 0;
  let hi = starts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// ---------- Presets ----------

export interface MeterPreset {
  id: string;
  label: string;
  family: 'Simple' | 'Compound' | 'Irregular' | 'Additive' | 'Mixed';
  bars: Bar[];
  note?: string;
}

const b = (num: number, den: number, groups?: number[]) => makeBar(num, den, groups);

export const METER_PRESETS: MeterPreset[] = [
  { id: '2-4', label: '2/4', family: 'Simple', bars: [b(2, 4)], note: 'March, polka' },
  { id: '3-4', label: '3/4', family: 'Simple', bars: [b(3, 4)], note: 'Waltz, minuet' },
  { id: '4-4', label: '4/4', family: 'Simple', bars: [b(4, 4)], note: 'Common time' },
  { id: '2-2', label: '2/2', family: 'Simple', bars: [b(2, 2)], note: 'Cut time (alla breve)' },
  { id: '6-8', label: '6/8', family: 'Compound', bars: [b(6, 8)], note: 'Jig, barcarolle' },
  { id: '9-8', label: '9/8', family: 'Compound', bars: [b(9, 8)], note: 'Slip jig' },
  { id: '12-8', label: '12/8', family: 'Compound', bars: [b(12, 8)], note: 'Slow blues, shuffle' },
  { id: '6-4', label: '6/4', family: 'Compound', bars: [b(6, 4)], note: 'Compound duple in quarters' },
  { id: '5-4', label: '5/4', family: 'Irregular', bars: [b(5, 4)], note: 'Felt 3+2 (“Take Five”)' },
  { id: '5-8', label: '5/8', family: 'Irregular', bars: [b(5, 8, [3, 2])], note: 'Two unequal beats' },
  { id: '7-8', label: '7/8', family: 'Irregular', bars: [b(7, 8, [2, 2, 3])], note: 'Three unequal beats' },
  { id: '11-8', label: '11/8', family: 'Irregular', bars: [b(11, 8, [2, 2, 3, 2, 2])], note: 'Kopanitsa (Bulgaria)' },
  { id: '13-8', label: '13/8', family: 'Irregular', bars: [b(13, 8, [3, 3, 3, 2, 2])], note: 'Five beats, long then short' },
  { id: '15-16', label: '15/16', family: 'Irregular', bars: [b(15, 16, [3, 3, 3, 3, 3])], note: 'Five dotted-eighth beats' },
  { id: '7-8-223', label: '7/8 (2+2+3)', family: 'Additive', bars: [b(7, 8, [2, 2, 3])], note: 'Rachenitsa' },
  { id: '7-8-322', label: '7/8 (3+2+2)', family: 'Additive', bars: [b(7, 8, [3, 2, 2])], note: 'Lesnoto, Kalamatianos' },
  { id: '7-8-232', label: '7/8 (2+3+2)', family: 'Additive', bars: [b(7, 8, [2, 3, 2])], note: 'Short, long, short' },
  { id: '9-8-aksak', label: '9/8 (2+2+2+3)', family: 'Additive', bars: [b(9, 8, [2, 2, 2, 3])], note: 'Turkish aksak, “Blue Rondo”' },
  { id: '8-8-332', label: '8/8 (3+3+2)', family: 'Additive', bars: [b(8, 8, [3, 3, 2])], note: 'Tresillo feel' },
  { id: 'mix-34-24', label: '3/4 + 2/4', family: 'Mixed', bars: [b(3, 4), b(2, 4)], note: 'Alternating bars' },
  { id: 'mix-78-44', label: '7/8 + 4/4', family: 'Mixed', bars: [b(7, 8, [2, 2, 3]), b(4, 4)], note: 'Prog-rock alternation' },
  { id: 'mix-68-34', label: '6/8 + 3/4', family: 'Mixed', bars: [b(6, 8), b(3, 4)], note: '“America” (Bernstein)' },
  { id: 'mix-54-44', label: '5/4 + 4/4 + 3/4', family: 'Mixed', bars: [b(5, 4), b(4, 4), b(3, 4)], note: 'Shrinking bars' },
];

/** Parse "7/8:2+2+3,4/4" into bars (used for URL state). Returns null if invalid. */
export function parseBars(s: string): Bar[] | null {
  const parts = s.split(',').filter(Boolean);
  if (!parts.length || parts.length > 8) return null;
  const out: Bar[] = [];
  for (const p of parts) {
    const m = /^(\d+)\/(\d+)(?::([\d+]+))?$/.exec(p.trim());
    if (!m) return null;
    const num = Number(m[1]);
    const den = Number(m[2]);
    const groups = m[3] ? m[3].split('+').map(Number) : defaultGroups(num, den);
    const bar = { num, den, groups };
    if (!isValidBar(bar)) return null;
    out.push(bar);
  }
  return out;
}

export function serializeBars(bars: Bar[]): string {
  return bars
    .map((bar) => {
      const def = defaultGroups(bar.num, bar.den);
      const same = def.length === bar.groups.length && def.every((g, i) => g === bar.groups[i]);
      return `${bar.num}/${bar.den}${same ? '' : ':' + bar.groups.join('+')}`;
    })
    .join(',');
}
