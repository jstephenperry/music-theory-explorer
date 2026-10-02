import { useMemo, useState, type KeyboardEvent } from 'react';
import { Piano } from '../../components/Piano';
import { ScoreView } from '../../components/ScoreView';
import { Button, Callout, PlayButton, Segmented, Slider } from '../../components/ui';
import { audio } from '../../audio/engine';
import { usePersistentState } from '../../hooks/usePersistentState';
import { makeKey } from '../../theory/keys';
import { midi, pitch, pitchName, type Pitch } from '../../theory/notes';
import { notateVoice, scoreFromVoices, type PlainNote } from '../../theory/score';
import { stepPitch } from '../../theory/composition/motive';
import {
  CANTUS_FIRMI,
  RULES,
  cfIndex,
  checkCounterpoint,
  intervalNumber,
  isComplete,
  isDownbeat,
  slotCount,
  slotLength,
  solveCounterpoint,
  type CPNote,
  type Exercise,
  type Species,
} from '../../theory/composition/counterpoint';
import { clefFor } from './scoreUtils';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

const C_MAJOR = makeKey('C');
/** Spelling for black keys: the raised leading tones of the modes, and B flat. */
const BLACK: Record<number, string> = { 1: 'C#', 3: 'Eb', 6: 'F#', 8: 'G#', 10: 'Bb' };

function spell(m: number): Pitch {
  const pcv = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  const name = BLACK[pcv] ?? ['C', '', 'D', '', 'E', 'F', '', 'G', '', 'A', '', 'B'][pcv];
  return pitch(`${name}${octave}`);
}

const encode = (n: CPNote) => (n === null ? '' : n === 'rest' ? 'r' : pitchName(n, false));
const decode = (x: string): CPNote => (x === '' ? null : x === 'r' ? 'rest' : pitch(x));

/** Fux's exercise: write a counterpoint to a cantus firmus, checked as you go. */
export function CounterpointExercise({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [cfId, setCfId] = usePersistentState<string>('cp.cf', 'd');
  const [species, setSpecies] = usePersistentState<Species>('cp.species', 1);
  const [above, setAbove] = usePersistentState<boolean>('cp.above', true);
  const cf = CANTUS_FIRMI.find((c) => c.id === cfId) ?? CANTUS_FIRMI[0];
  const ex: Exercise = useMemo(() => ({ cf: cf.notes.split(' ').map(pitch), species, above }), [cf, species, above]);
  const n = slotCount(ex);
  const [saved, setSaved] = usePersistentState<Record<string, string[]>>('cp.work', {});
  const workKey = `${cf.id}.${species}.${above ? 'above' : 'below'}`;
  const cp: CPNote[] = useMemo(() => Array.from({ length: n }, (_, i) => decode(saved[workKey]?.[i] ?? '')), [saved, workKey, n]);
  const [sel, setSel] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [bpm, setBpm] = useState(100);
  const slot = Math.min(sel, n - 1);

  const write = (next: CPNote[]) => {
    player.stop();
    setSaved((all) => ({ ...all, [workKey]: next.map(encode) }));
  };
  const setSlot = (i: number, v: CPNote) => write(cp.map((x, j) => (j === i ? v : x)));

  const issues = useMemo(() => checkCounterpoint(ex, cp), [ex, cp]);
  const errors = issues.filter((x) => x.severity === 'error');
  const warnings = issues.filter((x) => x.severity === 'warning');
  const complete = isComplete(ex, cp);
  const filledCount = cp.filter((x) => x !== null).length;

  const cpStaff = above ? 0 : 1;
  const { score, colors } = useMemo(() => {
    const cpNotes: PlainNote[] = cp.map((x, i) => {
      const p = x && x !== 'rest' ? x : null;
      const label = p ? String(intervalNumber(ex.cf[cfIndex(ex, i)], p)) : undefined;
      return { pitches: p ? [p] : [], dur: slotLength(ex, i), ...(above ? { below: label } : { above: label }) };
    });
    const cfNotes: PlainNote[] = ex.cf.map((p) => ({ pitches: [p], dur: 4 }));
    const time: [number, number] = [4, 4];
    const cpVoice = notateVoice(cpNotes, { time, staff: cpStaff });
    const cfVoice = notateVoice(cfNotes, { time, staff: 1 - cpStaff });
    const cpClef = above ? 'treble' : clefFor(ex.cf.map((p) => ({ ...p, octave: p.octave - 1 })));
    const cfClef = clefFor(ex.cf);
    const staves = above
      ? [
          { clef: cpClef, voices: [cpVoice] },
          { clef: cfClef, voices: [cfVoice] },
        ]
      : [
          { clef: cfClef, voices: [cfVoice] },
          { clef: cpClef, voices: [cpVoice] },
        ];
    const sc = scoreFromVoices(C_MAJOR, time, staves);
    const col: Record<string, string> = {};
    for (const w of warnings) for (const i of w.slots) col[`${cpStaff}.0.${i}`] = 'tone';
    for (const e of errors) for (const i of e.slots) col[`${cpStaff}.0.${i}`] = 'root';
    col[`${cpStaff}.0.${slot}`] = 'extra';
    return { score: sc, colors: col };
  }, [cp, ex, above, cpStaff, errors, warnings, slot]);

  const move = (d: number) => setSel((i) => Math.max(0, Math.min(n - 1, i + d)));
  const current = cp[slot];
  const step = (d: number) => {
    const base = current && current !== 'rest' ? current : ex.cf[cfIndex(ex, slot)];
    const next = stepPitch({ ...base, acc: 0 }, current && current !== 'rest' ? d : above ? 2 : -2, C_MAJOR);
    audio.playNote(midi(next), 0.6);
    setSlot(slot, next);
  };
  const enter = (m: number) => {
    setSlot(slot, spell(m));
    setMessage(null);
    if (slot < n - 1) setSel(slot + 1);
  };
  const hint = () => {
    const sol = solveCounterpoint(ex, { fixed: cp, budget: 40000 }) ?? solveCounterpoint(ex, { fixed: cp, budget: 40000, allowWarnings: true });
    if (!sol) {
      setMessage('No correct line continues from the notes you have written. Fix or erase the notes marked in red, or erase a few notes before this one.');
      return;
    }
    const target = cp[slot] === null ? slot : cp.findIndex((x) => x === null);
    if (target < 0) {
      setMessage('Every note is written. The list below shows anything left to improve.');
      return;
    }
    const v = sol[target];
    setSlot(target, v);
    setSel(Math.min(n - 1, target + 1));
    setMessage(`Hint for bar ${cfIndex(ex, target) + 1}: ${v === 'rest' ? 'a half rest' : pitchName(v as Pitch)}. A correct line can continue from here.`);
  };
  const solution = () => {
    const sol = solveCounterpoint(ex) ?? solveCounterpoint(ex, { allowWarnings: true, budget: 200000 });
    if (sol) {
      write(sol);
      setMessage('One correct solution among many. Change any note and the checker will follow you.');
    }
  };
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => step(1),
      ArrowDown: () => step(-1),
      Backspace: () => setSlot(slot, null),
      Delete: () => setSlot(slot, null),
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  };

  const bar = cfIndex(ex, slot) + 1;
  const where = species === 1 ? `Bar ${bar}` : `Bar ${bar}, ${isDownbeat(ex, slot) ? 'first' : 'second'} half`;
  // A three-octave keyboard is too narrow to tap on a phone: show the line's useful range (about a twelfth).
  const cfMidi = ex.cf.map(midi);
  const ranges = above ? { from: Math.min(...cfMidi), to: Math.min(...cfMidi) + 21 } : { from: Math.max(...cfMidi) - 21, to: Math.max(...cfMidi) };

  return (
    <div className="stack">
      <div className={s.controls}>
        <div className={s.control}>
          <span className={s.label}>Cantus firmus</span>
          <Segmented<string> ariaLabel="Cantus firmus" size="sm" value={cf.id} onChange={(v) => (player.stop(), setCfId(v), setSel(0), setMessage(null))} options={CANTUS_FIRMI.map((c) => ({ value: c.id, label: c.name.split(',')[0], title: `${c.name}: ${c.source}` }))} />
          <span className={s.hint}>
            {cf.name}: {cf.source}.
          </span>
        </div>
        <div className={s.control}>
          <span className={s.label}>Species</span>
          <Segmented<Species>
            ariaLabel="Species"
            size="sm"
            value={species}
            onChange={(v) => (player.stop(), setSpecies(v), setSel(0), setMessage(null))}
            options={[
              { value: 1, label: 'First: note against note' },
              { value: 2, label: 'Second: two against one' },
            ]}
          />
        </div>
        <div className={s.control}>
          <span className={s.label}>Counterpoint</span>
          <Segmented<string>
            ariaLabel="Counterpoint position"
            size="sm"
            value={above ? 'above' : 'below'}
            onChange={(v) => (player.stop(), setAbove(v === 'above'), setSel(0), setMessage(null))}
            options={[
              { value: 'above', label: 'Above the cantus' },
              { value: 'below', label: 'Below the cantus' },
            ]}
          />
        </div>
      </div>

      <div className={s.row}>
        <PlayButton playing={player.tag === 'cp'} onPlay={() => player.play(score, { bpm, tag: 'cp' })} onStop={player.stop} label="Play both voices" />
        <Slider
          label="Tempo"
          min={60}
          max={160}
          value={bpm}
          onChange={(v) => {
            setBpm(v);
            if (player.tag === 'cp') player.setBpm(v);
          }}
          format={(v) => `♩ = ${v}`}
        />
      </div>

      <ScoreView
        score={score}
        colors={colors}
        barsPerLine={species === 1 ? 6 : 4}
        active={player.tag === 'cp' ? player.active : undefined}
        onNoteClick={(id) => {
          const [st, , idx] = id.split('.').map(Number);
          if (st === cpStaff) setSel(idx);
        }}
        ariaLabel={`Cantus firmus ${cf.name} with your counterpoint ${above ? 'above' : 'below'} it`}
      />
      <p className={s.hint}>The numbers between the staves are the intervals between the voices. Notes in red break a rule, notes in gold are worth another look; the selected note is blue.</p>

      <div className={s.entry} onKeyDown={onKey} tabIndex={0} aria-label="Counterpoint editor. Arrow keys move between notes and change pitch.">
        <div className={s.row}>
          <Button size="sm" icon="chevron-left" onClick={() => move(-1)} disabled={slot === 0} aria-label="Previous note">
            Previous
          </Button>
          <span className={s.slotName} aria-live="polite">
            {where}: {current === null ? 'empty' : current === 'rest' ? 'half rest' : pitchName(current)}
          </span>
          <Button size="sm" icon="chevron-right" onClick={() => move(1)} disabled={slot === n - 1} aria-label="Next note">
            Next
          </Button>
        </div>
        <div className={s.row}>
          <Button size="sm" onClick={() => step(1)}>
            Step up
          </Button>
          <Button size="sm" onClick={() => step(-1)}>
            Step down
          </Button>
          {species === 2 && slot === 0 && (
            <Button size="sm" onClick={() => setSlot(0, 'rest')}>
              Half rest
            </Button>
          )}
          <Button size="sm" variant="ghost" icon="trash" onClick={() => setSlot(slot, null)} disabled={current === null}>
            Erase
          </Button>
        </div>
        <Piano from={ranges.from} to={ranges.to} onKeyClick={enter} labels="c" ariaLabel="Click a key to write the selected note" />
        <div className={s.row}>
          <Button icon="sparkle" onClick={hint}>
            Hint
          </Button>
          <Button variant="ghost" onClick={solution}>
            Show a solution
          </Button>
          <Button variant="ghost" icon="trash" onClick={() => (write(new Array(n).fill(null)), setSel(0), setMessage(null))} disabled={filledCount === 0}>
            Clear
          </Button>
        </div>
        {message && <p className={s.hint}>{message}</p>}
      </div>

      {complete && errors.length === 0 ? (
        <Callout title={`A correct ${species === 1 ? 'first' : 'second'}-species counterpoint`} tone="verdigris">
          {warnings.length === 0 ? 'No rule is broken and nothing calls for a second look.' : `No rule is broken. ${warnings.length === 1 ? 'One point is' : `${warnings.length} points are`} worth another look below.`}
        </Callout>
      ) : (
        <p className={s.hint} aria-live="polite">
          {filledCount} of {n} notes written. {errors.length ? `${errors.length} ${errors.length === 1 ? 'rule is' : 'rules are'} broken.` : 'No rule broken so far.'}
        </p>
      )}

      {issues.length > 0 && (
        <ul className={s.issues}>
          {[...issues]
            .sort((a, b) => Math.min(...a.slots) - Math.min(...b.slots) || (a.severity === 'error' ? -1 : 1))
            .map((x, i) => (
              <li key={i} className={x.severity === 'error' ? s.issueError : s.issueWarning}>
                <button className={s.issueBar} onClick={() => setSel(Math.min(...x.slots))}>
                  Bar {cfIndex(ex, Math.min(...x.slots)) + 1}
                </button>
                <span>
                  <strong>{RULES.find((r) => r.id === x.rule)?.name ?? x.rule}.</strong> {x.message}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/** The rules of strict two-voice counterpoint, as the checker applies them. */
export function CounterpointRules() {
  return (
    <dl className={s.rules}>
      {RULES.map((r) => (
        <div key={r.id}>
          <dt>{r.name}</dt>
          <dd>{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}
