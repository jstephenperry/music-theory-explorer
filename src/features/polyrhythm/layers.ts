/** Shared layer styling and sounds for the polyrhythm room. */
import { SOUNDS, type SoundId } from '../meter/patterns';

export const LAYER_COLORS = ['--accent', '--royal', '--verdigris'] as const;
export const LAYER_NAMES = ['A', 'B', 'C'];

export const LAYER_SOUND_IDS: SoundId[] = ['block', 'low', 'bell', 'clave', 'conga', 'tek', 'snare', 'hat'];
export const DEFAULT_LAYER_SOUNDS: SoundId[] = ['block', 'low', 'bell'];

export function soundOptions() {
  return LAYER_SOUND_IDS.map((id) => ({ value: id, label: SOUNDS[id].name }));
}

export function percFor(id: SoundId, gainScale = 1) {
  const s = SOUNDS[id];
  return { pitch: s.pitch, gain: s.gain * gainScale, decay: s.decay };
}

/** Audible layers given mute and solo flags. */
export function audibleLayers(muted: boolean[], solo: boolean[], n: number): boolean[] {
  const anySolo = solo.slice(0, n).some(Boolean);
  return Array.from({ length: n }, (_, i) => (anySolo ? !!solo[i] : !muted[i]));
}

export interface GridRow {
  label: string;
  colorVar: string;
  /** Cell kinds: 0 = empty, 1 = onset, 2 = strong onset (cycle start). */
  cells: number[];
  /** Optional cycle boundaries (drawn as brackets) in steps. */
  cycle?: number;
}

export function layerRows(gridRows: boolean[][], labels?: string[]): GridRow[] {
  return gridRows.map((r, i) => ({ label: labels?.[i] ?? LAYER_NAMES[i], colorVar: LAYER_COLORS[i], cells: r.map((x) => (x ? 2 : 0)) }));
}
