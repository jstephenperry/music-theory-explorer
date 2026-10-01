import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, Panel, Segmented, Select, Slider, Stat, Toggle } from '../../components/ui';
import { pitchFromMidi, pitchName } from '../../theory/notes';
import { usePersistentState } from '../../hooks/usePersistentState';
import { beatRate, cents, JUST_INTERVALS, justCents, midiToFreqA4, PURE_MAJOR_THIRD, PYTHAGOREAN_MAJOR_THIRD, SYNTONIC_COMMA, type JustInterval } from './tuning';
import { synth, TIMBRES, type Timbre, type ToneHandle } from './synth';
import { useTimeline } from './useTimeline';
import { formatCents } from './format';
import s from './Harmonics.module.css';

const BASES = [48, 53, 55, 57, 60, 62].map((m) => ({ value: String(m), label: pitchName(pitchFromMidi(m)) }));

type Mode = 'together' | 'melodic';

export function JustSection({ a4 }: { a4: number }) {
  const [id, setId] = usePersistentState('harmonics:just-interval', 'M3');
  const [baseMidi, setBaseMidi] = usePersistentState('harmonics:just-base', 57);
  const [timbre, setTimbre] = usePersistentState<Timbre>('harmonics:just-timbre', 'organ');
  const [mode, setMode] = useState<Mode>('together');
  const [offset, setOffset] = useState(() => {
    const jj = JUST_INTERVALS.find((x) => x.id === id) ?? JUST_INTERVALS[3];
    return jj.semis * 100 - justCents(jj);
  });
  const [holding, setHolding] = useState(false);
  const tl = useTimeline(timbre);
  const held = useRef<ToneHandle[]>([]);

  const j: JustInterval = JUST_INTERVALS.find((x) => x.id === id) ?? JUST_INTERVALS[3];
  const lower = midiToFreqA4(baseMidi, a4);
  const just = justCents(j);
  const et = j.semis * 100;
  const etOffset = et - just;
  const upperJust = lower * (j.ratio[0] / j.ratio[1]);
  const upperEt = lower * Math.pow(2, j.semis / 12);
  const upperLive = upperJust * Math.pow(2, offset / 1200);
  const [p, q] = j.ratio;
  const audibleBeats = p <= 9;
  const liveBeat = beatRate(lower, upperLive, p, q);
  const etBeat = beatRate(lower, upperEt, p, q);
  const basePitch = pitchFromMidi(baseMidi);

  // Sustained dyad that follows the slider.
  useEffect(() => {
    if (!holding) return;
    if (held.current.length === 0) {
      tl.stop();
      held.current = synth.chord([lower, upperLive], { timbre, level: 0.75, attack: 0.08, release: 0.15 });
    } else {
      held.current[0].setFreq(lower, 0.02);
      held.current[1].setFreq(upperLive, 0.02);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding, lower, upperLive]);

  // Changing timbre restarts the held dyad.
  useEffect(() => {
    held.current.forEach((h) => h.stop());
    held.current = [];
    if (holding) held.current = synth.chord([lower, upperLive], { timbre, level: 0.75, attack: 0.08, release: 0.15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timbre]);

  useEffect(
    () => () => {
      held.current.forEach((h) => h.stop());
      held.current = [];
    },
    [],
  );

  const release = () => {
    setHolding(false);
    held.current.forEach((h) => h.stop());
    held.current = [];
  };

  const dyad = (upper: number, at: number, idTag: string, dur = 2.2) =>
    mode === 'together'
      ? [{ at, dur, freqs: [lower, upper], id: idTag }]
      : [
          { at, dur: 0.75, freqs: [lower], id: idTag },
          { at: at + 0.8, dur: 0.9, freqs: [upper], id: idTag },
        ];
  const span = mode === 'together' ? 2.5 : 1.9;

  const play = (which: 'just' | 'et' | 'compare') => {
    release();
    if (which === 'just') tl.play(dyad(upperJust, 0, 'just'));
    else if (which === 'et') tl.play(dyad(upperEt, 0, 'et'));
    else tl.play([...dyad(upperJust, 0, 'just'), ...dyad(upperEt, span, 'et'), ...dyad(upperJust, span * 2, 'just'), ...dyad(upperEt, span * 3, 'et')]);
  };

  const thirds = [
    { id: 'pure', name: 'Just 5:4', cents: PURE_MAJOR_THIRD },
    { id: 'et', name: '12-TET', cents: 400 },
    { id: 'pyth', name: 'Pythagorean 81:64', cents: PYTHAGOREAN_MAJOR_THIRD },
  ];
  const playThird = (c: number, tag: string) => {
    release();
    tl.play([{ at: 0, dur: 2.2, freqs: [lower, lower * Math.pow(2, c / 1200)], id: tag }]);
  };
  const playThirds = () => {
    release();
    tl.play(thirds.map((t, i) => ({ at: i * 2.4, dur: 2.1, freqs: [lower, lower * Math.pow(2, t.cents / 1200)], id: t.id })));
  };

  const shownBeat = holding ? liveBeat : tl.active === 'et' ? etBeat : tl.active === 'just' ? 0 : liveBeat;

  return (
    <div className={s.section}>
      <div className={s.grid2}>
        <Panel eyebrow="Pure ratios against twelve equal steps" title="Interval sizes in cents">
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Interval</th>
                  <th>Ratio</th>
                  <th className={s.num}>Just</th>
                  <th className={s.num}>12-TET</th>
                  <th className={s.num}>Difference</th>
                  <th className={`${s.num} ${s.hideNarrow}`}>Beats</th>
                </tr>
              </thead>
              <tbody>
                {JUST_INTERVALS.map((x) => {
                  const jc = justCents(x);
                  const diff = x.semis * 100 - jc;
                  const b = beatRate(lower, lower * Math.pow(2, x.semis / 12), x.ratio[0], x.ratio[1]);
                  return (
                    <tr
                      key={x.id}
                      className={x.id === j.id ? s.rowActive : undefined}
                      onClick={() => {
                        setId(x.id);
                        setOffset(diff);
                      }}
                      tabIndex={0}
                      aria-selected={x.id === j.id}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setId(x.id);
                          setOffset(diff);
                        }
                      }}
                    >
                      <td>{x.name}</td>
                      <td>
                        {x.ratio[0]}:{x.ratio[1]}
                      </td>
                      <td className={s.num}>{jc.toFixed(2)}</td>
                      <td className={s.num}>{x.semis * 100}</td>
                      <td className={s.num}>
                        <span className={Math.abs(diff) < 0.01 ? s.pure : diff > 0 ? s.sharp : s.flat}>{Math.abs(diff) < 0.01 ? '0' : formatCents(diff, 2)}</span>
                      </td>
                      <td className={`${s.num} ${s.hideNarrow}`}>{x.ratio[0] <= 9 ? `${b.toFixed(1)} Hz` : 'n/a'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ fontSize: '0.82rem', margin: '0.6rem 0 0' }}>
            Difference: how far 12-TET is from the pure ratio (positive = wider). Beats: rate for the 12-TET version above {pitchName(basePitch)}.
          </p>
        </Panel>

        <Panel eyebrow={`${j.ratio[0]}:${j.ratio[1]} above ${pitchName(basePitch)}`} title={j.name}>
          <div className={s.detail}>
            <div className={s.controls}>
              <Select label="Lower note" value={String(baseMidi)} onChange={(v) => setBaseMidi(Number(v))} options={BASES} />
              <Select label="Timbre" value={timbre} onChange={(v) => setTimbre(v as Timbre)} options={TIMBRES.map((t) => ({ value: t.value, label: t.label }))} />
            </div>
            <Segmented
              ariaLabel="Play the notes together or one after another"
              options={[
                { value: 'together', label: 'Together' },
                { value: 'melodic', label: 'One after another' },
              ]}
              value={mode}
              onChange={setMode}
              size="sm"
            />
            <div className="row" style={{ gap: '0.5rem' }}>
              <Button size="sm" variant={tl.active === 'just' ? 'primary' : 'secondary'} icon="play" onClick={() => play('just')}>
                Just
              </Button>
              <Button size="sm" variant={tl.active === 'et' ? 'primary' : 'secondary'} icon="play" onClick={() => play('et')}>
                12-TET
              </Button>
              <Button size="sm" icon="loop" onClick={() => play('compare')}>
                Alternate
              </Button>
              <Button size="sm" variant="ghost" icon="stop" onClick={() => {
                tl.stop();
                release();
              }} aria-label="Stop" />
            </div>
            {j.note && <p className={s.prose}>{j.note}</p>}
            <hr className="rule" style={{ margin: '0.25rem 0' }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Toggle label="Hold and detune" checked={holding} onChange={(v) => (v ? setHolding(true) : release())} />
              <span className="row" style={{ gap: '0.4rem' }}>
                <Button size="sm" variant="ghost" onClick={() => setOffset(0)}>
                  Pure
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffset(etOffset)}>
                  12-TET
                </Button>
              </span>
            </div>
            <Slider
              label="Upper note, cents from pure"
              value={offset}
              onChange={setOffset}
              min={-40}
              max={40}
              step={0.1}
              format={(v) => `${formatCents(v, 1)}¢`}
              width={220}
            />
            <div className={s.stats}>
              <Stat label="Size" value={`${(just + offset).toFixed(1)}¢`} />
              <Stat
                label="Beat rate"
                value={
                  <span>
                    {audibleBeats ? `${shownBeat.toFixed(2)} Hz` : 'n/a'}{' '}
                    {audibleBeats && shownBeat > 0.05 && shownBeat < 25 && (holding || tl.playing) && (
                      <span className={`${s.beatDot} ${s.beatDotPulse}`} style={{ animationDuration: `${1 / shownBeat}s` }} aria-hidden="true" />
                    )}
                  </span>
                }
              />
            </div>
            <BeatPlot beat={audibleBeats ? shownBeat : 0} p={p} q={q} lower={lower} upper={holding ? upperLive : tl.active === 'et' ? upperEt : upperJust * Math.pow(2, offset / 1200)} audible={audibleBeats} />
          </div>
        </Panel>
      </div>

      <div className={s.demoGrid}>
        <Panel eyebrow="One interval, three sizes" title="Three major thirds">
          <div className={s.demo}>
            <p className={s.prose}>
              Four pure fifths (Pythagorean) overshoot the pure 5:4 third by the syntonic comma, {SYNTONIC_COMMA.toFixed(2)} cents. Equal
              temperament splits the difference, sitting 13.7 cents above pure.
            </p>
            <dl className={s.numbers}>
              {thirds.map((t) => (
                <div key={t.id} style={{ display: 'contents' }}>
                  <dt>{t.name}</dt>
                  <dd>
                    {t.cents.toFixed(2)}¢ <span className="faint">({formatCents(t.cents - PURE_MAJOR_THIRD, 2)} from pure)</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="row" style={{ gap: '0.5rem' }}>
              {thirds.map((t) => (
                <Button key={t.id} size="sm" variant={tl.active === t.id ? 'primary' : 'secondary'} onClick={() => playThird(t.cents, t.id)}>
                  {t.name.split(' ')[0]}
                </Button>
              ))}
              <Button size="sm" icon="play" onClick={playThirds}>
                All three
              </Button>
            </div>
          </div>
        </Panel>
        <Callout title="Where beats come from">
          <p>
            Two tones a little away from a simple ratio p:q each have a partial near the same frequency (the p-th of the lower
            note, the q-th of the upper). Those two partials drift in and out of phase, and you hear the loudness pulse at their
            difference in hertz. Pure ratios make the partials coincide exactly, so the beating stops. With pure sine tones there
            are no upper partials, so a mistuned third hardly beats at all: try the Pure timbre.
          </p>
          <p className="faint" style={{ fontSize: '0.88rem' }}>
            Size check: {cents(5 / 4).toFixed(2)}¢ (5:4) versus 400¢ (12-TET).
          </p>
        </Callout>
      </div>
    </div>
  );
}

function BeatPlot({ beat, p, q, lower, upper, audible }: { beat: number; p: number; q: number; lower: number; upper: number; audible: boolean }) {
  const W = 480;
  const H = 120;
  const mid = H / 2;
  const amp = H * 0.4;
  const path = useMemo(() => {
    const N = 900;
    const carrier = Math.min(120, Math.max(24, beat * 5));
    let d = '';
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      const env = Math.cos(Math.PI * beat * t);
      const v = env * Math.sin(2 * Math.PI * carrier * t);
      d += `${k === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(mid - v * amp).toFixed(1)}`;
    }
    return d;
  }, [beat, mid, amp]);
  const envPath = (sign: number) => {
    const N = 200;
    let d = '';
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      const v = Math.abs(Math.cos(Math.PI * beat * t));
      d += `${k === 0 ? 'M' : 'L'}${(t * W).toFixed(1)},${(mid - sign * v * amp).toFixed(1)}`;
    }
    return d;
  };
  return (
    <figure style={{ margin: 0 }}>
      <svg className={s.wave} style={{ height: 120 }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Beat envelope over one second: ${beat.toFixed(2)} beats per second`}>
        <line x1={0} x2={W} y1={mid} y2={mid} style={{ stroke: 'var(--rule)' }} vectorEffect="non-scaling-stroke" />
        <path d={path} fill="none" style={{ stroke: 'var(--brass)' }} strokeWidth={1} strokeOpacity={0.8} vectorEffect="non-scaling-stroke" />
        <path d={envPath(1)} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <path d={envPath(-1)} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="faint" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
        {audible
          ? `One second of partial ${p} of the lower note (${(p * lower).toFixed(1)} Hz) plus partial ${q} of the upper (${(q * upper).toFixed(1)} Hz). The envelope pulses ${beat.toFixed(2)} times per second; carrier not to scale.`
          : 'The coinciding partials are too high in the series to give clear beats.'}
      </figcaption>
    </figure>
  );
}
