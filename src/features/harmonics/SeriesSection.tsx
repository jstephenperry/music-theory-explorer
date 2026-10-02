import { useMemo, useState } from 'react';
import { Button, Callout, Panel, PlayButton, RootPicker, Segmented, Stat, Tag, Legend } from '../../components/ui';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { note, noteName, pitchName, withOctave, type Note } from '../../theory/notes';
import { usePersistentState } from '../../hooks/usePersistentState';
import { chunk, compoundName, formatCents } from './format';
import { harmonicSeries, midiToFreqA4, type Partial } from './tuning';
import { synth } from './synth';
import { useTimeline } from './useTimeline';
import s from './Harmonics.module.css';

const OCTAVES = [1, 2, 3, 4].map((o) => ({ value: o, label: String(o) }));

const CHORD_PRESETS: Array<{ label: string; parts: number[]; title: string }> = [
  { label: '4:5:6', parts: [4, 5, 6], title: 'A just major triad' },
  { label: '4:5:6:7', parts: [4, 5, 6, 7], title: 'The barbershop dominant seventh, tuned 4:5:6:7' },
  { label: '10:12:15', parts: [10, 12, 15], title: 'A just minor triad' },
  { label: '8 to 14', parts: [8, 9, 10, 11, 12, 13, 14], title: 'The overtone (acoustic) scale' },
  { label: '1 to 6', parts: [1, 2, 3, 4, 5, 6], title: 'The first six partials' },
];

function devClass(c: number): string {
  if (Math.abs(c) < 5) return s.pure;
  return c > 0 ? s.sharp : s.flat;
}

function devRole(c: number): string {
  if (Math.abs(c) < 5) return 'ink';
  return c > 0 ? 'accent' : 'royal';
}

function devFill(c: number): string {
  if (Math.abs(c) < 5) return 'var(--verdigris)';
  return c > 0 ? 'var(--accent)' : 'var(--royal)';
}

export function SeriesSection({ a4 }: { a4: number }) {
  const [rootName, setRootName] = usePersistentState('harmonics:series-root', 'C');
  const [octave, setOctave] = usePersistentState('harmonics:series-octave', 2);
  const [chosen, setChosen] = usePersistentState<number[]>('harmonics:series-chord', [4, 5, 6]);
  const [focus, setFocus] = useState(7);
  const tl = useTimeline('sine');

  const root: Note = useMemo(() => note(rootName), [rootName]);
  const fundamental = useMemo(() => withOctave(root, octave), [root, octave]);
  const series = useMemo(() => harmonicSeries(fundamental, a4, 16), [fundamental, a4]);
  const f = series[focus - 1];
  const active = typeof tl.active === 'number' ? tl.active : null;

  const playPartial = (p: Partial) => {
    setFocus(p.n);
    tl.play([{ at: 0, dur: 1.4, freqs: [p.freq], id: p.n }], 'sine', 0.75);
  };
  const playArpeggio = () => {
    tl.play(
      series.map((p, i) => ({ at: i * 0.32, dur: 0.6, freqs: [p.freq], id: p.n })),
      'sine',
      0.7,
    );
  };
  const playTogether = () => {
    const parts = [...new Set([1, ...chosen])].sort((a, b) => a - b);
    tl.play([{ at: 0, dur: 3, freqs: parts.map((n) => series[n - 1].freq), id: 'chord' }], 'sine', 0.85);
  };
  const playChosenArp = () => {
    const parts = [...new Set([1, ...chosen])].sort((a, b) => a - b);
    tl.play(
      [
        ...parts.map((n, i) => ({ at: i * 0.4, dur: parts.length * 0.4 - i * 0.4 + 1.6, freqs: [series[n - 1].freq], id: n })),
      ],
      'sine',
      0.75,
    );
  };
  const compareTempered = (p: Partial) => {
    const et = midiToFreqA4(p.midi, a4);
    tl.play(
      [
        { at: 0, dur: 1.1, freqs: [p.freq], id: p.n },
        { at: 1.25, dur: 1.1, freqs: [et], id: 'et' },
        { at: 2.5, dur: 2.2, freqs: [p.freq, et], id: 'both' },
      ],
      'sine',
      0.75,
    );
  };

  const toggle = (n: number) => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n].sort((a, b) => a - b)));

  // ---------- Spectrum chart geometry ----------
  const W = 720;
  const H = 250;
  const padL = 12;
  const padR = 12;
  const top = 46;
  const base = 196;
  const slot = (W - padL - padR) / 16;
  const barW = Math.min(30, slot * 0.62);

  // Two separate staves (bass for partials below middle C, treble above) so every note keeps both labels.
  const toEvent = (p: Partial) => ({
    keys: [p.pitch],
    duration: 'q' as const,
    top: String(p.n),
    bottom: Math.abs(p.deviation) < 0.5 ? '0' : formatCents(p.deviation),
    keyColors: [devRole(p.deviation)],
  });
  const lowParts = series.filter((p) => p.midi < 60);
  const highParts = series.filter((p) => p.midi >= 60);

  const marks: Record<number, KeyMark> = {};
  series.forEach((p) => {
    marks[p.midi] = { role: p.n === 1 ? 'root' : 'tone', color: p.n === 1 ? undefined : devFill(p.deviation), label: String(p.n) };
  });
  const lowKey = Math.floor(series[0].midi / 12) * 12;
  const highKey = Math.max(lowKey + 24, series[15].midi);
  const pressed = active !== null ? [series[active - 1]?.midi].filter((x): x is number => x !== undefined) : [];

  return (
    <div className={s.section}>
      <Panel
        eyebrow="Partials above a fundamental"
        title={`The harmonic series on ${pitchName(fundamental)}`}
        actions={<PlayButton playing={tl.playing} onPlay={playArpeggio} onStop={tl.stop} label="Play 1 to 16" />}
      >
        <div className={`${s.controls} block`}>
          <RootPicker spellings="common" label="Fundamental" value={root} onChange={(n) => setRootName(noteName(n, false))} />
          <div>
            <div className={`${s.refLabel} ${s.labelGap}`}>
              Octave
            </div>
            <Segmented ariaLabel="Octave of the fundamental" options={OCTAVES} value={octave} onChange={setOctave} size="sm" />
          </div>
          <Stat label="Fundamental" value={`${series[0].freq.toFixed(2)} Hz`} />
        </div>

        <div className={s.chartWrap}>
          <svg className={`${s.chart} ${s.chartWide}`} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Spectrum of the first 16 partials of ${pitchName(fundamental)}. Click a bar to hear a partial.`}>
            <line x1={padL} x2={W - padR} y1={base} y2={base} stroke="var(--rule-strong)" strokeWidth={1} />
            {series.map((p, i) => {
              const cx = padL + slot * (i + 0.5);
              const amp = 1 / Math.sqrt(p.n);
              const h = (base - top) * amp;
              const isActive = active === p.n;
              const isFocus = focus === p.n;
              const fill = isActive ? 'var(--accent)' : p.n === 1 ? 'var(--accent)' : 'var(--brass)';
              return (
                <g
                  key={p.n}
                  className={s.bar}
                  role="button"
                  tabIndex={0}
                  aria-label={`Partial ${p.n}: ${pitchName(p.pitch)}, ${p.freq.toFixed(1)} hertz, ${formatCents(p.deviation)} cents from equal temperament`}
                  onClick={() => playPartial(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playPartial(p);
                    }
                  }}
                >
                  <rect x={cx - slot / 2} y={8} width={slot} height={H - 8} fill="transparent" />
                  <rect
                    className={s.barBody}
                    x={cx - barW / 2}
                    y={base - h}
                    width={barW}
                    height={h}
                    rx={3}
                    style={{ fill, opacity: isActive ? 1 : isFocus ? 0.95 : 0.7 }}
                  />
                  {chosen.includes(p.n) && <circle cx={cx} cy={base - 9} r={4} style={{ fill: 'var(--bg-elev)', stroke: 'var(--verdigris)' }} strokeWidth={2} />}
                  <text x={cx} y={base - h - 28} textAnchor="middle" className={s.labelText} style={isFocus ? { fill: 'var(--accent)' } : undefined}>
                    {noteName(p.pitch)}
                  </text>
                  <text x={cx} y={base - h - 15} textAnchor="middle" className={s.smallText} style={{ fill: devFill(p.deviation) }}>
                    {Math.abs(p.deviation) < 0.5 ? '' : formatCents(p.deviation)}
                  </text>
                  <text x={cx} y={base + 16} textAnchor="middle" className={s.labelText}>
                    {p.n}
                  </text>
                  <text x={cx} y={base + 31} textAnchor="middle" className={s.axisText}>
                    {p.freq >= 1000 ? `${(p.freq / 1000).toFixed(2)}k` : p.freq.toFixed(0)}
                  </text>
                  {isFocus && <line x1={cx - barW / 2} x2={cx + barW / 2} y1={base + 3} y2={base + 3} stroke="var(--accent)" strokeWidth={2} />}
                </g>
              );
            })}
            <text x={W - padR} y={H - 2} textAnchor="end" className={s.axisText}>
              Partial number and frequency (Hz). Bar height shows a typical 1/√n amplitude.
            </text>
          </svg>
        </div>
        <Legend
          className={s.chartLegend}
          items={[
            { color: 'var(--royal)', label: 'Flat of 12-TET' },
            { color: 'var(--accent)', label: 'Sharp of 12-TET' },
            { color: 'var(--verdigris)', label: 'Within 5 cents' },
          ]}
          note="Click any bar, note or key to hear it."
        />
      </Panel>

      <div className={s.grid2}>
        <Panel eyebrow="On the staff" title="Nearest notes and their deviations">
          {lowParts.length > 0 && (
            <Staff
              clef="bass"
              events={lowParts.map(toEvent)}
              activeIndex={active !== null && active <= lowParts.length ? active - 1 : null}
              onEventClick={(i) => playPartial(lowParts[i])}
              eventWidth={34}
              ariaLabel={`Bass staff with partials 1 to ${lowParts.length} of ${pitchName(fundamental)}, cents deviation below each note`}
            />
          )}
          {highParts.length > 0 && (
            <Staff
              clef="treble"
              measures={chunk(highParts.map(toEvent), 4).map((events) => ({ events }))}
              finalBarline={false}
              activeIndex={active !== null && active > lowParts.length ? active - 1 - lowParts.length : null}
              onEventClick={(i) => playPartial(highParts[i])}
              eventWidth={34}
              ariaLabel={`Treble staff with partials ${lowParts.length + 1} to 16 of ${pitchName(fundamental)}, cents deviation below each note`}
            />
          )}
          <p className="note block">
            Numbers above are partials; numbers below are cents from 12-tone equal temperament.
          </p>
          <Piano from={lowKey} to={highKey} marks={marks} pressed={pressed} labels="c" ariaLabel="Keyboard with the nearest key of each partial marked by its number" />
        </Panel>

        <Panel eyebrow={`Partial ${f.n}`} title={f.n === 1 ? 'The fundamental' : compoundName(f.interval)}>
          <div className={s.detail}>
            <div className={s.detailHead}>
              <span className={s.bigNote}>{pitchName(f.pitch)}</span>
              <span className={`${devClass(f.deviation)} ${s.devBig}`}>
                {Math.abs(f.deviation) < 0.05 ? 'exactly in tune' : `${formatCents(f.deviation, 1)} cents`}
              </span>
            </div>
            <div className={s.stats}>
              <Stat label="Frequency" value={`${f.freq.toFixed(1)} Hz`} />
              <Stat label="Ratio" value={`${f.n}:1`} />
              <Stat label="Above fundamental" value={`${f.centsAbove.toFixed(1)}¢`} />
            </div>
            <PartialNote p={f} />
            <div className="row">
              <Button size="sm" icon="play" onClick={() => playPartial(f)}>
                Partial
              </Button>
              <Button size="sm" icon="sound" onClick={() => compareTempered(f)} disabled={f.n === 1}>
                Compare with 12-TET
              </Button>
              <Button size="sm" icon="chevron-left" onClick={() => setFocus(Math.max(1, f.n - 1))} aria-label="Previous partial" />
              <Button size="sm" icon="chevron-right" onClick={() => setFocus(Math.min(16, f.n + 1))} aria-label="Next partial" />
            </div>
          </div>
          <hr className="rule" />
          <div className={s.detail}>
            <div className={s.refLabel}>Sound partials together</div>
            <div className={s.chips} role="group" aria-label="Choose partials to sound with the fundamental">
              {series.map((p) => (
                <button key={p.n} type="button" className={`${s.chip} ${chosen.includes(p.n) ? s.chipOn : ''}`} aria-pressed={chosen.includes(p.n)} onClick={() => toggle(p.n)} title={pitchName(p.pitch)}>
                  {p.n}
                </button>
              ))}
            </div>
            <div className="row row-tight">
              {CHORD_PRESETS.map((c) => (
                <Button key={c.label} size="sm" variant="ghost" title={c.title} onClick={() => setChosen(c.parts)}>
                  {c.label}
                </Button>
              ))}
            </div>
            <div className="row">
              <Button variant="primary" size="sm" icon="play" onClick={playTogether}>
                Fundamental + selected
              </Button>
              <Button size="sm" onClick={playChosenArp}>
                Build up one by one
              </Button>
              <Button size="sm" variant="ghost" icon="stop" onClick={() => {
                tl.stop();
                synth.stopAll();
              }}>
                Stop
              </Button>
            </div>
          </div>
        </Panel>
      </div>
      <Callout title="Partials, timbre and consonance">
        <p>
          Timbre is the balance of partials, and consonance is partials lining up: in a 3:2 fifth every second partial of
          the upper note meets every third partial of the lower one. Tuning systems are different compromises, because
          these whole-number ratios do not fit into twelve equal steps.
        </p>
      </Callout>
    </div>
  );
}

function PartialNote({ p }: { p: Partial }) {
  const notes: Record<number, string> = {
    1: 'The pitch we name the note by. Every other partial is a whole-number multiple of its frequency.',
    2: 'An octave: the 2:1 ratio. Octaves are pure in every tuning system.',
    3: 'A perfect twelfth (octave plus fifth). The 3:2 fifth between partials 2 and 3 is only 2 cents wider than the tempered fifth.',
    5: 'A major third two octaves up, 14 cents flat of 12-TET. The 5:4 just third beats less than the piano\'s.',
    7: 'The harmonic seventh, 31 cents flat of a tempered B♭ above C. Barbershop quartets tune their dominant sevenths to it.',
    9: 'A major second (9:8 above the octave of the fundamental), 4 cents sharp.',
    11: 'Almost exactly halfway between a fourth and a tritone: no 12-TET key comes close.',
    13: 'Between a minor and a major sixth, 41 cents sharp of the minor sixth.',
    15: 'The major seventh, 12 cents flat: 15:8 is the just major seventh.',
  };
  const text =
    notes[p.n] ??
    (Number.isInteger(Math.log2(p.n))
      ? 'Another octave of the fundamental, exactly in tune.'
      : `An octave above partial ${p.n / 2}, so it deviates from 12-TET by the same amount.`);
  return (
    <p className="serif muted flush">
      {text} {p.n > 1 && <Tag tone={Math.abs(p.deviation) < 5 ? 'verdigris' : p.deviation > 0 ? 'accent' : 'royal'}>{Math.abs(p.deviation) < 5 ? 'close to 12-TET' : p.deviation > 0 ? 'sharp' : 'flat'}</Tag>}
    </p>
  );
}
