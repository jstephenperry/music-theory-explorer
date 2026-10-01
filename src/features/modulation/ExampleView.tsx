import { useEffect, useMemo, useState } from 'react';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff, type StaffEvent, type StaffMeasure } from '../../components/Staff';
import { Button, PlayButton, Slider } from '../../components/ui';
import { audio } from '../../audio/engine';
import type { SeqEvent } from '../../audio/sequencer';
import { usePlayer } from '../../audio/usePlayer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { keyName, vexKeySpec } from '../../theory/keys';
import { midi, noteName, pc, type Pitch } from '../../theory/notes';
import { voiceChord } from '../../theory/voicing';
import { respellPitch, type Example, type Step, type StepRole } from './logic';
import s from './Modulation.module.css';

const ROLE_COLOR: Record<StepRole, string | undefined> = {
  old: undefined,
  pivot: 'plum',
  transition: 'royal',
  new: 'verdigris',
  bridge: 'brass',
};

function staffLabel(st: Step): string {
  if (st.role === 'bridge') return 'hold';
  if (st.respell) return `= ${st.newLabel ?? ''}`;
  if (st.oldLabel && st.newLabel) return st.role === 'pivot' ? `${st.oldLabel} = ${st.newLabel}` : st.newLabel;
  return st.newLabel ?? st.oldLabel ?? '';
}

/** Sequencer events: a respelled step is tied to the chord before it, and a held tone sustains across the bridge. */
function buildEvents(ex: Example): SeqEvent[] {
  const events: SeqEvent[] = [];
  let t = 0;
  const held = ex.heldMidi;
  const heldRange = ex.heldSteps ?? [];
  ex.steps.forEach((st, i) => {
    const next = ex.steps[i + 1];
    const tiedDur = st.beats + (next?.respell ? next.beats : 0);
    let notes = st.respell ? [] : ex.pitches[i].map(midi);
    if (held !== undefined && heldRange.includes(i)) notes = notes.filter((m) => m !== held);
    events.push({ time: t, duration: tiedDur * 0.95, midi: notes, data: i, velocity: 0.62 });
    t += st.beats;
  });
  if (held !== undefined && heldRange.length) {
    const startIdx = Math.min(...heldRange);
    const endIdx = Math.max(...heldRange);
    const start = ex.steps.slice(0, startIdx).reduce((a, st) => a + st.beats, 0);
    const end = ex.steps.slice(0, endIdx + 1).reduce((a, st) => a + st.beats, 0);
    events.push({ time: start, duration: (end - start) * 0.97, midi: [held], velocity: 0.85, data: 'held' });
  }
  return events;
}

export function ExampleView({ ex }: { ex: Example }) {
  const player = usePlayer();
  const [bpm, setBpm] = usePersistentState('modulation:bpm', 76);
  const [selected, setSelected] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // A new example resets the selection and stops playback.
  const sig = ex.steps.map((st) => st.symbol + st.role).join('|') + ex.from.tonic.letter + ex.to.tonic.letter;
  useEffect(() => {
    setSelected(0);
    player.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const current = player.playing && active !== null ? active : selected;
  const heldSet = new Set(ex.heldSteps ?? []);

  const measures: StaffMeasure[] = useMemo(() => {
    const ms: StaffMeasure[] = [];
    let cur: StaffEvent[] = [];
    ex.steps.forEach((st, i) => {
      const isLast = i === ex.steps.length - 1;
      if ((st.phraseStart || isLast || cur.length === 2) && cur.length) {
        ms.push({ events: cur });
        cur = [];
      }
      // An event color would override per-key colors, so chords holding the common tone color each key instead.
      const holds = ex.heldMidi !== undefined && heldSet.has(i);
      const keyColors = ex.pitches[i].map((p) => (holds && midi(p) === ex.heldMidi ? 'brass' : ROLE_COLOR[st.role]));
      cur.push({
        keys: ex.pitches[i],
        duration: isLast ? 'w' : 'h',
        top: st.role === 'bridge' ? undefined : st.symbol,
        bottom: staffLabel(st),
        color: holds ? undefined : ROLE_COLOR[st.role],
        keyColors,
      });
    });
    if (cur.length) ms.push({ events: cur });
    return ms;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);

  const play = () => {
    setActive(0);
    player.play(buildEvents(ex), {
      bpm,
      onEvent: (_i, ev) => {
        if (typeof ev.data === 'number') setActive(ev.data);
      },
      onEnd: () => setActive(null),
    });
  };

  const audition = (i: number) => {
    setSelected(i);
    if (player.playing) player.stop();
    audio.playChord(ex.pitches[i].map(midi), 1.4, undefined, 0.65);
  };

  const pitches = ex.pitches[current] ?? [];
  const marks: Record<number, KeyMark> = {};
  pitches.forEach((p) => {
    const isHeld = ex.heldMidi !== undefined && heldSet.has(current) && midi(p) === ex.heldMidi;
    marks[midi(p)] = { role: isHeld ? 'root' : 'tone', label: noteName(p) };
  });

  const oldName = keyName(ex.from);
  const newName = keyName(ex.to);

  return (
    <div className={s.exampleGrid}>
      <div className={s.controls}>
        <PlayButton playing={player.playing} onPlay={play} onStop={player.stop} label="Play example" />
        <Slider
          label="Tempo"
          value={bpm}
          min={40}
          max={140}
          step={2}
          onChange={(v) => {
            setBpm(v);
            player.setBpm(v);
          }}
          format={(v) => `${v} bpm`}
        />
      </div>
      <p className={s.caption}>{ex.caption}</p>
      <Staff
        measures={measures}
        clef="grand"
        keySig={vexKeySpec(ex.from) ? ex.from : null}
        activeIndex={current}
        onEventClick={audition}
        ariaLabel={`Grand staff: modulation from ${oldName} to ${newName}`}
      />
      <div className={s.strip}>
        <div className={s.stripGrid} role="table" aria-label="Harmonic analysis in both keys">
          <div className={s.stripLabel} role="rowheader">
            Chord
          </div>
          <div className={s.stripLabel} role="rowheader">
            {oldName}
          </div>
          <div className={s.stripLabel} role="rowheader" style={{ color: 'var(--verdigris)' }}>
            {newName}
          </div>
          {ex.steps.map((st, i) => {
            const roleClass = st.role === 'pivot' ? s.stripPivot : st.role === 'transition' ? s.stripTransition : '';
            const cls = `${s.stripCell} ${roleClass} ${i === current ? s.stripActive : ''} ${st.phraseStart ? s.stripPhrase : ''}`;
            const label = `${st.symbol}: ${st.oldLabel ? `${st.oldLabel} in ${oldName}` : ''}${st.oldLabel && st.newLabel ? ', ' : ''}${st.newLabel ? `${st.newLabel} in ${newName}` : ''}`;
            return [
              <button key={`c${i}`} type="button" className={`${cls} ${s.stripSymbol}`} onClick={() => audition(i)} aria-label={`Play ${label}`}>
                {st.role === 'bridge' ? `${st.symbol} held` : st.symbol}
              </button>,
              <button key={`o${i}`} type="button" className={cls} onClick={() => audition(i)} tabIndex={-1} aria-hidden="true">
                {st.oldLabel ?? (st.role === 'bridge' ? <span className={s.stripMuted}>{noteName(st.notes[0])}</span> : '')}
              </button>,
              <button key={`n${i}`} type="button" className={`${cls} ${s.stripNew}`} onClick={() => audition(i)} tabIndex={-1} aria-hidden="true">
                {st.newLabel ?? (st.role === 'bridge' ? <span className={s.stripMuted}>{noteName(st.notes[0])}</span> : '')}
              </button>,
            ];
          })}
        </div>
      </div>
      <div className={s.legend}>
        <span className={s.legendItem}>
          <span className={s.swatch} style={{ background: 'var(--ink)' }} /> Old key
        </span>
        <span className={s.legendItem}>
          <span className={s.swatch} style={{ background: 'var(--plum)' }} /> Pivot or reinterpreted chord
        </span>
        <span className={s.legendItem}>
          <span className={s.swatch} style={{ background: 'var(--royal)' }} /> Transition
        </span>
        <span className={s.legendItem}>
          <span className={s.swatch} style={{ background: 'var(--verdigris)' }} /> New key
        </span>
        {ex.heldMidi !== undefined && (
          <span className={s.legendItem}>
            <span className={s.swatch} style={{ background: 'var(--brass)' }} /> Held common tone
          </span>
        )}
        <span className={s.legendItem}>Click a chord to hear it.</span>
      </div>
      <Piano from={36} to={84} marks={marks} pressed={player.playing ? pitches.map(midi) : []} ariaLabel="Piano showing the current chord" />
      {ex.enharmonic && <EnharmonicPair ex={ex} />}
    </div>
  );
}

/** The enharmonic pivot sonority shown in both spellings on separate staves. */
function EnharmonicPair({ ex }: { ex: Example }) {
  const e = ex.enharmonic!;
  const oldPitches = voiceChord(e.oldNotes, { low: 57 });
  const newPitches: Pitch[] = oldPitches.map((p) => {
    const n = e.newNotes.find((x) => pc(x) === pc(p));
    return n ? respellPitch(p, n) : p;
  });
  const play = () => audio.playChord(oldPitches.map(midi), 1.6, undefined, 0.65);
  const changed = (n: { letter: string; acc: number }) => !e.oldNotes.some((o) => o.letter === n.letter && o.acc === n.acc);
  const side = (title: string, numeral: string, symbol: string, ps: Pitch[], notes: typeof e.oldNotes, k: typeof ex.from, mark: boolean) => (
    <div className={s.enhSide}>
      <div className={s.enhTitle}>
        <span className={s.enhKey}>{title}</span>
        <span className={s.enhNumeral}>{numeral}</span>
      </div>
      <Staff events={[{ keys: ps, duration: 'w', top: symbol, color: mark ? 'plum' : undefined }]} clef="treble" keySig={vexKeySpec(k) ? k : null} ariaLabel={`${symbol} spelled in ${keyName(k)}`} />
      <div className={s.enhNotes}>
        {notes.map((n, i) => (
          <span key={i} className={`${s.enhNote} ${mark && changed(n) ? s.enhChanged : ''}`}>
            {noteName(n)}
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <div>
      <div className="row" style={{ margin: '0.75rem 0 0.4rem', gap: '0.5rem' }}>
        <span className="eyebrow">One sound, two spellings</span>
        <Button size="sm" variant="ghost" icon="sound" onClick={play}>
          Hear it
        </Button>
      </div>
      <div className={s.enh}>
        {side(`In ${keyName(ex.from)}`, e.oldLabel, e.oldSymbol, oldPitches, e.oldNotes, ex.from, false)}
        <div className={s.enhEq} aria-hidden="true">
          =
        </div>
        {side(`In ${keyName(ex.to)}`, e.newLabel, e.newSymbol, newPitches, e.newNotes, ex.to, true)}
      </div>
    </div>
  );
}
