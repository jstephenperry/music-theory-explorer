import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, PageHeader, Panel, Segmented, Select, Slider, Stat, Tabs, Toggle } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { usePlayer } from '../../audio/usePlayer';
import type { SeqEvent } from '../../audio/sequencer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlState } from '../../hooks/useUrlState';
import { keyName } from '../../theory/keys';
import { midi as toMidi, pitchName } from '../../theory/notes';
import {
  DEFAULT_ITEMS,
  DEFAULT_SETTINGS,
  EMPTY_SESSION,
  EXERCISES,
  generateQuestion,
  ITEMS,
  itemLabel,
  mulberry32,
  normalizeSettings,
  RANGES,
  recordAnswer,
  renderItem,
  scoreSession,
  selectionOdds,
  statKey,
  type ExerciseType,
  type Question,
  type Rendered,
  type Session,
  type Settings,
  type Stats,
} from './earTraining';
import s from './EarTraining.module.css';

type Phase = 'idle' | 'asking' | 'answered';

const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const PROMPTS: Record<ExerciseType, string> = {
  intervals: 'Which interval?',
  chords: 'Which chord quality?',
  scales: 'Which scale?',
  degrees: 'Which scale degree?',
  cadences: 'Which cadence?',
  progressions: 'Which progression?',
};

function toEvents(r: Rendered): SeqEvent[] {
  return r.events.map((e) => ({ time: e.time, duration: e.duration, midi: e.pitches.map(toMidi), data: e.staff, velocity: 0.72 }));
}

export default function EarTrainingPage() {
  const [typeParam, setTypeParam] = useUrlState('ex', 'intervals');
  const type: ExerciseType = (EXERCISES.some((e) => e.id === typeParam) ? typeParam : 'intervals') as ExerciseType;
  const [storedSettings, setStoredSettings] = usePersistentState<Settings>('ear:settings', DEFAULT_SETTINGS);
  const settings = useMemo(() => normalizeSettings(storedSettings), [storedSettings]);
  const [stats, setStats] = usePersistentState<Stats>('ear:stats', {});
  const [sessions, setSessions] = usePersistentState<Partial<Record<ExerciseType, Session>>>('ear:sessions', {});
  const session = sessions[type] ?? EMPTY_SESSION;

  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const rng = useRef(mulberry32((Date.now() ^ 0x5bd1e995) >>> 0));
  const player = usePlayer();

  const update = (patch: Partial<Settings>) => setStoredSettings({ ...settings, ...patch });

  // Reset the flow when the exercise changes.
  useEffect(() => {
    player.stop();
    setQuestion(null);
    setPhase('idle');
    setChosen(null);
    setShown(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const playRendered = useCallback(
    (r: Rendered) => {
      player.play(toEvents(r), { bpm: settings.bpm });
    },
    [player, settings.bpm],
  );

  const questionRender = useMemo(() => (question ? renderItem(question.type, question.answer, question.params) : null), [question]);
  const shownRender = useMemo(() => (question && shown ? renderItem(question.type, shown, question.params) : questionRender), [question, shown, questionRender]);

  const next = useCallback(() => {
    const q = generateQuestion(type, settings, stats, rng.current, question?.type === type ? question.answer : undefined);
    setQuestion(q);
    setPhase('asking');
    setChosen(null);
    setShown(null);
    setCount((c) => c + 1);
    playRendered(renderItem(q.type, q.answer, q.params));
  }, [type, settings, stats, question, playRendered]);

  const replay = useCallback(() => {
    if (!question || !questionRender) return;
    setShown(null);
    playRendered(questionRender);
  }, [question, questionRender, playRendered]);

  const answer = useCallback(
    (id: string) => {
      if (!question) return;
      if (phase === 'asking') {
        const correct = id === question.answer;
        setChosen(id);
        setPhase('answered');
        setShown(question.answer);
        setStats((st) => recordAnswer(st, statKey(type, question.answer), correct));
        setSessions((all) => ({ ...all, [type]: scoreSession(all[type] ?? EMPTY_SESSION, correct) }));
        if (!correct) playRendered(renderItem(question.type, question.answer, question.params));
      } else if (phase === 'answered') {
        // After answering, any option can be auditioned against the same root and key.
        setShown(id);
        playRendered(renderItem(question.type, id, question.params));
      }
    },
    [question, phase, type, setStats, setSessions, playRendered],
  );

  // Keyboard shortcuts: 1 to 9 (and 0 for a tenth option) answer, Space replays, Enter moves on.
  const keyState = useRef({ next, replay, answer, phase, question });
  keyState.current = { next, replay, answer, phase, question };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const st = keyState.current;
      if (e.key === ' ') {
        e.preventDefault();
        if (st.question) st.replay();
        else st.next();
        return;
      }
      if (e.key === 'Enter') {
        if (t && t.tagName === 'BUTTON' && st.phase !== 'answered' && st.question) return;
        e.preventDefault();
        if (st.phase !== 'asking') st.next();
        return;
      }
      const idx = SHORTCUT_KEYS.indexOf(e.key);
      if (idx >= 0 && st.question && idx < st.question.options.length && !e.repeat) {
        e.preventDefault();
        st.answer(st.question.options[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const options = question?.options ?? settings.items[type];
  const correct = phase === 'answered' && chosen === question?.answer;
  const exercise = EXERCISES.find((e) => e.id === type)!;

  const contextLine = (() => {
    if (!question) return exercise.blurb;
    const p = question.params;
    if (type === 'intervals') return p.direction === 'harmonic' ? 'Two notes together.' : p.direction === 'desc' ? 'Two notes, falling.' : 'Two notes, rising.';
    if (type === 'chords') return settings.chordInversions ? 'Inversions are on: listen for the quality, not the bass.' : 'Root position.';
    if (type === 'scales') return `From ${phase === 'answered' ? pitchName(p.root) : 'a random root'}.`;
    if (type === 'degrees') return phase === 'answered' ? `Key of ${keyName({ tonic: p.root, mode: p.mode ?? 'major' })}: cadence, then the note.` : 'A cadence sets the key, then one note sounds.';
    if (type === 'cadences') return phase === 'answered' ? `In ${keyName({ tonic: p.root, mode: p.mode ?? 'major' })}.` : 'Listen to the last two chords.';
    return phase === 'answered' ? `In ${keyName({ tonic: p.root, mode: p.mode ?? 'major' })}.` : 'Four chords.';
  })();

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Practice"
        title="Ear Training"
        lede="Listen, name what you hear, then compare it with the right answer on the keyboard and the staff. Items you miss come up more often."
      />
      <Tabs tabs={EXERCISES.map((e) => ({ id: e.id, label: e.label }))} value={type} onChange={(v) => setTypeParam(v)} ariaLabel="Exercise type" />

      <div className={s.layout}>
        <div className={s.main}>
          <Panel>
            <div className={s.stage}>
              <button
                type="button"
                className={`${s.listen} ${player.playing ? s.listenPlaying : ''}`}
                onClick={question ? replay : next}
                aria-label={question ? 'Replay the question (Space)' : 'Start (Enter)'}
              >
                <Icon name={question ? (player.playing ? 'sound' : 'play') : 'play'} size={30} />
              </button>
              <div className={s.prompt}>
                <div className="eyebrow">{question ? `${exercise.label} · question ${count}` : exercise.label}</div>
                <h2 className={s.promptTitle}>{question ? PROMPTS[type] : `Ready when you are`}</h2>
                <p className={s.promptSub}>{question ? contextLine : `${exercise.blurb} Press Start or Enter.`}</p>
              </div>
            </div>

            <div className={s.answers} role="group" aria-label="Answers">
              {options.map((id, i) => {
                const item = ITEMS[type].find((x) => x.id === id)!;
                const isAnswer = phase === 'answered' && id === question?.answer;
                const isWrong = phase === 'answered' && id === chosen && id !== question?.answer;
                const dim = phase === 'answered' && !isAnswer && !isWrong;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${s.answer} ${isAnswer ? s.answerCorrect : ''} ${isWrong ? s.answerWrong : ''} ${dim ? s.answerDim : ''}`}
                    onClick={() => answer(id)}
                    disabled={!question}
                    aria-keyshortcuts={i < SHORTCUT_KEYS.length ? SHORTCUT_KEYS[i] : undefined}
                    title={phase === 'answered' ? `Hear ${item.label} from the same root` : undefined}
                  >
                    {i < SHORTCUT_KEYS.length && <span className={s.answerKey}>{SHORTCUT_KEYS[i]}</span>}
                    <span className={s.answerLabel}>{item.label}</span>
                    {item.sub && <span className={s.answerSub}>{item.sub}</span>}
                  </button>
                );
              })}
            </div>

            {phase === 'answered' && question && (
              <div className={`${s.feedback} ${correct ? s.feedbackRight : s.feedbackWrong}`} role="status" aria-live="polite">
                <div>
                  <div className={s.feedbackTitle}>{correct ? 'Correct' : 'Not quite'}</div>
                  <div className={s.feedbackText}>
                    {correct ? (
                      <>It was {itemLabel(type, question.answer)}.{session.streak > 1 ? ` Streak: ${session.streak}.` : ''}</>
                    ) : (
                      <>
                        It was <strong>{itemLabel(type, question.answer)}</strong>; you chose {itemLabel(type, chosen!)}.
                      </>
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: '0.5rem' }}>
                  <Button size="sm" icon="play" variant={shown === question.answer ? 'primary' : 'secondary'} onClick={() => answer(question.answer)}>
                    {correct ? 'Hear it again' : 'Correct answer'}
                  </Button>
                  {!correct && chosen && (
                    <Button size="sm" icon="play" variant={shown === chosen ? 'primary' : 'secondary'} onClick={() => answer(chosen)}>
                      Your answer
                    </Button>
                  )}
                  <Button size="sm" variant="primary" iconRight="arrow-right" onClick={next}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            {phase !== 'answered' && (
              <div className="row" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
                {question ? (
                  <Button size="sm" variant="ghost" icon="loop" onClick={replay}>
                    Replay
                  </Button>
                ) : (
                  <Button variant="primary" icon="play" onClick={next}>
                    Start
                  </Button>
                )}
                {question && (
                  <Button size="sm" variant="ghost" iconRight="chevron-right" onClick={next} title="Skip without answering">
                    Skip
                  </Button>
                )}
              </div>
            )}
            <div className={`${s.hint} ${s.kbd}`}>
              <span>
                <kbd>1</kbd> to <kbd>{Math.min(options.length, 9)}</kbd>
                {options.length >= 10 ? (
                  <>
                    {' '}
                    and <kbd>0</kbd>
                  </>
                ) : null}{' '}
                answer
              </span>
              <span>
                <kbd>Space</kbd> replay
              </span>
              <span>
                <kbd>Enter</kbd> next
              </span>
            </div>
          </Panel>

          <Panel
            eyebrow="Reveal"
            title={phase === 'answered' && question && shown ? `${type === 'degrees' ? 'Degree ' : ''}${itemLabel(type, shown)}${shown === question.answer ? '' : ' (for comparison)'}` : 'Staff and keyboard'}
          >
            {phase === 'answered' && shownRender ? (
              <Reveal r={shownRender} beam={type === 'scales'} active={typeof player.activeData === 'number' ? player.activeData : null} playing={player.playing} />
            ) : (
              <div className={s.hidden}>The notes appear here once you answer.</div>
            )}
          </Panel>
        </div>

        <div className={s.side}>
          <StatsPanel type={type} stats={stats} session={session} settings={settings} onResetSession={() => setSessions((all) => ({ ...all, [type]: EMPTY_SESSION }))} onResetStats={() => setStats((st) => Object.fromEntries(Object.entries(st).filter(([k]) => !k.startsWith(`${type}:`))))} />
          <SettingsPanel type={type} settings={settings} update={update} />
        </div>
      </div>
      <Callout title="How to practice">
        <p>
          Short, frequent sessions work best. Start with a few contrasting items, add more once you pass about 85 percent, and sing the answer before you click.
          After each answer, audition the other buttons to hear how they differ from the same root.
        </p>
      </Callout>
    </div>
  );
}

function Reveal({ r, active, playing, beam }: { r: Rendered; active: number | null; playing: boolean; beam?: boolean }) {
  const all = r.events.flatMap((e) => e.pitches.map(toMidi));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const from = Math.floor(lo / 12) * 12;
  const to = Math.max(from + 24, Math.ceil((hi + 1) / 12) * 12);
  const marks: Record<number, KeyMark> = {};
  r.focus.forEach((p, i) => {
    marks[toMidi(p)] = { role: i === 0 ? 'root' : 'tone', label: r.focusLabels?.[i] ?? pitchName(p).replace(/\d+$/, '') };
  });
  const pressed = playing && active !== null ? r.events.filter((e) => e.staff === active).flatMap((e) => e.pitches.map(toMidi)) : [];
  return (
    <div className="stack">
      <Staff
        events={r.staff.map((x) => ({ keys: x.rest ? [] : x.keys, duration: x.duration, rest: x.rest, top: x.top, bottom: x.bottom }))}
        clef="auto"
        beam={beam}
        eventWidth={r.staff.length === 1 ? 90 : undefined}
        keySig={r.keySig}
        activeIndex={playing ? active : null}
        ariaLabel={`Notation: ${r.description}`}
      />
      <Piano from={from} to={to} marks={marks} pressed={pressed} labels="c" ariaLabel={`Keyboard showing ${r.description}`} />
      <p className="faint" style={{ margin: 0, fontSize: '0.85rem' }}>
        {r.description.charAt(0).toUpperCase() + r.description.slice(1)}. Play the keys to explore.
      </p>
    </div>
  );
}

function StatsPanel({
  type,
  stats,
  session,
  settings,
  onResetSession,
  onResetStats,
}: {
  type: ExerciseType;
  stats: Stats;
  session: Session;
  settings: Settings;
  onResetSession: () => void;
  onResetStats: () => void;
}) {
  const ids = settings.items[type];
  const odds = selectionOdds(type, ids, stats, settings.adaptive);
  const pct = session.total ? Math.round((session.correct / session.total) * 100) : null;
  const others = ITEMS[type].filter((i) => !ids.includes(i.id) && stats[statKey(type, i.id)]);
  return (
    <Panel eyebrow="This exercise" title="Progress">
      <div className={s.scoreRow}>
        <Stat label="Score" value={`${session.correct}/${session.total}`} />
        <Stat label="Accuracy" value={pct === null ? 'none' : `${pct}%`} />
        <Stat label="Streak" value={session.streak} />
        <Stat label="Best" value={session.best} />
      </div>
      <div className={s.groupLabel} style={{ marginBottom: '0.5rem' }}>
        Accuracy by item (all time)
      </div>
      <div className={s.statRows}>
        {[...ids, ...others.map((o) => o.id)].map((id) => {
          const st = stats[statKey(type, id)];
          const acc = st && st.a ? st.c / st.a : null;
          const color = acc === null ? 'var(--rule)' : acc >= 0.85 ? 'var(--verdigris)' : acc >= 0.6 ? 'var(--brass)' : 'var(--accent)';
          return (
            <div key={id} className={s.statRow} title={settings.adaptive && odds[id] !== undefined ? `Chance of coming up next: ${Math.round(odds[id] * 100)}%` : undefined}>
              <span className={s.statName} style={ids.includes(id) ? undefined : { color: 'var(--ink-faint)' }}>
                {itemLabel(type, id)}
              </span>
              <span className={s.statBar} role="img" aria-label={acc === null ? 'No attempts yet' : `${Math.round(acc * 100)} percent correct`}>
                <span className={s.statFill} style={{ width: `${acc === null ? 0 : Math.max(3, acc * 100)}%`, background: color }} />
              </span>
              <span className={s.statNum}>{st && st.a ? `${Math.round((acc ?? 0) * 100)}% · ${st.a}` : 'new'}</span>
            </div>
          );
        })}
      </div>
      <div className={s.statFoot}>
        <Button size="sm" variant="ghost" icon="undo" onClick={onResetSession}>
          New session
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon="trash"
          onClick={() => {
            if (window.confirm('Clear all-time statistics for this exercise?')) onResetStats();
          }}
        >
          Reset statistics
        </Button>
      </div>
      {settings.adaptive && <p className="faint" style={{ fontSize: '0.8rem', margin: '0.6rem 0 0' }}>Adaptive: items you miss come up more often. Hover a row to see its odds.</p>}
    </Panel>
  );
}

function SettingsPanel({ type, settings, update }: { type: ExerciseType; settings: Settings; update: (p: Partial<Settings>) => void }) {
  const selected = settings.items[type];
  const groups = [...new Set(ITEMS[type].map((i) => i.group ?? ''))];
  const toggle = (id: string) => {
    const has = selected.includes(id);
    if (has && selected.length <= 2) return;
    const nextIds = has ? selected.filter((x) => x !== id) : [...selected, id];
    update({ items: { ...settings.items, [type]: ITEMS[type].map((i) => i.id).filter((x) => nextIds.includes(x)) } });
  };
  const setItems = (ids: string[]) => update({ items: { ...settings.items, [type]: ids } });
  const usesRange = type === 'intervals' || type === 'chords' || type === 'scales';
  const usesKey = type === 'degrees' || type === 'cadences' || type === 'progressions';

  return (
    <Panel eyebrow="Settings" title="What to practice">
      <div className={s.settingsGrid}>
        <div className={s.group}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className={s.groupLabel}>Items</span>
            <span className="row" style={{ gap: '0.25rem' }}>
              <Button size="sm" variant="ghost" onClick={() => setItems(ITEMS[type].map((i) => i.id))}>
                All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setItems(DEFAULT_ITEMS[type])}>
                Defaults
              </Button>
            </span>
          </div>
          {groups.map((g) => (
            <div key={g} className={s.group} style={{ marginBottom: '0.3rem' }}>
              {g && <span className={s.subGroup}>{g}</span>}
              <div className={s.chips}>
                {ITEMS[type]
                  .filter((i) => (i.group ?? '') === g)
                  .map((i) => (
                    <button key={i.id} type="button" className={`${s.chip} ${selected.includes(i.id) ? s.chipOn : ''}`} aria-pressed={selected.includes(i.id)} onClick={() => toggle(i.id)} title={i.sub}>
                      {i.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <span className="faint" style={{ fontSize: '0.78rem' }}>
            At least two items. Changes apply from the next question.
          </span>
        </div>

        {type === 'intervals' && (
          <div className={s.group}>
            <span className={s.groupLabel}>Direction</span>
            <Segmented
              ariaLabel="Interval direction"
              size="sm"
              value={settings.intervalDirection}
              onChange={(v) => update({ intervalDirection: v })}
              options={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
                { value: 'harmonic', label: 'Harmonic' },
                { value: 'mixed', label: 'Mixed' },
              ]}
            />
          </div>
        )}
        {type === 'chords' && (
          <>
            <div className={s.group}>
              <span className={s.groupLabel}>Playing style</span>
              <Segmented
                ariaLabel="Chord playing style"
                size="sm"
                value={settings.chordStyle}
                onChange={(v) => update({ chordStyle: v })}
                options={[
                  { value: 'block', label: 'Block' },
                  { value: 'arpeggio', label: 'Broken' },
                  { value: 'both', label: 'Broken, then block' },
                ]}
              />
            </div>
            <Toggle label="Random inversions" checked={settings.chordInversions} onChange={(v) => update({ chordInversions: v })} />
          </>
        )}
        {type === 'scales' && (
          <div className={s.group}>
            <span className={s.groupLabel}>Direction</span>
            <Segmented
              ariaLabel="Scale direction"
              size="sm"
              value={settings.scaleDirection}
              onChange={(v) => update({ scaleDirection: v })}
              options={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
                { value: 'both', label: 'Up and down' },
              ]}
            />
          </div>
        )}
        {(type === 'degrees' || type === 'cadences') && (
          <div className={s.group}>
            <span className={s.groupLabel}>Mode</span>
            <Segmented
              ariaLabel="Key mode"
              size="sm"
              value={settings.keyMode}
              onChange={(v) => update({ keyMode: v })}
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
                { value: 'mixed', label: 'Both' },
              ]}
            />
            {type === 'cadences' && <span className="faint" style={{ fontSize: '0.78rem' }}>Phrygian half cadences are always played in minor.</span>}
          </div>
        )}
        {usesKey && <Toggle label="Random key (off: always C)" checked={settings.randomKey} onChange={(v) => update({ randomKey: v })} />}
        {usesRange && (
          <Select
            label="Root range"
            value={settings.range}
            onChange={(v) => update({ range: v as Settings['range'] })}
            options={Object.entries(RANGES).map(([value, r]) => ({ value, label: r.label }))}
          />
        )}
        <Slider label="Tempo" value={settings.bpm} onChange={(v) => update({ bpm: v })} min={50} max={160} step={2} format={(v) => `${v} bpm`} width={160} />
        <Toggle label="Adaptive (favor items I miss)" checked={settings.adaptive} onChange={(v) => update({ adaptive: v })} />
      </div>
    </Panel>
  );
}
