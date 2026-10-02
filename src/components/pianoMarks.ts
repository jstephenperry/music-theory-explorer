/** Helpers for marking keys on the Piano; kept apart from the component so the component file exports only components. */
import { mod } from '../theory/notes';
import type { KeyMark, MarkRole } from './Piano';

export const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

export const isBlackKey = (m: number) => !WHITE_PCS.includes(mod(m, 12));

/** Build `pcMarks` from a list of pitch classes with optional labels; the first entry is marked as the root. */
export function marksFromPcs(pcs: number[], labels?: string[], rootRole: MarkRole = 'root', toneRole: MarkRole = 'tone'): Record<number, KeyMark> {
  const out: Record<number, KeyMark> = {};
  pcs.forEach((p, i) => {
    const k = mod(p, 12);
    if (out[k]) return;
    out[k] = { role: i === 0 ? rootRole : toneRole, label: labels?.[i] };
  });
  return out;
}

/** Build `marks` for specific MIDI notes. */
export function marksFromMidi(notes: number[], labels?: string[], role: MarkRole = 'tone', rootRole?: MarkRole): Record<number, KeyMark> {
  const out: Record<number, KeyMark> = {};
  notes.forEach((m, i) => {
    out[m] = { role: i === 0 && rootRole ? rootRole : role, label: labels?.[i] };
  });
  return out;
}
