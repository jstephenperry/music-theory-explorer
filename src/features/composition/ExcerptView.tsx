import { useMemo, useState } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton, Slider } from '../../components/ui';
import { buildScore, selectNotes } from '../../theory/score';
import type { Excerpt } from './excerpts/types';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

/**
 * A classical excerpt with playback, highlight layers (motive, inversion ...) that can be switched
 * on and off, analysis brackets, commentary and its source.
 */
export function ExcerptView({ excerpt, player, defaultLayers }: { excerpt: Excerpt; player: ReturnType<typeof useScorePlayer>; defaultLayers?: string[] }) {
  const score = useMemo(() => buildScore(excerpt.spec), [excerpt]);
  const [on, setOn] = useState<Set<string>>(new Set(defaultLayers ?? excerpt.layers?.map((l) => l.id) ?? []));
  const [bpm, setBpm] = useState(excerpt.tempo);
  const playing = player.tag === excerpt.id;

  const colors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of excerpt.layers ?? []) if (on.has(l.id)) for (const id of selectNotes(score, l.select)) out[id] ??= l.color;
    return out;
  }, [excerpt, score, on]);
  const brackets = useMemo(
    () => (excerpt.brackets ?? []).filter((b) => !b.layer || on.has(b.layer)),
    [excerpt, on],
  );

  const toggle = (id: string) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <article className={s.excerpt}>
      <header className={s.excerptHead}>
        <div>
          <div className={s.composer}>{excerpt.composer}</div>
          <h3 className={s.work}>{excerpt.work}</h3>
          <div className={s.bars}>{excerpt.bars}</div>
        </div>
        <div className={s.transport}>
          <PlayButton playing={playing} onPlay={() => player.play(score, { bpm, tag: excerpt.id })} onStop={player.stop} label="Play" />
          <Slider
            label="Tempo"
            min={Math.round(excerpt.tempo * 0.5)}
            max={Math.round(excerpt.tempo * 1.4)}
            value={bpm}
            onChange={(v) => {
              setBpm(v);
              if (playing) player.setBpm(v);
            }}
            format={(v) => `♩ = ${v}`}
          />
        </div>
      </header>

      {excerpt.layers && (
        <div className={s.layers} role="group" aria-label="Highlight">
          {excerpt.layers.map((l) => (
            <button key={l.id} className={`${s.layer} ${on.has(l.id) ? s.layerOn : ''}`} aria-pressed={on.has(l.id)} onClick={() => toggle(l.id)}>
              <span className={s.layerSwatch} style={{ background: `var(--hl-${l.color})` }} aria-hidden="true" />
              {l.label}
            </button>
          ))}
        </div>
      )}

      <ScoreView score={score} colors={colors} brackets={brackets} barsPerLine={excerpt.barsPerLine} active={playing ? player.active : undefined} ariaLabel={`${excerpt.composer}, ${excerpt.work}, ${excerpt.bars}`} />

      <div className={s.commentary}>
        {excerpt.commentary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {excerpt.layers
          ?.filter((l) => on.has(l.id))
          .map((l) => (
            <p key={l.id} className={s.layerNote}>
              <span className={s.layerSwatch} style={{ background: `var(--hl-${l.color})` }} aria-hidden="true" />
              <strong>{l.label}.</strong> {l.description}
            </p>
          ))}
      </div>
      <p className={s.source}>{excerpt.source}</p>
    </article>
  );
}
