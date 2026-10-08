import { useEffect } from 'react';
import { audio } from '../../audio/engine';
import { midiToFreq } from '../../theory/notes';

/**
 * A soft sustained drone (tonic, optional fifth, and the octave) built directly on the Web Audio
 * context. It cross-fades when the pitches change and fades out when disabled or unmounted.
 */
export function useDrone(enabled: boolean, rootMidi: number, withFifth: boolean, level = 0.12) {
  useEffect(() => {
    if (!enabled) return;
    const ctx = audio.context();
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(level, t0 + 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.4;
    filter.connect(out);
    out.connect(ctx.destination);

    // A slow LFO moves the filter cutoff slightly, so the drone does not sound static.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(t0);

    const sources: OscillatorNode[] = [lfo];
    const voices: Array<[number, number]> = [
      [rootMidi, 0.5],
      [rootMidi + 12, 0.28],
      ...(withFifth ? ([[rootMidi + 7, 0.3]] as Array<[number, number]>) : []),
    ];
    for (const [m, gain] of voices) {
      const f = midiToFreq(m, audio.a4);
      for (const [type, detune, g] of [
        ['sawtooth', -4, 0.35],
        ['sawtooth', 5, 0.35],
        ['sine', 0, 0.7],
      ] as Array<[OscillatorType, number, number]>) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        const vg = ctx.createGain();
        vg.gain.value = gain * g;
        o.connect(vg);
        vg.connect(filter);
        o.start(t0);
        sources.push(o);
      }
    }

    return () => {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.35);
      sources.forEach((s) => {
        try {
          s.stop(t + 0.4);
        } catch {
          /* already stopped */
        }
      });
      window.setTimeout(() => out.disconnect(), 600);
    };
  }, [enabled, rootMidi, withFifth, level]);
}
