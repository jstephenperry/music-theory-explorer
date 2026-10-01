import { intervalName, transpose, type Interval } from '../../theory/intervals';
import { noteName, type Note } from '../../theory/notes';
import { classifyConsonance } from './intervalLogic';
import s from './IntervalsPage.module.css';

const CLASS_COLOR = {
  'perfect consonance': 'var(--verdigris)',
  'imperfect consonance': 'var(--royal)',
  dissonance: 'var(--plum)',
} as const;

/**
 * Every interval above the root as a rising staircase: step height is proportional to the size in
 * semitones, color shows the consonance class, and spellings that share keys stand side by side.
 */
export function Staircase({
  root,
  intervals,
  selected,
  onSelect,
}: {
  root: Note;
  intervals: Interval[];
  selected: Interval;
  onSelect: (iv: Interval) => void;
}) {
  const maxSemis = Math.max(12, ...intervals.map((i) => i.semis));
  const colW = intervals.length <= 13 ? 58 : intervals.length <= 25 ? 46 : 38;
  const gap = 4;
  const H = 210;
  const top = 34;
  const base = H - 30;
  const unit = (base - top - 14) / maxSemis;
  const width = intervals.length * colW;

  return (
    <div className={s.stairScroll}>
      <svg
        className={s.stairs}
        viewBox={`0 0 ${width} ${H}`}
        style={{ minWidth: intervals.length * 22 }}
        role="group"
        aria-label={`All intervals above ${noteName(root)}, from unison upward`}
      >
        {/* Semitone gridlines every octave */}
        {[0, 12, 24].filter((x) => x <= maxSemis).map((x) => (
          <g key={x}>
            <line x1={0} x2={width} y1={base - 14 - x * unit} y2={base - 14 - x * unit} style={{ stroke: 'var(--rule)' }} strokeDasharray="3 4" />
          </g>
        ))}
        {intervals.map((iv, i) => {
          const name = intervalName(iv);
          const cls = classifyConsonance(iv).cls;
          const isSel = iv.num === selected.num && iv.semis === selected.semis;
          const h = 14 + iv.semis * unit;
          const x = i * colW + gap / 2;
          const color = CLASS_COLOR[cls];
          const upper = noteName(transpose(root, iv));
          return (
            <g
              key={name}
              className={s.stair}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${name}, ${iv.semis} semitones, ${noteName(root)} to ${upper}`}
              onClick={() => onSelect(iv)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(iv);
                }
              }}
            >
              <rect x={i * colW} y={0} width={colW} height={H} fill="transparent" />
              <rect
                x={x}
                y={base - h}
                width={colW - gap}
                height={h}
                rx={3}
                style={{ fill: isSel ? 'var(--accent)' : color, opacity: isSel ? 1 : 0.28, stroke: isSel ? 'var(--accent)' : color }}
                strokeWidth={1}
              />
              <rect x={x} y={base - h} width={colW - gap} height={3} rx={1.5} style={{ fill: isSel ? 'var(--accent)' : color }} />
              <text x={x + (colW - gap) / 2} y={base - h - 7} textAnchor="middle" className={s.stairLabel} style={{ fill: isSel ? 'var(--accent)' : 'var(--ink)' }}>
                {name}
              </text>
              <text x={x + (colW - gap) / 2} y={base + 14} textAnchor="middle" className={s.stairNote} style={{ fill: isSel ? 'var(--accent)' : 'var(--ink-muted)' }}>
                {upper}
              </text>
              <text x={x + (colW - gap) / 2} y={base + 26} textAnchor="middle" className={s.stairSemis} style={{ fill: 'var(--ink-faint)' }}>
                {iv.semis}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
