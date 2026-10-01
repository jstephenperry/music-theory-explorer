/**
 * Lookahead sequencer: schedules audio precisely on the Web Audio clock and
 * fires UI callbacks in sync with what is heard.
 */
import { audio, type ClickLevel } from './engine';

export interface SeqEvent {
  /** Start time in beats from the beginning of the sequence. */
  time: number;
  /** Duration in beats. */
  duration: number;
  /** MIDI notes to sound. */
  midi?: number[];
  /** Raw frequencies (Hz) to sound. */
  freqs?: number[];
  velocity?: number;
  /** Arpeggiate the notes by this many beats per note. */
  strum?: number;
  click?: ClickLevel;
  /** Percussive hit at a given pitch (Hz). */
  perc?: { pitch: number; gain?: number; decay?: number };
  /** Arbitrary payload passed back to `onEvent`. */
  data?: unknown;
}

export interface SequenceOptions {
  bpm: number;
  loop?: boolean;
  /** Total length in beats (defaults to the end of the last event). Needed for loops with trailing rests. */
  length?: number;
  /** Called (on the UI thread, in sync with audio) when an event starts. */
  onEvent?: (index: number, event: SeqEvent) => void;
  /** Called when an event ends. */
  onEventEnd?: (index: number, event: SeqEvent) => void;
  /** Called when a non-looping sequence ends or is stopped. */
  onEnd?: () => void;
  /** Count-in clicks before the sequence (in beats). */
  countIn?: number;
}

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

export class Sequence {
  private events: SeqEvent[];
  private opts: SequenceOptions;
  private anchorTime = 0;
  private anchorBeat = 0;
  private bpm: number;
  private nextIndex = 0;
  private iteration = 0;
  private timer: number | null = null;
  private timeouts: number[] = [];
  private length: number;
  running = false;

  constructor(events: SeqEvent[], opts: SequenceOptions) {
    this.events = [...events].sort((a, b) => a.time - b.time);
    this.opts = opts;
    this.bpm = opts.bpm;
    this.length = opts.length ?? Math.max(0, ...this.events.map((e) => e.time + e.duration));
  }

  private beatToTime(beat: number): number {
    return this.anchorTime + ((beat - this.anchorBeat) * 60) / this.bpm;
  }

  /** Current position in beats (including loop iterations). */
  currentBeat(): number {
    const now = audio.now;
    return this.anchorBeat + ((now - this.anchorTime) * this.bpm) / 60;
  }

  /** Position within the sequence, 0..length. */
  position(): number {
    const b = this.currentBeat();
    if (b < 0) return 0;
    if (!this.length) return b;
    return this.opts.loop ? ((b % this.length) + this.length) % this.length : Math.min(b, this.length);
  }

  start() {
    const ctx = audio.context();
    const countIn = this.opts.countIn ?? 0;
    this.anchorTime = ctx.currentTime + 0.08;
    this.anchorBeat = -countIn;
    for (let i = 0; i < countIn; i++) audio.click(this.beatToTime(-countIn + i), i === 0 ? 'strong' : 'weak');
    this.running = true;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  setBpm(bpm: number) {
    if (!this.running) {
      this.bpm = bpm;
      return;
    }
    const beat = this.currentBeat();
    this.anchorTime = audio.now;
    this.anchorBeat = beat;
    this.bpm = bpm;
  }

  private tick() {
    if (!this.running) return;
    const horizon = audio.now + LOOKAHEAD;
    for (;;) {
      if (this.nextIndex >= this.events.length) {
        if (this.opts.loop && this.length > 0 && this.events.length > 0) {
          this.nextIndex = 0;
          this.iteration++;
          continue;
        }
        const endTime = this.beatToTime(this.length);
        if (endTime < audio.now) {
          this.finish();
        }
        return;
      }
      const ev = this.events[this.nextIndex];
      const beat = ev.time + this.iteration * this.length;
      const t = this.beatToTime(beat);
      if (t > horizon) return;
      this.schedule(ev, this.nextIndex, t);
      this.nextIndex++;
    }
  }

  private schedule(ev: SeqEvent, index: number, t: number) {
    const secPerBeat = 60 / this.bpm;
    const dur = ev.duration * secPerBeat;
    if (ev.midi?.length) {
      if (ev.strum) {
        ev.midi.forEach((m, i) => audio.playNote(m, Math.max(0.05, dur - i * ev.strum! * secPerBeat), t + i * ev.strum! * secPerBeat, ev.velocity ?? 0.7));
      } else if (ev.midi.length === 1) {
        audio.playNote(ev.midi[0], dur, t, ev.velocity ?? 0.75);
      } else {
        audio.playChord(ev.midi, dur, t, ev.velocity ?? 0.7);
      }
    }
    ev.freqs?.forEach((f) => audio.playFrequency(f, dur, t, ev.velocity ?? 0.6));
    if (ev.click) audio.click(t, ev.click);
    if (ev.perc) audio.percussion(t, ev.perc.pitch, ev.perc.gain ?? 0.4, ev.perc.decay ?? 0.08);
    const delay = Math.max(0, (t - audio.now) * 1000);
    if (this.opts.onEvent) this.timeouts.push(window.setTimeout(() => this.running && this.opts.onEvent!(index, ev), delay));
    if (this.opts.onEventEnd) this.timeouts.push(window.setTimeout(() => this.running && this.opts.onEventEnd!(index, ev), delay + dur * 1000));
    // Keep the timeout list from growing without bound in long loops.
    if (this.timeouts.length > 512) this.timeouts = this.timeouts.slice(-256);
  }

  private finish() {
    this.stop();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
    audio.allNotesOff();
    this.opts.onEnd?.();
  }
}

/** Convenience: build events for a list of chords, one per `beatsEach` beats. */
export function chordEvents(chords: number[][], beatsEach = 2, opts: { strum?: number; velocity?: number } = {}): SeqEvent[] {
  return chords.map((midi, i) => ({ time: i * beatsEach, duration: beatsEach * 0.95, midi, strum: opts.strum, velocity: opts.velocity, data: i }));
}

/** Convenience: build events for a melody / scale. */
export function melodyEvents(notes: number[], beatsEach = 0.5): SeqEvent[] {
  return notes.map((m, i) => ({ time: i * beatsEach, duration: beatsEach * 0.9, midi: [m], data: i }));
}
