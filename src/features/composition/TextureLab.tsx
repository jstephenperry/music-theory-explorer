import { useMemo, useState } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton, Segmented, Slider } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { TEXTURES, TEXTURE_PROGRESSIONS, TEXTURE_TONICS, buildTexture, type TextureId } from './textures';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';
import { flat } from '../../lib/format';


/** One progression, many textures: the same chords written out as chorale, Alberti bass, waltz ... */
export function TextureLab({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [texture, setTexture] = usePersistentState<TextureId>('texture.texture', 'alberti');
  const [progId, setProgId] = usePersistentState<string>('texture.progression', 'circle');
  const [tonic, setTonic] = usePersistentState<string>('texture.tonic', 'C');
  const [bpm, setBpm] = useState(84);
  const def = TEXTURES.find((t) => t.id === texture) ?? TEXTURES[0];
  const prog = TEXTURE_PROGRESSIONS.find((p) => p.id === progId) ?? TEXTURE_PROGRESSIONS[0];
  const { score, melodyIds } = useMemo(() => buildTexture(def.id, prog.chords, tonic), [def, prog, tonic]);
  const colors = useMemo(() => Object.fromEntries(melodyIds.map((id) => [id, def.id === 'prelude' || def.id === 'chorale' ? undefined : 'root'])), [melodyIds, def]);
  const stopThen =
    <T,>(f: (v: T) => void) =>
    (v: T) => {
      player.stop();
      f(v);
    };

  return (
    <div className="stack">
      <div className={s.controls}>
        <div className={s.control}>
          <span className={s.label}>Progression (one chord per bar)</span>
          <Segmented<string> ariaLabel="Progression" size="sm" value={prog.id} onChange={stopThen(setProgId)} options={TEXTURE_PROGRESSIONS.map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <div className={s.control}>
          <span className={s.label}>Key (major)</span>
          <Segmented<string> ariaLabel="Key" size="sm" value={tonic} onChange={stopThen(setTonic)} options={TEXTURE_TONICS.map((t) => ({ value: t, label: flat(t) }))} />
        </div>
      </div>
      <div className={s.control}>
        <span className={s.label}>Texture</span>
        <Segmented<TextureId> ariaLabel="Texture" value={def.id} onChange={stopThen(setTexture)} options={TEXTURES.map((t) => ({ value: t.id, label: t.short, title: t.name }))} />
      </div>
      <div className={s.cadenceHead}>
        <h3 className={s.cadenceName}>{def.name}</h3>
        <div className={s.row}>
          <PlayButton playing={player.tag === 'texture'} onPlay={() => player.play(score, { bpm, tag: 'texture' })} onStop={player.stop} label="Play" />
          <Slider
            label="Tempo"
            min={50}
            max={140}
            value={bpm}
            onChange={(v) => {
              setBpm(v);
              if (player.tag === 'texture') player.setBpm(v);
            }}
            format={(v) => `♩ = ${v}`}
          />
        </div>
      </div>
      <ScoreView score={score} colors={colors} barsPerLine={4} active={player.tag === 'texture' ? player.active : undefined} ariaLabel={`${prog.name} in ${flat(tonic)} major, written as ${def.name.toLowerCase()}`} />
      <div className={s.commentary}>
        <p>{def.description}</p>
        <p>
          <strong>Where to hear it:</strong> {def.examples}
        </p>
      </div>
    </div>
  );
}
