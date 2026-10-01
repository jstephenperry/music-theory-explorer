/**
 * Data model for rhythm-only notation (single-line percussion staves), independent of VexFlow.
 */
import { groupStarts, timeSigSpec, type AccentLevel, type Bar } from './meter';

export type VexDur = 'w' | 'h' | 'q' | '8' | '16' | '32';

export interface RNote {
  dur: VexDur;
  dots?: number;
  rest?: boolean;
  /** Draw an accent mark (>). */
  accent?: boolean;
  /** Highlight key (shared by notes that should light up together). */
  id?: string;
}

export interface RTuplet {
  /** Index of the first note and number of notes in the tuplet. */
  from: number;
  count: number;
  numNotes: number;
  notesOccupied: number;
  ratioed?: boolean;
}

export interface RMeasure {
  timeSig?: string;
  notes: RNote[];
  /** Groups of note indices to beam together. */
  beams?: number[][];
  tuplets?: RTuplet[];
}

export interface RPart {
  label?: string;
  /** CSS custom property used to color the notes, e.g. '--royal'. */
  colorVar?: string;
  measures: RMeasure[];
}

const DUR_BY_DEN: Record<number, VexDur> = { 1: 'w', 2: 'h', 4: 'q', 8: '8', 16: '16', 32: '32' };

export function pulseDur(den: number): VexDur {
  return DUR_BY_DEN[den] ?? 'q';
}

export const isBeamable = (d: VexDur) => d === '8' || d === '16' || d === '32';

/**
 * One measure of pulses for a bar: beamed by beat group, accents on accented pulses.
 * `idPrefix` + global pulse index become highlight ids.
 */
export function measureFromBar(
  bar: Bar,
  accents: AccentLevel[],
  opts: { showSig?: boolean; additiveSig?: boolean; pulseBase?: number; idPrefix?: string } = {},
): RMeasure {
  const dur = pulseDur(bar.den);
  const base = opts.pulseBase ?? 0;
  const prefix = opts.idPrefix ?? 'p';
  const notes: RNote[] = Array.from({ length: bar.num }, (_, i) => ({ dur, accent: (accents[i] ?? 0) > 0, id: `${prefix}${base + i}` }));
  const beams: number[][] = [];
  if (isBeamable(dur)) {
    groupStarts(bar.groups).forEach((s, gi) => {
      const g = bar.groups[gi];
      if (g >= 2) beams.push(Array.from({ length: g }, (_, k) => s + k));
    });
  }
  return { timeSig: opts.showSig === false ? undefined : timeSigSpec(bar, opts.additiveSig), notes, beams };
}

/** Measures for a sequence of bars, showing the time signature only where it changes. */
export function measuresFromBars(bars: Bar[], accents: AccentLevel[][], additiveSig = false, idPrefix = 'p'): RMeasure[] {
  let pulse = 0;
  let prevSig = '';
  return bars.map((bar, i) => {
    const sig = timeSigSpec(bar, additiveSig);
    const m = measureFromBar(bar, accents[i] ?? [], { showSig: sig !== prevSig, additiveSig, pulseBase: pulse, idPrefix });
    prevSig = sig;
    pulse += bar.num;
    return m;
  });
}
