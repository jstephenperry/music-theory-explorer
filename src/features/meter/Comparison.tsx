/**
 * Side-by-side comparisons of meters that share their notes but not their grouping:
 * 6/8 versus 3/4, and 12/8 versus 4/4 with triplets. A/B and alternating playback.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Panel, Segmented, Slider } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import type { SeqEvent } from '../../audio/sequencer';
import { RhythmStaff, type RhythmStaffHandle } from './RhythmStaff';
import type { RMeasure } from './rhythmNotation';
import { outputLatency, useRaf } from './useRaf';
import s from './MeterPage.module.css';

interface Side {
  title: string;
  caption: string;
  measure: RMeasure;
  /** Beat groups in pulses. */
  groups: number[];
}

interface Example {
  id: string;
  label: string;
  pulses: number;
  a: Side;
  b: Side;
  insight: string;
}

const eighths = (n: number, accents: number[]) => Array.from({ length: n }, (_, i) => ({ dur: '8' as const, accent: accents.includes(i) }));
const chunks = (n: number, size: number) => Array.from({ length: n / size }, (_, k) => Array.from({ length: size }, (_, j) => k * size + j));

const EXAMPLES: Example[] = [
  {
    id: '68-34',
    label: '6/8 versus 3/4',
    pulses: 6,
    a: {
      title: '6/8',
      caption: 'Two beats of three: ONE two three FOUR five six',
      measure: { timeSig: '6/8', notes: eighths(6, [0, 3]), beams: chunks(6, 3) },
      groups: [3, 3],
    },
    b: {
      title: '3/4',
      caption: 'Three beats of two: ONE and TWO and THREE and',
      measure: { timeSig: '3/4', notes: eighths(6, [0, 2, 4]), beams: chunks(6, 2) },
      groups: [2, 2, 2],
    },
    insight:
      'Six identical eighth notes. 6/8 groups them 3+3 (compound duple), 3/4 groups them 2+2+2 (simple triple). Alternate the two and you hear the cross-accent of Bernstein’s “America” and many Latin American dances.',
  },
  {
    id: '128-44',
    label: '12/8 versus 4/4 with triplets',
    pulses: 12,
    a: {
      title: '12/8',
      caption: 'Four dotted-quarter beats, each divided in three',
      measure: { timeSig: '12/8', notes: eighths(12, [0, 3, 6, 9]), beams: chunks(12, 3) },
      groups: [3, 3, 3, 3],
    },
    b: {
      title: '4/4 with triplets',
      caption: 'Four quarter beats, each divided by an eighth-note triplet',
      measure: {
        timeSig: '4/4',
        notes: eighths(12, [0, 3, 6, 9]),
        beams: chunks(12, 3),
        tuplets: [0, 3, 6, 9].map((from) => ({ from, count: 3, numNotes: 3, notesOccupied: 2 })),
      },
      groups: [3, 3, 3, 3],
    },
    insight:
      'These sound exactly the same when the dotted quarter of 12/8 equals the quarter of 4/4. Slow blues and doo-wop are usually written in 12/8; jazz and rock charts often write the same feel as 4/4 with triplets (or “swing eighths”).',
  },
];

const withIds = (m: RMeasure, prefix: string): RMeasure => ({ ...m, notes: m.notes.map((n, i) => ({ ...n, id: `${prefix}${i}` })) });

type Mode = 'a' | 'b' | 'ab';

export function Comparison() {
  const [exId, setExId] = useState(EXAMPLES[0].id);
  const ex = EXAMPLES.find((e) => e.id === exId)!;
  const [rate, setRate] = useState(240);
  const [mode, setMode] = useState<Mode | null>(null);
  const player = usePlayer();
  const staffA = useRef<RhythmStaffHandle>(null);
  const staffB = useRef<RhythmStaffHandle>(null);
  const latency = useRef(0);

  const parts = useMemo(() => ({ a: [{ measures: [withIds(ex.a.measure, 'a')] }], b: [{ measures: [withIds(ex.b.measure, 'b')] }] }), [ex]);

  const sideEvents = (side: Side, offset: number, tag: 'a' | 'b'): SeqEvent[] => {
    const evs: SeqEvent[] = [];
    let p = 0;
    side.groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++) {
        const strong = gi === 0 && k === 0;
        const beat = k === 0;
        evs.push({
          time: offset + p,
          duration: 1,
          perc: { pitch: strong ? 1900 : beat ? 1350 : 950, gain: strong ? 0.55 : beat ? 0.42 : 0.22, decay: 0.05 },
          data: { tag, i: p },
        });
        if (beat) evs.push({ time: offset + p, duration: 1, perc: { pitch: strong ? 110 : 170, gain: strong ? 0.75 : 0.5, decay: 0.18 } });
        p++;
      }
    });
    return evs;
  };

  const play = (m: Mode) => {
    const n = ex.pulses;
    const events = m === 'a' ? sideEvents(ex.a, 0, 'a') : m === 'b' ? sideEvents(ex.b, 0, 'b') : [...sideEvents(ex.a, 0, 'a'), ...sideEvents(ex.b, n, 'b')];
    setMode(m);
    latency.current = outputLatency();
    player.play(events, { bpm: rate, loop: true, length: m === 'ab' ? 2 * n : n });
  };

  useEffect(() => {
    player.setBpm(rate);
  }, [rate, player.setBpm]);

  useEffect(() => {
    if (!player.playing) {
      setMode(null);
      staffA.current?.highlight(null);
      staffB.current?.highlight(null);
    }
  }, [player.playing]);

  useEffect(() => {
    player.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exId]);

  useRaf(player.playing, () => {
    if (!mode) return;
    const n = ex.pulses;
    const len = mode === 'ab' ? 2 * n : n;
    const raw = player.position() - (latency.current * rate) / 60;
    const pos = ((raw % len) + len) % len;
    const i = Math.floor(pos);
    const side = mode === 'ab' ? (i < n ? 'a' : 'b') : mode;
    const k = i % n;
    (side === 'a' ? staffA : staffB).current?.highlight([`${side}${k}`]);
    (side === 'a' ? staffB : staffA).current?.highlight(null);
  });

  const card = (side: Side, which: 'a' | 'b') => (
    <div className={`${s.compareCard} ${mode === which || (mode === 'ab' && player.playing) ? s.compareCardOn : ''}`}>
      <div className={s.compareHead}>
        <h3 className={s.compareTitle}>{side.title}</h3>
        <Button size="sm" icon={player.playing && mode === which ? 'stop' : 'play'} onClick={() => (player.playing && mode === which ? player.stop() : play(which))}>
          {which.toUpperCase()}
        </Button>
      </div>
      <RhythmStaff parts={which === 'a' ? parts.a : parts.b} handle={which === 'a' ? staffA : staffB} ariaLabel={`${side.title}: ${side.caption}`} singleLine />
      <div className={s.compareDots} aria-hidden="true">
        {side.groups.map((g, gi) => (
          <span key={gi} className={s.compareGroup}>
            {Array.from({ length: g }, (_, k) => (
              <i key={k} className={`${s.cdot} ${k === 0 ? (gi === 0 ? s.cdotStrong : s.cdotBeat) : ''}`} />
            ))}
          </span>
        ))}
      </div>
      <p className={s.compareCaption}>{side.caption}</p>
    </div>
  );

  return (
    <Panel
      title="Same notes, different meter"
      eyebrow="Compare groupings"
      actions={
        <Segmented
          ariaLabel="Comparison example"
          size="sm"
          value={exId}
          onChange={setExId}
          options={EXAMPLES.map((e) => ({ value: e.id, label: e.label }))}
        />
      }
    >
      <div className={s.compare}>
        {card(ex.a, 'a')}
        {card(ex.b, 'b')}
      </div>
      <div className={s.compareControls}>
        <Button variant="primary" icon={player.playing && mode === 'ab' ? 'stop' : 'loop'} onClick={() => (player.playing && mode === 'ab' ? player.stop() : play('ab'))}>
          {player.playing && mode === 'ab' ? 'Stop' : 'Alternate A and B'}
        </Button>
        <Slider label="Pulse speed (eighths per minute)" min={120} max={420} step={6} value={rate} onChange={setRate} width={200} />
      </div>
      <p className={s.insight}>{ex.insight}</p>
    </Panel>
  );
}
