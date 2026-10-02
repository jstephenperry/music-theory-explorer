import { useEffect, useRef } from 'react';

/** Two-row "piano" mapping on a QWERTY keyboard: A W S E D F T G Y H U J K O L P ; ' */
const KEY_OFFSETS: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17,
};

/**
 * Play notes from the computer keyboard. Z and X shift the octave.
 * Ignored while typing in inputs.
 */
export function useComputerKeyboard(
  handlers: { onNoteOn: (midi: number) => void; onNoteOff: (midi: number) => void },
  baseMidi = 60,
  enabled = true,
) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  const octave = useRef(0);
  const down = useRef(new Map<string, number>());

  useEffect(() => {
    if (!enabled) return;
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      if (t.tagName === 'INPUT') {
        const type = (t as HTMLInputElement).type;
        return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color'].includes(type);
      }
      return t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') {
        octave.current = Math.max(-3, octave.current - 1);
        return;
      }
      if (k === 'x') {
        octave.current = Math.min(3, octave.current + 1);
        return;
      }
      if (!(k in KEY_OFFSETS) || down.current.has(k)) return;
      const m = baseMidi + octave.current * 12 + KEY_OFFSETS[k];
      down.current.set(k, m);
      ref.current.onNoteOn(m);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const m = down.current.get(k);
      if (m === undefined) return;
      down.current.delete(k);
      ref.current.onNoteOff(m);
    };
    const onBlur = () => {
      down.current.forEach((m) => ref.current.onNoteOff(m));
      down.current.clear();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [baseMidi, enabled]);
}
