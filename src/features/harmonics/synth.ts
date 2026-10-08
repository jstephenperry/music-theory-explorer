/**
 * A small dedicated synthesizer for the Harmonics & Tuning room.
 *
 * It plays exact frequencies (not MIDI notes) on the shared AudioContext, so tunings, partials and
 * beating can be heard precisely. Everything it starts can be stopped at once (on unmount, or when
 * a new demonstration begins). Output gain stays at or below 0.2.
 */
import { audio } from '../../audio/engine';
import { stopAllPlayback } from '../../audio/usePlayer';

export type Timbre = 'organ' | 'reed' | 'strings' | 'sine';

export const TIMBRES: Array<{ value: Timbre; label: string; title: string }> = [
  { value: 'organ', label: 'Organ', title: 'Harmonics 1 to 12: beats between coinciding partials are easy to hear.' },
  { value: 'reed', label: 'Reed', title: 'Odd harmonics dominate, like a clarinet.' },
  { value: 'strings', label: 'Strings', title: 'A bright sawtooth spectrum, gently filtered.' },
  { value: 'sine', label: 'Pure', title: 'Sine waves have no overtones, so mistuned thirds and sixths hardly beat.' },
];

export interface ToneHandle {
  stop: (when?: number) => void;
  setFreq: (hz: number, glide?: number) => void;
  setWave: (wave: PeriodicWave) => void;
}

export interface ToneOptions {
  when?: number;
  /** Seconds; omit for a sustained tone that lasts until `stop`. */
  duration?: number;
  /** Relative level 0..1 (default 0.6). */
  level?: number;
  timbre?: Timbre;
  /** Custom waveform (overrides the timbre). */
  wave?: PeriodicWave;
  attack?: number;
  release?: number;
}

const MASTER_LEVEL = 0.2;

class ToneSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private waves = new Map<Timbre, PeriodicWave>();
  private live = new Set<ToneHandle>();

  private output(): { ctx: AudioContext; master: GainNode } {
    const ctx = audio.context();
    if (!this.master || this.ctx !== ctx) {
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      this.master = ctx.createGain();
      this.master.gain.value = MASTER_LEVEL * Math.min(1, audio.volume / 0.8);
      this.master.connect(limiter);
      limiter.connect(ctx.destination);
      this.waves.clear();
    }
    return { ctx, master: this.master };
  }

  get now(): number {
    return audio.context().currentTime;
  }

  /** Build a PeriodicWave on the shared context. */
  makeWave(real: Float32Array, imag: Float32Array): PeriodicWave {
    const { ctx } = this.output();
    return ctx.createPeriodicWave(real, imag);
  }

  private timbreWave(t: Timbre): PeriodicWave | null {
    if (t === 'sine') return null;
    const cached = this.waves.get(t);
    if (cached) return cached;
    const n = 24;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) {
      if (t === 'organ') imag[k] = k <= 12 ? 1 / Math.pow(k, 0.9) : 0;
      if (t === 'reed') imag[k] = k % 2 === 1 ? 1 / k : 0.04 / k;
      if (t === 'strings') imag[k] = 1 / k;
    }
    const wave = this.makeWave(real, imag);
    this.waves.set(t, wave);
    return wave;
  }

  /** Start a tone. Returns a handle that can stop it, glide it to a new frequency or change its waveform. */
  tone(freq: number, opts: ToneOptions = {}): ToneHandle {
    const { ctx, master } = this.output();
    const when = Math.max(ctx.currentTime, opts.when ?? ctx.currentTime);
    const timbre = opts.timbre ?? 'organ';
    const level = Math.max(0, Math.min(1, opts.level ?? 0.6));
    const attack = opts.attack ?? 0.025;
    const release = opts.release ?? 0.09;

    const osc = ctx.createOscillator();
    const wave = opts.wave ?? this.timbreWave(timbre);
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = 'sine';
    osc.frequency.value = freq;

    let last: AudioNode = osc;
    if (timbre === 'strings' && !opts.wave) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(16000, freq * 7);
      lp.Q.value = 0.4;
      osc.connect(lp);
      last = lp;
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(level, when + attack);
    last.connect(env);
    env.connect(master);
    osc.start(when);

    let stopped = false;
    const handle: ToneHandle = {
      stop: (at?: number) => {
        if (stopped) return;
        stopped = true;
        this.live.delete(handle);
        const t = Math.max(ctx.currentTime, at ?? ctx.currentTime);
        const g = env.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => void };
        if (t <= when) {
          // Never started: silence it entirely.
          g.cancelScheduledValues(0);
          g.setValueAtTime(0, ctx.currentTime);
          try {
            osc.stop(when + 0.01);
          } catch {
            /* ignore */
          }
        } else {
          if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
          else g.cancelScheduledValues(t);
          g.setTargetAtTime(0, t, release / 3);
          try {
            osc.stop(t + release * 3);
          } catch {
            /* ignore */
          }
        }
        osc.onended = () => {
          try {
            env.disconnect();
          } catch {
            /* ignore */
          }
        };
      },
      setFreq: (hz: number, glide = 0.03) => {
        if (stopped) return;
        osc.frequency.setTargetAtTime(hz, ctx.currentTime, glide);
      },
      setWave: (w: PeriodicWave) => {
        if (!stopped) osc.setPeriodicWave(w);
      },
    };
    this.live.add(handle);
    if (opts.duration !== undefined) {
      const end = when + opts.duration;
      // Schedule the release now; keep the handle so stopAll can still cut it short.
      env.gain.setValueAtTime(level, Math.max(when + attack, end - 0.001));
      env.gain.setTargetAtTime(0, end, release / 3);
      osc.stop(end + release * 3);
      osc.onended = () => {
        this.live.delete(handle);
        stopped = true;
        try {
          env.disconnect();
        } catch {
          /* ignore */
        }
      };
    }
    return handle;
  }

  /** Several tones at once, with levels scaled so chords do not get louder than single notes. */
  chord(freqs: number[], opts: ToneOptions = {}): ToneHandle[] {
    const level = (opts.level ?? 0.6) / Math.max(1, Math.sqrt(freqs.length) * 0.85);
    return freqs.map((f) => this.tone(f, { ...opts, level }));
  }

  stopAll() {
    for (const h of [...this.live]) h.stop();
    this.live.clear();
  }

  /** Stop app-wide sequences and this synth's tones before starting a new demonstration. */
  takeOver() {
    stopAllPlayback();
    this.stopAll();
  }
}

export const synth = new ToneSynth();
