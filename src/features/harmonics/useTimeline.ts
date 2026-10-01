import { useCallback, useEffect, useRef, useState } from 'react';
import { stopAllPlayback } from '../../audio/usePlayer';
import { synth, type Timbre, type ToneHandle } from './synth';

export interface TimelineStep {
  /** Start time in seconds from the beginning. */
  at: number;
  /** Duration in seconds. */
  dur: number;
  freqs: number[];
  /** Optional per-step timbre. */
  timbre?: Timbre;
  /** Identifier reported to the UI while this step sounds. */
  id?: string | number;
  /** MIDI keys to show as pressed while this step sounds. */
  keys?: number[];
}

/**
 * Schedule a short list of exact-frequency steps on the room's synth and report which step is sounding.
 * Starting a new timeline, calling `stop`, or unmounting silences everything.
 */
export function useTimeline(defaultTimbre: Timbre = 'organ') {
  const [active, setActive] = useState<string | number | null>(null);
  const [activeKeys, setActiveKeys] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const handles = useRef<ToneHandle[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    handles.current.forEach((h) => h.stop());
    handles.current = [];
  }, []);

  const stop = useCallback(() => {
    clear();
    setActive(null);
    setActiveKeys([]);
    setPlaying(false);
  }, [clear]);

  const play = useCallback(
    (steps: TimelineStep[], timbre: Timbre = defaultTimbre, level = 0.6) => {
      stopAllPlayback();
      clear();
      const t0 = synth.now + 0.06;
      let end = 0;
      steps.forEach((s, i) => {
        handles.current.push(...synth.chord(s.freqs, { when: t0 + s.at, duration: s.dur, timbre: s.timbre ?? timbre, level }));
        const id = s.id ?? i;
        timers.current.push(
          window.setTimeout(() => {
            setActive(id);
            setActiveKeys(s.keys ?? []);
          }, (s.at + 0.06) * 1000),
        );
        end = Math.max(end, s.at + s.dur);
      });
      timers.current.push(
        window.setTimeout(() => {
          setActive(null);
          setActiveKeys([]);
          setPlaying(false);
          handles.current = [];
        }, (end + 0.15) * 1000),
      );
      setPlaying(true);
    },
    [clear, defaultTimbre],
  );

  useEffect(() => () => clear(), [clear]);

  return { play, stop, active, activeKeys, playing };
}
