/**
 * Metronome and step-sequencer event builders for the shared Sequence.
 *
 * Events are pre-allocated (one per pulse plus three subdivision slots) so that accents,
 * subdivision, swing, sound and step edits can be applied to the live event objects while
 * a sequence is playing, without restarting it. The Sequence reads `time`, `click` and `perc`
 * when it schedules each event, so mutations take effect from the next scheduling pass.
 */
import type { SeqEvent } from '../../audio/sequencer';
import { accentRole, subdivisionOffsets, type AccentLevel, type Bar, type ClickRole } from './meter';
import { SOUNDS, type PatternVoice } from './patterns';

export const SUB_SLOTS = 3;

export type MetronomeSound = 'click' | 'wood';

export interface PulseData {
  pulse: number;
  slot: number;
}

const WOOD: Record<ClickRole, { pitch: number; gain: number; decay: number }> = {
  strong: { pitch: 1900, gain: 0.6, decay: 0.07 },
  medium: { pitch: 1350, gain: 0.45, decay: 0.06 },
  weak: { pitch: 950, gain: 0.32, decay: 0.05 },
  sub: { pitch: 700, gain: 0.15, decay: 0.035 },
};

/** Allocate metronome events for a sequence of bars (times in tempo units). */
export function allocateMetronome(bars: Bar[], unit: number): { events: SeqEvent[]; length: number } {
  const events: SeqEvent[] = [];
  let t = 0;
  let pulse = 0;
  for (const bar of bars) {
    const pDur = 1 / bar.den / unit;
    for (let p = 0; p < bar.num; p++) {
      events.push({ time: t, duration: pDur, data: { pulse, slot: 0 } satisfies PulseData });
      for (let k = 1; k <= SUB_SLOTS; k++) events.push({ time: t + pDur / 2, duration: pDur / 4, data: { pulse, slot: k } satisfies PulseData });
      t += pDur;
      pulse++;
    }
  }
  return { events, length: t };
}

/** Apply accents, subdivision, swing and sound to allocated events (in place). */
export function applyMetronome(
  events: SeqEvent[],
  bars: Bar[],
  accents: AccentLevel[][],
  unit: number,
  opts: { subdiv: number; swing: number; sound: MetronomeSound; muteWeak?: boolean },
): void {
  const offs = subdivisionOffsets(opts.subdiv, opts.swing);
  const levels: AccentLevel[] = accents.flatMap((a, i) => Array.from({ length: bars[i].num }, (_, p) => a[p] ?? 0));
  const set = (ev: SeqEvent, role: ClickRole | null) => {
    if (!role) {
      ev.click = undefined;
      ev.perc = undefined;
    } else if (opts.sound === 'click') {
      ev.click = role;
      ev.perc = undefined;
    } else {
      ev.click = undefined;
      ev.perc = { ...WOOD[role] };
    }
  };
  let i = 0;
  let pulse = 0;
  for (const bar of bars) {
    const pDur = 1 / bar.den / unit;
    for (let p = 0; p < bar.num; p++) {
      const main = events[i];
      const level = levels[pulse] ?? 0;
      set(main, opts.muteWeak && level === 0 ? null : accentRole(level));
      const start = main.time;
      for (let k = 1; k <= SUB_SLOTS; k++) {
        const ev = events[i + k];
        const o = offs[k - 1];
        // Unused slots sit silently at the last used offset to keep events in time order.
        ev.time = start + (o ?? offs[offs.length - 1] ?? 0.5) * pDur;
        set(ev, o === undefined ? null : 'sub');
      }
      i += SUB_SLOTS + 1;
      pulse++;
    }
  }
}

// ---------- Step sequencer ----------

export interface StepData {
  step: number;
  voice: number;
}

/** One event per step and voice; times in beats (quarter notes). */
export function allocateSteps(steps: number, stepsPerBeat: number, voices: number): { events: SeqEvent[]; length: number } {
  const events: SeqEvent[] = [];
  const d = 1 / stepsPerBeat;
  for (let s = 0; s < steps; s++) for (let v = 0; v < voices; v++) events.push({ time: s * d, duration: d, data: { step: s, voice: v } satisfies StepData });
  return { events, length: steps * d };
}

export function applySteps(events: SeqEvent[], voices: PatternVoice[], muted: boolean[]): void {
  for (const ev of events) {
    const { step, voice } = ev.data as StepData;
    const vc = voices[voice];
    if (vc && !muted[voice] && vc.cells[step]) {
      const snd = SOUNDS[vc.sound];
      ev.perc = { pitch: snd.pitch, gain: snd.gain, decay: snd.decay };
    } else ev.perc = undefined;
  }
}
