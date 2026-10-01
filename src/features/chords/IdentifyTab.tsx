import { useMemo, useRef, useState } from 'react';
import { intervalLongName, midi, mod, noteName, pc, pitchInterval, pitchName, chordToneLabels } from '../../theory';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { Button, Empty, Panel, Segmented, Tag } from '../../components/ui';
import { audio } from '../../audio/engine';
import { useMidiInput } from '../../hooks/useMidiInput';
import { useComputerKeyboard } from '../../hooks/useComputerKeyboard';
import { usePersistentState } from '../../hooks/usePersistentState';
import { identifyMidi, spellMidis, toneRole, type Candidate } from './chordLogic';
import { CandidateList } from './CandidateList';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import s from './Chords.module.css';

const EXAMPLES: Array<{ label: string; notes: number[]; hint: string }> = [
  { label: 'C E G A', notes: [48, 64, 67, 69], hint: 'C6 or Am7 over C?' },
  { label: 'E C G', notes: [52, 60, 67], hint: 'A triad with its third in the bass' },
  { label: 'B D F A♭', notes: [47, 62, 65, 68], hint: 'A symmetric diminished seventh' },
  { label: 'E G♯ D G', notes: [40, 56, 62, 67], hint: 'The "Hendrix" chord' },
  { label: 'F B D♯ G♯', notes: [53, 59, 63, 68], hint: 'Wagner\'s Tristan chord' },
  { label: 'E A D G B', notes: [52, 57, 62, 67, 71], hint: 'Stacked fourths: the So What voicing' },
  { label: 'D F♯ A C E', notes: [50, 66, 69, 72, 76], hint: 'A dominant ninth' },
];

export function IdentifyTab({ notes: initial, setNotes, onOpen }: { notes: number[]; setNotes: (n: number[]) => void; onOpen: (c: Candidate) => void }) {
  // Local state is the source of truth (MIDI chords arrive as bursts faster than URL updates render);
  // the URL mirrors it for sharing.
  const [notes, setLocal] = useState(initial);
  const [mode, setMode] = usePersistentState<'new' | 'add'>('chords:identifyMode', 'new');
  const narrow = useMediaQuery('(max-width: 640px)');
  const notesRef = useRef(notes);
  const down = useRef(new Set<number>());

  const commit = (next: number[]) => {
    const uniq = [...new Set(next)].sort((a, b) => a - b);
    notesRef.current = uniq;
    setLocal(uniq);
    setNotes(uniq);
  };
  const toggle = (m: number) => commit(notesRef.current.includes(m) ? notesRef.current.filter((x) => x !== m) : [...notesRef.current, m]);

  const handlers = {
    onNoteOn: (m: number, velocity = 0.75) => {
      audio.noteOn(m, velocity);
      const fresh = down.current.size === 0;
      down.current.add(m);
      if (mode === 'new' && fresh) commit([m]);
      else commit([...notesRef.current, m]);
    },
    onNoteOff: (m: number) => {
      audio.noteOff(m);
      down.current.delete(m);
    },
  };
  const midiIn = useMidiInput(handlers);
  useComputerKeyboard(handlers, 60);

  const candidates = useMemo(() => identifyMidi(notes, { max: 8 }), [notes]);
  const top = candidates[0] ?? null;
  const spelled = useMemo(() => spellMidis(notes, top?.tones), [notes, top]);
  const labels = top ? chordToneLabels(top.chordId) : [];

  const marks: Record<number, KeyMark> = {};
  spelled.forEach((p) => {
    const m = midi(p);
    if (top) {
      const lab = labels[top.tones.findIndex((t) => pc(t) === mod(m, 12))] ?? noteName(p);
      marks[m] = { role: toneRole(lab), label: lab };
    } else {
      marks[m] = { role: 'tone', label: noteName(p) };
    }
  });

  const lowNote = notes.length ? Math.min(...notes) : 60;
  const highNote = notes.length ? Math.max(...notes) : 60;
  const pianoFrom = Math.min(narrow ? 48 : 36, Math.floor(lowNote / 12) * 12);
  const pianoTo = Math.max(84, Math.ceil((highNote + 1) / 12) * 12);

  const dyad = notes.length === 2 ? pitchInterval(spelled[0], spelled[1]) : null;
  let dyadName = '';
  if (dyad) {
    try {
      dyadName = intervalLongName(dyad);
    } catch {
      dyadName = `${dyad.semis} semitones`;
    }
  }

  const hear = (c: Candidate) => {
    const lowest = Math.min(...notes);
    const dist = mod(lowest - pc(c.root), 12) || 12;
    const rootMidi = Math.max(24, lowest - dist);
    audio.playChord([rootMidi, ...notes], 2.2);
  };

  const midiLabel =
    midiIn.status === 'connected'
      ? `MIDI: ${midiIn.devices.join(', ')}`
      : midiIn.status === 'unsupported'
        ? 'MIDI not supported in this browser'
        : midiIn.status === 'denied'
          ? 'MIDI access denied'
          : 'No MIDI device';

  return (
    <div className="stack">
      <Panel
        title="Play or pick some notes"
        eyebrow="Identify"
        actions={
          <>
            <Button icon="play" onClick={() => audio.playChord(notes, 2)} disabled={notes.length === 0}>
              Play
            </Button>
            <Button icon="trash" variant="ghost" onClick={() => commit([])} disabled={notes.length === 0}>
              Clear
            </Button>
          </>
        }
      >
        <div className={s.identifyBar}>
          <p className={s.small} style={{ margin: 0 }}>
            Click keys to add or remove notes, play a MIDI keyboard, or use your computer keys (<kbd>A</kbd> to <kbd>K</kbd> for white keys, <kbd>W</kbd>{' '}
            <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> for black keys, <kbd>Z</kbd> <kbd>X</kbd> to change octave). The lowest note is the bass.
          </p>
          <div className="row">
            <Tag tone={midiIn.status === 'connected' ? 'verdigris' : 'default'}>{midiLabel}</Tag>
            <Segmented
              size="sm"
              ariaLabel="Keyboard input mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'new', label: 'New chord each time', title: 'After you release every key, the next note starts a new chord' },
                { value: 'add', label: 'Add notes', title: 'Each played note is added to the selection' },
              ]}
            />
          </div>
        </div>
        <Piano from={pianoFrom} to={pianoTo} marks={marks} onKeyClick={toggle} ariaLabel="Piano: click keys to add or remove notes" />
        <div className={s.examples}>
          <span className={s.controlLabel}>Try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className={s.example}
              title={ex.hint}
              onClick={() => {
                commit(ex.notes);
                audio.playChord(ex.notes, 2);
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </Panel>

      <div className={s.identifyGrid}>
        <Panel title="Chord name" eyebrow="Best readings">
          {notes.length === 0 && <Empty>Choose at least two notes.</Empty>}
          {notes.length === 1 && <Empty>One note: {pitchName(spelled[0])}. Add another.</Empty>}
          {notes.length >= 2 && candidates.length === 0 && (
            <div className={s.noMatch}>
              <div className={s.noMatchTitle}>{dyad ? dyadName : 'No catalog chord'}</div>
              <p className="muted" style={{ margin: 0 }}>
                {dyad
                  ? `${noteName(spelled[0])} to ${noteName(spelled[1])}: ${dyad.semis} semitones. Add a third note to form a chord.`
                  : 'These notes do not form a chord in the catalog. Try removing a note, or read them as a cluster.'}
              </p>
            </div>
          )}
          {candidates.length > 0 && <CandidateList candidates={candidates} onOpen={onOpen} onHear={hear} />}
          {dyad && candidates.length > 0 && <p className={s.small}>As an interval: {dyadName}.</p>}
        </Panel>
        <Panel title="On the staff" eyebrow="Notation">
          {notes.length === 0 ? (
            <Empty>The notes you choose appear here.</Empty>
          ) : (
            <>
              <Staff clef="auto" events={[{ keys: spelled, duration: 'w', top: top?.symbol }]} eventWidth={80} ariaLabel={`Selected notes: ${spelled.map((p) => pitchName(p)).join(', ')}`} />
              <div className={s.noteList}>
                {spelled.map((p) => (
                  <button key={midi(p)} type="button" className={s.noteChip} onClick={() => toggle(midi(p))} title="Remove this note">
                    {pitchName(p)}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
              <p className={s.small}>Spelling follows the top reading, so accidentals match the chord symbol.</p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
