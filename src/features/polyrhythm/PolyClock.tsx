/**
 * Circular visualizations driven imperatively from requestAnimationFrame:
 * PolyClock (one polygon per layer, one rotating hand) and MeterRings (polymeter: one ring and
 * one hand per layer, each with its own cycle length).
 */
import { useImperativeHandle, useRef, type Ref } from 'react';
import { LAYER_COLORS } from './layers';
import s from './Polyrhythm.module.css';

const C = 150;
const R = 118;

const pt = (frac: number, r: number) => {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

export interface ClockHandle {
  /** frac = position in the cycle (0..1); flashes[layer] = 0..1 brightness of the latest onset; lit[layer] = its index. */
  update: (frac: number, lit: number[], flashes: number[]) => void;
  reset: () => void;
}

export function PolyClock({ counts, gridSize, handle, label }: { counts: number[]; gridSize: number; handle?: Ref<ClockHandle>; label: string }) {
  const hand = useRef<SVGGElement>(null);
  const verts = useRef<Array<Array<SVGCircleElement | null>>>([]);
  const prev = useRef<Array<SVGCircleElement | null>>([]);

  useImperativeHandle(
    handle,
    () => ({
      update(frac, lit, flashes) {
        hand.current?.setAttribute('transform', `rotate(${(frac * 360).toFixed(2)} ${C} ${C})`);
        lit.forEach((k, i) => {
          const el = verts.current[i]?.[k] ?? null;
          if (prev.current[i] && prev.current[i] !== el) prev.current[i]!.setAttribute('r', '6');
          if (el) el.setAttribute('r', String(6 + 6 * flashes[i]));
          prev.current[i] = el;
        });
      },
      reset() {
        hand.current?.setAttribute('transform', `rotate(0 ${C} ${C})`);
        prev.current.forEach((el) => el?.setAttribute('r', '6'));
        prev.current = [];
      },
    }),
    [],
  );

  return (
    <svg viewBox="0 0 300 300" role="img" aria-label={label} className={s.clockSvg}>
      <circle cx={C} cy={C} r={R + 14} style={{ fill: 'var(--bg-sunk)', stroke: 'var(--rule)' }} />
      <circle cx={C} cy={C} r={R} style={{ fill: 'none', stroke: 'var(--rule-strong)', strokeWidth: 0.8 }} />
      {gridSize <= 120 &&
        Array.from({ length: gridSize }, (_, s) => {
          const [x1, y1] = pt(s / gridSize, R + 2);
          const [x2, y2] = pt(s / gridSize, R + 8);
          return <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: 'var(--ink-faint)', strokeWidth: 0.8 }} />;
        })}
      {counts.map((n, i) => {
        const color = `var(${LAYER_COLORS[i]})`;
        const points = Array.from({ length: n }, (_, k) => pt(k / n, R));
        return (
          <g key={`${i}-${n}`}>
            {n >= 2 && (
              <polygon
                points={points.map((p) => p.join(',')).join(' ')}
                style={{ fill: `color-mix(in srgb, ${color} 10%, transparent)`, stroke: color, strokeWidth: 2, strokeLinejoin: 'round' }}
              />
            )}
            {points.map(([x, y], k) => (
              <circle
                key={k}
                ref={(el) => {
                  verts.current[i] = verts.current[i] ?? [];
                  verts.current[i][k] = el;
                }}
                cx={x}
                cy={y}
                r={6}
                style={{ fill: color, stroke: 'var(--bg-elev)', strokeWidth: 1.5, transition: 'r 40ms' }}
              />
            ))}
          </g>
        );
      })}
      <g ref={hand} transform={`rotate(0 ${C} ${C})`}>
        <line x1={C} y1={C} x2={C} y2={C - R - 12} style={{ stroke: 'var(--brass)', strokeWidth: 2.4, strokeLinecap: 'round' }} />
      </g>
      <circle cx={C} cy={C} r={6} style={{ fill: 'var(--brass)' }} />
    </svg>
  );
}

export interface RingsHandle {
  /** pulse = continuous position in pulses since the period start. */
  update: (pulse: number) => void;
  reset: () => void;
}

/** Polymeter rings: each layer cycles through its own number of pulses. */
export function MeterRings({ lengths, handle, label }: { lengths: number[]; handle?: Ref<RingsHandle>; label: string }) {
  const hands = useRef<Array<SVGGElement | null>>([]);
  const radii = lengths.map((_, i) => R - i * 30);
  useImperativeHandle(
    handle,
    () => ({
      update(pulse) {
        lengths.forEach((n, i) => {
          const frac = (pulse % n) / n;
          hands.current[i]?.setAttribute('transform', `rotate(${(frac * 360).toFixed(2)} ${C} ${C})`);
        });
      },
      reset() {
        hands.current.forEach((h) => h?.setAttribute('transform', `rotate(0 ${C} ${C})`));
      },
    }),
    [lengths],
  );
  return (
    <svg viewBox="0 0 300 300" role="img" aria-label={label} className={s.clockSvg}>
      <circle cx={C} cy={C} r={R + 14} style={{ fill: 'var(--bg-sunk)', stroke: 'var(--rule)' }} />
      <line x1={C} y1={C - R - 14} x2={C} y2={C - radii[radii.length - 1] + 14} style={{ stroke: 'var(--brass)', strokeWidth: 1, strokeDasharray: '3 3' }} />
      {lengths.map((n, i) => {
        const color = `var(${LAYER_COLORS[i]})`;
        const r = radii[i];
        return (
          <g key={`${i}-${n}`}>
            <circle cx={C} cy={C} r={r} style={{ fill: 'none', stroke: `color-mix(in srgb, ${color} 45%, transparent)`, strokeWidth: 1.5 }} />
            {Array.from({ length: n }, (_, k) => {
              const [x, y] = pt(k / n, r);
              return <circle key={k} cx={x} cy={y} r={k === 0 ? 7 : 4} style={{ fill: k === 0 ? color : 'var(--bg-elev)', stroke: color, strokeWidth: 1.5 }} />;
            })}
            <g
              ref={(el) => {
                hands.current[i] = el;
              }}
              transform={`rotate(0 ${C} ${C})`}
            >
              <line x1={C} y1={C - r + 13} x2={C} y2={C - r - 13} style={{ stroke: color, strokeWidth: 4, strokeLinecap: 'round' }} />
            </g>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={4} style={{ fill: 'var(--brass)' }} />
    </svg>
  );
}
