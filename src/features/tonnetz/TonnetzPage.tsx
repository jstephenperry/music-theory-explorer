import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../../audio/engine';
import type { SeqEvent } from '../../audio/sequencer';
import { usePlayer } from '../../audio/usePlayer';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { Button, Callout, PageHeader, Panel, PlayButton, RootPicker, Segmented, Slider, Toggle } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlState } from '../../hooks/useUrlState';
import { LETTER_PC, mod, noteFromPc, noteName, pc, type Note, type Pitch } from '../../theory/notes';
import {
  applyBasic,
  applyOp,
  findTri,
  initialVoices,
  keyScalePcs,
  leadVoices,
  OP_INFO,
  opSteps,
  pcAt,
  planPreset,
  PRESETS,
  triadName,
  triadNotes,
  triadOf,
  triadSymbol,
  triKey,
  type Op,
  type PlannedStep,
  type Quality,
  type Tri,
  type Triad,
} from './logic';
import { TonnetzLattice } from './TonnetzLattice';
import s from './Tonnetz.module.css';

const OPS: Op[] = ['P', 'L', 'R', 'N', 'S', 'H'];
const ORIGIN: Tri = { i: 0, j: 0, up: true };

/** "C", "Ebm", "F#" -> triad (root spelled loosely; only the pitch class matters). */
function parseTriad(sym: string): Triad | null {
  const m = /^([A-G])(#|b)?(m?)$/.exec(sym);
  if (!m) return null;
  const base = LETTER_PC[m[1] as Note['letter']];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return { root: mod(base + acc, 12), quality: (m[3] ? 'minor' : 'major') as Quality };
}
const triadParam = (t: Triad) => triadSymbol(t).replace('♯', '#').replace('♭', 'b');

/** A MIDI number spelled with the triad's own note names. */
function spell(m: number, notes: Note[]): Pitch {
  const n = notes.find((x) => pc(x) === mod(m, 12)) ?? noteFromPc(m);
  return { ...n, octave: Math.floor((m - LETTER_PC[n.letter] - n.acc) / 12) - 1 };
}

const signed = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0');
const motionWord = (d: number) => {
  const a = Math.abs(d);
  const size = a === 1 ? 'a semitone' : a === 2 ? 'a whole step' : `${a} semitones`;
  return `${d > 0 ? 'up' : 'down'} ${size}`;
};

interface State {
  tri: Tri;
  voices: number[];
  prevVoices: number[] | null;
  prevTriad: Triad | null;
  label: string;
}

export default function TonnetzPage() {
  const [chordParam, setChordParam] = useUrlState('chord', 'C');
  const [keyParam, setKeyParam] = useUrlState('key', '');
  const startTriad = parseTriad(chordParam) ?? { root: 0, quality: 'major' as Quality };
  const startTri = useMemo(() => findTri(startTriad, ORIGIN), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [st, setSt] = useState<State>(() => ({ tri: startTri, voices: initialVoices(triadOf(startTri)), prevVoices: null, prevTriad: null, label: '' }));
  const [undo, setUndo] = useState<State[]>([]);
  const [trail, setTrail] = useState<Tri[]>([startTri]);
  const [via, setVia] = useState<Tri[]>([]);
  const [moveId, setMoveId] = useState(0);
  const [hoverSound, setHoverSound] = usePersistentState('tonnetz:hoverSound', false);
  const [bpm, setBpm] = usePersistentState('tonnetz:bpm', 84);
  const [loop, setLoop] = usePersistentState('tonnetz:loop', false);
  const [presetId, setPresetId] = usePersistentState('tonnetz:preset', 'hexatonic');
  const [presetStep, setPresetStep] = useState<number | null>(null);
  const player = usePlayer();

  const triad = triadOf(st.tri);
  const notes = triadNotes(triad);

  // ---- Key overlay ----
  const overlayKey = keyParam ? parseTriad(keyParam) : null; // reuse the triad parser: "C" major, "Am" minor
  const overlayPcs = useMemo(() => (overlayKey ? keyScalePcs(overlayKey.root, overlayKey.quality) : null), [keyParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const stRef = useRef(st);
  stRef.current = st;
  const undoRef = useRef(undo);
  undoRef.current = undo;

  const go = useCallback((next: Tri, path: Tri[], label: string) => {
    const cur = stRef.current;
    const vm = leadVoices(cur.voices, triadOf(next));
    audio.playChord(vm.midis, 1.5, undefined, 0.62);
    const ns: State = { tri: next, voices: vm.midis, prevVoices: cur.voices, prevTriad: triadOf(cur.tri), label };
    stRef.current = ns;
    setUndo((u) => [...u.slice(-40), cur]);
    setSt(ns);
    setTrail((t) => [...t, ...path].slice(-28));
    setVia(path);
    setMoveId((k) => k + 1);
  }, []);

  const apply = useCallback(
    (op: Op) => {
      player.stop();
      setPresetStep(null);
      const path = applyOp(stRef.current.tri, op);
      go(path[path.length - 1], path, op);
    },
    [go, player],
  );

  useEffect(() => {
    setChordParam(triadParam(triad));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triad.root, triad.quality]);

  const doUndo = useCallback(() => {
    const u = undoRef.current;
    if (!u.length) return;
    const prev = u[u.length - 1];
    const cur = stRef.current;
    const n = cur.label && cur.label in OP_INFO ? opSteps(cur.label as Op).length : 1;
    audio.playChord(prev.voices, 1.2, undefined, 0.55);
    stRef.current = prev;
    setSt(prev);
    setUndo(u.slice(0, -1));
    setTrail((t) => (t.length > n ? t.slice(0, -n) : [prev.tri]));
    setVia([]);
    setMoveId((k) => k + 1);
  }, []);

  const reset = () => {
    player.stop();
    setPresetStep(null);
    setSt({ tri: ORIGIN, voices: initialVoices({ root: 0, quality: 'major' }), prevVoices: null, prevTriad: null, label: '' });
    setUndo([]);
    setTrail([ORIGIN]);
    setVia([]);
    setMoveId((k) => k + 1);
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if ((OPS as string[]).includes(k)) {
        e.preventDefault();
        apply(k as Op);
      } else if (k === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        doUndo();
      } else if (e.key === ' ' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        e.preventDefault();
        audio.playChord(stRef.current.voices, 1.4, undefined, 0.62);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply, doUndo]);

  // ---- Presets ----
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const planRef = useRef<{ start: State; steps: PlannedStep[] } | null>(null);
  /** Cycles start from a major triad: from a minor triad, begin at its parallel major. */
  const presetStart = (cur: State): State => {
    if (cur.tri.up) return { ...cur, prevVoices: null, prevTriad: null, label: '' };
    const tri = applyBasic(cur.tri, 'P');
    return { tri, voices: leadVoices(cur.voices, triadOf(tri)).midis, prevVoices: null, prevTriad: null, label: '' };
  };
  const previewStart = presetStart(st);
  const planPreview = useMemo(() => planPreset(preset, previewStart.tri, previewStart.voices), [preset, triKey(previewStart.tri), previewStart.voices.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const playPreset = () => {
    const start: State = presetStart(stRef.current);
    const steps = planPreset(preset, start.tri, start.voices);
    planRef.current = { start, steps };
    const all = [start.voices, ...steps.map((p) => p.voices.midis)];
    const events: SeqEvent[] = all.map((m, k) => ({ time: k * 2, duration: 1.9, midi: m, data: k, velocity: 0.6 }));
    player.play(events, {
      bpm,
      loop,
      length: all.length * 2,
      onEvent: (_i, ev) => {
        const k = ev.data as number;
        const plan = planRef.current;
        if (!plan) return;
        setPresetStep(k);
        if (k === 0) {
          setSt(plan.start);
          setVia([]);
          setTrail([plan.start.tri]);
          setMoveId((x) => x + 1);
          return;
        }
        const stp = plan.steps[k - 1];
        const prev = k === 1 ? plan.start : { tri: plan.steps[k - 2].tri, voices: plan.steps[k - 2].voices.midis };
        setSt({ tri: stp.tri, voices: stp.voices.midis, prevVoices: prev.voices, prevTriad: triadOf(prev.tri), label: stp.label });
        setTrail((t) => [...t, ...stp.path].slice(-28));
        setVia(stp.path);
        setMoveId((x) => x + 1);
      },
      onEnd: () => setPresetStep(null),
    });
  };

  // ---- Voice motion display ----
  const moves = st.prevVoices ? st.voices.map((m, v) => m - st.prevVoices![v]) : [0, 0, 0];
  const prevNotes = st.prevTriad ? triadNotes(st.prevTriad) : notes;
  const marks: Record<number, KeyMark> = {};
  st.voices.forEach((m, v) => {
    const moved = moves[v] !== 0;
    if (moved && st.prevVoices) marks[st.prevVoices[v]] = { role: 'muted', ring: true, label: noteName(spell(st.prevVoices[v], prevNotes)) };
    marks[m] = { role: moved ? 'root' : 'tone', label: moved ? signed(moves[v]) : noteName(spell(m, notes)) };
  });
  const sortedIdx = (vs: number[]) => vs.map((m, v) => ({ m, v })).sort((a, b) => a.m - b.m);
  const staffEvents = [
    ...(st.prevVoices && st.prevTriad
      ? [{ keys: sortedIdx(st.prevVoices).map((x) => spell(x.m, prevNotes)), duration: 'h' as const, top: triadSymbol(st.prevTriad), keyColors: sortedIdx(st.prevVoices).map((x) => (moves[x.v] !== 0 ? 'muted' : undefined)) }]
      : []),
    {
      keys: sortedIdx(st.voices).map((x) => spell(x.m, notes)),
      duration: (st.prevVoices ? 'h' : 'w') as 'h' | 'w',
      top: triadSymbol(triad),
      bottom: st.label || undefined,
      keyColors: sortedIdx(st.voices).map((x) => (moves[x.v] !== 0 ? 'accent' : undefined)),
    },
  ];
  const movedList = st.prevVoices ? st.voices.map((m, v) => ({ v, from: st.prevVoices![v], to: m, d: moves[v] })).filter((x) => x.d !== 0) : [];
  const heldList = st.prevVoices ? st.voices.filter((_m, v) => moves[v] === 0) : [];

  const onNodeClick = (i: number, j: number) => audio.playNote(60 + pcAt(i, j), 0.9, undefined, 0.7);
  const lastHover = useRef(0);
  const onNodeHover = (i: number, j: number) => {
    if (!hoverSound) return;
    const now = performance.now();
    if (now - lastHover.current < 70) return;
    lastHover.current = now;
    audio.playNote(60 + pcAt(i, j), 0.5, undefined, 0.4);
  };

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Harmony"
        title="Tonnetz"
        lede="Euler's table of tones, revived by Riemann and today's music theorists: every triangle is a triad, and neighbors differ by a single note. Walk the lattice with P, L and R and hear how little has to move."
      />

      <Panel>
        <div className={s.toolbar}>
          <div className={s.current} aria-live="polite">
            <span className={s.currentName}>{triadName(triad)}</span>
            <span className={s.currentNotes}>{notes.map((n) => noteName(n)).join(' ')}</span>
          </div>
          <div className={s.opGroup} role="group" aria-label="Neo-Riemannian transformations">
            {OPS.map((op, k) => (
              <span key={op} style={{ display: 'contents' }}>
                {k === 3 && <span className={s.opDivider} aria-hidden="true" />}
                <button type="button" className={`${s.opButton} ${st.label === op ? s.opButtonLast : ''}`} onClick={() => apply(op)} title={`${OP_INFO[op].name}: ${OP_INFO[op].desc} (key ${op})`} aria-label={`${op}: ${OP_INFO[op].name}`}>
                  <span className={s.opLetter}>{op}</span>
                  <span className={s.opSub}>{op === 'N' || op === 'S' || op === 'H' ? opSteps(op).join('') : OP_INFO[op].name.split(' ')[0]}</span>
                </button>
              </span>
            ))}
            <span className={s.opDivider} aria-hidden="true" />
            <Button size="sm" icon="undo" onClick={doUndo} disabled={!undo.length}>
              Undo
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
        <TonnetzLattice current={st.tri} via={via} moveId={moveId} trail={trail} overlay={overlayPcs} onTriClick={(t) => { player.stop(); setPresetStep(null); go(t, [t], ''); }} onNodeClick={onNodeClick} onNodeHover={onNodeHover} stepMs={via.length > 1 ? 200 : 320} />
        <p className={s.hint}>
          Click a triangle to play and select its triad; click a note to hear it; drag to pan. Keys: <kbd>P</kbd> <kbd>L</kbd> <kbd>R</kbd> <kbd>N</kbd> <kbd>S</kbd> <kbd>H</kbd>, <kbd>U</kbd> to undo, <kbd>Space</kbd> to replay.
        </p>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <Toggle label="Play notes on hover" checked={hoverSound} onChange={setHoverSound} />
        </div>
      </Panel>

      <div className={s.below}>
        <Panel title="Voice leading" eyebrow={st.label ? (st.label.length > 1 ? `${st.label.split('').join(' then ')}` : `${st.label}: ${OP_INFO[st.label as Op].name}`) : 'Current triad'}>
          <p className={s.moveText}>
            {st.prevVoices && st.prevTriad ? (
              movedList.length ? (
                <>
                  {triadSymbol(st.prevTriad)} → {triadSymbol(triad)}:{' '}
                  {movedList.map((x) => (
                    <span key={x.v}>
                      <span className={`${s.moveChip} ${s.moved}`}>
                        {noteName(spell(x.from, prevNotes))} → {noteName(spell(x.to, notes))}
                      </span>{' '}
                      {motionWord(x.d)}
                      {'; '}
                    </span>
                  ))}
                  {heldList.length ? (
                    <>
                      held{' '}
                      {heldList.map((m) => (
                        <span key={m} className={`${s.moveChip} ${s.held}`} style={{ marginRight: '0.25em' }}>
                          {noteName(spell(m, notes))}
                        </span>
                      ))}
                    </>
                  ) : (
                    'no common tones'
                  )}
                </>
              ) : (
                'Same triad.'
              )
            ) : (
              'Apply a transformation or click a neighboring triangle to see which voice moves.'
            )}
          </p>
          <Staff events={staffEvents} clef="treble" ariaLabel="Previous and current triad" />
          <Piano from={48} to={84} marks={marks} pressed={player.playing ? st.voices : []} ariaLabel="Piano showing the current triad and the moving voice" />
          <p className={s.hint}>Rings show where a moving voice came from; numbers show how far it moved in semitones.</p>
        </Panel>

        <div className={s.stack}>
          <Panel title="Cycles" eyebrow="Play a path">
            <div className={s.presets} role="radiogroup" aria-label="Preset cycle">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === preset.id} className={`${s.preset} ${p.id === preset.id ? s.presetActive : ''}`} onClick={() => setPresetId(p.id)}>
                  <span className={s.presetName}>{p.name}</span>
                  <span className={s.presetDesc}>{p.desc}</span>
                </button>
              ))}
            </div>
            <div className={s.sequence} aria-label="Triads in this cycle">
              <span className={`${s.seqChip} ${presetStep === 0 ? s.seqChipActive : ''}`}>{triadSymbol(planRef.current && presetStep !== null ? triadOf(planRef.current.start.tri) : triadOf(previewStart.tri))}</span>
              {(presetStep !== null && planRef.current ? planRef.current.steps : planPreview).map((p, k) => (
                <span key={k} style={{ display: 'contents' }}>
                  <span className={s.seqOp}>{p.label}</span>
                  <span className={`${s.seqChip} ${presetStep === k + 1 ? s.seqChipActive : ''}`}>{triadSymbol(p.triad)}</span>
                </span>
              ))}
            </div>
            <div className="row">
              <PlayButton playing={player.playing} onPlay={playPreset} onStop={() => { player.stop(); setPresetStep(null); }} label="Play cycle" />
              <Slider label="Tempo" value={bpm} min={40} max={160} step={2} onChange={(v) => { setBpm(v); player.setBpm(v); }} format={(v) => `${v} bpm`} />
              <Toggle label="Loop" checked={loop} onChange={setLoop} />
            </div>
          </Panel>

          <Panel title="Key overlay" eyebrow="Diatonic region">
            <Toggle label="Highlight the triads of a key" checked={!!overlayKey} onChange={(on) => setKeyParam(on ? 'C' : '')} />
            {overlayKey && (
              <div className={s.stack} style={{ marginTop: '0.75rem' }}>
                <RootPicker spellings="common" label="Tonic" value={noteFromPc(overlayKey.root)} onChange={(n) => setKeyParam(noteName(n, false) + (overlayKey.quality === 'minor' ? 'm' : ''))} />
                <Segmented
                  ariaLabel="Mode"
                  value={overlayKey.quality}
                  onChange={(q) => setKeyParam(noteName(noteFromPc(overlayKey.root), false) + (q === 'minor' ? 'm' : ''))}
                  options={[
                    { value: 'major', label: 'Major' },
                    { value: 'minor', label: 'Natural minor' },
                  ]}
                />
                <p className={s.hint} style={{ marginTop: 0 }}>
                  The six consonant triads of a key form a compact strip: three majors and three minors joined by L and R. The diminished triad has no
                  triangle.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Reading the Tonnetz" eyebrow="What you are looking at">
        <div className="grid-2">
          <div className={s.explain}>
            <ul>
              <li>Each node is a pitch class. Moving right adds a perfect fifth; up and to the right, a major third; up and to the left, a minor third.</li>
              <li>Three mutually adjacent nodes form a triangle: pointing up it is a major triad, pointing down a minor triad.</li>
              <li>
                Two triangles that share an edge share two notes. Crossing that edge replaces only the third note, by a semitone or a whole step: the smoothest
                possible change of harmony.
              </li>
              <li>The lattice repeats in every direction (it is really a torus), so each triad appears many times; the trail shows the path you took.</li>
            </ul>
            <Callout title="Why it matters">
              Late Romantic and film composers chain these moves to reach distant triads with almost no motion in the voices, which is why C major to G♯ minor
              (H) can sound inevitable rather than random.
            </Callout>
          </div>
          <table className={s.opTable}>
            <tbody>
              {OPS.map((op) => (
                <tr key={op}>
                  <td>{op}</td>
                  <td>
                    <b>{OP_INFO[op].name}.</b> {OP_INFO[op].desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
