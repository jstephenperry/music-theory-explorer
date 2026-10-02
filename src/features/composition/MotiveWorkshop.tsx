import { useMemo, useState } from 'react';
import { Piano } from '../../components/Piano';
import { ScoreView } from '../../components/ScoreView';
import { Button, Callout, PlayButton, Segmented, Slider } from '../../components/ui';
import { audio } from '../../audio/engine';
import { usePersistentState } from '../../hooks/usePersistentState';
import { DEV_OPS, develop, type DevOp, type Motive } from '../../theory/composition/motive';
import { MOTIVE_PRESETS } from './motivePresets';
import { keyName, makeKey } from '../../theory/keys';
import { midi } from '../../theory/notes';
import { scoreFromVoices, notateVoice } from '../../theory/score';
import { SEGMENT_COLORS, motiveNotes, segmentsToScore, spellInKey } from '../../theory/composition/scoreUtils';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

const DURATIONS: Array<{ value: number; label: string }> = [
  { value: 0.25, label: '♬ 16th' },
  { value: 0.5, label: '♪ 8th' },
  { value: 0.75, label: '♪. dotted 8th' },
  { value: 1, label: '♩ quarter' },
  { value: 1.5, label: '♩. dotted quarter' },
  { value: 2, label: '𝅗𝅥 half' },
];

const COMMON_TIME: [number, number] = [4, 4];
const MAX_STEPS = 10;
const MAX_NOTES = 12;

interface CustomNote {
  midi: number | null;
  dur: number;
}

export function MotiveWorkshop({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [presetId, setPresetId] = usePersistentState<string>('motive.preset', 'bach');
  const [chain, setChain] = usePersistentState<DevOp[]>('motive.chain', MOTIVE_PRESETS[0].recipe);
  const [custom, setCustom] = usePersistentState<CustomNote[]>('motive.custom', [
    { midi: 67, dur: 0.5 },
    { midi: 72, dur: 0.5 },
    { midi: 71, dur: 0.25 },
    { midi: 69, dur: 0.25 },
    { midi: 67, dur: 1 },
  ]);
  const [entryDur, setEntryDur] = useState(0.5);
  const [bpm, setBpm] = useState(84);

  const preset = MOTIVE_PRESETS.find((p) => p.id === presetId);
  const key = preset?.key ?? makeKey('C');
  const time = preset?.time ?? COMMON_TIME;
  const motive: Motive = useMemo(
    () => preset?.motive ?? custom.map((c) => ({ pitch: c.midi === null ? null : spellInKey(c.midi, key), dur: c.dur })),
    [preset, custom, key],
  );

  const steps = useMemo(() => (motive.length ? develop(motive, chain, key) : []), [motive, chain, key]);
  const { score, brackets, colors } = useMemo(
    () =>
      segmentsToScore(
        steps.map((st, i) => ({ label: `${i + 1}. ${DEV_OPS.find((o) => o.id === st.op)!.short}`, notes: motiveNotes(st.motive), color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
        key,
        time,
      ),
    [steps, key, time],
  );
  const sourceScore = useMemo(() => scoreFromVoices(key, time, [{ clef: score.staves[0]?.clef ?? 'treble', voices: [notateVoice(motiveNotes(motive), { time })] }]), [motive, key, time, score]);

  const choosePreset = (id: string) => {
    player.stop();
    setPresetId(id);
    const p = MOTIVE_PRESETS.find((x) => x.id === id);
    if (p) setChain(p.recipe);
    else setChain(['original', 'seq-up', 'invert', 'head', 'head']);
  };
  const addStep = (op: DevOp) => setChain((c) => (c.length >= MAX_STEPS ? c : [...c, op]));
  const removeStep = (i: number) => setChain((c) => c.filter((_, j) => j !== i));

  const addNote = (m: number | null) => {
    if (m !== null) audio.playNote(m, 0.5);
    setCustom((c) => (c.length >= MAX_NOTES ? c : [...c, { midi: m, dur: entryDur }]));
  };

  return (
    <div className="stack">
      <div className={s.row}>
        <Segmented<string>
          ariaLabel="Motive"
          value={presetId}
          onChange={choosePreset}
          options={[...MOTIVE_PRESETS.map((p) => ({ value: p.id, label: p.name })), { value: 'custom', label: 'Your own' }]}
        />
        <span className={s.hint}>{preset ? `${preset.source}, in ${keyName(key)}` : 'Write a motive of up to 12 notes in C major.'}</span>
      </div>

      {!preset && (
        <div className={s.entry}>
          <div className={s.row}>
            <Segmented<number> ariaLabel="Note value" size="sm" value={entryDur} onChange={setEntryDur} options={DURATIONS.map((d) => ({ value: d.value, label: d.label }))} />
            <Button size="sm" onClick={() => addNote(null)}>
              Rest
            </Button>
            <Button size="sm" icon="undo" onClick={() => setCustom((c) => c.slice(0, -1))} disabled={custom.length === 0}>
              Undo
            </Button>
            <Button size="sm" icon="trash" variant="ghost" onClick={() => setCustom([])} disabled={custom.length === 0}>
              Clear
            </Button>
          </div>
          <Piano from={55} to={84} onKeyClick={addNote} labels="c" ariaLabel="Click keys to add notes to your motive" />
          <ScoreView score={sourceScore} ariaLabel="Your motive" showTime={false} finalBarline={false} />
        </div>
      )}

      <div className={s.chainBox}>
        <div className={s.chainHead}>
          <span className={s.label}>Development</span>
          <span className={s.hint}>Each step transforms the one before it. Add up to {MAX_STEPS}.</span>
        </div>
        <ol className={s.chain}>
          {chain.map((op, i) => {
            const def = DEV_OPS.find((o) => o.id === op)!;
            return (
              <li key={i} className={s.chainStep}>
                <span className={s.chainSwatch} style={{ background: `var(--hl-${SEGMENT_COLORS[i % SEGMENT_COLORS.length]})` }} aria-hidden="true" />
                <span>
                  {i + 1}. {def.name}
                </span>
                <button className={s.chainRemove} onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}, ${def.name}`}>
                  ×
                </button>
              </li>
            );
          })}
        </ol>
        <div className={s.opGrid} role="group" aria-label="Add a development step">
          {DEV_OPS.map((o) => (
            <button key={o.id} className={s.opButton} onClick={() => addStep(o.id)} disabled={chain.length >= MAX_STEPS} title={o.description}>
              + {o.name}
            </button>
          ))}
        </div>
      </div>

      {motive.length === 0 ? (
        <Callout title="No motive yet">Click keys on the piano to write a motive.</Callout>
      ) : (
        <>
          <div className={s.row}>
            <PlayButton playing={player.tag === 'workshop'} onPlay={() => player.play(score, { bpm, tag: 'workshop' })} onStop={player.stop} label="Play development" />
            <Slider label="Tempo" min={50} max={160} value={bpm} onChange={setBpm} format={(v) => `♩ = ${v}`} />
          </div>
          <ScoreView score={score} colors={colors} brackets={brackets} active={player.tag === 'workshop' ? player.active : undefined} ariaLabel="The developed motive" />
          <ol className={s.stepNotes}>
            {steps.map((st, i) => {
              const def = DEV_OPS.find((o) => o.id === st.op)!;
              return (
                <li key={i}>
                  <span className={s.chainSwatch} style={{ background: `var(--hl-${SEGMENT_COLORS[i % SEGMENT_COLORS.length]})` }} aria-hidden="true" />
                  <strong>{def.name}.</strong> {def.description}
                  {st.motive.some((x) => x.pitch && (midi(x.pitch) < 36 || midi(x.pitch) > 96)) && ' (This segment runs off the keyboard; try a step in the other direction.)'}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
