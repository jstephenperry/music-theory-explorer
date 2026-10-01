/**
 * A mechanical metronome drawn in SVG. The arm is driven imperatively (no React re-render per frame).
 */
import { useImperativeHandle, useRef, type Ref } from 'react';
import s from './MeterPage.module.css';

export interface PendulumHandle {
  /** Angle in degrees (negative = left) and a flash amount 0..1 with the accent level of the last pulse. */
  update: (angle: number, flash: number, level: number) => void;
  reset: () => void;
}

export function Pendulum({ handle, bpmLabel }: { handle?: Ref<PendulumHandle>; bpmLabel: string }) {
  const arm = useRef<SVGGElement>(null);
  const lamp = useRef<SVGCircleElement>(null);

  useImperativeHandle(
    handle,
    () => ({
      update(angle, flash, level) {
        arm.current?.setAttribute('transform', `rotate(${angle.toFixed(2)} 60 150)`);
        const l = lamp.current;
        if (l) {
          l.style.opacity = String(0.15 + 0.85 * flash);
          l.style.fill = level === 2 ? 'var(--accent)' : level === 1 ? 'var(--brass-bright)' : 'var(--ink-faint)';
        }
      },
      reset() {
        arm.current?.setAttribute('transform', 'rotate(0 60 150)');
        if (lamp.current) lamp.current.style.opacity = '0.15';
      },
    }),
    [],
  );

  return (
    <svg className={s.pendulum} viewBox="0 0 120 180" role="img" aria-label={`Metronome at ${bpmLabel}`}>
      {/* Body */}
      <path d="M38 8 H82 L106 172 H14 Z" style={{ fill: 'var(--wood)', stroke: 'var(--brass)', strokeWidth: 1.2 }} />
      <path d="M44 18 H76 L92 150 H28 Z" style={{ fill: 'var(--wood-2)', stroke: 'color-mix(in srgb, var(--brass) 50%, transparent)', strokeWidth: 0.8 }} />
      {/* Scale ticks */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={54} x2={66} y1={30 + i * 12} y2={30 + i * 12} style={{ stroke: 'color-mix(in srgb, var(--brass) 55%, transparent)', strokeWidth: 0.7 }} />
      ))}
      {/* Arm */}
      <g ref={arm} transform="rotate(0 60 150)">
        <line x1={60} y1={150} x2={60} y2={22} style={{ stroke: 'var(--brass-bright)', strokeWidth: 2.2, strokeLinecap: 'round' }} />
        <path d="M52 62 H68 L65 76 H55 Z" style={{ fill: 'var(--brass)', stroke: 'var(--brass-bright)', strokeWidth: 0.8 }} />
      </g>
      <circle cx={60} cy={150} r={4.5} style={{ fill: 'var(--brass)' }} />
      {/* Lamp */}
      <circle ref={lamp} cx={60} cy={163} r={5} style={{ fill: 'var(--accent)', opacity: 0.15 }} />
    </svg>
  );
}
