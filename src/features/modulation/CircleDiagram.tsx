import { keyFromFifths, keySignatureFifths, type Key } from '../../theory/keys';
import { mod } from '../../theory/notes';
import { keyShort, keyLabel } from './logic';
import s from './Modulation.module.css';

const R_OUT = 112;
const R_IN = 74;
const C = 150;

function pos(index: number, r: number): [number, number] {
  const a = (index * 30 - 90) * (Math.PI / 180);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/**
 * Small circle of fifths: majors outside, relative minors inside.
 * Marks the source and target keys and draws the shortest path between their signatures.
 */
export function CircleDiagram({ from, to, onPick }: { from: Key; to: Key; onPick?: (k: Key) => void }) {
  const fa = keySignatureFifths(from);
  const fb = keySignatureFifths(to);
  const ia = mod(fa, 12);
  const ib = mod(fb, 12);
  let steps = mod(fb - fa, 12);
  if (steps > 6) steps -= 12;
  const rFor = (k: Key) => (k.mode === 'major' ? R_OUT : R_IN);

  const labelFor = (i: number, mode: 'major' | 'minor'): Key => {
    for (const k of [from, to]) if (k.mode === mode && mod(keySignatureFifths(k), 12) === i) return k;
    return keyFromFifths(mod(i + 6, 12) - 6, mode);
  };

  // Path along the middle ring between the two signature positions.
  const rPath = (R_OUT + R_IN) / 2;
  const pathPts: string[] = [];
  const n = Math.abs(steps);
  const dir = Math.sign(steps);
  for (let k = 0; k <= n * 6; k++) {
    const idx = ia + (dir * k) / 6;
    const [x, y] = pos(idx, rPath);
    pathPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const [ax, ay] = pos(ia, rFor(from));
  const [bx, by] = pos(ib, rFor(to));
  const [am, an] = pos(ia, rPath);
  const [bm, bn] = pos(ib, rPath);

  return (
    <div className={s.circleWrap}>
      <svg viewBox="0 0 300 300" className={s.circleSvg} role="img" aria-label={`Circle of fifths: ${keyLabel(from)} to ${keyLabel(to)}, ${n} step${n === 1 ? '' : 's'}${n ? (steps > 0 ? ' sharpward' : ' flatward') : ''}`}>
        <circle cx={C} cy={C} r={R_OUT + 22} style={{ fill: 'var(--bg-sunk)', stroke: 'var(--rule)' }} />
        <circle cx={C} cy={C} r={rPath} style={{ fill: 'none', stroke: 'var(--rule)', strokeDasharray: '2 4' }} />
        <circle cx={C} cy={C} r={R_IN - 20} style={{ fill: 'var(--bg-elev)', stroke: 'var(--rule)' }} />
        {n > 0 && (
          <polyline points={pathPts.join(' ')} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.55 }} />
        )}
        <line x1={ax} y1={ay} x2={am} y2={an} style={{ stroke: 'var(--brass)', strokeWidth: 2 }} />
        <line x1={bx} y1={by} x2={bm} y2={bn} style={{ stroke: 'var(--verdigris)', strokeWidth: 2 }} />
        {Array.from({ length: 12 }, (_, i) => {
          const maj = labelFor(i, 'major');
          const min = labelFor(i, 'minor');
          const [x1, y1] = pos(i, R_OUT);
          const [x2, y2] = pos(i, R_IN);
          const isA = (k: Key) => k === from;
          const isB = (k: Key) => k === to;
          const ring = (k: Key, x: number, y: number, r: number) => {
            const fill = isA(k) ? 'var(--brass)' : isB(k) ? 'var(--verdigris)' : 'var(--bg-elev)';
            const color = isA(k) || isB(k) ? 'var(--bg-elev)' : 'var(--ink)';
            return (
              <g
                key={k.mode}
                onClick={onPick ? () => onPick(k) : undefined}
                style={{ cursor: onPick ? 'pointer' : 'default' }}
                role={onPick ? 'button' : undefined}
                aria-label={onPick ? `Set target to ${keyLabel(k)}` : undefined}
              >
                <circle cx={x} cy={y} r={r} style={{ fill, stroke: 'var(--rule-strong)', strokeWidth: 0.8 }} />
                <text x={x} y={y + 4.5} textAnchor="middle" style={{ fill: color, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: k.mode === 'major' ? 14 : 12 }}>
                  {keyShort(k)}
                </text>
              </g>
            );
          };
          return (
            <g key={i}>
              {ring(maj, x1, y1, 15)}
              {ring(min, x2, y2, 13)}
            </g>
          );
        })}
        <text x={C} y={C - 4} textAnchor="middle" style={{ fill: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>
          {n}
        </text>
        <text x={C} y={C + 14} textAnchor="middle" style={{ fill: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: 1 }}>
          {n === 1 ? 'STEP' : 'STEPS'}
        </text>
      </svg>
      <div className={s.circleCaption}>
        {n === 0 ? 'Same key signature.' : `${n} step${n === 1 ? '' : 's'} ${steps > 0 ? 'clockwise (toward sharps)' : 'counterclockwise (toward flats)'}`}
      </div>
    </div>
  );
}
