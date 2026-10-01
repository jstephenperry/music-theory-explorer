/**
 * From rhythm to pitch: accelerate a polyrhythm until its pulse trains become tones.
 * 3:2 becomes a perfect fifth, 5:4 a major third.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, Panel, Stat } from '../../components/ui';
import { stopAllPlayback } from '../../audio/usePlayer';
import { noteName, pitchFromMidi } from '../../theory/notes';
import { useRaf } from '../meter/useRaf';
import { LAYER_COLORS, LAYER_NAMES } from './layers';
import { CLICK_TO_TONE, PulsePitchEngine, toneMix } from './pulsePitch';
import { ratioInterval } from './rhythm';
import s from './Polyrhythm.module.css';

const RATIOS: Array<{ a: number; b: number }> = [
  { a: 2, b: 1 },
  { a: 3, b: 2 },
  { a: 4, b: 3 },
  { a: 5, b: 4 },
  { a: 6, b: 5 },
  { a: 5, b: 3 },
  { a: 7, b: 4 },
  { a: 9, b: 8 },
];

/** Slider 0..1 to the rate of layer B in pulses per second (log scale, 1 to 220 Hz). */
const MIN_RATE = 1;
const MAX_RATE = 220;
const rateFromSlider = (x: number) => MIN_RATE * Math.pow(MAX_RATE / MIN_RATE, x);
const sliderFromRate = (r: number) => Math.log(r / MIN_RATE) / Math.log(MAX_RATE / MIN_RATE);

function nearestNote(hz: number): string {
  const m = 69 + 12 * Math.log2(hz / 440);
  const r = Math.round(m);
  const cents = Math.round((m - r) * 100);
  const p = pitchFromMidi(r);
  return `${noteName(p)}${p.octave}${cents ? ` ${cents > 0 ? '+' : '−'}${Math.abs(cents)}¢` : ''}`;
}

function zone(rate: number): { name: string; hint: string } {
  if (rate < 8) return { name: 'Rhythm', hint: 'Separate events you could tap along to' };
  if (rate < CLICK_TO_TONE.to) return { name: 'Flutter', hint: 'Too fast to count, not yet a pitch: a buzz or rattle' };
  return { name: 'Pitch', hint: 'The pulse rate is heard as a frequency' };
}

export function PitchView() {
  const [ratio, setRatio] = useState(RATIOS[1]);
  const [x, setX] = useState(sliderFromRate(1.5));
  const [running, setRunning] = useState(false);
  const [ramping, setRamping] = useState(false);
  const engine = useRef<PulsePitchEngine | null>(null);
  const lamps = useRef<Array<HTMLSpanElement | null>>([]);
  const rampRef = useRef<{ from: number; t0: number } | null>(null);
  const rateB = rateFromSlider(x);
  const rates = [ratio.a * rateB / ratio.b, rateB];
  const info = useMemo(() => ratioInterval(ratio.a, ratio.b), [ratio]);
  const z = zone(rates[1]);

  const base = rateB / ratio.b;

  const start = () => {
    stopAllPlayback();
    engine.current ??= new PulsePitchEngine();
    engine.current.start([ratio.a, ratio.b], base, [1900, 1150]);
    setRunning(true);
  };
  const stop = () => {
    engine.current?.stop();
    setRunning(false);
    setRamping(false);
  };

  useEffect(() => () => engine.current?.stop(true), []);

  useEffect(() => {
    if (running) engine.current?.setBase(base);
  }, [base, running]);

  useEffect(() => {
    if (running) engine.current?.start([ratio.a, ratio.b], rateFromSlider(x) / ratio.b, [1900, 1150]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  // Stop when the browser tab is hidden (the click scheduler relies on timers).
  useEffect(() => {
    const onHide = () => document.hidden && stop();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accelerate = () => {
    if (!running) start();
    rampRef.current = { from: x >= 0.98 ? 0 : x, t0: performance.now() };
    setRamping(true);
  };

  useRaf(running, (now) => {
    const r = rampRef.current;
    if (ramping && r) {
      const t = (now - r.t0) / 1000;
      const nx = Math.min(1, r.from + t / 18);
      setX(nx);
      if (nx >= 1) setRamping(false);
    }
    // Pulse lamps: blink at the layer rate, glow steadily once the rate is too fast to see.
    rates.forEach((rate, i) => {
      const el = lamps.current[i];
      if (!el) return;
      const phase = ((now / 1000) * rate) % 1;
      const blink = rate > 16 ? 0.75 : Math.max(0.12, 1 - phase * 4);
      el.style.opacity = String(blink);
    });
  });

  useEffect(() => {
    if (!running) lamps.current.forEach((el) => el && (el.style.opacity = '0.12'));
  }, [running]);

  const mix = toneMix(rates[1]);
  const markerLeft = `${(x * 100).toFixed(2)}%`;
  const zoneEdge = (hz: number) => `${(sliderFromRate(hz) * 100).toFixed(2)}%`;

  return (
    <div className={s.stack}>
      <Panel title="From rhythm to pitch" eyebrow="Speed up a polyrhythm until it sings">
        <div className={s.chips} role="group" aria-label="Ratio">
          {RATIOS.map((r) => {
            const active = r.a === ratio.a && r.b === ratio.b;
            return (
              <button key={`${r.a}:${r.b}`} type="button" className={`${s.chip} ${active ? s.chipActive : ''}`} aria-pressed={active} onClick={() => setRatio(r)}>
                {r.a}:{r.b} <span className={s.chipSub}>{ratioInterval(r.a, r.b).description}</span>
              </button>
            );
          })}
        </div>

        <div className={s.pitchTop}>
          <div className={s.lamps}>
            {[0, 1].map((i) => (
              <div key={i} className={s.lampBox}>
                <span
                  ref={(el) => {
                    lamps.current[i] = el;
                  }}
                  className={s.lamp}
                  style={{ background: `var(${LAYER_COLORS[i]})` }}
                />
                <span className={s.lampLabel}>
                  {LAYER_NAMES[i]}: {i === 0 ? ratio.a : ratio.b} per cycle
                </span>
                <span className={s.lampRate}>{rates[i] < 10 ? rates[i].toFixed(2) : rates[i].toFixed(1)} Hz</span>
                <span className={s.lampHint}>{rates[i] < 20 ? `${Math.round(rates[i] * 60)} per minute` : nearestNote(rates[i])}</span>
              </div>
            ))}
          </div>
          <div className={s.pitchButtons}>
            <Button variant="primary" icon={running ? 'stop' : 'play'} onClick={running ? stop : start}>
              {running ? 'Stop' : 'Start'}
            </Button>
            <Button icon="sparkle" onClick={accelerate} disabled={ramping}>
              Accelerate
            </Button>
            <Button variant="ghost" icon="undo" onClick={() => { setRamping(false); setX(sliderFromRate(1.5)); }}>
              Slow again
            </Button>
          </div>
        </div>

        <div className={s.speed}>
          <label htmlFor="pitch-speed" className={s.factLabel}>
            Speed (layer B pulses per second, logarithmic)
          </label>
          <div className={s.zoneTrack}>
            <div className={s.zoneBand} style={{ left: 0, width: zoneEdge(8) }}>
              Rhythm
            </div>
            <div className={s.zoneBand} style={{ left: zoneEdge(8), width: `calc(${zoneEdge(CLICK_TO_TONE.to)} - ${zoneEdge(8)})` }}>
              Flutter
            </div>
            <div className={`${s.zoneBand} ${s.zonePitch}`} style={{ left: zoneEdge(CLICK_TO_TONE.to), right: 0 }}>
              Pitch
            </div>
            <div className={s.zoneMarker} style={{ left: markerLeft }} />
          </div>
          <input
            id="pitch-speed"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={x}
            onChange={(e) => {
              setRamping(false);
              setX(Number(e.target.value));
            }}
            className={s.speedRange}
          />
          <p className={s.caption}>
            <strong>{z.name}.</strong> {z.hint}. Mix: {Math.round((1 - mix) * 100)}% clicks, {Math.round(mix * 100)}% tone.
          </p>
        </div>

        <div className={s.statsRow}>
          <Stat label="Ratio" value={`${ratio.a}:${ratio.b}`} />
          <Stat label="Becomes" value={<span className={s.statText}>{info.description}</span>} />
          <Stat label="Size" value={`${info.cents.toFixed(1)}¢`} />
          <Stat
            label="Equal temperament"
            value={<span className={s.statText}>{Math.abs(info.nearest.deviation) < 0.05 ? 'exact' : `${info.nearest.deviation > 0 ? '+' : '−'}${Math.abs(info.nearest.deviation).toFixed(1)}¢ from ${info.nearest.name}`}</span>}
          />
        </div>
      </Panel>
      <Callout title="Why it works">
        <p>
          A pitch is a pulse that repeats fast enough (above about 20 times per second) for the ear to fuse it into a tone. Two pulse trains in a 3:2 ratio
          therefore become two frequencies in a 3:2 ratio: a just perfect fifth. The rhythm you could tap at the start is the same pattern as the
          interval you hear at the end, only about a hundred times faster.
        </p>
      </Callout>
    </div>
  );
}
