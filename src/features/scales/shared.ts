import type { SeqEvent } from '../../audio/sequencer';
import type { SelectGroup } from '../../components/ui';
import { SCALES, SCALE_FAMILIES } from '../../theory/scales';

export type LabelMode = 'names' | 'degrees' | 'intervals' | 'none';
export type View = 'modes' | 'harmony' | 'compare' | 'finder';

/** Payload attached to every sequenced event so the piano and staves can follow playback. */
export interface PlayData {
  kind: 'scale' | 'cmp' | 'chord' | 'ladder' | 'preview';
  /** Index into the relevant staff, chord list or ladder rung. */
  index: number;
  /** Secondary index (note within a ladder rung or preview). */
  sub?: number;
  /** Identifies what is previewed (a scale id plus root). */
  tag?: string;
  midi: number[];
}

export const SCALE_GROUPS: SelectGroup[] = SCALE_FAMILIES.map((f) => ({
  label: f,
  options: SCALES.filter((x) => x.family === f).map((x) => ({ value: x.id, label: x.name })),
}));

/** Sequence events for a list of MIDI notes, one per `beats`, tagged for highlighting. */
export function melody(
  notes: Array<{ midi: number; index: number; sub?: number }>,
  kind: PlayData['kind'],
  start = 0,
  beats = 1,
  tag?: string,
): SeqEvent[] {
  return notes.map((n, i) => ({
    time: start + i * beats,
    duration: beats * (i === notes.length - 1 ? 1.8 : 0.92),
    midi: [n.midi],
    data: { kind, index: n.index, sub: n.sub, tag, midi: [n.midi] } satisfies PlayData,
  }));
}

/** Short scale name without the parenthetical alias: "Aeolian (Natural minor)" -> "Aeolian". */
export function shortName(name: string): string {
  return name.replace(/ \(.*\)$/, '');
}
