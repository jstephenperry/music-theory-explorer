import { useCallback, useMemo, useState } from 'react';
import { usePlayer } from '../../audio/usePlayer';
import type { SeqEvent } from '../../audio/sequencer';
import { scoreSounds, type Score } from '../../theory/score';

interface SoundData {
  ids: string[];
}

/**
 * Play a Score and track which notes are sounding, so every voice can be highlighted at once.
 * `tag` identifies what is playing when a page has several scores.
 */
export function useScorePlayer() {
  const player = usePlayer();
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());
  const [tag, setTag] = useState<string | null>(null);

  const stop = useCallback(() => {
    player.stop();
    setActive(new Set());
    setTag(null);
  }, [player]);

  const play = useCallback(
    (score: Score, opts: { bpm: number; tag: string; loop?: boolean }) => {
      const events: SeqEvent[] = scoreSounds(score).map((snd) => {
        const staff = Number(snd.ids[0].split('.')[0]);
        return {
          time: snd.time,
          duration: snd.duration * (snd.grace ? 1 : 0.96),
          midi: snd.midi,
          // The top staff (usually the melody) sounds a little louder than the accompaniment.
          velocity: snd.grace ? 0.5 : staff === 0 ? 0.74 : 0.6,
          data: { ids: snd.ids } satisfies SoundData,
        };
      });
      const total = score.staves[0]?.voices[0]?.notes.reduce((a, n) => a + n.dur, 0) ?? 0;
      setActive(new Set());
      setTag(opts.tag);
      player.play(events, {
        bpm: opts.bpm,
        loop: opts.loop,
        length: total,
        onEvent: (_, ev) => {
          const ids = (ev.data as SoundData).ids;
          setActive((prev) => new Set([...prev, ...ids]));
        },
        onEventEnd: (_, ev) => {
          const ids = new Set((ev.data as SoundData).ids);
          setActive((prev) => new Set([...prev].filter((x) => !ids.has(x))));
        },
        onEnd: () => {
          setActive(new Set());
          setTag(null);
        },
      });
    },
    [player],
  );

  return useMemo(() => ({ play, stop, active, tag, playing: player.playing, setBpm: player.setBpm }), [play, stop, active, tag, player.playing, player.setBpm]);
}
