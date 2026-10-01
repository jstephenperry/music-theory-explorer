import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { audio } from './engine';
import { Sequence, type SeqEvent, type SequenceOptions } from './sequencer';
import type { BankStatus } from './samples';

/** Only one sequence plays at a time across the whole app. */
let current: Sequence | null = null;

const stoppers = new Set<() => void>();

/**
 * Register a stop function for a custom sound source (e.g. a hand-built Web Audio graph) so that it
 * is silenced when other playback starts or the user navigates away. Returns an unregister function.
 */
export function registerStopper(fn: () => void): () => void {
  stoppers.add(fn);
  return () => stoppers.delete(fn);
}

export function stopAllPlayback() {
  current?.stop();
  current = null;
  stoppers.forEach((fn) => fn());
}

export interface Player {
  play: (events: SeqEvent[], opts: SequenceOptions) => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  playing: boolean;
  /** Index of the event currently sounding, or null. */
  activeIndex: number | null;
  /** Payload of the event currently sounding. */
  activeData: unknown;
  /** Position in beats within the sequence (polled; use for animations). */
  position: () => number;
}

/**
 * Hook wrapping a Sequence: tracks playing state and the active event for UI highlighting.
 */
export function usePlayer(): Player {
  const seqRef = useRef<Sequence | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeData, setActiveData] = useState<unknown>(null);

  const stop = useCallback(() => {
    seqRef.current?.stop();
    seqRef.current = null;
  }, []);

  const play = useCallback((events: SeqEvent[], opts: SequenceOptions) => {
    stopAllPlayback();
    seqRef.current?.stop();
    const seq = new Sequence(events, {
      ...opts,
      onEvent: (i, ev) => {
        setActiveIndex(i);
        setActiveData(ev.data ?? null);
        opts.onEvent?.(i, ev);
      },
      onEnd: () => {
        setPlaying(false);
        setActiveIndex(null);
        setActiveData(null);
        if (current === seq) current = null;
        if (seqRef.current === seq) seqRef.current = null;
        opts.onEnd?.();
      },
    });
    seqRef.current = seq;
    current = seq;
    setPlaying(true);
    seq.start();
  }, []);

  const setBpm = useCallback((bpm: number) => seqRef.current?.setBpm(bpm), []);
  const position = useCallback(() => seqRef.current?.position() ?? 0, []);

  useEffect(() => () => seqRef.current?.stop(), []);

  return useMemo(
    () => ({ play, stop, setBpm, playing, activeIndex, activeData, position }),
    [play, stop, setBpm, playing, activeIndex, activeData, position],
  );
}

/** Subscribe to global audio settings (instrument, volume, reverb, A4). */
export function useAudioSettings() {
  const snapshot = useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    () => `${audio.instrument}|${audio.volume}|${audio.reverb}|${audio.a4}|${audio.instrumentStatus}`,
  );
  const [instrument, volume, reverb, a4, status] = snapshot.split('|');
  return { instrument, volume: Number(volume), reverb: Number(reverb), a4: Number(a4), status: status as BankStatus };
}
