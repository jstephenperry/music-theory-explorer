import { useMemo, useState } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton, Segmented, Slider } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { BASS_CHOICES, MELODY_TECHNIQUES, MODE_CHOICES, THEME_CHOICE, buildVariation, type BassChoice, type MelodyTechnique, type ModeChoice, type VariationChoice } from './variations';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

/** Vary the K. 265 theme one dimension at a time and hear what stays and what changes. */
export function VariationWorkshop({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [stored, setChoice] = usePersistentState<VariationChoice>('variations.choice', { ...THEME_CHOICE, melody: 'neighbor' });
  const choice = useMemo(() => ({ ...THEME_CHOICE, ...stored }), [stored]);
  const [showTheme, setShowTheme] = useState(true);
  const [bpm, setBpm] = useState(84);
  const built = useMemo(() => buildVariation(choice), [choice]);
  const theme = useMemo(() => buildVariation(THEME_CHOICE), []);
  const colors = useMemo(() => (showTheme ? Object.fromEntries(built.themeIds.map((id) => [id, 'root'])) : {}), [built, showTheme]);
  const set = <K extends keyof VariationChoice>(k: K, v: VariationChoice[K]) => {
    player.stop();
    setChoice({ ...choice, [k]: v });
  };
  const technique = MELODY_TECHNIQUES.find((m) => m.id === choice.melody)!;
  const mode = MODE_CHOICES.find((m) => m.id === choice.mode)!;

  return (
    <div className="stack">
      <div className={s.controls}>
        <div className={s.control}>
          <span className={s.label}>Melody</span>
          <Segmented<MelodyTechnique> ariaLabel="Melody technique" size="sm" value={choice.melody} onChange={(v) => set('melody', v)} options={MELODY_TECHNIQUES.map((m) => ({ value: m.id, label: m.name }))} />
          <span className={s.hint}>{technique.description}</span>
        </div>
        <div className={s.control}>
          <span className={s.label}>Mode</span>
          <Segmented<ModeChoice> ariaLabel="Mode" size="sm" value={choice.mode} onChange={(v) => set('mode', v)} options={MODE_CHOICES.map((m) => ({ value: m.id, label: m.name }))} />
          <span className={s.hint}>{mode.description}</span>
          <span className={s.label}>Accompaniment</span>
          <Segmented<BassChoice> ariaLabel="Accompaniment" size="sm" value={choice.bass} onChange={(v) => set('bass', v)} options={BASS_CHOICES.map((b) => ({ value: b.id, label: b.name }))} />
        </div>
      </div>

      <div className={s.row}>
        <PlayButton playing={player.tag === 'variation'} onPlay={() => player.play(built.score, { bpm, tag: 'variation' })} onStop={player.stop} label="Play the variation" />
        <PlayButton playing={player.tag === 'variation-theme'} onPlay={() => player.play(theme.score, { bpm, tag: 'variation-theme' })} onStop={player.stop} label="Play the theme" variant="secondary" />
        <Slider
          label="Tempo"
          min={40}
          max={140}
          value={bpm}
          onChange={(v) => {
            setBpm(v);
            if (player.tag?.startsWith('variation')) player.setBpm(v);
          }}
          format={(v) => `♩ = ${v}`}
        />
        <label className={s.check}>
          <input type="checkbox" checked={showTheme} onChange={(e) => setShowTheme(e.target.checked)} /> Mark the theme’s notes
        </label>
      </div>
      <ScoreView score={built.score} colors={colors} barsPerLine={4} active={player.tag === 'variation' ? player.active : undefined} ariaLabel="Your variation on the theme" />
      <p className={s.hint}>
        Generated from the theme in the manner of Mozart’s variations, not quoted from them. Notes marked in red are the theme’s own notes, sounding on their own beat.
      </p>
    </div>
  );
}
