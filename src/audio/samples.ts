/**
 * Sampled instruments. Recordings live in `public/samples/<dir>/<note>.mp3`, one every minor third
 * (A, C, D♯, F♯), so no note is pitch-shifted by more than a semitone and a half.
 *
 * Sources (see public/samples/CREDITS.md):
 * - Grand piano: Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0.
 * - Electric piano, pipe organ, string section, harp: Musyng Kite soundfont, CC BY-SA 3.0,
 *   rendered per note by the midi-js-soundfonts project.
 *
 * Buffers are decoded on an OfflineAudioContext, so loading can start before the user's first
 * gesture creates the real AudioContext. AudioBuffers are not tied to the context that decoded them.
 */
import type { InstrumentId } from './engine';

export interface SampledSpec {
  dir: string;
  notes: string[];
  /** Linear gain that brings the recordings to a common loudness. */
  gain: number;
  /** Release time constant scale in seconds (how quickly the note dies after key-up). */
  release: number;
  /** Sustaining instruments: loop the steady part of the recording while the key is held. */
  loop?: boolean;
  /** Darken soft notes with a velocity-controlled low-pass filter. */
  velocityFilter?: boolean;
  /** Notes at or above this MIDI number have no damper and ring on after key-up (piano top octaves). */
  undampedFrom?: number;
}

const GRID = ['A0', ...[1, 2, 3, 4, 5, 6, 7].flatMap((o) => [`C${o}`, `Ds${o}`, `Fs${o}`, `A${o}`]), 'C8'];
const without = (...skip: string[]) => GRID.filter((n) => !skip.includes(n));

export const SAMPLED: Partial<Record<InstrumentId, SampledSpec>> = {
  piano: { dir: 'piano', notes: GRID, gain: 1.15, release: 0.36, velocityFilter: true, undampedFrom: 89 },
  // The soundfont has no electric piano at the extremes of the keyboard.
  epiano: { dir: 'epiano', notes: without('A0', 'A7', 'C8'), gain: 3, release: 0.3, velocityFilter: true },
  organ: { dir: 'organ', notes: without('C8'), gain: 1.6, release: 0.14, loop: true },
  strings: { dir: 'strings', notes: GRID, gain: 1.9, release: 0.5, loop: true },
  harp: { dir: 'harp', notes: GRID, gain: 3.6, release: 0.9, velocityFilter: true },
};

export interface Zone {
  midi: number;
  /** Frequency of the recorded note at A4 = 440 Hz. */
  freq: number;
  buffer: AudioBuffer;
  /** Seconds to skip at the start (silence and encoder padding before the attack). */
  offset: number;
  loopStart?: number;
  loopEnd?: number;
}

export type BankStatus = 'idle' | 'loading' | 'ready' | 'error';

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "Ds4" -> 63. */
export function sampleNoteMidi(name: string): number {
  const m = /^([A-G])(s?)(\d)$/.exec(name);
  if (!m) throw new Error(`Bad sample name: ${name}`);
  return (Number(m[3]) + 1) * 12 + PC[m[1]] + (m[2] ? 1 : 0);
}

/** Find where the attack begins: the first sample above -40 dB relative to the early peak. */
function findOnset(buf: AudioBuffer): number {
  const scan = Math.min(buf.length, Math.floor(buf.sampleRate * 0.6));
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < scan; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  if (peak === 0) return 0;
  const threshold = peak * 0.01;
  let first = scan;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < first; i++) {
      if (Math.abs(d[i]) > threshold) {
        first = i;
        break;
      }
    }
  }
  return Math.max(0, first - Math.floor(buf.sampleRate * 0.002));
}

/**
 * Prepare a sustain loop. The loop length is a whole number of periods of the note, and the last
 * part of the loop is crossfaded with the audio just before the loop start, so the jump from the
 * loop end back to the loop start is seamless.
 */
function makeLoop(buf: AudioBuffer, onset: number, freq: number): { loopStart: number; loopEnd: number } | null {
  const sr = buf.sampleRate;
  const end = buf.length - Math.floor(sr * 0.1);
  const period = sr / freq;
  const xfade = Math.floor(sr * 0.25);
  let start = Math.max(onset + Math.floor(sr * 0.7), end - Math.floor(sr * 1.9));
  const periods = Math.max(1, Math.round((end - start) / period));
  start = Math.round(end - periods * period);
  if (start - xfade < onset || end - start < xfade * 2) return null;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < xfade; i++) {
      const t = i / xfade;
      const a = end - xfade + i;
      const b = start - xfade + i;
      d[a] = d[a] * (1 - t) + d[b] * t;
    }
  }
  return { loopStart: start / sr, loopEnd: end / sr };
}

/** Fade the last few milliseconds so a recording that is cut short does not click. */
function fadeTail(buf: AudioBuffer) {
  const n = Math.min(buf.length, Math.floor(buf.sampleRate * 0.06));
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[buf.length - n + i] *= 1 - i / n;
  }
}

function sampleUrl(dir: string, note: string): string {
  return new URL(`samples/${dir}/${note}.mp3`, document.baseURI).href;
}

let decoder: BaseAudioContext | null = null;
function decodeContext(): BaseAudioContext {
  if (!decoder) {
    const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    decoder = new Offline(2, 1, 44100);
  }
  return decoder;
}

export class SampleBank {
  private zones = new Map<InstrumentId, Zone[]>();
  private status = new Map<InstrumentId, BankStatus>();
  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  statusOf(id: InstrumentId): BankStatus {
    return SAMPLED[id] ? (this.status.get(id) ?? 'idle') : 'ready';
  }

  /** Fetch and decode an instrument's recordings, middle of the keyboard first. Safe to call repeatedly. */
  load(id: InstrumentId): Promise<void> {
    const spec = SAMPLED[id];
    const st = this.status.get(id);
    if (!spec || st === 'loading' || st === 'ready') return Promise.resolve();
    this.status.set(id, 'loading');
    this.onChange();
    const zones: Zone[] = [];
    this.zones.set(id, zones);
    const queue = [...spec.notes].sort((a, b) => Math.abs(sampleNoteMidi(a) - 62) - Math.abs(sampleNoteMidi(b) - 62));
    let failures = 0;
    const worker = async () => {
      for (let name = queue.shift(); name; name = queue.shift()) {
        try {
          const res = await fetch(sampleUrl(spec.dir, name));
          if (!res.ok) throw new Error(`${res.status}`);
          const buffer = await decodeContext().decodeAudioData(await res.arrayBuffer());
          const midi = sampleNoteMidi(name);
          const freq = 440 * Math.pow(2, (midi - 69) / 12);
          const offset = findOnset(buffer);
          const loop = spec.loop ? makeLoop(buffer, offset, freq) : null;
          if (!loop) fadeTail(buffer);
          zones.push({ midi, freq, buffer, offset: offset / buffer.sampleRate, ...(loop ?? {}) });
          zones.sort((a, b) => a.midi - b.midi);
        } catch {
          failures++;
        }
      }
    };
    return Promise.all(Array.from({ length: 6 }, worker)).then(() => {
      const ok = zones.length > 0 && failures < spec.notes.length / 2;
      // After an error, the next call to `load` tries again (for example once the connection returns).
      this.status.set(id, ok ? 'ready' : 'error');
      this.onChange();
    });
  }

  /** The recording closest to a pitch (fractional MIDI), or null when none is loaded nearby. */
  zoneFor(id: InstrumentId, midi: number): Zone | null {
    const zones = this.zones.get(id);
    if (!zones || zones.length === 0) return null;
    let best: Zone | null = null;
    for (const z of zones) if (!best || Math.abs(z.midi - midi) < Math.abs(best.midi - midi)) best = z;
    // Stretching a recording by more than a fourth sounds unnatural; use the synthesized fallback instead.
    return best && Math.abs(best.midi - midi) <= 5 ? best : null;
  }
}
