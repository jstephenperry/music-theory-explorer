import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, Panel, RootPicker, Select, Tag, Toggle } from '../../components/ui';
import { Piano, type KeyMark } from '../../components/Piano';
import { useComputerKeyboard } from '../../hooks/useComputerKeyboard';
import { usePersistentState } from '../../hooks/usePersistentState';
import { makeKey } from '../../theory/keys';
import { midi as toMidi, mod, note, noteName, pc, type Note } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { voiceProgression } from '../../theory/voicing';
import {
  alongFifths,
  cents,
  circleOfPureFifths,
  degreeNotes,
  deviations,
  MEANTONE_FIFTH,
  PURE_FIFTH,
  PYTHAGOREAN_COMMA,
  SYNTONIC_COMMA,
  triadQualities,
  tunedFrequency,
  TUNING_BY_ID,
  TUNING_SYSTEMS,
  wolfFifth,
  wolfNotes,
  intervalSize,
  midiToFreqA4,
  type TuningId,
} from './tuning';
import { synth, TIMBRES, type Timbre, type ToneHandle } from './synth';
import { useTimeline, type TimelineStep } from './useTimeline';
import { formatCents } from './format';
import s from './Harmonics.module.css';

const CADENCE = ['I', 'IV', 'V', 'I'];

/** True on phone-width screens, where a two-octave keyboard is easier to play. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

function devFill(c: number): string {
  if (Math.abs(c) < 0.5) return 'var(--verdigris)';
  return c > 0 ? 'var(--accent)' : 'var(--royal)';
}

export function TuningSection({ a4 }: { a4: number }) {
  const [system, setSystem] = usePersistentState<TuningId>('harmonics:tuning-system', 'meantone');
  const [compare, setCompare] = usePersistentState<string>('harmonics:tuning-compare', 'et12');
  const [tonicName, setTonicName] = usePersistentState('harmonics:tuning-tonic', 'C');
  const [timbre, setTimbre] = usePersistentState<Timbre>('harmonics:tuning-timbre', 'organ');
  const [repeatEt, setRepeatEt] = usePersistentState('harmonics:tuning-repeat', false);
  const [showCents, setShowCents] = usePersistentState('harmonics:tuning-cents', true);
  const [held, setHeld] = useState<number[]>([]);
  const [selectedTriad, setSelectedTriad] = useState<number | null>(null);
  const tl = useTimeline(timbre);
  const narrow = useNarrow();
  const voices = useRef(new Map<number, ToneHandle>());

  const sys = TUNING_BY_ID[system] ?? TUNING_BY_ID.meantone;
  const tonic: Note = useMemo(() => note(tonicName), [tonicName]);
  const tonicPc = pc(tonic);
  const devs = useMemo(() => deviations(sys.id, tonicPc), [sys.id, tonicPc]);
  const cmpDevs = useMemo(() => (compare !== 'none' && compare !== sys.id ? deviations(compare as TuningId, tonicPc) : null), [compare, sys.id, tonicPc]);
  const names = useMemo(() => degreeNotes(sys.id, tonic), [sys.id, tonic]);
  const triads = useMemo(() => triadQualities(sys.id, tonicPc), [sys.id, tonicPc]);

  const freqOf = useCallback((m: number, id: TuningId = sys.id) => tunedFrequency(id, tonicPc, m, a4), [sys.id, tonicPc, a4]);

  // ---------- Live keyboard ----------
  const noteOn = useCallback(
    (m: number) => {
      voices.current.get(m)?.stop();
      voices.current.set(m, synth.tone(freqOf(m), { timbre, level: 0.42, attack: 0.03, release: 0.2 }));
      setHeld((h) => (h.includes(m) ? h : [...h, m]));
    },
    [freqOf, timbre],
  );
  const noteOff = useCallback((m: number) => {
    voices.current.get(m)?.stop();
    voices.current.delete(m);
    setHeld((h) => h.filter((x) => x !== m));
  }, []);
  useComputerKeyboard({ onNoteOn: noteOn, onNoteOff: noteOff }, 60);

  // Retune held notes when the system, tonic or reference changes.
  useEffect(() => {
    voices.current.forEach((v, m) => v.setFreq(freqOf(m), 0.05));
  }, [freqOf]);
  useEffect(() => {
    const map = voices.current;
    return () => {
      map.forEach((v) => v.stop());
      map.clear();
    };
  }, []);

  // ---------- Demonstrations ----------
  const withRepeat = (chords: number[][], dur: number, tagPrefix: string): TimelineStep[] => {
    const steps: TimelineStep[] = [];
    chords.forEach((c, i) => {
      const id = `${tagPrefix}${i}`;
      steps.push({ at: i * dur, dur: dur * 0.95, freqs: c.map((m) => freqOf(m)), id, keys: c });
    });
    if (repeatEt && sys.id !== 'et12') {
      const off = chords.length * dur + 0.6;
      chords.forEach((c, i) => {
        const id = `${tagPrefix}et${i}`;
        steps.push({ at: off + i * dur, dur: dur * 0.95, freqs: c.map((m) => freqOf(m, 'et12')), id, keys: c });
      });
    }
    return steps;
  };

  const tonicLow = useMemo(() => {
    // Place the tonic between G3 and F♯4 for the triad and cadence.
    const m = 55 + mod(tonicPc - 7, 12);
    return m;
  }, [tonicPc]);

  const playTriad = () => {
    const triad = [tonicLow - 12, tonicLow, tonicLow + 4, tonicLow + 7];
    tl.play(withRepeat([triad], 2.6, 'triad'), timbre, 0.7);
  };

  const cadence = useMemo(() => {
    const key = makeKey(tonic, 'major');
    const chords = CADENCE.map((r) => parseRoman(r, key));
    return voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass }))).map((v) => v.map(toMidi));
  }, [tonic]);
  const playCadence = () => tl.play(withRepeat(cadence, 1.35, 'cad'), timbre, 0.7);

  const playMajorOn = (d: number) => {
    setSelectedTriad(d);
    let root = 55 + mod(tonicPc + d - 7, 12);
    if (root > 62) root -= 12;
    tl.play(withRepeat([[root - 12, root, root + 4, root + 7]], 2.4, `maj${d}-`), timbre, 0.7);
  };

  // Wolf fifth: the chain-closing fifth in quarter-comma meantone on this tonic.
  const wolf = wolfNotes(tonic);
  const wolfLowMidi = 48 + pc(wolf.from);
  const goodLowMidi = 48 + tonicPc;
  const playWolf = (id: TuningId) => {
    const f = (m: number) => tunedFrequency(id, tonicPc, m, a4);
    tl.play(
      [
        { at: 0, dur: 2.2, freqs: [f(goodLowMidi), f(goodLowMidi + 7)], id: 'good', keys: [goodLowMidi, goodLowMidi + 7] },
        { at: 2.5, dur: 3, freqs: [f(wolfLowMidi), f(wolfLowMidi + 7)], id: 'wolf', keys: [wolfLowMidi, wolfLowMidi + 7] },
      ],
      timbre,
      0.75,
    );
  };
  const currentWolf = sys.fifth !== undefined ? intervalSize(sys.id, tonicPc, mod(pc(wolf.from) - tonicPc, 12), 7) : null;

  // Pythagorean comma: twelve pure fifths, folded into one octave, do not return home.
  const commaStart = midiToFreqA4(48 + tonicPc, a4);
  const circle = useMemo(() => circleOfPureFifths(commaStart), [commaStart]);
  const circleNames = useMemo(() => Array.from({ length: 13 }, (_, k) => noteName(alongFifths(tonic, k))), [tonic]);
  const playComma = () => {
    const steps: TimelineStep[] = [];
    circle.forEach((f, k) => {
      if (k === 0) steps.push({ at: 0, dur: 0.55, freqs: [f], id: `c${k}` });
      else steps.push({ at: k * 0.6, dur: 0.55, freqs: [circle[k - 1], f], id: `c${k}` });
    });
    const end = 13 * 0.6 + 0.4;
    steps.push({ at: end, dur: 1.4, freqs: [commaStart * 2], id: 'home' });
    steps.push({ at: end + 1.5, dur: 1.4, freqs: [circle[12]], id: 'c12' });
    steps.push({ at: end + 3.0, dur: 3.2, freqs: [commaStart * 2, circle[12]], id: 'clash' });
    tl.play(steps, timbre, 0.7);
  };

  const pressed = useMemo(() => [...held, ...tl.activeKeys], [held, tl.activeKeys]);

  const pcMarks: Record<number, KeyMark> = {};
  for (let d = 0; d < 12; d++) {
    const v = devs[d];
    pcMarks[mod(tonicPc + d, 12)] = d === 0
      ? { role: 'root', label: showCents ? '0' : noteName(names[0]) }
      : showCents
        ? { color: devFill(v), label: Math.abs(v) < 0.5 ? '0' : formatCents(v) }
        : { role: 'muted', ring: true };
  }

  const activeId = typeof tl.active === 'string' ? tl.active : '';
  const inEt = activeId.includes('et');

  return (
    <div className={s.section}>
      <Panel eyebrow="Choose a temperament" title={sys.name}>
        <div className={s.controls} style={{ marginBottom: '1rem' }}>
          <Select label="System" value={sys.id} onChange={(v) => setSystem(v as TuningId)} options={TUNING_SYSTEMS.map((t) => ({ value: t.id, label: t.short }))} />
          <Select
            label="Compare with"
            value={compare}
            onChange={setCompare}
            options={[{ value: 'none', label: 'Nothing' }, ...TUNING_SYSTEMS.filter((t) => t.id !== sys.id).map((t) => ({ value: t.id, label: t.short }))]}
          />
          <Select label="Timbre" value={timbre} onChange={(v) => setTimbre(v as Timbre)} options={TIMBRES.map((t) => ({ value: t.value, label: t.label }))} />
        </div>
        <RootPicker spellings="common" label="Tonic (the tuning is built on this note)" value={tonic} onChange={(n) => setTonicName(noteName(n, false))} />
        <p className={s.prose} style={{ margin: '1rem 0' }}>
          {sys.description}
        </p>
        <DeviationChart devs={devs} cmp={cmpDevs} cmpName={cmpDevs ? TUNING_BY_ID[compare as TuningId].short : ''} names={names.map((n) => noteName(n))} />
      </Panel>

      <Panel
        eyebrow={`Play in ${sys.short} on ${noteName(tonic)}`}
        title="The tuned keyboard"
        actions={
          <>
            <Button size="sm" variant="primary" icon="play" onClick={playTriad}>
              {noteName(tonic)} major triad
            </Button>
            <Button size="sm" icon="play" onClick={playCadence}>
              I IV V I
            </Button>
            <Button size="sm" variant="ghost" icon="stop" onClick={tl.stop} aria-label="Stop" />
          </>
        }
      >
        <div className="row" style={{ marginBottom: '0.75rem', justifyContent: 'space-between' }}>
          <div className="row">
            <Toggle label="Then repeat in 12-TET" checked={repeatEt} onChange={setRepeatEt} />
            <Toggle label="Show cents on keys" checked={showCents} onChange={setShowCents} />
          </div>
          {tl.playing && repeatEt && sys.id !== 'et12' && <Tag tone={inEt ? 'royal' : 'accent'}>{inEt ? 'Now: 12-TET' : `Now: ${sys.short}`}</Tag>}
        </div>
        <Piano from={narrow ? 60 : 48} to={84} sound={false} onNoteOn={noteOn} onNoteOff={noteOff} pcMarks={pcMarks} pressed={pressed} labels="c" ariaLabel={`Keyboard tuned in ${sys.name} on ${noteName(tonic)}`} />
        <p className="faint" style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
          Hold several keys to hear chords in this tuning, or use the computer keyboard (A W S E D F T G Y H U J K; Z and X change octave). Labels show cents from 12-TET.
        </p>
      </Panel>

      <Panel eyebrow="Key color" title={`Major triads in ${sys.short}`}>
        <p className={s.prose} style={{ marginBottom: '0.9rem' }}>
          Each cell shows how far the triad's major third and fifth are from pure (5:4 and 3:2). Click to hear it. Darker cells are rougher.
        </p>
        <div className={s.triads}>
          {triads.map((t) => {
            const rough = Math.min(1, Math.abs(t.thirdError) / 35 + Math.abs(t.fifthError) / 25);
            const isActive = selectedTriad === t.degree && tl.playing;
            const name = noteName(names[t.degree]);
            return (
              <button
                key={t.degree}
                type="button"
                className={`${s.triad} ${isActive ? s.triadActive : ''}`}
                style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(rough * 38)}%, var(--bg-elev))` }}
                onClick={() => playMajorOn(t.degree)}
                aria-label={`${name} major: third ${formatCents(t.thirdError, 1)} cents, fifth ${formatCents(t.fifthError, 1)} cents from pure`}
              >
                <span className={s.triadName}>{name}</span>
                <span className={s.triadLine}>3rd {formatCents(t.thirdError, 1)}</span>
                <span className={s.triadLine}>5th {formatCents(t.fifthError, 1)}</span>
              </button>
            );
          })}
        </div>
        <p className="faint" style={{ fontSize: '0.82rem', margin: '0.6rem 0 0' }}>
          Triads are played on the keyboard keys, so in meantone a B major chord uses the E♭ key for its D♯: the out-of-tune third is the price of a 12-key keyboard.
        </p>
      </Panel>

      <div className={s.demoGrid}>
        <Panel eyebrow="Quarter-comma meantone" title="The wolf fifth">
          <div className={s.demo}>
            <p className={s.prose}>
              Eleven meantone fifths of {MEANTONE_FIFTH.toFixed(2)}¢ leave the twelfth, from {noteName(wolf.from)} to {noteName(wolf.to)}, at{' '}
              {wolfFifth(MEANTONE_FIFTH).toFixed(2)}¢: {(wolfFifth(MEANTONE_FIFTH) - PURE_FIFTH).toFixed(1)} cents wider than pure. It howls.
            </p>
            <dl className={s.numbers}>
              <dt>Meantone fifth</dt>
              <dd>{MEANTONE_FIFTH.toFixed(2)}¢</dd>
              <dt>Meantone wolf</dt>
              <dd>{wolfFifth(MEANTONE_FIFTH).toFixed(2)}¢</dd>
              <dt>Pythagorean wolf</dt>
              <dd>{wolfFifth(PURE_FIFTH).toFixed(2)}¢</dd>
              {currentWolf !== null && sys.id !== 'meantone' && (
                <>
                  <dt>{sys.short}</dt>
                  <dd>{currentWolf.toFixed(2)}¢</dd>
                </>
              )}
            </dl>
            <div className="row" style={{ gap: '0.5rem' }}>
              <Button size="sm" variant="primary" icon="play" onClick={() => playWolf('meantone')}>
                {noteName(tonic)} to {noteName(alongFifths(tonic, 1))}, then the wolf
              </Button>
              {sys.id !== 'meantone' && (
                <Button size="sm" icon="play" onClick={() => playWolf(sys.id)}>
                  Same in {sys.short}
                </Button>
              )}
            </div>
            <div className="row" style={{ gap: '0.4rem' }}>
              <Tag tone={activeId === 'good' ? 'verdigris' : 'default'}>
                {noteName(tonic)} to {noteName(alongFifths(tonic, 1))}
              </Tag>
              <Tag tone={activeId === 'wolf' ? 'accent' : 'default'}>
                {noteName(wolf.from)} to {noteName(wolf.to)}
              </Tag>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Twelve fifths versus seven octaves" title="The Pythagorean comma">
          <div className={s.demo}>
            <p className={s.prose}>
              Stack twelve pure fifths and you should arrive back home, seven octaves up. You overshoot by (3/2)¹² ÷ 2⁷, about {PYTHAGOREAN_COMMA.toFixed(2)} cents:{' '}
              {circleNames[12]} is not {circleNames[0]}.
            </p>
            <CommaSpiral circle={circle} names={circleNames} active={activeId} />
            <div className="row" style={{ gap: '0.5rem' }}>
              <Button size="sm" variant="primary" icon="play" onClick={playComma}>
                Climb the fifths
              </Button>
              <Button size="sm" variant="ghost" icon="stop" onClick={tl.stop} aria-label="Stop" />
            </div>
            <p className="faint" style={{ fontSize: '0.82rem', margin: 0 }}>
              Each new note sounds with the previous one (a pure fifth or fourth), then {circleNames[12]} is played against {circleNames[0]}. The syntonic comma (81:80, {SYNTONIC_COMMA.toFixed(2)}¢) is its slightly smaller cousin.
            </p>
          </div>
        </Panel>
      </div>

      <Callout title="Why temper at all?">
        <p>
          Pure fifths and pure thirds cannot coexist in a 12-note octave: four pure fifths overshoot a pure third by the syntonic comma, and twelve overshoot seven octaves by the
          Pythagorean comma. Every system on this page decides where to hide those commas: in one wolf (Pythagorean, meantone), spread unevenly (Werckmeister), or evenly
          everywhere (12-TET).
        </p>
      </Callout>
    </div>
  );
}

function DeviationChart({ devs, cmp, cmpName, names }: { devs: number[]; cmp: number[] | null; cmpName: string; names: string[] }) {
  const W = 720;
  const H = 230;
  const padL = 40;
  const padR = 10;
  const top = 18;
  const bottom = 190;
  const maxAbs = Math.max(...devs.map(Math.abs), ...(cmp ?? []).map(Math.abs));
  const scale = Math.max(20, Math.ceil(maxAbs / 10) * 10);
  const mid = (top + bottom) / 2;
  const y = (v: number) => mid - (v / scale) * ((bottom - top) / 2);
  const slot = (W - padL - padR) / 12;
  const bw = Math.min(26, slot * 0.5);
  const ticks = [-scale, -scale / 2, 0, scale / 2, scale];
  return (
    <div className={s.chartWrap}>
      <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cents deviation from 12-TET for each note: ${names.map((n, i) => `${n} ${formatCents(devs[i], 1)}`).join(', ')}`} style={{ minWidth: 520 }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? 'var(--rule-strong)' : 'var(--rule)' }} strokeDasharray={t === 0 ? undefined : '2 4'} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" className={s.axisText}>
              {t === 0 ? '0' : formatCents(t)}
            </text>
          </g>
        ))}
        {devs.map((v, i) => {
          const cx = padL + slot * (i + 0.5);
          const off = cmp ? -bw * 0.28 : 0;
          const y0 = y(0);
          const y1 = y(v);
          return (
            <g key={i}>
              <rect x={cx - bw / 2 + off} y={Math.min(y0, y1)} width={bw} height={Math.max(1, Math.abs(y1 - y0))} rx={2} style={{ fill: devFill(v) }} opacity={0.85} />
              {cmp && (
                <rect
                  x={cx - bw / 2 + bw * 0.28}
                  y={Math.min(y0, y(cmp[i]))}
                  width={bw}
                  height={Math.max(1, Math.abs(y(cmp[i]) - y0))}
                  rx={2}
                  fill="none"
                  style={{ stroke: 'var(--ink-muted)' }}
                  strokeDasharray="3 2"
                  strokeWidth={1.2}
                />
              )}
              <text x={cx} y={v >= 0 ? y1 - 5 : y1 + 13} textAnchor="middle" className={s.smallText} style={{ fill: 'var(--ink)' }}>
                {Math.abs(v) < 0.05 ? '0' : formatCents(v, 1)}
              </text>
              <text x={cx} y={H - 18} textAnchor="middle" className={s.labelText}>
                {names[i]}
              </text>
            </g>
          );
        })}
        {cmp && (
          <g>
            <rect x={W - padR - 150} y={2} width={12} height={10} fill="none" style={{ stroke: 'var(--ink-muted)' }} strokeDasharray="3 2" />
            <text x={W - padR - 134} y={11} className={s.axisText}>
              {cmpName}
            </text>
          </g>
        )}
        <text x={padL} y={H - 2} className={s.axisText}>
          Cents from 12-TET, with the tonic tuned to its 12-TET pitch
        </text>
      </svg>
    </div>
  );
}

function CommaSpiral({ circle, names, active }: { circle: number[]; names: string[]; active: string }) {
  const S = 340;
  const c = S / 2;
  const pts = circle.map((f, k) => {
    const ce = cents(f / circle[0]);
    const ang = ((ce % 1200) / 1200) * Math.PI * 2 - Math.PI / 2;
    const r = 96 + k * 3.2;
    return { x: c + r * Math.cos(ang), y: c + r * Math.sin(ang), lx: c + (r + 20) * Math.cos(ang), ly: c + (r + 20) * Math.sin(ang), k };
  });
  const activeK = active.startsWith('c') ? Number(active.slice(1)) : active === 'home' ? 0 : active === 'clash' ? 12 : -1;
  return (
    <div className={s.figure}>
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Twelve pure fifths drawn around a circle of one octave; the thirteenth note lands past the starting point by the Pythagorean comma">
        <circle cx={c} cy={c} r={96} fill="none" style={{ stroke: 'var(--rule)' }} />
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" style={{ stroke: 'var(--brass)' }} strokeWidth={1} strokeOpacity={0.3} />
        <line x1={pts[0].x} y1={pts[0].y} x2={pts[12].x} y2={pts[12].y} style={{ stroke: 'var(--accent)' }} strokeWidth={2} />
        {pts.map((p) => {
          const on = p.k === activeK || (active === 'clash' && p.k === 0);
          const isEnd = p.k === 12 || p.k === 0;
          return (
            <g key={p.k}>
              <circle cx={p.x} cy={p.y} r={on ? 6 : 4} style={{ fill: on ? 'var(--accent)' : isEnd ? 'var(--royal)' : 'var(--brass)' }} />
              <text x={p.lx} y={p.ly + 4} textAnchor="middle" className={s.smallText} style={{ fill: isEnd ? 'var(--ink)' : undefined, fontWeight: isEnd ? 700 : 400 }}>
                {names[p.k]}
              </text>
            </g>
          );
        })}
        <text x={c} y={c - 4} textAnchor="middle" className={s.labelText}>
          {PYTHAGOREAN_COMMA.toFixed(2)}¢
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className={s.axisText}>
          gap after 12 fifths
        </text>
      </svg>
    </div>
  );
}
