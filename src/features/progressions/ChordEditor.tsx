import { useState } from 'react';
import { Button, Field, Segmented, Tag } from '../../components/ui';
import type { Key } from '../../theory/keys';
import { noteName } from '../../theory/notes';
import { BEAT_CHOICES, chordLabel, normalizeNumeral, parseNumeral } from './model';
import { cx, fnClass } from './classes';
import type { LabChord } from './parts';
import s from './Progressions.module.css';
import ui from '../../components/ui.module.css';

const TAG_TONE = { tonic: 'verdigris', predominant: 'royal', dominant: 'accent', chromatic: 'plum' } as const;

export function ChordEditor({
  chord,
  index,
  count,
  keyObj,
  onNumeral,
  onBeats,
  onMove,
  onDuplicate,
  onDelete,
  onPlay,
}: {
  chord: LabChord;
  index: number;
  count: number;
  keyObj: Key;
  onNumeral: (n: string) => void;
  onBeats: (b: number) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPlay: () => void;
}) {
  // The parent remounts this editor (via key) when the chord changes, which resets the draft.
  const [draft, setDraft] = useState(chord.item.numeral);

  let error: string | null = null;
  let preview: string | null = null;
  if (draft.trim() && normalizeNumeral(draft) !== chord.item.numeral) {
    try {
      const rc = parseNumeral(draft, keyObj);
      preview = `${rc.display} = ${chordLabel(rc)}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  const commit = () => {
    if (!draft.trim()) return setDraft(chord.item.numeral);
    if (error) return;
    const n = normalizeNumeral(draft);
    if (n !== chord.item.numeral) onNumeral(n);
  };
  const beatOptions = BEAT_CHOICES.map((b) => ({ value: b, label: String(b) }));
  if (!BEAT_CHOICES.includes(chord.item.beats as (typeof BEAT_CHOICES)[number])) beatOptions.push({ value: chord.item.beats as (typeof BEAT_CHOICES)[number], label: String(chord.item.beats) });
  const { rc, desc } = chord;

  return (
    <div className={fnClass(desc.fn)}>
      <div className={s.editorHead}>
        <span className={s.editorNumeral}>{rc.display}</span>
        <span className={s.editorSymbol}>{chordLabel(rc)}</span>
        <span className={s.editorNotes}>{rc.notes.map((n) => noteName(n)).join(' ')}</span>
      </div>
      <div className="row" style={{ gap: '0.4rem' }}>
        <Tag tone={TAG_TONE[desc.fn]}>{desc.role === 'Diatonic' ? `Diatonic ${desc.fn}` : desc.role}</Tag>
        {desc.fn === 'chromatic' && <Tag>tends to {desc.tendency}</Tag>}
        {desc.source && <Tag tone="brass">from {desc.source}</Tag>}
        {rc.tonicized && <Tag tone="brass">tonicizes {noteName(rc.tonicized.tonic)} {rc.tonicized.mode}</Tag>}
      </div>
      <p className={s.detail}>{desc.detail}</p>

      <div className={s.editorRow}>
        <Field label="Numeral" htmlFor="prog-numeral-input" hint={preview ?? 'Enter to apply. n = ♮, h = ø'}>
          <input
            id="prog-numeral-input"
            className={cx(ui.input, s.numeralInput)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setDraft(chord.item.numeral);
            }}
            onBlur={commit}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? 'prog-numeral-error' : undefined}
          />
          {error && (
            <span id="prog-numeral-error" className={s.inputError} role="alert">
              {error}
            </span>
          )}
        </Field>
        <Field label="Beats">
          <Segmented size="sm" ariaLabel="Duration in beats" options={beatOptions} value={chord.item.beats as (typeof BEAT_CHOICES)[number]} onChange={(b) => onBeats(b)} />
        </Field>
      </div>
      <div className={s.buttonRow}>
        <Button size="sm" icon="play" onClick={onPlay}>
          Play
        </Button>
        <Button size="sm" icon="chevron-left" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move left">
          Left
        </Button>
        <Button size="sm" iconRight="chevron-right" onClick={() => onMove(1)} disabled={index >= count - 1} aria-label="Move right">
          Right
        </Button>
        <Button size="sm" icon="copy" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button size="sm" icon="trash" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
