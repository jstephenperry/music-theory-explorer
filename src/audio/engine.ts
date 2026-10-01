/**
 * Web Audio synthesis engine. No samples are downloaded: every instrument is synthesised,
 * so the app works offline and loads quickly.
 */
import { midiToFreq } from '../theory/notes';

export type InstrumentId = 'piano' | 'epiano' | 'organ' | 'strings' | 'harp' | 'sine';

export const INSTRUMENTS: Array<{ id: InstrumentId; name: string }> = [
  { id: 'piano', name: 'Grand piano' },
  { id: 'epiano', name: 'Electric piano' },
  { id: 'organ', name: 'Pipe organ' },
  { id: 'strings', name: 'String section' },
  { id: 'harp', name: 'Harp' },
  { id: 'sine', name: 'Pure tone' },
];

export type ClickLevel = 'strong' | 'medium' | 'weak' | 'sub';

interface Voice {
  stop: (when: number) => void;
  endTime: number;
}

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private held = new Map<number, Voice>();
  private listeners = new Set<Listener>();
  instrument: InstrumentId = 'piano';
  volume = 0.8;
  reverb = 0.25;
  /** Tuning reference for A4 in Hz. */
  a4 = 440;

  /** Lazily create the AudioContext (browsers require a user gesture). */
  context(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.dry = this.ctx.createGain();
      this.wet = this.ctx.createGain();
      this.dry.gain.value = 1;
      this.wet.gain.value = this.reverb;
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.makeImpulse(2.6, 2.8);
      this.master.connect(this.dry);
      this.master.connect(convolver);
      convolver.connect(this.wet);
      this.dry.connect(this.compressor);
      this.wet.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get now(): number {
    return this.context().currentTime;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  setInstrument(id: InstrumentId) {
    this.instrument = id;
    this.emit();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    this.emit();
  }

  setReverb(v: number) {
    this.reverb = v;
    if (this.ctx) this.wet.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    this.emit();
  }

  setA4(hz: number) {
    this.a4 = hz;
    this.emit();
  }

  /** A synthetic concert-hall impulse response: decaying stereo noise. */
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < ctx.sampleRate * 0.01 ? i / (ctx.sampleRate * 0.01) : 1);
      }
    }
    return buf;
  }

  /**
   * Start a note. Returns a handle that stops the note.
   * `duration` (seconds) schedules the release automatically when given.
   */
  private voice(freq: number, when: number, velocity: number, duration: number | null, instrument: InstrumentId): Voice {
    const ctx = this.context();
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.master);
    const nodes: AudioScheduledSourceNode[] = [];
    const v = Math.max(0.05, Math.min(1, velocity));
    let release = 0.25;
    // Gentle loudness compensation so low and high notes sit evenly.
    const comp = Math.min(1.4, Math.max(0.55, Math.pow(261.6 / freq, 0.25)));
    const peak = 0.22 * v * comp;

    const osc = (type: OscillatorType, mult: number, gain: number, detune = 0, dest: AudioNode = out) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(dest);
      o.start(when);
      nodes.push(o);
      return { o, g };
    };

    switch (instrument) {
      case 'piano': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 0.6;
        const bright = 1200 + 5000 * v;
        filter.frequency.setValueAtTime(Math.min(bright + freq * 2, 16000), when);
        filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 500), when + 1.8);
        filter.connect(out);
        // Partials with slight inharmonicity and individual decays.
        const partials: Array<[number, number, number]> = [
          [1, 1, 0], [2.002, 0.45, 1], [3.006, 0.22, -1], [4.012, 0.12, 2], [5.02, 0.06, 0], [6.03, 0.03, 0],
        ];
        for (const [mult, gain, det] of partials) {
          if (freq * mult > 15000) continue;
          const { g } = osc(mult === 1 ? 'triangle' : 'sine', mult, gain, det, filter);
          g.gain.setValueAtTime(gain, when);
          g.gain.exponentialRampToValueAtTime(gain * 0.25, when + 0.8 / mult + 0.4);
        }
        // Hammer noise.
        const noise = ctx.createBufferSource();
        const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
        const d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        noise.buffer = nb;
        const ng = ctx.createGain();
        ng.gain.value = 0.15 * v;
        const nf = ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = Math.min(freq * 4, 8000);
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(out);
        noise.start(when);
        nodes.push(noise);
        const decayTime = Math.max(1.2, 6 * Math.pow(261.6 / freq, 0.6));
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak, when + 0.004);
        out.gain.exponentialRampToValueAtTime(peak * 0.45, when + 0.25);
        out.gain.exponentialRampToValueAtTime(peak * 0.02, when + decayTime);
        release = 0.3;
        break;
      }
      case 'epiano': {
        // Two-operator FM: a classic tine sound.
        const mod = ctx.createOscillator();
        mod.frequency.value = freq * 1;
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(freq * 2.2 * v, when);
        modGain.gain.exponentialRampToValueAtTime(freq * 0.2, when + 1.2);
        mod.connect(modGain);
        const car = osc('sine', 1, 1);
        modGain.connect(car.o.frequency);
        mod.start(when);
        nodes.push(mod);
        const tine = osc('sine', 14, 0.04 * v);
        tine.g.gain.setValueAtTime(0.04 * v, when);
        tine.g.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak, when + 0.005);
        out.gain.exponentialRampToValueAtTime(peak * 0.35, when + 1.0);
        out.gain.exponentialRampToValueAtTime(peak * 0.05, when + 4);
        release = 0.25;
        break;
      }
      case 'organ': {
        // Drawbars: 16', 8', 4', 2 2/3', 2'.
        const bars: Array<[number, number]> = [[0.5, 0.35], [1, 0.6], [2, 0.35], [3, 0.18], [4, 0.14], [6, 0.05]];
        for (const [mult, gain] of bars) if (freq * mult < 14000) osc('sine', mult, gain, (Math.random() - 0.5) * 4);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak * 0.75, when + 0.06);
        release = 0.12;
        break;
      }
      case 'strings': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = Math.min(freq * 6, 9000);
        filter.Q.value = 0.5;
        filter.connect(out);
        for (const det of [-9, -3, 4, 10]) osc('sawtooth', 1, 0.18, det, filter);
        // Vibrato.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.2;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 4;
        lfo.connect(lfoGain);
        nodes.forEach((n) => {
          if (n instanceof OscillatorNode) lfoGain.connect(n.detune);
        });
        lfo.start(when);
        nodes.push(lfo);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak * 0.7, when + 0.25);
        release = 0.6;
        break;
      }
      case 'harp': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(freq * 8, 12000), when);
        filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.2, 300), when + 1.5);
        filter.connect(out);
        osc('triangle', 1, 1, 0, filter);
        osc('sine', 2, 0.3, 0, filter);
        osc('sine', 3, 0.1, 0, filter);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak * 1.1, when + 0.003);
        out.gain.exponentialRampToValueAtTime(peak * 0.01, when + Math.max(1.5, 4 * Math.pow(261.6 / freq, 0.5)));
        release = 0.5;
        break;
      }
      case 'sine': {
        osc('sine', 1, 1);
        out.gain.setValueAtTime(0, when);
        out.gain.linearRampToValueAtTime(peak * 0.9, when + 0.02);
        release = 0.08;
        break;
      }
    }

    let stopped = false;
    const voice: Voice = {
      endTime: Infinity,
      stop: (t: number) => {
        if (stopped) return;
        stopped = true;
        const at = Math.max(t, when + 0.01);
        out.gain.cancelScheduledValues(at);
        out.gain.setTargetAtTime(0, at, release / 4);
        const end = at + release * 2;
        nodes.forEach((n) => {
          try {
            n.stop(end);
          } catch {
            /* already stopped */
          }
        });
        setTimeout(() => out.disconnect(), (end - ctx.currentTime + 0.2) * 1000);
        voice.endTime = end;
      },
    };
    if (duration !== null) voice.stop(when + duration);
    return voice;
  }

  /** Play a note for a duration (seconds). `when` defaults to now. */
  playNote(midiNote: number, duration = 1, when?: number, velocity = 0.75) {
    const t = when ?? this.now;
    this.voice(midiToFreq(midiNote, this.a4), t, velocity, duration, this.instrument);
  }

  /** Play an arbitrary frequency (for tuning and harmonic-series demos). */
  playFrequency(freq: number, duration = 1, when?: number, velocity = 0.7, instrument: InstrumentId = this.instrument) {
    const t = when ?? this.now;
    this.voice(freq, t, velocity, duration, instrument);
  }

  /** Play several notes together, optionally strummed/arpeggiated by `strum` seconds per note. */
  playChord(midiNotes: number[], duration = 1.5, when?: number, velocity = 0.7, strum = 0) {
    const t = when ?? this.now;
    const sorted = [...midiNotes].sort((a, b) => a - b);
    const vel = velocity / Math.max(1, Math.sqrt(sorted.length) * 0.8);
    sorted.forEach((m, i) => this.voice(midiToFreq(m, this.a4), t + i * strum, vel, duration, this.instrument));
  }

  /** Play notes one after another. */
  playArpeggio(midiNotes: number[], step = 0.25, when?: number, velocity = 0.75) {
    const t = when ?? this.now;
    midiNotes.forEach((m, i) => this.voice(midiToFreq(m, this.a4), t + i * step, velocity, step * 1.6, this.instrument));
  }

  /** Begin a sustained note (e.g. while a key is held). */
  noteOn(midiNote: number, velocity = 0.75) {
    this.noteOff(midiNote);
    this.held.set(midiNote, this.voice(midiToFreq(midiNote, this.a4), this.now, velocity, null, this.instrument));
  }

  noteOff(midiNote: number) {
    const v = this.held.get(midiNote);
    if (v) {
      v.stop(this.now);
      this.held.delete(midiNote);
    }
  }

  allNotesOff() {
    for (const m of [...this.held.keys()]) this.noteOff(m);
  }

  /** Metronome click. */
  click(when?: number, level: ClickLevel = 'weak') {
    const ctx = this.context();
    const t = when ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const freq = level === 'strong' ? 1760 : level === 'medium' ? 1320 : level === 'weak' ? 990 : 740;
    const amp = level === 'strong' ? 0.5 : level === 'medium' ? 0.35 : level === 'weak' ? 0.25 : 0.12;
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g);
    g.connect(this.compressor);
    o.start(t);
    o.stop(t + 0.08);
  }

  /** Percussive tone for rhythm and polyrhythm demos (woodblock-like at different pitches). */
  percussion(when: number | undefined, pitchHz = 800, gain = 0.4, decay = 0.08) {
    const ctx = this.context();
    const t = when ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = pitchHz;
    f.Q.value = 4;
    o.type = 'square';
    o.frequency.setValueAtTime(pitchHz, t);
    o.frequency.exponentialRampToValueAtTime(pitchHz * 0.8, t + decay);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(f);
    f.connect(g);
    g.connect(this.compressor);
    o.start(t);
    o.stop(t + decay + 0.02);
  }
}

export const audio = new AudioEngine();
