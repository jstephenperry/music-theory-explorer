import { useEffect, useState } from 'react';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { Button, Callout, Legend, Panel, PageHeader, RootPicker, Stat, Tag, Toggle } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import type { SeqEvent } from '../../audio/sequencer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { interval, intervalLongName, intervalName, simplifyInterval, transposePitch, type Interval } from '../../theory/intervals';
import { midi, midiToFreq, noteName, pitchName, pitchNear, type Note, type Pitch } from '../../theory/notes';
import {
  ALTERED_INTERVALS,
  ALTERNATIVE_RATIOS,
  COMPOUND_INTERVALS,
  PRIMARY_INTERVALS,
  classifyConsonance,
  compareTuning,
  contextFor,
  enharmonicSpellings,
  inversionOf,
  isCompound,
  parseState,
  spellFromKeys,
} from './intervalLogic';
import { MELODIC_REFERENCES } from './references';
import { Staircase } from './Staircase';
import { useUrlParams } from '../../hooks/useUrlState';
import s from './IntervalsPage.module.css';

interface PlayData {
  /** Staff event index: 0 lower note, 1 upper note, 2 both. */
  index: number;
  midi: number[];
  tag?: string;
}

const CLASS_TONE = { 'perfect consonance': 'verdigris', 'imperfect consonance': 'royal', dissonance: 'plum' } as const;

function useNarrow(px: number): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

function fmtCents(c: number): string {
  return c.toFixed(1);
}

export default function IntervalsPage() {
  const [params, setParams] = useUrlParams({ root: 'C', oct: '4', iv: 'M3' });
  const { lower, iv } = parseState(params.root, params.oct, params.iv);
  const root: Note = { letter: lower.letter, acc: lower.acc };
  const upper = transposePitch(lower, iv);
  const lo = midi(lower);
  const hi = midi(upper);
  const name = intervalName(iv);
  const longName = intervalLongName(iv);

  const [showCompound, setShowCompound] = usePersistentState<boolean>('intervals.compound', false);
  const [showAltered, setShowAltered] = usePersistentState<boolean>('intervals.altered', false);
  const [pending, setPending] = useState<number | null>(null);
  const player = usePlayer();
  const narrow = useNarrow(640);
  const data = player.playing ? (player.activeData as PlayData | null) : null;

  const setState = (p: Pitch, i: Interval, play = true) => {
    setParams({ root: noteName(p, false), oct: String(p.octave), iv: intervalName(i) });
    if (play) playSequence(p, i, 'updown');
  };

  // ---- Playback ----
  function playSequence(p: Pitch, i: Interval, how: 'up' | 'down' | 'together' | 'updown') {
    const a = midi(p);
    const b = midi(transposePitch(p, i));
    const ev = (time: number, notes: number[], index: number, duration = 0.95): SeqEvent => ({ time, duration, midi: notes, data: { index, midi: notes } satisfies PlayData });
    let events: SeqEvent[];
    if (how === 'up') events = [ev(0, [a], 0), ev(1, [b], 1, 1.6)];
    else if (how === 'down') events = [ev(0, [b], 1), ev(1, [a], 0, 1.6)];
    else if (how === 'together') events = [ev(0, [a, b], 2, 2.4)];
    else events = [ev(0, [a], 0), ev(1, [b], 1), ev(2.2, [a, b], 2, 2.2)];
    player.play(events, { bpm: 100 });
  }

  const tuning = compareTuning(iv);
  const playTuning = () => {
    if (!tuning) return;
    const f = midiToFreq(lo, audio.a4);
    const tempered = f * 2 ** (iv.semis / 12);
    const just = (f * tuning.ratio.n) / tuning.ratio.d;
    const events: SeqEvent[] = [
      { time: 0, duration: 2.6, freqs: [f, tempered], velocity: 0.55, data: { index: 2, midi: [lo, hi], tag: 'equal' } satisfies PlayData },
      { time: 3.2, duration: 2.6, freqs: [f, just], velocity: 0.55, data: { index: 2, midi: [lo, hi], tag: 'just' } satisfies PlayData },
    ];
    player.play(events, { bpm: 60 });
  };

  // ---- Piano ----
  const onKeyClick = (m: number) => {
    if (pending === null) {
      setPending(m);
      return;
    }
    const next = spellFromKeys(pending, m, root);
    setPending(null);
    setParams({ root: noteName(next.lower, false), oct: String(next.lower.octave), iv: intervalName(next.iv) });
    window.setTimeout(() => playSequence(next.lower, next.iv, 'together'), 250);
  };

  const marks: Record<number, KeyMark> = {};
  if (pending !== null) {
    marks[pending] = { role: 'other', label: '1st' };
  } else {
    marks[lo] = { role: 'root', label: noteName(lower) };
    if (hi !== lo) marks[hi] = { role: 'tone', label: noteName(upper) };
  }
  const baseTo = showCompound || hi > 84 ? 96 : 84;
  const pianoFrom = narrow ? Math.min(lo - 2, 53) : Math.min(48, lo);
  const pianoTo = narrow ? Math.max(hi + 2, 77) : Math.max(baseTo, hi);

  // ---- Interval sets ----
  const gridSets = [
    { label: 'Simple intervals', names: PRIMARY_INTERVALS },
    ...(showAltered ? [{ label: 'Augmented and diminished spellings', names: ALTERED_INTERVALS }] : []),
    ...(showCompound ? [{ label: 'Compound intervals', names: COMPOUND_INTERVALS }] : []),
  ];
  const shownNames = [...PRIMARY_INTERVALS, ...(showAltered ? ALTERED_INTERVALS : []), ...(showCompound ? COMPOUND_INTERVALS : [])];
  const stairIntervals = (shownNames.includes(name) ? shownNames : [...shownNames, name]).map(interval).sort((a, b) => a.semis - b.semis || a.num - b.num);

  const consonance = classifyConsonance(iv);
  const inversion = inversionOf(iv);
  const simple = simplifyInterval(iv);
  const spellings = enharmonicSpellings(iv.semis);
  const words = longName.split(' ');
  const genericWord = words[words.length - 1];
  const qualityWord = words.slice(0, -1).join(' ');
  const refSemis = iv.semis === 0 ? 0 : iv.semis % 12 === 0 ? 12 : iv.semis % 12;
  const refs = MELODIC_REFERENCES[refSemis];
  const alternatives = ALTERNATIVE_RATIOS[intervalName(simple)];
  const isSel = (n: string) => intervalName(iv) === n;

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Pitch & Scale"
        title="Intervals"
        lede="The distance between two notes, named by its letter span and its exact size. Pick a root and an interval, or click any two keys, then hear it, see it on the staff, and compare how it is spelled and tuned."
      />

      <Panel className={s.chooser}>
        <div className={s.chooserTop}>
          <div className={s.rootFix}>
          <RootPicker
            label="Lower note"
            value={root}
            onChange={(n) => {
              const p = pitchNear(n, lo);
              setState(p.octave < 2 ? { ...p, octave: p.octave + 1 } : p, iv);
            }}
          />
          </div>
          <div className={s.toggles}>
            <Toggle label="Augmented and diminished spellings" checked={showAltered} onChange={setShowAltered} />
            <Toggle label="Compound intervals (to two octaves)" checked={showCompound} onChange={setShowCompound} />
          </div>
        </div>
        {gridSets.map((g) => (
          <div key={g.label} className={s.gridGroup}>
            <div className={s.subhead}>{g.label}</div>
            <div className={s.grid} role="radiogroup" aria-label={g.label}>
              {g.names.map((n) => {
                const i = interval(n);
                const cls = classifyConsonance(i).cls;
                return (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={isSel(n)}
                    className={`${s.ivButton} ${s[`cls-${CLASS_TONE[cls]}`]} ${isSel(n) ? s.ivButtonActive : ''}`}
                    onClick={() => setState(lower, i)}
                    title={intervalLongName(i)}
                  >
                    <span className={s.ivName}>{n}</span>
                    <span className={s.ivNote}>{noteName(transposePitch(lower, i))}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Panel>

      <Panel
        title={
          <span>
            {name} <span className={s.titleLong}>{longName}</span>
          </span>
        }
        eyebrow={`${pitchName(lower)} to ${pitchName(upper)}`}
        actions={
          <div className={s.playRow}>
            <Button size="sm" icon="play" onClick={() => playSequence(lower, iv, 'up')}>
              Ascending
            </Button>
            <Button size="sm" icon="play" onClick={() => playSequence(lower, iv, 'down')}>
              Descending
            </Button>
            <Button size="sm" variant="primary" icon="play" onClick={() => playSequence(lower, iv, 'together')}>
              Together
            </Button>
          </div>
        }
      >
        <div className="stack">
          <Piano from={pianoFrom} to={pianoTo} marks={marks} pressed={data?.midi ?? []} onKeyClick={onKeyClick} ariaLabel={`Piano with ${pitchName(lower)} and ${pitchName(upper)} marked`} />
          <div className={s.pianoHint} aria-live="polite">
            {pending === null ? (
              <>Click any two keys to measure the interval between them.</>
            ) : (
              <>
                First note: <strong>{pitchName(spellFromKeys(pending, pending, root).lower)}</strong>. Now click the second key.{' '}
                <button className={s.linkButton} onClick={() => setPending(null)}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className={s.mainGrid}>
            <div className="stack">
              <Staff
                clef="auto"
                events={[
                  { keys: [lower], duration: 'h', bottom: noteName(lower) },
                  { keys: [upper], duration: 'h', bottom: noteName(upper) },
                  { keys: hi === lo && upper.letter === lower.letter && upper.acc === lower.acc ? [lower] : [lower, upper], duration: 'w', bottom: name },
                ]}
                activeIndex={data && !data.tag ? data.index : data?.tag ? 2 : null}
                onEventClick={(i) => playSequence(lower, iv, i === 0 ? 'up' : i === 1 ? 'down' : 'together')}
                eventWidth={70}
                ariaLabel={`${longName} from ${pitchName(lower)} to ${pitchName(upper)}, melodic then harmonic`}
              />
              <div className={s.staffCaption}>
                <span>Melodic</span>
                <span>Harmonic</span>
              </div>
            </div>
            <div className={s.facts}>
              <Stat size="sm" label="Semitones" value={String(iv.semis)} />
              <Stat size="sm" label="Generic size" value={`${iv.num} (${genericWord})`} />
              <Stat size="sm" label="Quality" value={qualityWord} />
              <Stat
                size="sm"
                label="Inversion"
                value={
                  <button
                    className={s.linkButton}
                    title="Invert: move the lower note up an octave"
                    onClick={() => {
                      const newLower = transposePitch(lower, simple);
                      setState(newLower, inversion);
                    }}
                  >
                    {intervalName(inversion)} ({intervalLongName(inversion)})
                  </button>
                }
              />
              <Stat
                size="sm"
                label="Simple or compound"
                value={isCompound(iv) ? `compound: ${intervalName(simple)} plus ${Math.round((iv.semis - simple.semis) / 12) === 1 ? 'an octave' : 'two octaves'}` : 'simple'}
              />
              <Stat size="sm" label="Consonance" value={<Tag tone={CLASS_TONE[consonance.cls]}>{consonance.cls}</Tag>} />
              {consonance.note && <p className={s.factNote}>{consonance.note}</p>}
            </div>
          </div>
        </div>
      </Panel>

      {tuning && (
        <Panel title="Just intonation and equal temperament" eyebrow="Tuning">
          <div className={s.tuning}>
            <div className={s.tuningFacts}>
              <Stat
                size="sm"
                label="Just ratio"
                value={
                  <span className={s.ratio}>
                    {tuning.ratio.n}:{tuning.ratio.d}
                  </span>
                }
              />
              <Stat size="sm" label="Just" value={`${fmtCents(tuning.justCents)} ¢`} />
              <Stat size="sm" label="Equal tempered" value={`${tuning.equalCents} ¢`} />
              <Stat size="sm" label="Difference" value={`${tuning.difference >= 0 ? '+' : '−'}${fmtCents(Math.abs(tuning.difference))} ¢`} />
            </div>
            <Gauge diff={tuning.difference} />
            <p className={s.tuningText}>
              {Math.abs(tuning.difference) < 0.05
                ? 'Equal temperament tunes this interval exactly pure.'
                : `The piano's equal-tempered ${name} is ${fmtCents(Math.abs(tuning.difference))} cents ${tuning.difference > 0 ? 'wider' : 'narrower'} than the pure ${tuning.ratio.n}:${tuning.ratio.d}.`}{' '}
              Play both and listen for the slow beating in the tempered version.
              {alternatives && ` Other ratios sometimes quoted: ${alternatives.map((a) => `${a.n}:${a.d} (${a.note})`).join(', ')}.`}
            </p>
            <div className={s.playRow}>
              <Button icon="play" onClick={playTuning}>
                Equal, then just
              </Button>
              {data?.tag && <Tag tone="brass">{data.tag === 'equal' ? 'Now: equal tempered' : 'Now: just'}</Tag>}
            </div>
          </div>
        </Panel>
      )}

      <Panel title={`Every interval above ${noteName(root)}`} eyebrow="Staircase">
        <Staircase root={root} intervals={stairIntervals} selected={iv} onSelect={(i) => setState(lower, i)} />
        <Legend
          className={s.staircaseLegend}
          items={[
            { color: 'var(--verdigris)', label: 'Perfect consonance' },
            { color: 'var(--royal)', label: 'Imperfect consonance' },
            { color: 'var(--plum)', label: 'Dissonance' },
          ]}
          note="Step height is the size in semitones; steps of equal height are enharmonic spellings."
        />
      </Panel>

      <div className={s.twoCol}>
        <Panel title="Enharmonic spellings" eyebrow="Same keys, different letter names">
          <div className="stack">
            <p className={s.lead}>
              {pitchName(lower)} and the key {iv.semis} semitone{iv.semis === 1 ? '' : 's'} above it can be spelled {spellings.length} ways. The sound is identical on a piano;
              the spelling tells you where the notes come from and where they tend to resolve.
            </p>
            <div className={s.spellings}>
              {spellings.map((sp) => {
                const n = intervalName(sp);
                const up = transposePitch(lower, sp);
                const ctx = contextFor(root, sp);
                const cls = classifyConsonance(sp).cls;
                const current = isSel(n);
                return (
                  <div key={n} className={`${s.spelling} ${current ? s.spellingActive : ''}`}>
                    <div className={s.spellingHead}>
                      <div>
                        <div className={s.spellingName}>
                          {noteName(lower)} to {noteName(up)}: {n}
                        </div>
                        <div className={s.spellingLong}>
                          {intervalLongName(sp)} <Tag tone={CLASS_TONE[cls]}>{cls}</Tag>
                        </div>
                      </div>
                      <div className={s.playRow}>
                        <Button size="sm" variant="ghost" icon="play" aria-label={`Play ${intervalLongName(sp)}`} onClick={() => playSequence(lower, sp, 'updown')} />
                        {!current && (
                          <Button size="sm" onClick={() => setState(lower, sp, false)}>
                            Use
                          </Button>
                        )}
                      </div>
                    </div>
                    <Staff clef="auto" events={[{ keys: [lower, up], duration: 'w' }]} eventWidth={60} ariaLabel={`${noteName(lower)} and ${noteName(up)} as ${intervalLongName(sp)}`} />
                    {ctx && <p className={s.context}>{ctx.text}</p>}
                  </div>
                );
              })}
            </div>
            <Callout title="Spelling and resolution">
              Interval names count letters, not keys. An augmented interval usually expands outward when it resolves and a diminished one contracts inward, so {noteName(root)} to{' '}
              {noteName(transposePitch(lower, spellings[0]))} and {noteName(root)} to {noteName(transposePitch(lower, spellings[spellings.length - 1]))} lead to different places
              even though your fingers press the same keys.
            </Callout>
          </div>
        </Panel>

        <Panel title="Melodic references" eyebrow="Tunes that begin with this interval">
          <div className="stack">
            {iv.semis === 0 ? (
              <p className={s.lead}>A unison has no melodic leap: both notes are the same pitch.</p>
            ) : (
              <>
                {isCompound(iv) && <p className={s.lead}>Compound intervals are easiest to hear as the simple interval plus an octave. These tunes use the {intervalName(simple)} it reduces to.</p>}
                <RefList title={`${intervalName(simple)} up`} items={refs.up} onPlay={() => playSequence(lower, iv, 'up')} />
                <RefList title={`${intervalName(simple)} down`} items={refs.down} onPlay={() => playSequence(lower, iv, 'down')} />
                <p className={s.refNote}>References depend on sound only, so enharmonic spellings share them. Sing the opening of the tune, then check it against the buttons.</p>
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RefList({ title, items, onPlay }: { title: string; items: Array<{ title: string; where: string }>; onPlay: () => void }) {
  return (
    <div>
      <div className={s.refHead}>
        <span className={s.subhead}>{title}</span>
        <Button size="sm" variant="ghost" icon="play" aria-label={`Play ${title}`} onClick={onPlay} />
      </div>
      {items.length === 0 ? (
        <p className={s.refNone}>No widely known tune; try singing the inversion instead.</p>
      ) : (
        <ul className={s.refList}>
          {items.map((r) => (
            <li key={r.title}>
              <span className={s.refTitle}>{r.title}</span>
              <span className={s.refWhere}>{r.where}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A ±50 cent gauge showing how far equal temperament sits from the just ratio. */
function Gauge({ diff }: { diff: number }) {
  const clamped = Math.max(-50, Math.min(50, diff));
  const x = 10 + ((clamped + 50) / 100) * 280;
  return (
    <svg className={s.gauge} viewBox="0 0 300 54" role="img" aria-label={`Equal temperament differs from just intonation by ${diff.toFixed(1)} cents`}>
      <line x1={10} x2={290} y1={26} y2={26} style={{ stroke: 'var(--rule-strong)' }} strokeWidth={1} />
      {[-50, -25, 0, 25, 50].map((c) => {
        const cx = 10 + ((c + 50) / 100) * 280;
        return (
          <g key={c}>
            <line x1={cx} x2={cx} y1={c === 0 ? 14 : 20} y2={c === 0 ? 38 : 32} style={{ stroke: c === 0 ? 'var(--verdigris)' : 'var(--rule-strong)' }} strokeWidth={c === 0 ? 2 : 1} />
            <text x={cx} y={50} textAnchor="middle" className={s.gaugeText} style={{ fill: 'var(--ink-faint)' }}>
              {c > 0 ? `+${c}` : c}
            </text>
          </g>
        );
      })}
      <text x={10 + 140} y={10} textAnchor="middle" className={s.gaugeText} style={{ fill: 'var(--verdigris)' }}>
        just
      </text>
      <circle cx={x} cy={26} r={6} style={{ fill: 'var(--accent)' }} />
    </svg>
  );
}
