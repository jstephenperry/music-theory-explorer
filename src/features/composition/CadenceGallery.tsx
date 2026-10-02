import { useMemo } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton, Segmented } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { CADENCE_TYPES, cadenceScore, cadenceType, type CadenceId } from './cadences';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

/** Every cadence type in four-part harmony, with two examples each. */
export function CadenceGallery({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [id, setId] = usePersistentState<CadenceId>('phrase.cadence', 'pac');
  const [example, setExample] = usePersistentState<number>('phrase.cadenceExample', 0);
  const type = cadenceType(id) ?? CADENCE_TYPES[0];
  const ex = Math.min(example, type.examples.length - 1);
  const score = useMemo(() => cadenceScore(type, ex), [type, ex]);
  const tag = `cadence-${type.id}-${ex}`;

  return (
    <div className="stack">
      <Segmented<CadenceId>
        ariaLabel="Cadence"
        value={type.id}
        onChange={(v) => {
          player.stop();
          setId(v);
        }}
        options={CADENCE_TYPES.map((c) => ({ value: c.id, label: c.short, title: c.name }))}
      />
      <div className={s.cadenceHead}>
        <h3 className={s.cadenceName}>{type.name}</h3>
        <div className={s.row}>
          <Segmented<number>
            ariaLabel="Example"
            size="sm"
            value={ex}
            onChange={(v) => {
              player.stop();
              setExample(v);
            }}
            options={type.examples.map((_, i) => ({ value: i, label: `Example ${i + 1}` }))}
          />
          <PlayButton playing={player.tag === tag} onPlay={() => player.play(score, { bpm: 66, tag })} onStop={player.stop} label="Play" />
        </div>
      </div>
      <ScoreView score={score} active={player.tag === tag ? player.active : undefined} ariaLabel={`${type.name}, example ${ex + 1}, in four parts`} />
      <div className={s.commentary}>
        <p>{type.description}</p>
        <p>
          <strong>Listen for:</strong> {type.listenFor}
        </p>
      </div>
    </div>
  );
}
