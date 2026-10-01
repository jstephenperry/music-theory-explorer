/**
 * Linear LCM grid: one row per layer plus the composite rhythm, with an imperative playhead.
 * Also used for polymeters (rows = layers' cycles over the shared pulse).
 */
import { useImperativeHandle, useRef, type Ref } from 'react';
import { LAYER_COLORS, LAYER_NAMES } from './layers';

export interface GridHandle {
  /** Position in grid steps (fractional), or null to hide. */
  update: (step: number | null) => void;
}

export interface GridRow {
  label: string;
  colorVar: string;
  /** Cell kinds: 0 = empty, 1 = onset, 2 = strong onset (cycle start). */
  cells: number[];
  /** Optional cycle boundaries (drawn as brackets) in steps. */
  cycle?: number;
}

const ROW_H = 26;
const LABEL_W = 34;

export function LcmGrid({
  rows,
  size,
  together,
  composite,
  handle,
  label,
  stepLabels = true,
}: {
  rows: GridRow[];
  size: number;
  together?: number[];
  composite?: number[];
  handle?: Ref<GridHandle>;
  label: string;
  stepLabels?: boolean;
}) {
  const head = useRef<SVGRectElement>(null);
  const cellW = Math.max(6, Math.min(34, 640 / size));
  const width = LABEL_W + size * cellW + 2;
  const allRows = composite ? [...rows, { label: 'All', colorVar: '--ink', cells: Array.from({ length: size }, (_, s) => (composite.includes(s) ? 1 : 0)) }] : rows;
  const height = allRows.length * ROW_H + (stepLabels ? 18 : 4) + 6;
  const tog = new Set(together ?? []);

  useImperativeHandle(
    handle,
    () => ({
      update(step) {
        const el = head.current;
        if (!el) return;
        if (step === null) {
          el.style.opacity = '0';
          return;
        }
        el.style.opacity = '1';
        el.setAttribute('x', String(LABEL_W + Math.floor(step) * cellW));
      },
    }),
    [cellW],
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ width: '100%', display: 'block', maxHeight: height * 1.6 }}>
      {Array.from({ length: size }, (_, s) =>
        tog.has(s) ? (
          <rect key={`t${s}`} x={LABEL_W + s * cellW} y={0} width={cellW} height={allRows.length * ROW_H} rx={3} style={{ fill: 'color-mix(in srgb, var(--brass) 18%, transparent)' }} />
        ) : null,
      )}
      <rect ref={head} x={LABEL_W} y={0} width={cellW} height={allRows.length * ROW_H} rx={3} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.6, opacity: 0 }} />
      {allRows.map((row, ri) => {
        const y = ri * ROW_H;
        const isComposite = composite && ri === allRows.length - 1;
        return (
          <g key={ri}>
            <text x={LABEL_W - 8} y={y + ROW_H / 2 + 4} textAnchor="end" style={{ fill: `var(${row.colorVar})`, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)' }}>
              {row.label}
            </text>
            {isComposite && <line x1={LABEL_W} x2={width - 2} y1={y + 1} y2={y + 1} style={{ stroke: 'var(--rule-strong)', strokeWidth: 0.8 }} />}
            {row.cells.map((c, s) => {
              const x = LABEL_W + s * cellW;
              const pad = Math.min(3, cellW * 0.15);
              const boundary = row.cycle && s % row.cycle === 0 && s > 0;
              return (
                <g key={s}>
                  {boundary && <line x1={x} x2={x} y1={y + 3} y2={y + ROW_H - 3} style={{ stroke: `var(${row.colorVar})`, strokeWidth: 1.4 }} />}
                  {c > 0 ? (
                    <rect
                      x={x + pad}
                      y={y + 5 + (c === 1 && row.cycle ? 5 : 0)}
                      width={cellW - 2 * pad}
                      height={ROW_H - 10 - (c === 1 && row.cycle ? 10 : 0)}
                      rx={Math.min(4, cellW / 3)}
                      style={{ fill: `var(${row.colorVar})`, opacity: c === 1 && row.cycle ? 0.55 : 1 }}
                    />
                  ) : (
                    <circle cx={x + cellW / 2} cy={y + ROW_H / 2} r={Math.min(1.8, cellW / 6)} style={{ fill: 'var(--ink-faint)' }} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      {stepLabels &&
        Array.from({ length: size }, (_, s) =>
          size <= 32 || s % Math.ceil(size / 24) === 0 ? (
            <text key={`n${s}`} x={LABEL_W + s * cellW + cellW / 2} y={allRows.length * ROW_H + 14} textAnchor="middle" style={{ fill: 'var(--ink-faint)', fontSize: 9.5, fontFamily: 'var(--font-ui)' }}>
              {s + 1}
            </text>
          ) : null,
        )}
    </svg>
  );
}

export function layerRows(gridRows: boolean[][], labels?: string[]): GridRow[] {
  return gridRows.map((r, i) => ({ label: labels?.[i] ?? LAYER_NAMES[i], colorVar: LAYER_COLORS[i], cells: r.map((x) => (x ? 2 : 0)) }));
}
