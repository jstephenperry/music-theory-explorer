import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PRACTICAL_MAJOR_KEYS,
  PRACTICAL_MINOR_KEYS,
  chordToneLabels,
  intervalLongName,
  keyName,
  keyNotes,
  midi,
  mod,
  noteName,
  pc,
  pitchInterval,
  pitchName,
  type Key,
} from '../../theory';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { Button, PageHeader, Panel, Select, Tag, Toggle } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { audio } from '../../audio/engine';
import { usePlayer } from '../../audio/usePlayer';
import { useMidiInput } from '../../hooks/useMidiInput';
import { useComputerKeyboard } from '../../hooks/useComputerKeyboard';
import { usePersistentState } from '../../hooks/usePersistentState';
import { identifyMidi, romanFor, spellMidis, toneRole } from '../chords/chordLogic';
import { CandidateList } from '../chords/CandidateList';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useUrlParams } from '../../hooks/useUrlState';
import {
  COMPUTER_KEYS,
  finishTake,
  keyFromParam,
  keyToParam,
  notesAt,
  pushHistory,
  recNoteOff,
  recNoteOn,
  takeEvents,
  takeLength,
  type HistoryEntry,
  type RecNote,
} from './playLogic';
import s from './Playground.module.css';

type Source = 'pointer' | 'external';

const KEY_BASE = 60;
const sorted = (set: Iterable<number>) => [...set].sort((a, b) => a - b);

export default function PlaygroundPage() {
  const [q, update] = useUrlParams({ key: '' });
  const keyCtx = keyFromParam(q.key);
  const wide = useMediaQuery('(min-width: 1000px)');
  const medium = useMediaQuery('(min-width: 600px)');
  const octaves = wide ? 5 : medium ? 3 : 2;
  const baseStart = wide ? 2 : medium ? 3 : 4;
  const [shift, setShift] = usePersistentState('play:shift', 0);
  const startOct = Math.max(0, Math.min(8 - octaves, baseStart + shift));
  const from = (startOct + 1) * 12;
  const to = from + octaves * 12;

  const [sustain, setSustain] = usePersistentState('play:sustain', false);
  const sustainRef = useRef(sustain);

  // Physical keys down (any source) and notes held by sustain. Refs are the source of truth so that
  // quick bursts of MIDI messages between renders are not lost; `bump` re-renders.
  const downRef = useRef(new Set<number>());
  const susRef = useRef(new Set<number>());
  const swallowRef = useRef(new Set<number>());
  const [held, setHeld] = useState<number[]>([]);
  const bump = () => setHeld(sorted(new Set([...downRef.current, ...susRef.current])));

  // Recording
  const [recording, setRecording] = useState(false);
  const recRef = useRef<RecNote[]>([]);
  const recStart = useRef(0);
  const recordingRef = useRef(false);
  const [take, setTake] = useState<RecNote[]>([]);
  const nowS = () => performance.now() / 1000;
  const recOn = (m: number, v: number) => {
    if (recordingRef.current) recRef.current = recNoteOn(recRef.current, m, nowS() - recStart.current, v);
  };
  const recOff = (m: number) => {
    if (recordingRef.current) recRef.current = recNoteOff(recRef.current, m, nowS() - recStart.current);
  };

  const noteOn = (m: number, velocity = 0.75, source: Source = 'external') => {
    if (source === 'pointer' && sustainRef.current && susRef.current.has(m) && !downRef.current.has(m)) {
      // Clicking a sustained key releases it.
      susRef.current.delete(m);
      swallowRef.current.add(m);
      audio.noteOff(m);
      recOff(m);
      bump();
      return;
    }
    if (susRef.current.has(m)) {
      susRef.current.delete(m);
      recOff(m);
    }
    audio.noteOn(m, velocity);
    downRef.current.add(m);
    recOn(m, velocity);
    bump();
  };
  const noteOff = (m: number, source: Source = 'external') => {
    if (source === 'pointer' && swallowRef.current.delete(m)) return;
    if (!downRef.current.has(m)) return;
    downRef.current.delete(m);
    if (sustainRef.current) susRef.current.add(m);
    else {
      audio.noteOff(m);
      recOff(m);
    }
    bump();
  };
  const changeSustain = (v: boolean) => {
    setSustain(v);
    sustainRef.current = v;
    if (!v) {
      susRef.current.forEach((m) => {
        audio.noteOff(m);
        recOff(m);
      });
      susRef.current.clear();
      bump();
    }
  };
  const clearNotes = () => {
    [...downRef.current, ...susRef.current].forEach(recOff);
    audio.allNotesOff();
    downRef.current.clear();
    susRef.current.clear();
    bump();
  };

  const midiIn = useMidiInput({ onNoteOn: (m, v) => noteOn(m, v), onNoteOff: (m) => noteOff(m) });
  useComputerKeyboard({ onNoteOn: (m) => noteOn(m, 0.75), onNoteOff: (m) => noteOff(m) }, KEY_BASE);

  // Mirror the computer keyboard's octave (Z and X) for the legend; same rules as the shared hook.
  const [kbOct, setKbOct] = useState(0);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') setKbOct((o) => Math.max(-3, o - 1));
      if (k === 'x') setKbOct((o) => Math.min(3, o + 1));
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  useEffect(() => () => audio.allNotesOff(), []);

  // Playback of a recorded take, with the sounding notes polled once per frame.
  const player = usePlayer();
  const [polledNotes, setPolledNotes] = useState<number[]>([]);
  const { playing, position } = player;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = '';
    const tick = () => {
      const now = notesAt(take, position());
      const k = now.join(',');
      if (k !== last) {
        last = k;
        setPolledNotes(now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, position, take]);
  const playNotes = playing ? polledNotes : [];

  const startRecording = () => {
    player.stop();
    recRef.current = [];
    recStart.current = nowS();
    recordingRef.current = true;
    setRecording(true);
    // Notes already held when recording starts are captured from time zero.
    [...downRef.current, ...susRef.current].forEach((m) => (recRef.current = recNoteOn(recRef.current, m, 0)));
  };
  const stopRecording = () => {
    recordingRef.current = false;
    setRecording(false);
    setTake(finishTake(recRef.current, nowS() - recStart.current));
  };
  const playTake = () => {
    if (take.length === 0) return;
    clearNotes();
    player.play(takeEvents(take), { bpm: 60, length: takeLength(take) + 0.3 });
  };

  // ---- Naming ----
  const naming = player.playing ? playNotes : held;
  const namingKey = naming.join(',');
  const keyParam = keyToParam(keyCtx);
  const candidates = useMemo(() => identifyMidi(naming, { key: keyCtx, max: 6 }), [namingKey, keyParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = candidates[0] ?? null;
  const spelled = useMemo(() => spellMidis(naming, top?.tones, keyCtx), [namingKey, top, keyParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- History: commit a chord once it has been held briefly ----
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const topSymbol = top?.symbol ?? '';
  useEffect(() => {
    if (player.playing || !topSymbol) return;
    const midis = namingKey.split(',').map(Number);
    const t = window.setTimeout(() => setHistory((h) => pushHistory(h, { symbol: topSymbol, midis })), 350);
    return () => window.clearTimeout(t);
  }, [namingKey, topSymbol, player.playing]);
  const historyRomans = useMemo(
    () => history.map((h) => {
        const c = keyCtx ? identifyMidi(h.midis, { key: keyCtx, max: 1 })[0] : undefined;
        return c ? romanFor(c, keyCtx) : '';
      }),
    [history, keyParam], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const historyRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [history.length]);

  // ---- Piano marks ----
  const pcMarks: Record<number, KeyMark> = {};
  if (keyCtx) {
    keyNotes(keyCtx).forEach((n, i) => {
      pcMarks[pc(n)] = { role: i === 0 ? 'root' : 'muted', ring: true };
    });
  }
  const labels = top ? chordToneLabels(top.chordId) : [];
  const marks: Record<number, KeyMark> = {};
  spelled.forEach((p) => {
    const m = midi(p);
    const lab = top ? labels[top.tones.findIndex((t) => pc(t) === mod(m, 12))] ?? noteName(p) : noteName(p);
    marks[m] = { role: top ? toneRole(lab) : 'tone', label: lab };
  });

  // ---- Readout for 0, 1 or 2 notes ----
  let fallbackTitle = '';
  let fallbackSub = '';
  if (naming.length === 0) {
    fallbackTitle = 'Play something';
    fallbackSub = 'Hold a few notes together to name the chord.';
  } else if (naming.length === 1) {
    fallbackTitle = pitchName(spelled[0]);
    const deg = keyCtx ? keyNotes(keyCtx).findIndex((n) => pc(n) === pc(spelled[0])) : -1;
    fallbackSub = deg >= 0 ? `Scale degree ${deg + 1} of ${keyName(keyCtx!)}` : 'Add more notes to form a chord.';
  } else if (!top) {
    if (naming.length === 2) {
      const iv = pitchInterval(spelled[0], spelled[1]);
      try {
        fallbackTitle = intervalLongName(iv);
      } catch {
        fallbackTitle = `${iv.semis} semitones`;
      }
      fallbackSub = `${noteName(spelled[0])} to ${noteName(spelled[1])}, ${iv.semis} semitones`;
    } else {
      fallbackTitle = 'Unnamed cluster';
      fallbackSub = spelled.map((p) => noteName(p)).join(' ');
    }
  }

  const midiLabel =
    midiIn.status === 'connected'
      ? midiIn.devices.join(', ')
      : midiIn.status === 'unsupported'
        ? 'Web MIDI is not available in this browser'
        : midiIn.status === 'denied'
          ? 'MIDI access was denied'
          : 'No MIDI device connected';

  const keyOptions = [
    { label: 'Major keys', options: PRACTICAL_MAJOR_KEYS.map((k: Key) => ({ value: keyToParam(k), label: keyName(k) })) },
    { label: 'Minor keys', options: PRACTICAL_MINOR_KEYS.map((k: Key) => ({ value: keyToParam(k), label: keyName(k) })) },
  ];

  const kbBase = KEY_BASE + kbOct * 12;
  const whiteOffsets = COMPUTER_KEYS.filter((k) => ![1, 3, 6, 8, 10].includes(k.offset % 12));
  const blackOffsets = COMPUTER_KEYS.filter((k) => [1, 3, 6, 8, 10].includes(k.offset % 12));
  const activeSet = new Set(player.playing ? playNotes : held);

  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Free Play"
        lede="A five-octave keyboard with live chord naming. Play with the mouse, your computer keys or a MIDI keyboard, and watch every chord get its name, its notation and its function."
      />

      <Panel sunk className={s.console}>
        <div className={s.consoleRow}>
          <div className={s.status}>
            <span className={`${s.led} ${midiIn.status === 'connected' ? s.ledOn : ''}`} aria-hidden="true" />
            <Icon name="midi" size={18} />
            <span>
              <span className={s.statusLabel}>MIDI</span>
              <span className={s.statusText}>{midiLabel}</span>
            </span>
          </div>
          <Toggle label="Sustain (hold notes until released)" checked={sustain} onChange={changeSustain} />
          <Select
            label="Key context"
            value={q.key && keyCtx ? keyToParam(keyCtx) : ''}
            onChange={(v) => update({ key: v })}
            options={[{ value: '', label: 'No key' }]}
            groups={keyOptions}
          />
          <div className={s.consoleButtons}>
            <Button icon="x" onClick={clearNotes} disabled={held.length === 0}>
              Clear notes
            </Button>
          </div>
        </div>
      </Panel>

      <section className={s.placard} aria-label="Chord readout">
        <div className={s.readout}>
          <div className="eyebrow" style={{ color: 'var(--brass-bright)' }}>
            {player.playing ? 'Playback' : 'Now sounding'}
            {keyCtx && <span className={s.keyBadge}> in {keyName(keyCtx)}</span>}
          </div>
          {top ? (
            <CandidateList candidates={candidates} keyCtx={keyCtx} tone="wood" maxAlternatives={4} />
          ) : (
            <div className={s.fallback}>
              <div className={s.fallbackTitle}>{fallbackTitle}</div>
              <div className={s.fallbackSub}>{fallbackSub}</div>
            </div>
          )}
        </div>
        <div className={s.staffCard}>
          <Staff
            clef="grand"
            keySig={keyCtx}
            events={[
              naming.length
                ? { keys: spelled, duration: 'w', top: top?.symbol, bottom: top && keyCtx ? romanFor(top, keyCtx) : undefined }
                : { keys: [], rest: true, duration: 'w' },
            ]}
            eventWidth={90}
            ariaLabel={naming.length ? `Grand staff: ${spelled.map((p) => pitchName(p)).join(', ')}` : 'Empty grand staff'}
          />
        </div>
      </section>

      <Panel className={s.pianoPanel}>
        <div className={s.pianoHead}>
          <div className={s.octaveNav}>
            <Button size="sm" icon="chevron-left" aria-label="Shift the keyboard down an octave" onClick={() => setShift(shift - 1)} disabled={startOct <= 0} />
            <span className={s.range}>
              C{startOct} to C{startOct + octaves}
            </span>
            <Button size="sm" icon="chevron-right" aria-label="Shift the keyboard up an octave" onClick={() => setShift(shift + 1)} disabled={startOct >= 8 - octaves} />
          </div>
          <div className={s.heldList} aria-live="polite">
            {naming.length > 0 ? (
              spelled.map((p) => (
                <Tag key={midi(p)} tone="brass">
                  {pitchName(p)}
                </Tag>
              ))
            ) : (
              <span className="faint">{sustain ? 'Sustain is on: click keys to build a chord, click again to release.' : 'Nothing held.'}</span>
            )}
          </div>
        </div>
        <Piano
          from={from}
          to={to}
          sound={false}
          marks={marks}
          pcMarks={pcMarks}
          pressed={player.playing ? playNotes : held}
          onNoteOn={(m) => noteOn(m, 0.75, 'pointer')}
          onNoteOff={(m) => noteOff(m, 'pointer')}
          labels="c"
          ariaLabel="Playable piano keyboard"
        />
        {keyCtx && (
          <p className={s.hint}>
            Rings mark the notes of {keyName(keyCtx)}; the tonic ring is in velvet.
          </p>
        )}
      </Panel>

      <div className={s.lower}>
        <Panel eyebrow="Computer keyboard" title="Play with your keys">
          <svg className={s.legend} viewBox={`0 0 ${whiteOffsets.length * 40} 120`} role="img" aria-label="Computer keyboard mapping: A S D F G H J K L semicolon for white keys, W E T Y U O P for black keys">
            {whiteOffsets.map((k, i) => {
              const on = activeSet.has(kbBase + k.offset);
              return (
                <g key={k.key}>
                  <rect x={i * 40 + 1} y={1} width={38} height={116} rx={4} className={`${s.lw} ${on ? s.lOn : ''}`} />
                  <text x={i * 40 + 20} y={100} textAnchor="middle" className={s.lKey}>
                    {k.key}
                  </text>
                  {k.offset % 12 === 0 && (
                    <text x={i * 40 + 20} y={80} textAnchor="middle" className={s.lNote}>
                      C{4 + kbOct + k.offset / 12}
                    </text>
                  )}
                </g>
              );
            })}
            {blackOffsets.map((k) => {
              const whiteBefore = whiteOffsets.filter((w) => w.offset < k.offset).length;
              const on = activeSet.has(kbBase + k.offset);
              return (
                <g key={k.key}>
                  <rect x={whiteBefore * 40 - 13} y={1} width={26} height={70} rx={3} className={`${s.lb} ${on ? s.lOn : ''}`} />
                  <text x={whiteBefore * 40} y={58} textAnchor="middle" className={s.lKeyBlack}>
                    {k.key}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className={s.hint}>
            <kbd>Z</kbd> and <kbd>X</kbd> move the computer keyboard down or up an octave (now C{4 + kbOct} to F{5 + kbOct}). Keys are ignored while you type in a field.
          </p>
        </Panel>

        <Panel
          eyebrow="Phrase recorder"
          title="Record and play back"
          actions={
            recording ? (
              <Button variant="primary" icon="stop" onClick={stopRecording}>
                Stop recording
              </Button>
            ) : (
              <Button icon="sparkle" onClick={startRecording} disabled={player.playing}>
                Record
              </Button>
            )
          }
        >
          {recording ? (
            <p className={s.recNow}>
              <span className={`${s.led} ${s.ledRec}`} aria-hidden="true" /> Recording. Play a phrase, then stop.
            </p>
          ) : take.length === 0 ? (
            <p className={s.hint}>Capture a phrase from any input and hear it back with live chord names.</p>
          ) : (
            <div className={s.takeRow}>
              <Button variant={player.playing ? 'primary' : 'secondary'} icon={player.playing ? 'stop' : 'play'} onClick={player.playing ? player.stop : playTake}>
                {player.playing ? 'Stop' : 'Play take'}
              </Button>
              <span className="muted">
                {take.length} notes, {takeLength(take).toFixed(1)} s
              </span>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => setTake([])} aria-label="Discard take" />
            </div>
          )}
        </Panel>
      </div>

      <Panel
        eyebrow="History"
        title="Chords you played"
        actions={
          <Button size="sm" variant="ghost" icon="trash" onClick={() => setHistory([])} disabled={history.length === 0}>
            Clear history
          </Button>
        }
      >
        {history.length === 0 ? (
          <p className={s.hint}>Each chord you hold for a moment is added here. Click one to hear it again.</p>
        ) : (
          <ol className={s.history} ref={historyRef}>
            {history.map((h, i) => (
              <li key={h.id}>
                <button type="button" className={s.histChip} onClick={() => audio.playChord(h.midis, 1.6)} title={h.midis.map((m) => pitchName(spellMidis([m], null, keyCtx)[0])).join(' ')}>
                  <span className={s.histSymbol}>{h.symbol}</span>
                  {historyRomans[i] && <span className={s.histRoman}>{historyRomans[i]}</span>}
                </button>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
