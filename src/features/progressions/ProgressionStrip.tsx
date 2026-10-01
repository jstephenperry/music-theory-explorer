import { useRef, type KeyboardEvent } from 'react';
import { chordLabel } from './model';
import { cx, fnClass } from './classes';
import type { LabChord } from './parts';
import s from './Progressions.module.css';

const SHORT_ROLE: Record<string, string> = {
  'Secondary dominant': 'secondary V',
  'Secondary leading-tone': 'secondary vii°',
  'Secondary predominant': 'secondary ii',
  'Tritone substitute': 'tritone sub',
  'Backdoor dominant': 'backdoor',
  'Modal interchange': 'modal mixture',
  'Chromatic mediant': 'mediant',
  'Cadential six-four': 'cadential',
  'Augmented sixth': 'aug. sixth',
  'Passing diminished': 'passing °7',
  'Common-tone diminished': 'common-tone °7',
  'Blues subdominant': 'blues IV',
};

function shortRole(role: string, fn: string): string {
  if (role === 'Diatonic') return fn;
  return SHORT_ROLE[role] ?? role.toLowerCase();
}

export function ProgressionStrip({
  chords,
  selected,
  playing,
  onSelect,
  onMove,
  onDelete,
  onAdd,
}: {
  chords: LabChord[];
  selected: number | null;
  playing: number | null;
  onSelect: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onDelete: (i: number) => void;
  onAdd: () => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const focus = (i: number) => requestAnimationFrame(() => refs.current[i]?.focus());

  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      e.preventDefault();
      if (e.altKey || e.shiftKey) {
        const j = i + dir;
        if (j < 0 || j >= chords.length) return;
        onMove(i, dir);
        focus(j);
      } else {
        const j = Math.max(0, Math.min(chords.length - 1, i + dir));
        onSelect(j);
        focus(j);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(i);
      focus(Math.max(0, Math.min(i, chords.length - 2)));
    }
  };

  return (
    <div className={s.strip} role="list" aria-label="Progression. Arrow keys select, Alt or Shift plus arrows move, Delete removes.">
      {chords.map((c, i) => {
        const beats = Math.min(16, Math.max(1, Math.round(c.item.beats)));
        return (
          <div role="listitem" key={i} style={{ display: 'flex' }}>
            <button
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={cx(s.card, fnClass(c.desc.fn), selected === i && s.cardSelected, playing === i && s.cardPlaying)}
              style={{ minWidth: `${68 + Math.min(c.item.beats, 8) * 9}px` }}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => onKey(e, i)}
              aria-pressed={selected === i}
              aria-label={`Chord ${i + 1}: ${c.rc.display}, ${chordLabel(c.rc)}, ${c.desc.role}, ${c.item.beats} beats`}
              title={`${c.desc.role}${c.desc.source ? ` (${c.desc.source})` : ''}: ${c.desc.detail}`}
            >
              <span className={s.cardNumeral}>{c.rc.display}</span>
              <span className={s.cardSymbol}>{chordLabel(c.rc)}</span>
              <span className={s.cardRole}>{shortRole(c.desc.role, c.desc.fn)}</span>
              <span className={s.beats} aria-hidden="true">
                {Array.from({ length: beats }, (_, b) => (
                  <span key={b} className={s.beat} style={beats > 8 ? { width: 4 } : undefined} />
                ))}
              </span>
            </button>
          </div>
        );
      })}
      <div role="listitem" style={{ display: 'flex' }}>
        <button type="button" className={s.addCard} onClick={onAdd} title="Add a chord: pick one from the palette or the suggestions below">
          + Add
        </button>
      </div>
    </div>
  );
}
