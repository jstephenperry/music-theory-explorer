import { useEffect, useRef, useState } from 'react';

export type MidiStatus = 'unsupported' | 'idle' | 'connected' | 'denied';

interface MidiHandlers {
  onNoteOn?: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
}

/**
 * Listen to all connected MIDI keyboards (Web MIDI API, supported in Chromium-based browsers).
 */
export function useMidiInput(handlers: MidiHandlers, enabled = true): { status: MidiStatus; devices: string[] } {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  const [status, setStatus] = useState<MidiStatus>(() => (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? 'idle' : 'unsupported'));
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled || !('requestMIDIAccess' in navigator)) return;
    let access: MIDIAccess | null = null;
    let cancelled = false;
    const onMessage = (e: MIDIMessageEvent) => {
      const data = e.data;
      if (!data || data.length < 2) return;
      const cmd = data[0] & 0xf0;
      const note = data[1];
      const vel = data.length > 2 ? data[2] : 0;
      if (cmd === 0x90 && vel > 0) ref.current.onNoteOn?.(note, vel / 127);
      else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) ref.current.onNoteOff?.(note);
    };
    const bind = () => {
      if (!access) return;
      const names: string[] = [];
      access.inputs.forEach((input) => {
        input.onmidimessage = onMessage;
        names.push(input.name ?? 'MIDI input');
      });
      setDevices(names);
      setStatus(names.length ? 'connected' : 'idle');
    };
    navigator
      .requestMIDIAccess()
      .then((a) => {
        if (cancelled) return;
        access = a;
        bind();
        a.onstatechange = bind;
      })
      .catch(() => setStatus('denied'));
    return () => {
      cancelled = true;
      if (access) {
        access.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
        access.onstatechange = null;
      }
    };
  }, [enabled]);

  return { status, devices };
}
