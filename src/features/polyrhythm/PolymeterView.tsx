/**
 * Polymeter: layers share one pulse but repeat over different cycle lengths, drifting out of
 * phase and realigning after the least common multiple of their lengths.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Panel, PlayButton, Select, Slider, Toggle } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import type { SeqEvent } from '../../audio/sequencer';
import { usePersistentState } from '../../hooks/usePersistentState';
import type { SoundId } from '../meter/patterns';
import { outputLatency, useRaf } from '../meter/useRaf';
import { MeterRings, type RingsHandle } from './PolyClock';
import { LcmGrid, type GridHandle } from './LcmGrid';
import type { GridRow } from './layers';
import { DEFAULT_LAYER_SOUNDS, LAYER_COLORS, LAYER_NAMES, percFor, soundOptions } from './layers';
import { phaseDrift, polymeter, POLYMETER_PRESETS } from './rhythm';
import s from './Polyrhythm.module.css';

interface EvData {
  layer: number;
  pulse: number;
}

export function PolymeterView() {
  const [lengths, setLengths] = useState<number[]>([3, 4]);
  const [sounds, setSounds] = usePersistentState<SoundId[]>('polymeter:sounds', DEFAULT_LAYER_SOUNDS);
  const [muted, setMuted] = useState([false, false, false]);
  const [bpm, setBpm] = usePersistentState('polymeter:bpm', 160);
  const [ticks, setTicks] = useState(true);
  const info = useMemo(() => polymeter(lengths), [lengths]);
  const key = lengths.join(',');
  const drift = lengths.length >= 2 ? phaseDrift(lengths[0], lengths[1]) : [];

  const player = usePlayer();
  const alloc = useRef<{ key: string; events: SeqEvent[] } | null>(null);
  const latency = useRef(0);
  const rings = useRef<RingsHandle>(null);
  const grid = useRef<GridHandle>(null);
  const posEls = useRef<Array<HTMLSpanElement | null>>([]);

  const apply = (events: SeqEvent[]) => {
    for (const ev of events) {
      const d = ev.data as EvData;
      if (d.layer < 0) ev.perc = ticks ? { pitch: 2600, gain: 0.07, decay: 0.02 } : undefined;
      else {
        const start = d.pulse % lengths[d.layer] === 0;
        ev.perc = !muted[d.layer] ? percFor(sounds[d.layer] ?? 'block', start ? 1.1 : 0.32) : undefined;
      }
    }
  };

  const start = () => {
    const events: SeqEvent[] = [];
    for (let p = 0; p < info.period; p++) {
      events.push({ time: p, duration: 1, data: { layer: -1, pulse: p } satisfies EvData });
      lengths.forEach((_, layer) => events.push({ time: p, duration: 1, data: { layer, pulse: p } satisfies EvData }));
    }
    apply(events);
    alloc.current = { key, events };
    latency.current = outputLatency();
    player.play(events, { bpm, loop: true, length: info.period });
  };

  useEffect(() => {
    const a = alloc.current;
    if (!player.playing || !a) return;
    if (a.key !== key) start();
    else apply(a.events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, muted, sounds, ticks]);

  const playerSetBpm = player.setBpm;
  useEffect(() => {
    playerSetBpm(bpm);
  }, [bpm, playerSetBpm]);

  useEffect(() => {
    if (!player.playing) {
      rings.current?.reset();
      grid.current?.update(null);
      posEls.current.forEach((el) => el && (el.textContent = '·'));
    }
  }, [player.playing]);

  useRaf(player.playing, () => {
    const raw = player.position() - (latency.current * bpm) / 60;
    const pos = ((raw % info.period) + info.period) % info.period;
    rings.current?.update(pos);
    grid.current?.update(pos);
    const p = Math.floor(pos);
    lengths.forEach((l, i) => {
      const el = posEls.current[i];
      if (el) el.textContent = `${(p % l) + 1} / ${l}`;
    });
  });

  const rows: GridRow[] = lengths.map((l, i) => ({
    label: String(l),
    colorVar: LAYER_COLORS[i],
    cells: info.accents[i].map((a) => (a ? 2 : 1)),
    cycle: l,
  }));
  const setLen = (i: number, v: number) => setLengths(lengths.map((x, k) => (k === i ? Math.max(2, Math.min(12, v)) : x)));

  return (
    <div className={s.stack}>
      <Panel title="Polymeter" eyebrow="Same pulse, different cycle lengths" actions={<PlayButton playing={player.playing} onPlay={start} onStop={player.stop} />}>
        <div className={s.chips} role="group" aria-label="Polymeter presets">
          {POLYMETER_PRESETS.map((p) => {
            const active = p.counts.join(',') === key;
            return (
              <button key={p.id} type="button" className={`${s.chip} ${active ? s.chipActive : ''}`} onClick={() => setLengths(p.counts)} aria-pressed={active} title={p.note}>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className={s.layers}>
          {lengths.map((l, i) => (
            <div key={i} className={s.layerRow}>
              <span className={s.swatch} style={{ background: `var(${LAYER_COLORS[i]})` }} aria-hidden="true" />
              <span className={s.layerName}>Layer {LAYER_NAMES[i]}</span>
              <div className={s.stepper} role="group" aria-label={`Layer ${LAYER_NAMES[i]} cycle length`}>
                <Button size="sm" icon="minus" aria-label="Shorter cycle" onClick={() => setLen(i, l - 1)} disabled={l <= 2} />
                <span className={s.countValue} style={{ color: `var(${LAYER_COLORS[i]})` }}>
                  {l}
                </span>
                <Button size="sm" icon="plus" aria-label="Longer cycle" onClick={() => setLen(i, l + 1)} disabled={l >= 12} />
              </div>
              <Select
                ariaLabel={`Sound for layer ${LAYER_NAMES[i]}`}
                value={sounds[i] ?? 'block'}
                onChange={(v) => {
                  const next = [...sounds];
                  next[i] = v as SoundId;
                  setSounds(next);
                }}
                options={soundOptions()}
              />
              <button type="button" className={`${s.ms} ${muted[i] ? s.msOn : ''}`} aria-pressed={muted[i]} onClick={() => setMuted((m) => m.map((x, k) => (k === i ? !x : x)))}>
                Mute
              </button>
              <span className={s.livePos} aria-hidden="true">
                <span
                  ref={(el) => {
                    posEls.current[i] = el;
                  }}
                >
                  ·
                </span>
              </span>
              {i === 2 && <Button size="sm" variant="ghost" icon="x" aria-label="Remove layer C" onClick={() => setLengths(lengths.slice(0, 2))} />}
            </div>
          ))}
          {lengths.length < 3 && (
            <Button size="sm" icon="plus" onClick={() => setLengths([...lengths, 5])}>
              Add a third layer
            </Button>
          )}
        </div>
        <div className={s.controlsRow}>
          <Slider label="Pulse tempo (pulses per minute)" min={60} max={320} value={bpm} onChange={setBpm} width={200} />
          <Toggle label="Tick every pulse" checked={ticks} onChange={setTicks} />
        </div>
      </Panel>

      <div className={s.twoCol}>
        <Panel title="Cycles" eyebrow="Each ring is one layer’s bar">
          <MeterRings lengths={lengths} handle={rings} label={`Concentric rings with ${lengths.join(', ')} pulses; each hand completes its ring at its own rate`} />
          <p className={s.caption}>All hands point up together only every {info.period} pulses.</p>
        </Panel>
        <Panel title="Phase drift" eyebrow={`Realign after ${info.period} pulses`}>
          <LcmGrid rows={rows} size={info.period} together={[0]} handle={grid} label={`${info.period} pulses with each layer’s cycle starts marked`} />
          <div className={s.facts}>
            {lengths.map((l, i) => (
              <div key={i}>
                <span className={s.factLabel} style={{ color: `var(${LAYER_COLORS[i]})` }}>
                  Layer {LAYER_NAMES[i]}
                </span>
                <span className={s.factValue}>{info.cycles[i]} cycles</span>
                <span className={s.factHint}>of {l} pulses</span>
              </div>
            ))}
          </div>
          {drift.length > 1 && (
            <div className={s.driftRow}>
              <span className={s.factLabel}>Where B is when A restarts</span>
              <div className={s.driftCells}>
                {drift.map((d, k) => (
                  <span key={k} className={`${s.driftCell} ${d === 0 ? s.driftAligned : ''}`} title={`Start of A’s cycle ${k + 1}: B is on pulse ${d + 1} of ${lengths[1]}`}>
                    {d + 1}
                  </span>
                ))}
                <span className={`${s.driftCell} ${s.driftAligned}`}>1</span>
              </div>
              <span className={s.factHint}>
                Each new cycle of A begins {(lengths[0] % lengths[1]) || lengths[1]} pulse{(lengths[0] % lengths[1]) === 1 ? '' : 's'} later in B’s cycle, until both start together again.
              </span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
