import { useEffect, useRef } from 'react';
import { audio } from '../../audio/engine';

/** Run `cb` on every animation frame while `active` is true. */
export function useRaf(active: boolean, cb: (now: number) => void): void {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = (t: number) => {
      ref.current(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/** Output latency of the audio device in seconds (so visuals match what is heard). */
export function outputLatency(): number {
  const ctx = audio.context();
  return (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
}

/**
 * Track loop wrap-arounds of a looping position so animations can count bars or cycles.
 * Returns a function mapping the current looped position to { pos, loops }.
 */
export function makeLoopTracker() {
  let last = -1;
  let loops = 0;
  return (pos: number) => {
    if (last >= 0 && pos < last - 1e-6) loops++;
    last = pos;
    return { pos, loops };
  };
}
