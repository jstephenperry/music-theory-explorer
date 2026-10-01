/**
 * "From rhythm to pitch": two or more pulse trains whose rates keep a fixed ratio.
 * Slow rates are rendered as individually scheduled clicks; as the rate passes roughly
 * 12 to 40 pulses per second the clicks crossfade into buzzy periodic tones at the same
 * frequency, so a 3:2 polyrhythm becomes a perfect fifth. Output level stays at or below 0.18.
 */
import { audio } from '../../audio/engine';

export const CLICK_TO_TONE = { from: 12, to: 40 };
const OUT_LEVEL = 0.18;
const LOOKAHEAD = 0.12;

/** 0 = all clicks, 1 = all tone, for a pulse rate in Hz. */
export function toneMix(rate: number): number {
  const { from, to } = CLICK_TO_TONE;
  if (rate <= from) return 0;
  if (rate >= to) return 1;
  return (Math.log2(rate) - Math.log2(from)) / (Math.log2(to) - Math.log2(from));
}

interface Layer {
  ratio: number;
  clickPitch: number;
  osc: OscillatorNode;
  tone: GainNode;
  click: GainNode;
  next: number;
  muted: boolean;
}

export class PulsePitchEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private layers: Layer[] = [];
  private timer: number | null = null;
  private base = 1;
  private clickBuffers = new Map<number, AudioBuffer>();
  running = false;

  /**
   * Start pulse trains. `ratios` are relative rates (e.g. [3, 2]); `base` is pulses per second
   * of a layer with ratio 1, so layer i pulses at ratios[i] * base.
   */
  start(ratios: number[], base: number, clickPitches: number[]) {
    this.stop(true);
    const ctx = audio.context();
    this.ctx = ctx;
    this.base = base;
    const out = ctx.createGain();
    out.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5000;
    out.connect(lp);
    lp.connect(ctx.destination);
    out.gain.setTargetAtTime(OUT_LEVEL, ctx.currentTime, 0.02);
    this.out = out;
    const wave = this.pulseWave(ctx);
    const t0 = ctx.currentTime + 0.05;
    const per = 1 / Math.max(1, ratios.length);
    this.layers = ratios.map((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.value = ratio * base;
      const tone = ctx.createGain();
      const click = ctx.createGain();
      const mix = toneMix(ratio * base);
      tone.gain.value = mix * per * 0.9;
      click.gain.value = (1 - mix) * per * 1.4;
      osc.connect(tone);
      tone.connect(out);
      click.connect(out);
      osc.start(t0);
      return { ratio, clickPitch: clickPitches[i] ?? 1500, osc, tone, click, next: t0, muted: false };
    });
    this.running = true;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  /** Change the base rate smoothly while running. */
  setBase(base: number) {
    this.base = base;
    const ctx = this.ctx;
    if (!ctx || !this.running) return;
    const per = 1 / Math.max(1, this.layers.length);
    for (const l of this.layers) {
      const f = l.ratio * base;
      l.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.03);
      const mix = toneMix(f);
      l.tone.gain.setTargetAtTime(mix * per * 0.9, ctx.currentTime, 0.04);
      l.click.gain.setTargetAtTime((1 - mix) * per * 1.4, ctx.currentTime, 0.04);
    }
  }

  /** Mute or unmute individual layers. */
  setMuted(muted: boolean[]) {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    this.layers.forEach((l, i) => {
      const m = !!muted[i];
      if (m === l.muted) return;
      l.muted = m;
      if (m) l.osc.disconnect();
      else l.osc.connect(l.tone);
    });
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.running) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    for (const l of this.layers) {
      const rate = l.ratio * this.base;
      const period = 1 / rate;
      // If we fell behind (tab in background), skip ahead instead of bursting.
      if (l.next < ctx.currentTime - 0.2) l.next = ctx.currentTime + 0.01;
      while (l.next < horizon) {
        if (toneMix(rate) < 1 && !l.muted) this.click(l, l.next);
        l.next += period;
      }
    }
  }

  private click(l: Layer, when: number) {
    const ctx = this.ctx!;
    let buf = this.clickBuffers.get(l.clickPitch);
    if (!buf) {
      const len = Math.floor(ctx.sampleRate * 0.012);
      buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        d[i] = Math.sin(2 * Math.PI * l.clickPitch * t) * Math.exp(-t / 0.0025);
      }
      this.clickBuffers.set(l.clickPitch, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(l.click);
    src.start(when);
  }

  /** A band-limited pulse: equal-ish harmonics rolled off gently. */
  private pulseWave(ctx: AudioContext): PeriodicWave {
    const n = 24;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) real[k] = 1 / Math.pow(k, 0.9);
    return ctx.createPeriodicWave(real, imag);
  }

  stop(immediate = false) {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    const out = this.out;
    const layers = this.layers;
    this.running = false;
    this.layers = [];
    this.out = null;
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const fade = immediate ? 0.01 : 0.06;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + fade);
    for (const l of layers) {
      try {
        l.osc.stop(t + fade + 0.02);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* ignore */
      }
    }, (fade + 0.2) * 1000);
  }
}
