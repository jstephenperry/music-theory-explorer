import { useCallback, useMemo, useRef, useState } from 'react';
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
  // A written note can sound as several events (a trill, a tremolo), so count the events per id
  // and keep the note highlighted until the last of them ends.
  const counts = useRef(new Map<string, number>());
  const publish = () => setActive(new Set([...counts.current].filter(([, n]) => n > 0).map(([id]) => id)));

  const stop = useCallback(() => {
    player.stop();
    counts.current.clear();
    setActive(new Set());
    setTag(null);
  }, [player]);

  const play = useCallback(
    (score: Score, opts: { bpm: number; tag: string; loop?: boolean }) => {
      const events: SeqEvent[] = scoreSounds(score).map((snd) => {
        const staff = Number(snd.ids[0].split('.')[0]);
        return {
          time: snd.time,
          duration: snd.duration * (snd.grace ? 1 : snd.ornament ? 0.9 : 0.96),
          midi: snd.midi,
          // The top staff (usually the melody) sounds a little louder than the accompaniment; ornament notes a touch lighter.
          velocity: snd.grace ? 0.5 : (staff === 0 ? 0.74 : 0.6) * (snd.ornament ? 0.92 : 1),
          data: { ids: snd.ids } satisfies SoundData,
        };
      });
      const total = score.staves[0]?.voices[0]?.notes.reduce((a, n) => a + n.dur, 0) ?? 0;
      counts.current.clear();
      setActive(new Set());
      setTag(opts.tag);
      player.play(events, {
        bpm: opts.bpm,
        loop: opts.loop,
        length: total,
        onEvent: (_, ev) => {
          for (const id of (ev.data as SoundData).ids) counts.current.set(id, (counts.current.get(id) ?? 0) + 1);
          publish();
        },
        onEventEnd: (_, ev) => {
          for (const id of (ev.data as SoundData).ids) counts.current.set(id, Math.max(0, (counts.current.get(id) ?? 0) - 1));
          publish();
        },
        onEnd: () => {
          counts.current.clear();
          setActive(new Set());
          setTag(null);
        },
      });
    },
    [player],
  );

  return useMemo(() => ({ play, stop, active, tag, playing: player.playing, setBpm: player.setBpm }), [play, stop, active, tag, player.playing, player.setBpm]);
}
