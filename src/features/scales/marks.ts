/** Marking and spelling helpers for the Scales & Modes keyboard. */
/**
 * Pieces of the Scales & Modes room that do not hold state: the hero's formula row, step bar, forms
 * and equivalents, the keyboard legend, and the marking helpers.
 */
import { type KeyMark } from '../../components/Piano';
import {
  
  
  
  findScalesByPcs,
  
  
  
  scalePcs,
  
  
  type ScaleDef,
  
} from '../../theory/scales';
import { mod, pc, type Note } from '../../theory/notes';
import { scaleTones, type ScaleTone } from './scaleLogic';
import { type LabelMode } from './shared';

export function toneLabel(t: ScaleTone, mode: LabelMode): string | undefined {
  if (mode === 'names') return t.name;
  if (mode === 'degrees') return t.degree;
  if (mode === 'intervals') return t.intervalName;
  return undefined;
}

/** Spell a pitch class using the current scale when possible. */
export function nameForPc(p: number, tones: ScaleTone[]): Note {
  const t = tones.find((x) => mod(x.midi, 12) === p);
  if (t) return t.note;
  const names: Note[] = [
    { letter: 'C', acc: 0 }, { letter: 'D', acc: -1 }, { letter: 'D', acc: 0 }, { letter: 'E', acc: -1 }, { letter: 'E', acc: 0 }, { letter: 'F', acc: 0 },
    { letter: 'F', acc: 1 }, { letter: 'G', acc: 0 }, { letter: 'A', acc: -1 }, { letter: 'A', acc: 0 }, { letter: 'B', acc: -1 }, { letter: 'B', acc: 0 },
  ];
  return names[p];
}

export function compareMarks(root: Note, aId: string, bId: string, labelMode: LabelMode): Record<number, KeyMark> {
  const a = scaleTones(root, aId).slice(0, -1);
  const b = scaleTones(root, bId).slice(0, -1);
  const out: Record<number, KeyMark> = {};
  const aPcs = new Set(a.map((t) => mod(t.midi, 12)));
  const bPcs = new Set(b.map((t) => mod(t.midi, 12)));
  for (const t of [...a, ...b]) {
    const p = mod(t.midi, 12);
    if (out[p]) continue;
    const role = t.index === 0 ? 'root' : aPcs.has(p) && bPcs.has(p) ? 'tone' : aPcs.has(p) ? 'alt' : 'extra';
    out[p] = { role, label: toneLabel(t, labelMode) };
  }
  return out;
}

/** Other scales (in any tradition) with exactly the same pitches on the same root. */
export function sameNotesElsewhere(root: Note, scale: ScaleDef): ScaleDef[] {
  const rootPc = pc(root);
  const seen = new Set<string>();
  return findScalesByPcs(scalePcs(rootPc, scale.id))
    .filter((r) => r.rootPc === rootPc && r.scale.id !== scale.id && r.scale.intervals.length === scale.intervals.length)
    .map((r) => r.scale)
    .filter((x) => !seen.has(x.id) && !!seen.add(x.id));
}
