/**
 * Editable step sequencer with a library of world rhythm patterns.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Panel, PlayButton, Select, Slider, Tag } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { allocateSteps, applySteps } from './metronome';
import { PATTERNS, SOUNDS, beatGroups, interOnsetIntervals, type PatternVoice, type RhythmPattern, type SoundId } from './patterns';
import { outputLatency, useRaf } from './useRaf';
import s from './MeterPage.module.css';

interface Working {
  id: string;
  steps: number;
  stepsPerBeat: number;
  groups: number[];
  voices: PatternVoice[];
}

const fromPattern = (p: RhythmPattern): Working => ({
  id: p.id,
  steps: p.steps,
  stepsPerBeat: p.stepsPerBeat,
  groups: [...p.groups],
  voices: p.voices.map((v) => ({ ...v, cells: [...v.cells] })),
});

export function StepSequencer() {
  const [w, setW] = useState<Working>(() => fromPattern(PATTERNS[0]));
  const pattern = PATTERNS.find((p) => p.id === w.id);
  const [bpm, setBpm] = useState(PATTERNS[0].bpm);
  const [muted, setMuted] = useState<boolean[]>([false, false, false]);
  const player = usePlayer();
  const alloc = useRef<{ key: string; events: ReturnType<typeof allocateSteps>['events'] } | null>(null);
  const cellEls = useRef<Array<HTMLDivElement | null>>([]);
  const litStep = useRef(-1);
  const latency = useRef(0);
  const structureKey = `${w.steps}/${w.stepsPerBeat}/${w.voices.length}`;

  const start = () => {
    const a = allocateSteps(w.steps, w.stepsPerBeat, w.voices.length);
    applySteps(a.events, w.voices, muted);
    alloc.current = { key: structureKey, events: a.events };
    latency.current = outputLatency();
    player.play(a.events, { bpm, loop: true, length: a.length });
  };

  useEffect(() => {
    const a = alloc.current;
    if (!player.playing || !a) return;
    if (a.key !== structureKey) start();
    else applySteps(a.events, w.voices, muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, muted]);

  const playerSetBpm = player.setBpm;
  useEffect(() => {
    playerSetBpm(bpm);
  }, [bpm, playerSetBpm]);

  const light = (step: number) => {
    if (step === litStep.current) return;
    cellEls.current[litStep.current]?.classList.remove(s.stepColNow);
    cellEls.current[step]?.classList.add(s.stepColNow);
    litStep.current = step;
  };

  useEffect(() => {
    if (!player.playing) light(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playing]);

  useRaf(player.playing, () => {
    const len = w.steps / w.stepsPerBeat;
    const raw = player.position() - (latency.current * bpm) / 60;
    const pos = ((raw % len) + len) % len;
    light(Math.floor(pos * w.stepsPerBeat));
  });

  const choose = (id: string) => {
    const p = PATTERNS.find((x) => x.id === id);
    if (!p) return;
    setW(fromPattern(p));
    setBpm(p.bpm);
    setMuted([false, false, false]);
  };

  const toggleCell = (vi: number, step: number) => {
    const turningOn = !w.voices[vi].cells[step];
    if (turningOn && !player.playing) {
      const snd = SOUNDS[w.voices[vi].sound];
      audio.percussion(undefined, snd.pitch, snd.gain, snd.decay);
    }
    setW((prev) => ({ ...prev, voices: prev.voices.map((v, k) => (k === vi ? { ...v, cells: v.cells.map((c, j) => (j === step ? !c : c)) } : v)) }));
  };

  const setSteps = (n: number) => {
    const steps = Math.max(4, Math.min(32, n));
    setW((prev) => ({
      ...prev,
      steps,
      groups: steps === prev.steps ? prev.groups : beatGroups(steps, prev.stepsPerBeat),
      voices: prev.voices.map((v) => ({ ...v, cells: Array.from({ length: steps }, (_, i) => v.cells[i] ?? false) })),
    }));
  };

  const rotate = (dir: number) => {
    setW((prev) => ({
      ...prev,
      voices: prev.voices.map((v) => ({ ...v, cells: v.cells.map((_, i) => v.cells[(i - dir + prev.steps) % prev.steps]) })),
    }));
  };

  const clear = () => setW((prev) => ({ ...prev, voices: prev.voices.map((v) => ({ ...v, cells: v.cells.map(() => false) })) }));

  const groupStartSet = useMemo(() => {
    const set = new Set<number>();
    let acc = 0;
    for (const g of w.groups) {
      set.add(acc);
      acc += g;
    }
    return set;
  }, [w.groups]);

  const ioi = interOnsetIntervals(w.voices[0].cells);
  const edited = pattern ? JSON.stringify(fromPattern(pattern)) !== JSON.stringify(w) : false;

  return (
    <Panel
      title="Rhythm library"
      eyebrow="Step sequencer"
      actions={<PlayButton playing={player.playing} onPlay={start} onStop={player.stop} label="Play loop" />}
    >
      <div className={s.patternPicker} role="radiogroup" aria-label="Rhythm pattern">
        {PATTERNS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === w.id} className={`${s.chip} ${p.id === w.id ? s.chipActive : ''}`} onClick={() => choose(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      {pattern && (
        <div className={s.patternInfo}>
          <div className="row">
            <Tag tone="brass">{pattern.timeSig}</Tag>
            <Tag>{pattern.origin}</Tag>
            {ioi.length > 0 && (
              <Tag tone="royal" title="Durations between onsets of the top voice, in steps">
                {ioi.join(' + ')}
              </Tag>
            )}
            {edited && <Tag tone="accent">edited</Tag>}
          </div>
          <p className={s.patternBlurb}>{pattern.blurb}</p>
        </div>
      )}

      <div className={s.seqWrap}>
        <div className={s.seq} style={{ ['--steps' as string]: w.steps }}>
          {w.voices.map((v, vi) => (
            <div key={vi} className={s.seqRow}>
              <div className={s.seqVoice}>
                <button
                  type="button"
                  className={`${s.muteBtn} ${muted[vi] ? s.muteOn : ''}`}
                  onClick={() => setMuted((m) => m.map((x, k) => (k === vi ? !x : x)))}
                  aria-pressed={muted[vi]}
                  aria-label={`${muted[vi] ? 'Unmute' : 'Mute'} ${v.name}`}
                  title={muted[vi] ? 'Unmute' : 'Mute'}
                >
                  M
                </button>
                <Select
                  ariaLabel={`Sound for ${v.name}`}
                  value={v.sound}
                  onChange={(snd) => setW((prev) => ({ ...prev, voices: prev.voices.map((x, k) => (k === vi ? { ...x, sound: snd as SoundId } : x)) }))}
                  options={Object.values(SOUNDS).map((x) => ({ value: x.id, label: x.name }))}
                />
              </div>
              <div className={s.seqCells}>
                {v.cells.map((on, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${s.cell} ${on ? s[`cellOn${vi}`] : ''} ${groupStartSet.has(i) ? s.cellBeat : ''}`}
                    onClick={() => toggleCell(vi, i)}
                    aria-pressed={on}
                    aria-label={`${v.name}, step ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className={s.seqRow}>
            <div className={s.seqVoice} />
            <div className={s.seqCells}>
              {Array.from({ length: w.steps }, (_, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    cellEls.current[i] = el;
                  }}
                  className={`${s.stepNum} ${groupStartSet.has(i) ? s.stepNumBeat : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={s.seqControls}>
        <Slider label="Tempo (quarter notes per minute)" min={40} max={220} value={bpm} onChange={setBpm} width={180} />
        <div className={s.stepper} role="group" aria-label="Number of steps">
          <span className={s.stepperLabel}>Steps</span>
          <Button size="sm" icon="minus" aria-label="Fewer steps" onClick={() => setSteps(w.steps - 1)} disabled={w.steps <= 4} />
          <span className={s.stepperValue}>{w.steps}</span>
          <Button size="sm" icon="plus" aria-label="More steps" onClick={() => setSteps(w.steps + 1)} disabled={w.steps >= 32} />
        </div>
        <div className="row">
          <Button size="sm" icon="chevron-left" onClick={() => rotate(-1)}>
            Rotate
          </Button>
          <Button size="sm" iconRight="chevron-right" onClick={() => rotate(1)}>
            Rotate
          </Button>
          <Button size="sm" icon="trash" onClick={clear}>
            Clear
          </Button>
          {pattern && edited && (
            <Button size="sm" icon="undo" onClick={() => choose(pattern.id)}>
              Restore
            </Button>
          )}
        </div>
      </div>
      <p className="faint" style={{ fontSize: '0.85rem', margin: '0.6rem 0 0' }}>
        Tip: rotate son clave 3-2 by eight steps and it becomes 2-3. Shaded cells mark the start of each beat.
      </p>
    </Panel>
  );
}
