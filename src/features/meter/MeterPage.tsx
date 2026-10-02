import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, PageHeader, Panel, PlayButton, Segmented, Slider, Stat, Tag, Toggle } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlState } from '../../hooks/useUrlState';
import { analyzeBar, buildTimeline, defaultAccents, defaultGroups, indexAt, makeBar, METER_PRESETS, nextAccent, noteValue, parseBars, serializeBars, tapTempo, tempoMarking, tempoUnit, TEMPO_MARKINGS, toggleBoundary, type AccentLevel, type Bar, type MeterPreset, countSyllables } from './meter';
import { allocateMetronome, applyMetronome, type MetronomeSound } from './metronome';
import { measuresFromBars } from './rhythmNotation';
import { RhythmStaff, type RhythmStaffHandle } from './RhythmStaff';
import { BeatGrid, type BeatGridHandle } from './BeatGrid';
import { Pendulum, type PendulumHandle } from './Pendulum';
import { Comparison } from './Comparison';
import { StepSequencer } from './StepSequencer';
import { makeLoopTracker, outputLatency, useRaf } from './useRaf';
import s from './MeterPage.module.css';

const FAMILIES: Array<{ id: MeterPreset['family']; title: string; hint: string }> = [
  { id: 'Simple', title: 'Simple', hint: 'Beats divide in two' },
  { id: 'Compound', title: 'Compound', hint: 'Beats divide in three' },
  { id: 'Irregular', title: 'Irregular / asymmetric', hint: 'Five, seven, eleven ...' },
  { id: 'Additive', title: 'Additive groupings', hint: 'Same bar, different beats' },
  { id: 'Mixed', title: 'Mixed meter', hint: 'Changing time signatures' },
];

const DENS = [2, 4, 8, 16];

/** Symbol for a tempo unit when it is a common one, otherwise its name. */
function unitLabel(unit: number): string {
  const v = noteValue(unit);
  return ['quarter', 'eighth', 'dotted quarter', 'dotted eighth'].includes(v.name) ? v.symbol : v.name;
}

export default function MeterPage() {
  const [mParam, setMParam] = useUrlState('m', '4/4');
  const bars = useMemo<Bar[]>(() => parseBars(mParam) ?? [makeBar(4, 4)], [mParam]);
  const barsKey = serializeBars(bars);
  const [sel, setSel] = useState(0);
  const selBar = Math.min(sel, bars.length - 1);
  const [accentState, setAccentState] = useState<{ key: string; acc: AccentLevel[][] } | null>(null);
  const accents = useMemo(() => (accentState?.key === barsKey ? accentState.acc : bars.map(defaultAccents)), [accentState, barsKey, bars]);
  const [additiveSig, setAdditiveSig] = usePersistentState('meter:additiveSig', true);

  const [bpm, setBpm] = usePersistentState('meter:bpm', 96);
  const [subdiv, setSubdiv] = usePersistentState('meter:subdiv', 1);
  const [swing, setSwing] = usePersistentState('meter:swing', 0);
  const [sound, setSound] = usePersistentState<MetronomeSound>('meter:sound', 'click');
  const [taps, setTaps] = useState<number[]>([]);

  const setBars = useCallback((next: Bar[]) => setMParam(serializeBars(next)), [setMParam]);

  const analyses = useMemo(() => bars.map(analyzeBar), [bars]);
  const unit = tempoUnit(bars[0]);
  const marking = tempoMarking(bpm);
  const timeline = useMemo(() => buildTimeline(bars, accents, unit), [bars, accents, unit]);
  const totalPulses = timeline.pulseStarts.length - 1;
  const singleBar = bars.length === 1;

  // ---------- Playback ----------
  const player = usePlayer();
  const alloc = useRef<{ key: string; events: ReturnType<typeof allocateMetronome>['events']; length: number } | null>(null);
  const liveOpts = { subdiv, swing, sound };

  const start = () => {
    const a = allocateMetronome(bars, unit);
    applyMetronome(a.events, bars, accents, unit, liveOpts);
    alloc.current = { key: barsKey, ...a };
    player.play(a.events, { bpm, loop: true, length: a.length });
  };

  // Live edits: accents, subdivision, swing and sound apply without restarting.
  useEffect(() => {
    const a = alloc.current;
    if (player.playing && a && a.key === barsKey) applyMetronome(a.events, bars, accents, unit, { subdiv, swing, sound });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accents, subdiv, swing, sound]);

  // Structural changes restart the loop.
  useEffect(() => {
    if (player.playing && alloc.current && alloc.current.key !== barsKey) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barsKey]);

  const playerSetBpm = player.setBpm;
  useEffect(() => {
    playerSetBpm(bpm);
  }, [bpm, playerSetBpm]);

  // ---------- Animation ----------
  const pendulum = useRef<PendulumHandle>(null);
  const grid = useRef<BeatGridHandle>(null);
  const staff = useRef<RhythmStaffHandle>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const beatCounter = useRef<HTMLSpanElement>(null);
  const startedAt = useRef(0);
  const tracker = useRef(makeLoopTracker());
  const latency = useRef(0);

  useEffect(() => {
    if (player.playing) {
      startedAt.current = performance.now();
      tracker.current = makeLoopTracker();
      latency.current = outputLatency();
    } else {
      pendulum.current?.reset();
      grid.current?.highlight(null);
      staff.current?.highlight(null);
      if (counter.current) counter.current.textContent = '·';
      if (beatCounter.current) beatCounter.current.textContent = '·';
    }
  }, [player.playing]);

  const levels = useMemo(() => accents.flatMap((a, i) => Array.from({ length: bars[i].num }, (_, p) => a[p] ?? 0)), [accents, bars]);

  useRaf(player.playing, (now) => {
    const lenU = timeline.length;
    if (now - startedAt.current < 90 + latency.current * 1000 || lenU <= 0) return;
    const raw = player.position() - (latency.current * bpm) / 60;
    const pos = ((raw % lenU) + lenU) % lenU;
    const { loops } = tracker.current(pos);
    const pulse = indexAt(timeline.pulseStarts, pos);
    const beat = indexAt(timeline.beatStarts, pos);
    const bar = indexAt(timeline.barStarts, pos);
    if (pulse < 0) return;
    const bStart = timeline.beatStarts[beat];
    const bEnd = timeline.beatStarts[beat + 1];
    const phase = (pos - bStart) / Math.max(1e-6, bEnd - bStart);
    const beatsPerLoop = timeline.beatStarts.length - 1;
    const parity = (loops * beatsPerLoop + beat) % 2;
    // The arm reaches an extreme on every beat, like a mechanical metronome.
    const angle = 28 * Math.cos(Math.PI * (parity + phase));
    const pStart = timeline.pulseStarts[pulse];
    const sinceSec = ((pos - pStart) * 60) / bpm;
    const flash = Math.max(0, 1 - sinceSec / 0.18);
    pendulum.current?.update(angle, flash, levels[pulse]);
    grid.current?.highlight(pulse);
    const copy = singleBar ? loops % 2 : 0;
    staff.current?.highlight([`p${pulse + copy * totalPulses}`]);
    if (counter.current) counter.current.textContent = String(loops * bars.length + bar + 1);
    const beatInBar = beat - timeline.beatStarts.findIndex((t) => t >= timeline.barStarts[bar] - 1e-9);
    if (beatCounter.current) beatCounter.current.textContent = String(beatInBar + 1);
  });

  // ---------- Editing ----------
  const updateBar = (i: number, bar: Bar) => {
    const next = bars.map((b, k) => (k === i ? bar : b));
    setBars(next);
  };
  const setAccent = (bi: number, p: number) => {
    const acc = accents.map((a) => [...a]);
    acc[bi][p] = nextAccent(acc[bi][p] ?? 0);
    setAccentState({ key: barsKey, acc });
  };
  const toggleGroup = (bi: number, p: number) => {
    const bar = bars[bi];
    updateBar(bi, { ...bar, groups: toggleBoundary(bar.groups, p) });
  };
  const setNum = (num: number) => {
    const b = bars[selBar];
    const n = Math.max(1, Math.min(32, num));
    updateBar(selBar, { num: n, den: b.den, groups: defaultGroups(n, b.den) });
  };
  const setDen = (den: number) => {
    const b = bars[selBar];
    updateBar(selBar, { num: b.num, den, groups: defaultGroups(b.num, den) });
  };
  const choosePreset = (p: MeterPreset) => {
    setSel(0);
    setBars(p.bars);
  };
  const tap = () => {
    const now = performance.now();
    const next = [...taps.filter((t) => now - t < 8000), now];
    setTaps(next);
    const t = tapTempo(next);
    if (t) setBpm(Math.round(Math.max(20, Math.min(300, t))));
  };

  const a = analyses[selBar];
  const bar = bars[selBar];
  const notationMeasures = useMemo(() => {
    const shown = singleBar ? [bars[0], bars[0]] : bars;
    const acc = singleBar ? [accents[0], accents[0]] : accents;
    return measuresFromBars(shown, acc, additiveSig);
  }, [bars, accents, singleBar, additiveSig]);

  const onNoteClick = (id: string) => {
    const g = Number(id.slice(1)) % totalPulses;
    let bi = 0;
    while (bi < bars.length - 1 && g >= timeline.barPulseStarts[bi + 1]) bi++;
    setAccent(bi, g - timeline.barPulseStarts[bi]);
  };

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Rhythm & Time"
        title="Meter & Time"
        lede="How a time signature organizes pulses into beats and bars. Choose a meter, regroup its pulses, move the accents, then hear and see the result."
      />

      <div className={s.topGrid}>
        <Panel title="Time signature" eyebrow="Choose or build a meter">
          <div className={s.families}>
            {FAMILIES.map((f) => (
              <div key={f.id} className={s.family}>
                <div className={s.familyHead}>
                  <span className={s.familyTitle}>{f.title}</span>
                  <span className={s.familyHint}>{f.hint}</span>
                </div>
                <div className={s.chips}>
                  {METER_PRESETS.filter((p) => p.family === f.id).map((p) => {
                    const active = serializeBars(p.bars) === barsKey;
                    return (
                      <button key={p.id} type="button" className={`${s.chip} ${active ? s.chipActive : ''}`} onClick={() => choosePreset(p)} title={p.note} aria-pressed={active}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <hr className="rule" />
          <div className={s.builder}>
            <div className={s.builderRow}>
              <div className={s.stepper} role="group" aria-label="Numerator">
                <span className={s.stepperLabel}>Pulses</span>
                <Button size="sm" icon="minus" aria-label="Fewer pulses" onClick={() => setNum(bar.num - 1)} disabled={bar.num <= 1} />
                <span className={s.stepperValue}>{bar.num}</span>
                <Button size="sm" icon="plus" aria-label="More pulses" onClick={() => setNum(bar.num + 1)} disabled={bar.num >= 32} />
              </div>
              <div className={s.stepper}>
                <span className={s.stepperLabel}>Pulse value</span>
                <Segmented ariaLabel="Denominator" size="sm" value={bar.den} onChange={setDen} options={DENS.map((d) => ({ value: d, label: `/${d}`, title: `${noteValue(1 / d).name} notes` }))} />
              </div>
            </div>
            <div className={s.builderRow}>
              <span className={s.stepperLabel}>Bars</span>
              <div className={s.chips}>
                {bars.map((b, i) => (
                  <button key={i} type="button" className={`${s.chip} ${i === selBar ? s.chipActive : ''}`} onClick={() => setSel(i)} aria-pressed={i === selBar}>
                    {b.num}/{b.den}
                    {b.groups.length > 1 && !b.groups.every((g) => g === b.groups[0]) ? ` (${b.groups.join('+')})` : ''}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                icon="plus"
                onClick={() => {
                  if (bars.length >= 6) return;
                  setBars([...bars, { ...bars[selBar], groups: [...bars[selBar].groups] }]);
                  setSel(bars.length);
                }}
                disabled={bars.length >= 6}
              >
                Add bar
              </Button>
              <Button
                size="sm"
                icon="trash"
                onClick={() => {
                  setBars(bars.filter((_, i) => i !== selBar));
                  setSel(Math.max(0, selBar - 1));
                }}
                disabled={bars.length <= 1}
                aria-label="Remove selected bar"
              />
            </div>
          </div>
        </Panel>

        <Panel title="Analysis" eyebrow={bars.length > 1 ? `Bar ${selBar + 1} of ${bars.length}` : 'Classification'}>
          <div className={s.analysis}>
            <div
              className={s.bigSig}
              aria-label={`Time signature ${bar.num}/${bar.den}`}
              style={additiveSig && !a.equalBeats ? { fontSize: `${Math.max(1.1, 2.6 - bar.groups.length * 0.32)}rem` } : undefined}
            >
              <span>{additiveSig && !a.equalBeats ? bar.groups.join('+') : bar.num}</span>
              <span>{bar.den}</span>
            </div>
            <div className={s.analysisBody}>
              <div className={s.kindRow}>
                <Tag tone={a.kind === 'simple' ? 'verdigris' : a.kind === 'compound' ? 'royal' : 'plum'}>{a.kind}</Tag>
                {a.asymmetric && <Tag tone="brass">additive</Tag>}
              </div>
              <h3 className={s.kindLabel}>{a.label}</h3>
              <p className={s.summary}>{a.summary}</p>
            </div>
          </div>
          <div className={s.stats}>
            <Stat label="Beats per bar" value={a.beatCount} />
            <Stat label="Beat unit" value={<span className={s.statSmall}>{a.beatUnitText}</span>} />
            <Stat label="Pulse" value={<span className={s.statSmall}>{a.pulse.name}</span>} />
            <Stat label="Pulses per beat" value={a.pulsesPerBeat.join(' + ')} />
          </div>
          <p className={s.division}>{a.divisionText}.</p>
          <div className={s.counting} aria-label="Counting syllables">
            <span className={s.countingLabel}>Count</span>
            {countSyllables(bar.groups, bar.groups.every((g) => g === 1)).map((c, i) => (
              <span key={i} className={`${s.syl} ${accents[selBar]?.[i] === 2 ? s.sylStrong : accents[selBar]?.[i] === 1 ? s.sylMid : ''}`}>
                {c}
              </span>
            ))}
          </div>
          {bars.length > 1 && (
            <ul className={s.mixedList}>
              {analyses.map((x, i) => (
                <li key={i}>
                  <button type="button" className={s.linkish} onClick={() => setSel(i)}>
                    {bars[i].num}/{bars[i].den}
                  </button>{' '}
                  {x.label}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Metronome and beat grid"
        eyebrow="Click pulses to move accents, click gaps to regroup"
        actions={<PlayButton playing={player.playing} onPlay={start} onStop={player.stop} label="Start" />}
      >
        <div className={s.metro}>
          <div className={s.metroVisual}>
            <Pendulum handle={pendulum} bpmLabel={`${bpm} beats per minute`} />
            <div className={s.counters} aria-live="off">
              <div>
                <span className={s.counterLabel}>Bar</span>
                <span ref={counter} className={s.counterValue}>
                  ·
                </span>
              </div>
              <div>
                <span className={s.counterLabel}>Beat</span>
                <span ref={beatCounter} className={s.counterValue}>
                  ·
                </span>
              </div>
            </div>
          </div>
          <div className={s.metroControls}>
            <div className={s.tempoRow}>
              <div className={s.tempoReadout}>
                <span className={s.tempoUnit}>{unitLabel(unit)} =</span>
                <span className={s.tempoValue}>{bpm}</span>
                <span className={s.tempoMarking}>
                  {marking.name}
                  <span className={s.tempoMeaning}>{marking.meaning}</span>
                </span>
              </div>
              <div className={s.tempoButtons}>
                <Button size="sm" icon="minus" aria-label="Slower" onClick={() => setBpm(Math.max(20, bpm - 1))} />
                <Button size="sm" icon="plus" aria-label="Faster" onClick={() => setBpm(Math.min(300, bpm + 1))} />
                <Button size="sm" onClick={tap} aria-label="Tap tempo">
                  Tap{taps.length > 1 ? ` (${taps.length})` : ''}
                </Button>
              </div>
            </div>
            <Slider label="Tempo (beats per minute)" min={20} max={300} value={bpm} onChange={setBpm} width={260} format={(v) => `${v}`} />
            <div className={s.ladder} role="group" aria-label="Italian tempo markings">
              {TEMPO_MARKINGS.map((m) => {
                const active = m === marking;
                const mid = m.max === Infinity ? 208 : m.min === 0 ? 20 : Math.round((m.min + m.max) / 2);
                return (
                  <button
                    key={m.name}
                    type="button"
                    className={`${s.rung} ${active ? s.rungActive : ''}`}
                    onClick={() => setBpm(mid)}
                    title={`${m.name}: ${m.meaning}`}
                  >
                    <span className={s.rungName}>{m.name}</span>
                    <span className={s.rungRange}>{m.max === Infinity ? `${m.min}+` : m.min === 0 ? `< ${m.max}` : `${m.min}-${m.max}`}</span>
                  </button>
                );
              })}
            </div>
            <div className={s.optionsRow}>
              <div className={s.stepper}>
                <span className={s.stepperLabel}>Sound</span>
                <Segmented
                  ariaLabel="Metronome sound"
                  size="sm"
                  value={sound}
                  onChange={setSound}
                  options={[
                    { value: 'click', label: 'Click' },
                    { value: 'wood', label: 'Woodblock' },
                  ]}
                />
              </div>
              <div className={s.stepper}>
                <span className={s.stepperLabel}>Subdivide each pulse</span>
                <Segmented
                  ariaLabel="Subdivision"
                  size="sm"
                  value={subdiv}
                  onChange={setSubdiv}
                  options={[
                    { value: 1, label: 'Off' },
                    { value: 2, label: '÷2' },
                    { value: 3, label: '÷3' },
                    { value: 4, label: '÷4' },
                  ]}
                />
              </div>
              <div className={subdiv === 2 ? '' : s.disabled}>
                <Slider
                  label="Swing"
                  min={0}
                  max={100}
                  value={Math.round(swing * 100)}
                  onChange={(v) => setSwing(v / 100)}
                  width={150}
                  format={(v) => (v === 0 ? 'Straight' : v === 100 ? 'Triplet' : `${50 + Math.round(v * 0.1667)}:${50 - Math.round(v * 0.1667)}`)}
                />
              </div>
            </div>
            {subdiv !== 2 && swing > 0 && <p className={s.note}>Swing applies to the two-way subdivision (÷2).</p>}
          </div>
        </div>

        <BeatGrid bars={bars} accents={accents} onAccent={setAccent} onBoundary={toggleGroup} handle={grid} selectedBar={selBar} onSelectBar={setSel} />
        <div className={s.legend}>
          <span>
            <i className={`${s.legendDot} ${s.lvl2}`} /> Downbeat
          </span>
          <span>
            <i className={`${s.legendDot} ${s.lvl1}`} /> Secondary accent
          </span>
          <span>
            <i className={`${s.legendDot} ${s.lvl0}`} /> Weak pulse
          </span>
          <span className={s.legendHint}>Brass rules mark beat boundaries. Click a gap to split or merge beats.</span>
          {accentState?.key === barsKey && (
            <Button size="sm" variant="ghost" icon="undo" onClick={() => setAccentState(null)}>
              Reset accents
            </Button>
          )}
        </div>
      </Panel>

      <Panel
        title="Notation"
        eyebrow={singleBar ? 'Two bars, beamed by beat' : 'Time signature shown where it changes'}
        actions={<Toggle label="Additive signature (2+2+3/8)" checked={additiveSig} onChange={setAdditiveSig} />}
      >
        <RhythmStaff
          parts={[{ measures: notationMeasures }]}
          handle={staff}
          onNoteClick={onNoteClick}
          ariaLabel={`Rhythm notation of ${bars.map((b) => `${b.num}/${b.den}`).join(', ')}, beamed ${bars.map((b) => b.groups.join('+')).join(', ')}`}
        />
        <p className={s.note}>
          Beams follow the beat groups, so the notation shows how to feel the bar. Accent marks show the strong pulses; click a note to change its accent.
        </p>
      </Panel>

      <Comparison />

      <StepSequencer />

      <Callout title="Listening ideas">
        <p>
          Play 6/8 and 3/4 at the same eighth-note speed: the notes are identical, only the accents move. Then try 7/8 as 2+2+3 and 3+2+2,
          and notice how each grouping changes the dance. Set ÷2 subdivision in 4/4 and slide the swing from straight to triplet.
        </p>
      </Callout>
    </div>
  );
}
