/**
 * Hemiola: six beats heard as 3+3 (two bars of 3/4) or 2+2+2 (three bars of 2/4),
 * which is 3 against 2 at the level of the bar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Callout, Panel, PlayButton, Segmented, Slider } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import type { SeqEvent } from '../../audio/sequencer';
import { RhythmStaff, type RhythmStaffHandle } from '../meter/RhythmStaff';
import type { RMeasure } from '../meter/rhythmNotation';
import { outputLatency, useRaf } from '../meter/useRaf';
import s from './Polyrhythm.module.css';

type Mode = 'three' | 'two' | 'both' | 'cadence';

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'three', label: '3+3 (two bars of 3/4)' },
  { value: 'two', label: '2+2+2 (hemiola)' },
  { value: 'both', label: 'Both at once' },
  { value: 'cadence', label: 'Cadence: normal, then hemiola' },
];

/** Accented beats (0-based) within a cycle for each mode, per layer. */
function accentPlan(mode: Mode): { length: number; threes: number[]; twos: number[] } {
  if (mode === 'three') return { length: 6, threes: [0, 3], twos: [] };
  if (mode === 'two') return { length: 6, threes: [], twos: [0, 2, 4] };
  if (mode === 'both') return { length: 6, threes: [0, 3], twos: [0, 2, 4] };
  return { length: 12, threes: [0, 3], twos: [6, 8, 10] };
}

const quarters = (n: number, accents: number[], prefix: string, base: number, timeSig?: string): RMeasure => ({
  timeSig,
  notes: Array.from({ length: n }, (_, i) => ({ dur: 'q' as const, accent: accents.includes(base + i), id: `${prefix}${base + i}` })),
});

export function HemiolaView() {
  const [mode, setMode] = useState<Mode>('both');
  const [bpm, setBpm] = useState(150);
  const plan = accentPlan(mode);
  const player = usePlayer();
  const latency = useRef(0);
  const written = useRef<RhythmStaffHandle>(null);
  const heard = useRef<RhythmStaffHandle>(null);
  const cells = useRef<Array<HTMLDivElement | null>>([]);
  const litCell = useRef(-1);

  const start = (m: Mode = mode) => {
    const p = accentPlan(m);
    const events: SeqEvent[] = [];
    for (let b = 0; b < p.length; b++) {
      events.push({ time: b, duration: 1, perc: { pitch: 2600, gain: 0.08, decay: 0.02 }, data: b });
      if (p.threes.includes(b)) events.push({ time: b, duration: 1, perc: { pitch: 110, gain: 0.8, decay: 0.22 } });
      if (p.twos.includes(b)) events.push({ time: b, duration: 1, perc: { pitch: 1500, gain: 0.45, decay: 0.07 } });
    }
    latency.current = outputLatency();
    player.play(events, { bpm, loop: true, length: p.length });
  };

  useEffect(() => {
    if (player.playing) start(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    player.setBpm(bpm);
  }, [bpm, player.setBpm]);

  const light = (i: number) => {
    if (i === litCell.current) return;
    cells.current[litCell.current]?.classList.remove(s.beatNow);
    cells.current[i]?.classList.add(s.beatNow);
    litCell.current = i;
  };

  useEffect(() => {
    if (!player.playing) {
      light(-1);
      written.current?.highlight(null);
      heard.current?.highlight(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playing]);

  useRaf(player.playing, () => {
    const len = plan.length;
    const raw = player.position() - (latency.current * bpm) / 60;
    const beat = Math.floor(((raw % len) + len) % len);
    light(beat);
    written.current?.highlight([`w${beat}`]);
    heard.current?.highlight([`h${beat}`]);
  });

  // Notation: what is written (3/4 bars) and what is heard (regrouped).
  const writtenParts = useMemo(() => {
    const acc = [...new Set([...plan.threes, ...plan.twos])];
    const bars = plan.length / 3;
    return [{ measures: Array.from({ length: bars }, (_, k) => quarters(3, mode === 'both' ? [0, 2, 3, 4] : acc, 'w', k * 3, k === 0 ? '3/4' : undefined)) }];
  }, [plan, mode]);

  const heardParts = useMemo(() => {
    const ms: RMeasure[] = [];
    let sig = '';
    for (let b = 0; b < plan.length; ) {
      const inHemiola = mode === 'two' || mode === 'both' || (mode === 'cadence' && b >= 6);
      const size = inHemiola ? 2 : 3;
      const ts = `${size}/4`;
      ms.push(quarters(size, [b], 'h', b, ts !== sig ? ts : undefined));
      sig = ts;
      b += size;
    }
    return [{ measures: ms }];
  }, [plan, mode]);

  return (
    <div className={s.stack}>
      <Panel title="Hemiola" eyebrow="3 against 2 at the level of the bar" actions={<PlayButton playing={player.playing} onPlay={() => start()} onStop={player.stop} />}>
        <div className={s.controlsRow}>
          <Segmented ariaLabel="Hemiola mode" size="sm" value={mode} onChange={setMode} options={MODES} />
          <Slider label="Tempo (quarter notes per minute)" min={60} max={240} value={bpm} onChange={setBpm} width={180} />
        </div>

        <div className={s.hemiola} style={{ ['--beats' as string]: plan.length }}>
          <div className={s.hemiolaRow}>
            {Array.from({ length: plan.length / 3 }, (_, k) => (
              <div key={k} className={`${s.bracket} ${s.bracketThree} ${plan.threes.length && (mode !== 'cadence' || k < 2) ? '' : s.bracketOff}`} style={{ gridColumn: `${k * 3 + 1} / span 3` }}>
                3
              </div>
            ))}
          </div>
          <div className={s.hemiolaBeats}>
            {Array.from({ length: plan.length }, (_, b) => (
              <div
                key={b}
                ref={(el) => {
                  cells.current[b] = el;
                }}
                className={`${s.beatCell} ${plan.threes.includes(b) ? s.beatThree : ''} ${plan.twos.includes(b) ? s.beatTwo : ''}`}
              >
                {(b % 3) + 1}
              </div>
            ))}
          </div>
          <div className={s.hemiolaRow}>
            {Array.from({ length: plan.length / 2 }, (_, k) => {
              const on = mode === 'two' || mode === 'both' || (mode === 'cadence' && k >= 3);
              return (
                <div key={k} className={`${s.bracket} ${s.bracketTwo} ${on ? '' : s.bracketOff}`} style={{ gridColumn: `${k * 2 + 1} / span 2` }}>
                  2
                </div>
              );
            })}
          </div>
        </div>
        <p className={s.caption}>
          Low drum: the 3/4 downbeats (groups of three beats). High block: groups of two beats. Beat numbers count within each written 3/4 bar.
        </p>
      </Panel>

      <div className={s.twoCol}>
        <Panel title="As written" eyebrow="In 3/4, with accents">
          <RhythmStaff parts={writtenParts} handle={written} singleLine ariaLabel="Quarter notes in 3/4 with the accents of the selected mode" />
        </Panel>
        <Panel title="As heard" eyebrow="Regrouped by the accents">
          <RhythmStaff parts={heardParts} handle={heard} singleLine ariaLabel="The same quarter notes rebarred as they are heard" />
        </Panel>
      </div>

      <Callout title="Where to hear it">
        <p>
          Baroque dances and cadences (Handel, Bach courantes) often turn the last two bars of 3/4 into one bar of 3/2. Brahms and Schumann blur
          the barline with it constantly, and Bernstein’s “America” alternates 6/8 and 3/4, the same idea a level down: 3+3 versus 2+2+2 eighths.
        </p>
      </Callout>
    </div>
  );
}
