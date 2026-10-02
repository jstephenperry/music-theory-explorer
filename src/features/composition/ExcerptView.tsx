import { useMemo, useState } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton, Slider } from '../../components/ui';
import { buildScore, selectNotes } from '../../theory/score';
import type { Excerpt } from '../../repertoire';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

/**
 * A classical excerpt with playback, highlight layers (motive, inversion ...) that can be switched
 * on and off, analysis brackets, commentary and its source.
 */
/** Shown under the provenance of any excerpt whose score carries ornament signs. */
const ORNAMENT_NOTE = 'Ornaments are realized in playback with the diatonic neighbors of the key: trills from the main note, mordents to the lower neighbor.';

export function ExcerptView({ excerpt, player, defaultLayers }: { excerpt: Excerpt; player: ReturnType<typeof useScorePlayer>; defaultLayers?: string[] }) {
  const { work, analysis } = excerpt;
  const score = useMemo(() => buildScore(work.spec), [work]);
  const [on, setOn] = useState<Set<string>>(new Set(defaultLayers ?? analysis.layers?.map((l) => l.id) ?? []));
  const [bpm, setBpm] = useState(work.tempo);
  const playing = player.tag === work.id;
  const ornamented = useMemo(() => score.staves.some((st) => st.voices.some((v) => v.notes.some((n) => n.orn?.some((o) => o !== 'stacc' && o !== 'fermata')))), [score]);

  const colors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of analysis.layers ?? []) if (on.has(l.id)) for (const id of selectNotes(score, l.select)) out[id] ??= l.color;
    return out;
  }, [analysis, score, on]);
  const brackets = useMemo(
    () => (analysis.brackets ?? []).filter((b) => !b.layer || on.has(b.layer)),
    [analysis, on],
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
          <div className={s.composer}>{work.composer}</div>
          <h3 className={s.work}>{work.title}</h3>
          <div className={s.bars}>{work.bars}</div>
        </div>
        <div className={s.transport}>
          <PlayButton playing={playing} onPlay={() => player.play(score, { bpm, tag: work.id })} onStop={player.stop} label="Play" />
          <Slider
            label="Tempo"
            min={Math.round(work.tempo * 0.5)}
            max={Math.round(work.tempo * 1.4)}
            value={bpm}
            onChange={(v) => {
              setBpm(v);
              if (playing) player.setBpm(v);
            }}
            format={(v) => `♩ = ${v}`}
          />
        </div>
      </header>

      {analysis.layers && (
        <div className={s.layers} role="group" aria-label="Highlight">
          {analysis.layers.map((l) => (
            <button key={l.id} className={`${s.layer} ${on.has(l.id) ? s.layerOn : ''}`} aria-pressed={on.has(l.id)} onClick={() => toggle(l.id)}>
              <span className={s.layerSwatch} style={{ background: `var(--hl-${l.color})` }} aria-hidden="true" />
              {l.label}
            </button>
          ))}
        </div>
      )}

      <ScoreView score={score} colors={colors} brackets={brackets} barsPerLine={work.barsPerLine} active={playing ? player.active : undefined} ariaLabel={`${work.composer}, ${work.title}, ${work.bars}`} />

      <div className={s.commentary}>
        {analysis.commentary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {analysis.layers
          ?.filter((l) => on.has(l.id))
          .map((l) => (
            <p key={l.id} className={s.layerNote}>
              <span className={s.layerSwatch} style={{ background: `var(--hl-${l.color})` }} aria-hidden="true" />
              <strong>{l.label}.</strong> {l.description}
            </p>
          ))}
      </div>
      <p className={s.source}>
        {work.provenance}
        {ornamented && ` ${ORNAMENT_NOTE}`}
      </p>
    </article>
  );
}
