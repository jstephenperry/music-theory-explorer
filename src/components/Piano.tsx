/**
 * Interactive SVG piano keyboard.
 *
 * - Click, drag (glissando) or touch to play; works with the global audio engine.
 * - `marks` highlight specific MIDI notes; `pcMarks` highlight a pitch class in every octave.
 * - `pressed` shows keys as held down (e.g. notes sounding during playback or from MIDI input).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { noteFromPc, noteName, mod } from '../theory/notes';
import { isBlackKey } from './pianoMarks';
import s from './Piano.module.css';

export type MarkRole = 'root' | 'tone' | 'alt' | 'extra' | 'other' | 'muted';

export interface KeyMark {
  /** Semantic color role, or any CSS color. */
  role?: MarkRole;
  color?: string;
  /** Short label drawn on the key (note name, degree, interval ...). */
  label?: string;
  /** Draw only an outline ring instead of a filled marker. */
  ring?: boolean;
}

export interface PianoProps {
  /** Lowest MIDI note (rounded down to a white key). Default 48 (C3). */
  from?: number;
  /** Highest MIDI note (rounded up to a white key). Default 84 (C6). */
  to?: number;
  marks?: Record<number, KeyMark>;
  pcMarks?: Record<number, KeyMark>;
  pressed?: number[];
  /** Play sound when keys are pressed (default true). */
  sound?: boolean;
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  /** Called on click/tap (after noteOn); useful for toggle-selection UIs. */
  onKeyClick?: (midi: number) => void;
  /** Which keys get a note-name label when not marked: none, C only, or all white keys. */
  labels?: 'none' | 'c' | 'white';
  /** Fixed pixel height. Width always fills the container. */
  height?: number;
  ariaLabel?: string;
  disabled?: boolean;
}

const WHITE_W = 24;
const WHITE_H = 132;
const BLACK_W = 14;
const BLACK_H = 84;
/** Horizontal nudge of each black key relative to the white-key boundary. */
const BLACK_OFFSET: Record<number, number> = { 1: -2, 3: 2, 6: -3, 8: 0, 10: 3 };

const ROLE_VAR: Record<MarkRole, string> = {
  root: 'var(--hl-root)',
  tone: 'var(--hl-tone)',
  alt: 'var(--hl-alt)',
  extra: 'var(--hl-extra)',
  other: 'var(--hl-other)',
  muted: 'var(--ink-faint)',
};


interface KeyGeom {
  midi: number;
  black: boolean;
  x: number;
  w: number;
  h: number;
}

function layout(from: number, to: number): { keys: KeyGeom[]; width: number } {
  let lo = from;
  let hi = to;
  while (isBlackKey(lo)) lo--;
  while (isBlackKey(hi)) hi++;
  const keys: KeyGeom[] = [];
  let whiteIndex = 0;
  for (let m = lo; m <= hi; m++) {
    if (!isBlackKey(m)) {
      keys.push({ midi: m, black: false, x: whiteIndex * WHITE_W, w: WHITE_W, h: WHITE_H });
      whiteIndex++;
    }
  }
  whiteIndex = 0;
  for (let m = lo; m <= hi; m++) {
    if (!isBlackKey(m)) {
      whiteIndex++;
      continue;
    }
    const x = whiteIndex * WHITE_W - BLACK_W / 2 + BLACK_OFFSET[mod(m, 12)];
    keys.push({ midi: m, black: true, x, w: BLACK_W, h: BLACK_H });
  }
  return { keys, width: whiteIndex * WHITE_W };
}

export function Piano({
  from = 48,
  to = 84,
  marks,
  pcMarks,
  pressed,
  sound = true,
  onNoteOn,
  onNoteOff,
  onKeyClick,
  labels = 'c',
  height,
  ariaLabel = 'Piano keyboard',
  disabled,
}: PianoProps) {
  const { keys, width } = useMemo(() => layout(from, to), [from, to]);
  const [held, setHeld] = useState<Set<number>>(new Set());
  const pointerDown = useRef(false);
  const activePointerNote = useRef<number | null>(null);

  const start = useCallback(
    (m: number) => {
      if (disabled) return;
      if (sound) audio.noteOn(m, 0.75);
      onNoteOn?.(m);
      setHeld((h) => new Set(h).add(m));
    },
    [sound, onNoteOn, disabled],
  );
  const end = useCallback(
    (m: number) => {
      if (sound) audio.noteOff(m);
      onNoteOff?.(m);
      setHeld((h) => {
        const n = new Set(h);
        n.delete(m);
        return n;
      });
    },
    [sound, onNoteOff],
  );

  useEffect(() => {
    const up = () => {
      pointerDown.current = false;
      if (activePointerNote.current !== null) {
        end(activePointerNote.current);
        activePointerNote.current = null;
      }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [end]);

  const pressedSet = useMemo(() => new Set([...(pressed ?? []), ...held]), [pressed, held]);

  const handleDown = (m: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    // Release capture so pointerenter fires on neighboring keys (glissando).
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    pointerDown.current = true;
    activePointerNote.current = m;
    start(m);
    onKeyClick?.(m);
  };
  const handleEnter = (m: number) => () => {
    if (!pointerDown.current || activePointerNote.current === m) return;
    if (activePointerNote.current !== null) end(activePointerNote.current);
    activePointerNote.current = m;
    start(m);
  };

  const handleKey = (m: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      start(m);
      onKeyClick?.(m);
      window.setTimeout(() => end(m), 350);
    }
  };

  const markFor = (m: number): KeyMark | undefined => marks?.[m] ?? pcMarks?.[mod(m, 12)];

  const viewH = WHITE_H + 6;
  return (
    <div className={s.wrap} style={height ? { height } : undefined}>
      <svg
        className={s.svg}
        viewBox={`-2 -2 ${width + 4} ${viewH}`}
        preserveAspectRatio={height ? 'none' : 'xMidYMid meet'}
        role="group"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id="pk-white" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--key-white-top)" />
            <stop offset="1" stopColor="var(--key-white-bottom)" />
          </linearGradient>
          <linearGradient id="pk-black" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--key-black-top)" />
            <stop offset="1" stopColor="var(--key-black-bottom)" />
          </linearGradient>
        </defs>
        {/* Felt strip above the keys */}
        <rect x={-2} y={-2} width={width + 4} height={5} fill="var(--accent)" opacity={0.85} />
        {keys.map((k) => {
          const mark = markFor(k.midi);
          const isPressed = pressedSet.has(k.midi);
          const color = mark ? mark.color ?? ROLE_VAR[mark.role ?? 'tone'] : undefined;
          const pcName = noteName(noteFromPc(k.midi));
          const octave = Math.floor(k.midi / 12) - 1;
          const showName =
            !mark?.label && !k.black && (labels === 'white' || (labels === 'c' && mod(k.midi, 12) === 0));
          const cxm = k.x + k.w / 2;
          const markerY = k.black ? k.h - 13 : k.h - 16;
          const r = k.black ? 6 : 8.5;
          return (
            <g
              key={k.midi}
              className={`${s.key} ${k.black ? s.black : s.white} ${isPressed ? s.pressed : ''}`}
              onPointerDown={handleDown(k.midi)}
              onPointerEnter={handleEnter(k.midi)}
              onKeyDown={handleKey(k.midi)}
              tabIndex={disabled ? -1 : 0}
              role="button"
              aria-label={`${pcName}${octave}${mark?.label ? `, ${mark.label}` : ''}`}
              aria-pressed={isPressed}
            >
              <rect
                x={k.x + (k.black ? 0 : 0.5)}
                y={3}
                width={k.w - (k.black ? 0 : 1)}
                height={k.h - (isPressed ? 1.5 : 0)}
                rx={k.black ? 2 : 3}
                className={s.keyBody}
                fill={isPressed ? (k.black ? '#4a3c32' : 'var(--key-pressed)') : k.black ? 'url(#pk-black)' : 'url(#pk-white)'}
              />
              {mark && color && !k.black && !mark.ring && (
                <rect x={k.x + 2.5} y={k.h - 34} width={k.w - 5} height={33} rx={3} fill={color} opacity={0.14} />
              )}
              {mark && color && (
                <circle
                  cx={cxm}
                  cy={markerY}
                  r={r}
                  fill={mark.ring ? 'none' : color}
                  stroke={color}
                  strokeWidth={mark.ring ? 2 : 0}
                  className={s.marker}
                />
              )}
              {mark?.label && (
                <text
                  x={cxm}
                  y={markerY + (k.black ? 2.6 : 3.2)}
                  textAnchor="middle"
                  className={s.markLabel}
                  fontSize={k.black ? (mark.label.length > 2 ? 5.2 : 6.5) : mark.label.length > 2 ? 7 : 8.5}
                  fill={mark.ring ? (k.black ? 'var(--key-white-top)' : 'var(--ink)') : '#fffaf0'}
                >
                  {mark.label}
                </text>
              )}
              {showName && (
                <text x={cxm} y={k.h - 6} textAnchor="middle" className={s.keyName}>
                  {pcName}
                  {mod(k.midi, 12) === 0 ? octave : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}


