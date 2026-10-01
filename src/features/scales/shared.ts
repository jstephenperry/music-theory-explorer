import type { SeqEvent } from '../../audio/sequencer';
import type { SelectGroup } from '../../components/ui';
import { SCALES, TRADITIONS, familiesOf, scalesInFamily } from '../../theory/scales';

export type LabelMode = 'names' | 'degrees' | 'intervals' | 'none';
export type View = 'modes' | 'harmony' | 'compare' | 'finder';

/** Payload attached to every sequenced event so the piano and staves can follow playback. */
export interface PlayData {
  kind: 'scale' | 'cmp' | 'chord' | 'ladder' | 'preview' | 'form';
  /** Index into the relevant staff, chord list or ladder rung. */
  index: number;
  /** Secondary index (note within a ladder rung or preview). */
  sub?: number;
  /** Identifies what is previewed (a scale id plus root). */
  tag?: string;
  midi: number[];
}

/** Every scale, grouped by tradition and family, for drop-down lists. */
export const SCALE_GROUPS: SelectGroup[] = TRADITIONS.flatMap((t) =>
  familiesOf(t.id).map((f) => ({
    label: `${t.short}: ${f}`,
    options: scalesInFamily(t.id, f).map((x) => ({ value: x.id, label: x.name })),
  })),
);

export const SCALE_COUNT = SCALES.length;

/** Sequence events for a list of MIDI notes (fractional for microtonal pitches), one per `beats`, tagged for highlighting. */
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
