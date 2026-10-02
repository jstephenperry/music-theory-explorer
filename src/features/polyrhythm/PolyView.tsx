/**
 * Polyrhythm explorer: two or three layers of evenly spaced onsets sharing one cycle.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Panel, PlayButton, Select, Slider, Tag, Toggle } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import type { SeqEvent } from '../../audio/sequencer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlState } from '../../hooks/useUrlState';
import { SOUNDS, type SoundId } from '../meter/patterns';
import { RhythmStaff, type RhythmStaffHandle } from '../meter/RhythmStaff';
import type { RMeasure, RNote, RPart } from '../meter/rhythmNotation';
import { isBeamable } from '../meter/rhythmNotation';
import { outputLatency, useRaf } from '../meter/useRaf';
import { indexAt } from '../meter/meter';
import { PolyClock, type ClockHandle } from './PolyClock';
import { LcmGrid, type GridHandle } from './LcmGrid';
import { layerRows } from './layers';
import { audibleLayers, DEFAULT_LAYER_SOUNDS, LAYER_COLORS, LAYER_NAMES, percFor, soundOptions } from './layers';
import { gcd, mnemonic, polyGrid, polyNotation, POLY_PRESETS, type PolyNotation } from './rhythm';
import s from './Polyrhythm.module.css';

function parseCounts(v: string): number[] {
  const xs = v.split(':').map(Number);
  return xs.length >= 2 && xs.length <= 3 && xs.every((x) => Number.isInteger(x) && x >= 1 && x <= 16) ? xs : [3, 2];
}

interface EvData {
  layer: number;
  k: number;
}

/** Notation parts for the first two layers (top = A, bottom = B). */
function notationParts(n: PolyNotation, a: number, b: number): RPart[] {
  const mk = (count: number, dur: RNote['dur'], dots: number, prefix: string): RNote[] => Array.from({ length: count }, (_, k) => ({ dur, dots, id: `${prefix}${k}` }));
  const topNotes = mk(a, n.top.dur, n.top.dots, 't');
  const top: RMeasure = { timeSig: n.timeSig, notes: topNotes };
  if (n.top.tuplet) {
    top.tuplets = [{ from: 0, count: a, ...n.top.tuplet }];
    if (isBeamable(n.top.dur) && a <= 8) top.beams = [topNotes.map((_, i) => i)];
  }
  const botNotes = mk(b, n.bottom.dur, 0, 'b');
  const bottom: RMeasure = { timeSig: n.timeSig, notes: botNotes };
  if (isBeamable(n.bottom.dur)) bottom.beams = Array.from({ length: Math.ceil(b / 2) }, (_, k) => [2 * k, 2 * k + 1].filter((i) => i < b));
  return [
    { label: String(a), colorVar: LAYER_COLORS[0], measures: [top] },
    { label: String(b), colorVar: LAYER_COLORS[1], measures: [bottom] },
  ];
}

export function PolyView() {
  const [rParam, setRParam] = useUrlState('r', '3:2');
  const counts = useMemo(() => parseCounts(rParam), [rParam]);
  const setCounts = (c: number[]) => setRParam(c.join(':'));
  const [sounds, setSounds] = usePersistentState<SoundId[]>('poly:sounds', DEFAULT_LAYER_SOUNDS);
  const [muted, setMuted] = useState([false, false, false]);
  const [solo, setSolo] = useState([false, false, false]);
  const [bpm, setBpm] = usePersistentState('poly:bpm', 72);
  const [pulse, setPulse] = useState(false);
  const n = counts.length;
  const grid = useMemo(() => polyGrid(counts), [counts]);
  const cycleBeats = counts[1];
  const cycleSec = (cycleBeats * 60) / bpm;
  const mn = mnemonic(counts);
  const notation = useMemo(() => polyNotation(counts[0], counts[1]), [counts]);
  const parts = useMemo(() => (notation ? notationParts(notation, counts[0], counts[1]) : null), [notation, counts]);

  // ---------- Playback ----------
  const player = usePlayer();
  const alloc = useRef<{ key: string; events: SeqEvent[] } | null>(null);
  const key = counts.join(':');

  const apply = (events: SeqEvent[]) => {
    const on = audibleLayers(muted, solo, n);
    for (const ev of events) {
      const d = ev.data as EvData;
      if (d.layer < 0) ev.perc = pulse ? { pitch: 3200, gain: 0.08, decay: 0.02 } : undefined;
      else ev.perc = on[d.layer] ? percFor(sounds[d.layer] ?? 'block', d.k === 0 ? 1.15 : 1) : undefined;
    }
  };

  const start = () => {
    const events: SeqEvent[] = [];
    counts.forEach((c, layer) => {
      for (let k = 0; k < c; k++) events.push({ time: (k * cycleBeats) / c, duration: cycleBeats / c, data: { layer, k } satisfies EvData });
    });
    for (let st = 0; st < grid.size; st++) events.push({ time: (st * cycleBeats) / grid.size, duration: cycleBeats / grid.size, data: { layer: -1, k: st } satisfies EvData });
    apply(events);
    alloc.current = { key, events };
    latency.current = outputLatency();
    player.play(events, { bpm, loop: true, length: cycleBeats });
  };

  useEffect(() => {
    const a = alloc.current;
    if (!player.playing || !a) return;
    if (a.key !== key) start();
    else apply(a.events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, muted, solo, sounds, pulse]);

  const playerSetBpm = player.setBpm;
  useEffect(() => {
    playerSetBpm(bpm);
  }, [bpm, playerSetBpm]);

  // ---------- Animation ----------
  const clock = useRef<ClockHandle>(null);
  const gridRef = useRef<GridHandle>(null);
  const staff = useRef<RhythmStaffHandle>(null);
  const sylEls = useRef<Array<HTMLSpanElement | null>>([]);
  const litSyl = useRef(-1);
  const latency = useRef(0);

  const lightSyl = (i: number) => {
    if (i === litSyl.current) return;
    sylEls.current[litSyl.current]?.classList.remove(s.sylNow);
    sylEls.current[i]?.classList.add(s.sylNow);
    litSyl.current = i;
  };

  useEffect(() => {
    if (!player.playing) {
      clock.current?.reset();
      gridRef.current?.update(null);
      staff.current?.highlight(null);
      lightSyl(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playing]);

  const compositeStarts = useMemo(() => [...grid.composite, grid.size], [grid]);

  useRaf(player.playing, () => {
    const raw = player.position() - (latency.current * bpm) / 60;
    const pos = ((raw % cycleBeats) + cycleBeats) % cycleBeats;
    const frac = pos / cycleBeats;
    const lit = counts.map((c) => Math.floor(frac * c + 1e-9) % c);
    const flashes = counts.map((c, i) => Math.max(0, 1 - ((frac - lit[i] / c) * cycleSec) / 0.22));
    clock.current?.update(frac, lit, flashes);
    const step = frac * grid.size;
    gridRef.current?.update(step);
    staff.current?.highlight([`t${lit[0]}`, `b${lit[1]}`]);
    lightSyl(indexAt(compositeStarts, step));
  });

  const setCount = (i: number, v: number) => setCounts(counts.map((c, k) => (k === i ? Math.max(1, Math.min(16, v)) : c)));
  const ioiUnit = grid.size;

  return (
    <div className={s.stack}>
      <Panel title="Layers" eyebrow="Choose a ratio" actions={<PlayButton playing={player.playing} onPlay={start} onStop={player.stop} />}>
        <div className={s.chips} role="group" aria-label="Polyrhythm presets">
          {POLY_PRESETS.map((p) => {
            const active = p.counts.join(':') === key;
            return (
              <button key={p.id} type="button" className={`${s.chip} ${active ? s.chipActive : ''}`} onClick={() => setCounts(p.counts)} aria-pressed={active} title={p.note}>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className={s.layers}>
          {counts.map((c, i) => (
            <div key={i} className={s.layerRow}>
              <span className={s.swatch} style={{ background: `var(${LAYER_COLORS[i]})` }} aria-hidden="true" />
              <span className={s.layerName}>Layer {LAYER_NAMES[i]}</span>
              <div className={s.stepper} role="group" aria-label={`Layer ${LAYER_NAMES[i]} count`}>
                <Button size="sm" icon="minus" aria-label="Fewer onsets" onClick={() => setCount(i, c - 1)} disabled={c <= 1} />
                <span className={s.countValue} style={{ color: `var(${LAYER_COLORS[i]})` }}>
                  {c}
                </span>
                <Button size="sm" icon="plus" aria-label="More onsets" onClick={() => setCount(i, c + 1)} disabled={c >= 16} />
              </div>
              <Select
                ariaLabel={`Sound for layer ${LAYER_NAMES[i]}`}
                value={sounds[i] ?? 'block'}
                onChange={(v) => {
                  const next = [...sounds];
                  next[i] = v as SoundId;
                  setSounds(next);
                  const snd = SOUNDS[v as SoundId];
                  if (!player.playing) audio.percussion(undefined, snd.pitch, snd.gain, snd.decay);
                }}
                options={soundOptions()}
              />
              <div className={s.msGroup}>
                <button type="button" className={`${s.ms} ${muted[i] ? s.msOn : ''}`} aria-pressed={muted[i]} onClick={() => setMuted((m) => m.map((x, k) => (k === i ? !x : x)))}>
                  Mute
                </button>
                <button type="button" className={`${s.ms} ${solo[i] ? s.soloOn : ''}`} aria-pressed={solo[i]} onClick={() => setSolo((m) => m.map((x, k) => (k === i ? !x : x)))}>
                  Solo
                </button>
              </div>
              {i === 2 && (
                <Button size="sm" variant="ghost" icon="x" aria-label="Remove layer C" onClick={() => setCounts(counts.slice(0, 2))} />
              )}
            </div>
          ))}
          {n < 3 && (
            <Button size="sm" icon="plus" onClick={() => setCounts([...counts, 4])}>
              Add a third layer
            </Button>
          )}
        </div>
        <div className={s.controlsRow}>
          <Slider label={`Tempo (layer B beats per minute)`} min={30} max={200} value={bpm} onChange={setBpm} width={200} />
          <Toggle label={`Tick the ${grid.size}-step grid`} checked={pulse} onChange={setPulse} />
          <span className={s.cycleInfo}>Cycle: {cycleSec.toFixed(2)} s</span>
        </div>
      </Panel>

      <div className={s.twoCol}>
        <Panel title="Clock" eyebrow="One cycle around the circle">
          <PolyClock counts={counts} gridSize={grid.size} handle={clock} label={`Circle with ${counts.map((c) => `a ${c}-sided figure`).join(' and ')}; a hand sweeps once per cycle`} />
          <p className={s.caption}>
            Each polygon marks one layer’s onsets. They meet only at the top{grid.together.length > 1 ? ` and at ${grid.together.length - 1} other point${grid.together.length > 2 ? 's' : ''}` : ''}
            {grid.together.length > 1 ? ', because the counts share a factor' : ''}.
          </p>
        </Panel>
        <Panel title="Grid" eyebrow={`Least common multiple: ${grid.size} steps`}>
          <LcmGrid
            rows={layerRows(grid.rows, counts.map(String))}
            size={grid.size}
            together={grid.together}
            composite={grid.composite}
            handle={gridRef}
            label={`Grid of ${grid.size} steps showing where each layer sounds, and the composite rhythm`}
          />
          <div className={s.facts}>
            <div>
              <span className={s.factLabel}>Composite rhythm</span>
              <span className={s.factValue}>{grid.compositeIOI.join(' + ')}</span>
              <span className={s.factHint}>
                {grid.composite.length} onsets; durations in grid steps of 1/{ioiUnit} cycle
              </span>
            </div>
            <div>
              <span className={s.factLabel}>Every layer together</span>
              <span className={s.factValue}>{grid.together.length}×</span>
              <span className={s.factHint}>per cycle{n === 2 && gcd(counts[0], counts[1]) > 1 ? ` (gcd ${gcd(counts[0], counts[1])})` : ''}</span>
            </div>
          </div>
          {mn && (
            <div className={s.mnemonic}>
              <Tag tone="brass">Say it</Tag>
              <span className={s.mnemonicWords}>
                {mn.syllables.map((syl, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      sylEls.current[i] = el;
                    }}
                    className={s.syl}
                    style={{ color: grid.compositeLayers[i].length > 1 ? 'var(--ink)' : `var(${LAYER_COLORS[grid.compositeLayers[i][0]]})` }}
                  >
                    {syl}
                  </span>
                ))}
              </span>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Notation" eyebrow={n === 3 ? 'Layers A and B' : `${counts[0]} against ${counts[1]}`}>
        {parts ? (
          <RhythmStaff parts={parts} handle={staff} highlightVar="--brass-bright" ariaLabel={`${counts[0]} against ${counts[1]} notated on two percussion lines`} singleLine />
        ) : (
          <p className={s.caption}>This ratio is too dense to notate in a single bar; the grid and clock show it exactly.</p>
        )}
        {notation && (
          <p className={s.caption}>
            {notation.top.tuplet
              ? `${counts[0]} evenly spaced notes in the time of ${notation.top.tuplet.notesOccupied} written as a ${notation.top.tuplet.ratioed ? `${counts[0]}:${notation.top.tuplet.notesOccupied}` : counts[0]}-tuplet, over ${counts[1]} steady beats.`
              : `${counts[0]} notes fit exactly as ${notation.top.dots ? 'dotted ' : ''}values over ${counts[1]} beats, so no tuplet is needed.`}
          </p>
        )}
      </Panel>
    </div>
  );
}
