import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, Panel, PlayButton, Select, Stat, Toggle } from '../../components/ui';
import { pitchFromMidi, pitchName } from '../../theory/notes';
import { usePersistentState } from '../../hooks/usePersistentState';
import { midiToFreqA4, periodicWaveCoefficients, presetSpectrum, PARTIAL_COUNT, SYNTH_PRESETS, type PresetId, type Spectrum } from './tuning';
import { synth, type ToneHandle } from './synth';
import s from './Harmonics.module.css';

const PITCHES = [36, 43, 48, 55, 57, 60, 64, 67, 69].map((m) => ({ value: String(m), label: pitchName(pitchFromMidi(m)) }));

export function SynthSection({ a4 }: { a4: number }) {
  const [preset, setPreset] = usePersistentState<PresetId | 'custom'>('harmonics:synth-preset', 'saw');
  const [spec, setSpec] = usePersistentState<Spectrum>('harmonics:synth-spectrum', presetSpectrum('saw'));
  const [pitchMidi, setPitchMidi] = usePersistentState('harmonics:synth-pitch', 48);
  const [holding, setHolding] = useState(false);
  const [showParts, setShowParts] = useState(true);
  const voice = useRef<ToneHandle | null>(null);
  const buildTimer = useRef<number | null>(null);

  const freq = midiToFreqA4(pitchMidi, a4);
  const safeSpec: Spectrum = useMemo(() => {
    const amps = Array.from({ length: PARTIAL_COUNT }, (_, i) => spec.amps?.[i] ?? 0);
    const phases = Array.from({ length: PARTIAL_COUNT }, (_, i) => spec.phases?.[i] ?? 0);
    return { amps, phases };
  }, [spec]);
  const silent = safeSpec.amps.every((a) => a <= 0.001);

  // Keep the held tone in sync with the spectrum and pitch.
  useEffect(() => {
    if (!holding) return;
    if (silent) {
      voice.current?.stop();
      voice.current = null;
      return;
    }
    const { real, imag } = periodicWaveCoefficients(safeSpec);
    const wave = synth.makeWave(real, imag);
    if (!voice.current) voice.current = synth.tone(freq, { wave, level: 0.75, attack: 0.08, release: 0.15 });
    else {
      voice.current.setWave(wave);
      voice.current.setFreq(freq, 0.02);
    }
  }, [holding, safeSpec, freq, silent]);

  useEffect(
    () => () => {
      voice.current?.stop();
      voice.current = null;
      if (buildTimer.current) window.clearInterval(buildTimer.current);
    },
    [],
  );

  const stopHold = () => {
    setHolding(false);
    voice.current?.stop();
    voice.current = null;
  };

  const applyPreset = (id: PresetId) => {
    if (buildTimer.current) window.clearInterval(buildTimer.current);
    setPreset(id);
    setSpec(presetSpectrum(id));
  };

  const setAmp = (i: number, v: number) => {
    setPreset('custom');
    setSpec((prev) => {
      const amps = Array.from({ length: PARTIAL_COUNT }, (_, k) => prev.amps?.[k] ?? 0);
      const phases = Array.from({ length: PARTIAL_COUNT }, (_, k) => prev.phases?.[k] ?? 0);
      amps[i] = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
      return { amps, phases };
    });
  };

  const randomizePhases = () => setSpec((prev) => ({ amps: safeSpec.amps, phases: (prev.phases ?? []).map(() => Math.random() * Math.PI * 2) }));
  const zeroPhases = () => setSpec({ amps: safeSpec.amps, phases: safeSpec.phases.map(() => 0) });

  /** Add the current spectrum's partials one at a time while the tone sounds. */
  const buildUp = () => {
    if (buildTimer.current) window.clearInterval(buildTimer.current);
    const target = safeSpec;
    let k = 1;
    setSpec({ amps: target.amps.map((a, i) => (i === 0 ? a || 1 : 0)), phases: target.phases });
    setHolding(true);
    buildTimer.current = window.setInterval(() => {
      k++;
      if (k > PARTIAL_COUNT) {
        if (buildTimer.current) window.clearInterval(buildTimer.current);
        buildTimer.current = null;
        return;
      }
      setSpec({ amps: target.amps.map((a, i) => (i < k ? (i === 0 ? a || 1 : a) : 0)), phases: target.phases });
    }, 450);
  };

  const centroid = useMemo(() => {
    const total = safeSpec.amps.reduce((a, b) => a + b, 0);
    if (!total) return 0;
    return safeSpec.amps.reduce((acc, a, i) => acc + a * (i + 1), 0) / total;
  }, [safeSpec]);
  const evenShare = useMemo(() => {
    const total = safeSpec.amps.reduce((a, b) => a + b * b, 0);
    if (!total) return 0;
    return safeSpec.amps.reduce((acc, a, i) => acc + ((i + 1) % 2 === 0 ? a * a : 0), 0) / total;
  }, [safeSpec]);

  const presetHint = SYNTH_PRESETS.find((p) => p.id === preset)?.hint ?? 'Your own spectrum. Drag across the bars to draw.';

  return (
    <div className={s.section}>
      <Panel
        eyebrow="Additive synthesis"
        title="Build a timbre from sine waves"
        actions={
          <PlayButton
            playing={holding}
            onPlay={() => setHolding(true)}
            onStop={stopHold}
            label="Hold tone"
            stopLabel="Release"
            disabled={silent && !holding}
          />
        }
      >
        <div className={s.controls} style={{ marginBottom: '1rem' }}>
          <Select label="Pitch" value={String(pitchMidi)} onChange={(v) => setPitchMidi(Number(v))} options={PITCHES} />
          <Stat label="Frequency" value={`${freq.toFixed(1)} Hz`} />
          <Stat label="Brightness" value={centroid ? centroid.toFixed(2) : 'none'} title="Spectral centroid: the amplitude-weighted average partial number" />
          <Stat label="Even partials" value={`${Math.round(evenShare * 100)}%`} title="Share of energy in even-numbered partials" />
        </div>
        <div className="row" style={{ gap: '0.4rem', marginBottom: '0.9rem' }} role="group" aria-label="Presets">
          {SYNTH_PRESETS.map((p) => (
            <Button key={p.id} size="sm" variant={preset === p.id ? 'primary' : 'secondary'} onClick={() => applyPreset(p.id)} title={p.hint} aria-pressed={preset === p.id}>
              {p.name}
            </Button>
          ))}
        </div>
        <p className={s.prose} style={{ marginBottom: '0.9rem' }}>
          {presetHint}
        </p>

        <div className={s.grid2}>
          <div>
            <div className={s.refLabel} style={{ marginBottom: '0.35rem' }}>
              Partial amplitudes (drag to draw)
            </div>
            <PartialEditor amps={safeSpec.amps} onChange={setAmp} />
            <div className="row" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
              <Button size="sm" icon="sparkle" onClick={buildUp} title="Start from the fundamental and add one partial at a time">
                Build up partial by partial
              </Button>
              <Button size="sm" variant="ghost" icon="undo" onClick={() => setSpec({ amps: safeSpec.amps.map(() => 0), phases: safeSpec.phases })}>
                Clear
              </Button>
            </div>
          </div>
          <div>
            <div className={s.refLabel} style={{ marginBottom: '0.35rem' }}>
              One period of the waveform
            </div>
            <Waveform spec={safeSpec} showParts={showParts} />
            <div className="row" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
              <Toggle label="Show components" checked={showParts} onChange={setShowParts} />
              <Button size="sm" icon="shuffle" onClick={randomizePhases} title="Shift each partial in time by a random amount">
                Randomize phases
              </Button>
              <Button size="sm" variant="ghost" onClick={zeroPhases}>
                Reset phases
              </Button>
            </div>
          </div>
        </div>
      </Panel>
      <Callout title="Shape is not sound">
        <p>
          Hold a tone and randomize the phases: the waveform changes completely, yet the timbre barely changes. The ear
          listens to which partials are present and how strong they are, not to the shape of the wave. The triangle preset
          alternates its phases only to draw the familiar shape.
        </p>
      </Callout>
    </div>
  );
}

function PartialEditor({ amps, onChange }: { amps: number[]; onChange: (i: number, v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const padX = 6;
    const x = e.clientX - r.left - padX;
    const i = Math.floor((x / (r.width - padX * 2)) * PARTIAL_COUNT);
    if (i < 0 || i >= PARTIAL_COUNT) return;
    const v = 1 - (e.clientY - r.top - 8) / (r.height - 8);
    onChange(i, v < 0.03 ? 0 : v);
  };

  return (
    <div>
      <div
        ref={ref}
        className={s.editor}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && setFromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {amps.map((a, i) => (
          <div
            key={i}
            className={s.slot}
            role="slider"
            tabIndex={0}
            aria-label={`Partial ${i + 1} amplitude`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(a * 100)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.1 : 0.02;
              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(i, a + step);
              else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(i, a - step);
              else if (e.key === 'Home') onChange(i, 0);
              else if (e.key === 'End') onChange(i, 1);
              else return;
              e.preventDefault();
            }}
          >
            <span className={s.slotTrack} aria-hidden="true" />
            <span className={`${s.slotFill} ${(i + 1) % 2 === 1 ? s.slotFillOdd : ''}`} style={{ height: `${a * 100}%` }} />
          </div>
        ))}
      </div>
      <div className={s.slotNums} aria-hidden="true">
        {amps.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

function Waveform({ spec, showParts }: { spec: Spectrum; showParts: boolean }) {
  const W = 400;
  const H = 200;
  const mid = H / 2;
  const amp = H * 0.42;
  const N = 300;
  // One period, sampled so that the last point lands exactly on the start of the next period.
  const raw = useMemo(() => {
    const out: number[] = [];
    for (let k = 0; k < N; k++) {
      const th = (2 * Math.PI * k) / (N - 1);
      let v = 0;
      spec.amps.forEach((a, i) => (v += a * Math.sin((i + 1) * th + spec.phases[i])));
      out.push(v);
    }
    return out;
  }, [spec]);
  const peak = Math.max(1e-9, ...raw.map(Math.abs));
  const samples = raw.map((v) => v / peak);
  const path = samples.map((v, k) => `${k === 0 ? 'M' : 'L'}${((k / (N - 1)) * W).toFixed(1)},${(mid - v * amp).toFixed(1)}`).join('');
  const parts = showParts
    ? spec.amps
        .map((a, i) => ({ a, i }))
        .filter((p) => p.a > 0.01)
        .slice(0, 8)
        .map(({ a, i }) => {
          let d = '';
          for (let k = 0; k < N; k++) {
            const th = (2 * Math.PI * k) / (N - 1);
            const v = (a * Math.sin((i + 1) * th + spec.phases[i])) / peak;
            d += `${k === 0 ? 'M' : 'L'}${((k / (N - 1)) * W).toFixed(1)},${(mid - v * amp).toFixed(1)}`;
          }
          return { d, i };
        })
    : [];
  return (
    <svg className={s.wave} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Waveform: one period of the sum of the partials">
      <line x1={0} x2={W} y1={mid} y2={mid} style={{ stroke: 'var(--rule-strong)' }} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={W / 2} x2={W / 2} y1={8} y2={H - 8} style={{ stroke: 'var(--rule)' }} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      {parts.map((p) => (
        <path key={p.i} d={p.d} fill="none" style={{ stroke: p.i % 2 === 0 ? 'var(--accent)' : 'var(--brass)' }} strokeOpacity={0.28} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <path d={path} fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth={2.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
