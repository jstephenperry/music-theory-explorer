import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui';
import { noteName, pc } from '../../theory/notes';
import { centroid, isDiatonic, nodeLabel, nodePos, pcAt, SQRT3_2, triadNotes, triadOf, triadSymbol, triKey, vertices, type Tri } from './logic';
import s from './Tonnetz.module.css';

export interface LatticeProps {
  current: Tri;
  /** Triangles passed through on the way to `current` (compound moves). */
  via: Tri[];
  /** Changes on every move so the highlight animates. */
  moveId: number;
  trail: Tri[];
  overlay: number[] | null;
  onTriClick: (t: Tri) => void;
  onNodeClick: (i: number, j: number) => void;
  onNodeHover: (i: number, j: number) => void;
  /** Milliseconds per elementary step of the highlight animation. */
  stepMs: number;
}

type V = [number, number];

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Reorder b's vertices so vertices shared with a keep a's index (the third one flips across the edge). */
function align(a: V[], b: V[]): V[] {
  const out: Array<V | null> = [null, null, null];
  const rest: V[] = [];
  for (const v of b) {
    const k = a.findIndex((w) => Math.abs(w[0] - v[0]) < 1e-6 && Math.abs(w[1] - v[1]) < 1e-6);
    if (k >= 0 && !out[k]) out[k] = v;
    else rest.push(v);
  }
  return out.map((v) => v ?? rest.shift()!) as V[];
}

const triPoints = (t: Tri, S: number): V[] => vertices(t).map(([i, j]) => nodePos(i, j)).map(([x, y]) => [x * S, y * S]);

export function TonnetzLattice(props: LatticeProps) {
  const { current, via, moveId, trail, overlay, stepMs } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const world = useRef<SVGGElement>(null);
  const hl = useRef<SVGPolygonElement>(null);
  const [width, setWidth] = useState(900);
  const S = width < 560 ? 56 : 70;
  const H = Math.round(Math.min(560, Math.max(360, width * 0.58)));

  // Camera in lattice units; committed state drives which part of the lattice is rendered.
  const [cam, setCam] = useState<V>(() => centroid(current));
  const camRef = useRef<V>(cam);
  const camAnim = useRef<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setWidth(Math.max(280, Math.floor(es[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyCam = (c: V) => {
    camRef.current = c;
    world.current?.setAttribute('transform', `translate(${(width / 2 - c[0] * S).toFixed(2)} ${(H / 2 - c[1] * S).toFixed(2)})`);
  };
  // Keep the transform in sync after every render, without interrupting an animation or a drag.
  useEffect(() => {
    if (!camAnim.current && !drag.current?.moved) applyCam(camRef.current);
  });

  const animateCam = (target: V, ms = 450) => {
    if (camAnim.current) cancelAnimationFrame(camAnim.current);
    const from = camRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      const e = ease(k);
      applyCam([from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e]);
      if (k < 1) camAnim.current = requestAnimationFrame(tick);
      else {
        camAnim.current = null;
        setCam(target);
      }
    };
    camAnim.current = requestAnimationFrame(tick);
  };

  // ---- Highlight animation through the path ----
  const shown = useRef<V[] | null>(null);
  const hlAnim = useRef<number | null>(null);
  useEffect(() => {
    const path = [...via.filter((t) => t !== current), current];
    const targets = path.map((t) => triPoints(t, S));
    if (!shown.current) {
      shown.current = targets[targets.length - 1];
      hl.current?.setAttribute('points', shown.current.map((v) => v.join(',')).join(' '));
    } else {
      if (hlAnim.current) cancelAnimationFrame(hlAnim.current);
      const segs: Array<[V[], V[]]> = [];
      let a = shown.current;
      for (const tgt of targets) {
        const b = align(a, tgt);
        segs.push([a, b]);
        a = b;
      }
      const t0 = performance.now();
      const per = Math.max(60, stepMs);
      const tick = (now: number) => {
        const el = Math.max(0, (now - t0) / per);
        const idx = Math.min(segs.length - 1, Math.floor(el));
        const k = Math.min(1, el - idx);
        const [p, q] = segs[idx];
        const e = ease(k);
        const pts = p.map((v, n) => [v[0] + (q[n][0] - v[0]) * e, v[1] + (q[n][1] - v[1]) * e] as V);
        shown.current = pts;
        hl.current?.setAttribute('points', pts.map((v) => `${v[0].toFixed(2)},${v[1].toFixed(2)}`).join(' '));
        if (el < segs.length) hlAnim.current = requestAnimationFrame(tick);
        else hlAnim.current = null;
      };
      hlAnim.current = requestAnimationFrame(tick);
    }
    // Follow the current triangle when it nears the edge.
    const [cx, cy] = centroid(current);
    const c = camRef.current;
    if (Math.abs(cx - c[0]) * S > width / 2 - S * 1.2 || Math.abs(cy - c[1]) * S > H / 2 - S * 1.0) animateCam([cx, cy]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveId, S]);

  useEffect(
    () => () => {
      if (hlAnim.current) cancelAnimationFrame(hlAnim.current);
      if (camAnim.current) cancelAnimationFrame(camAnim.current);
    },
    [],
  );

  // ---- Dragging (pan within a few cells of the current triangle) ----
  const drag = useRef<{ x: number; y: number; cam: V; moved: boolean; id: number } | null>(null);
  const clampCam = (c: V): V => {
    const [cx, cy] = centroid(current);
    const R = 6;
    return [Math.max(cx - R, Math.min(cx + R, c[0])), Math.max(cy - R * 0.8, Math.min(cy + R * 0.8, c[1]))];
  };
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, cam: camRef.current, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 5) {
      d.moved = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
    if (d.moved) applyCam(clampCam([d.cam[0] - dx / S, d.cam[1] - dy / S]));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) setCam(camRef.current);
  };

  const center = () => animateCam(centroid(current));

  const overlayKey = overlay ? overlay.join(',') : '';
  // Stable handlers for the memoized layer, always calling the latest props.
  const latest = useRef(props);
  latest.current = props;
  const handlers = useMemo(
    () => ({
      tri: (t: Tri) => !drag.current?.moved && latest.current.onTriClick(t),
      node: (i: number, j: number) => !drag.current?.moved && latest.current.onNodeClick(i, j),
      hover: (i: number, j: number) => latest.current.onNodeHover(i, j),
    }),
    [],
  );

  return (
    <div className={s.latticeWrap} ref={wrap}>
      <svg
        className={s.latticeSvg}
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        role="group"
        aria-label="Tonnetz: pitch classes on a triangular lattice. Horizontal steps are perfect fifths, diagonals are thirds. Triangles are major and minor triads."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g ref={world}>
          <LatticeLayer cam={cam} width={width} height={H} S={S} overlayKey={overlayKey} overlay={overlay} onTriClick={handlers.tri} onNodeClick={handlers.node} onNodeHover={handlers.hover} />
          <Trail trail={trail} S={S} />
          <polygon ref={hl} points="0,0 0,0 0,0" style={{ fill: 'var(--accent)', fillOpacity: 0.32, stroke: 'var(--accent)', strokeWidth: 3, strokeLinejoin: 'round', pointerEvents: 'none' }} />
          <CurrentNodes current={current} S={S} />
        </g>
      </svg>
      <div className={s.mapButtons}>
        <Button size="sm" icon="sparkle" onClick={center} aria-label="Center on the current triad">
          Center
        </Button>
      </div>
      <div className={s.axes} aria-hidden="true">
        <span>→ perfect fifth</span>
        <span>↗ major third</span>
        <span>↖ minor third</span>
      </div>
    </div>
  );
}

function Trail({ trail, S }: { trail: Tri[]; S: number }) {
  if (trail.length < 2) return null;
  const pts = trail.map((t) => centroid(t)).map(([x, y]) => [x * S, y * S]);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {pts.slice(1).map((p, k) => {
        const q = pts[k];
        const age = (pts.length - 1 - (k + 1)) / Math.max(1, pts.length - 1);
        return <line key={k} x1={q[0]} y1={q[1]} x2={p[0]} y2={p[1]} style={{ stroke: 'var(--plum)', strokeWidth: 3, strokeLinecap: 'round', opacity: 0.85 - age * 0.6 }} />;
      })}
      {pts.map((p, k) => (
        <circle key={k} cx={p[0]} cy={p[1]} r={k === pts.length - 1 ? 0 : 3.2} style={{ fill: 'var(--plum)', opacity: 0.35 + (0.5 * k) / pts.length }} />
      ))}
    </g>
  );
}

function CurrentNodes({ current, S }: { current: Tri; S: number }) {
  // Label the active nodes with the triad's own spelling (C♯ in A major, not D♭).
  const spelled = triadNotes(triadOf(current));
  const label = (i: number, j: number) => {
    const n = spelled.find((x) => pc(x) === pcAt(i, j));
    return n ? noteName(n) : nodeLabel(i, j);
  };
  return (
    <g style={{ pointerEvents: 'none' }}>
      {vertices(current).map(([i, j]) => {
        const [x, y] = nodePos(i, j);
        return (
          <g key={`${i},${j}`} className={`${s.node} ${s.nodeActive}`} transform={`translate(${x * S} ${y * S})`}>
            <circle r={S * 0.24} />
            <text y={S * 0.085} textAnchor="middle" fontSize={S * 0.25}>
              {label(i, j)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface LayerProps {
  cam: V;
  width: number;
  height: number;
  S: number;
  overlayKey: string;
  overlay: number[] | null;
  onTriClick: (t: Tri) => void;
  onNodeClick: (i: number, j: number) => void;
  onNodeHover: (i: number, j: number) => void;
}

/** The static lattice around the camera (re-rendered only when the camera settles or settings change). */
const LatticeLayer = memo(
  function LatticeLayer({ cam, width, height, S, overlay, onTriClick, onNodeClick, onNodeHover }: LayerProps) {
    const { nodes, tris } = useMemo(() => {
      const M = 5; // margin in lattice units, so panning and camera moves never show an empty edge
      const xmin = cam[0] - width / 2 / S - M;
      const xmax = cam[0] + width / 2 / S + M;
      const ymin = cam[1] - height / 2 / S - M;
      const ymax = cam[1] + height / 2 / S + M;
      const jmin = Math.floor(-ymax / SQRT3_2);
      const jmax = Math.ceil(-ymin / SQRT3_2);
      const nodes: Array<[number, number]> = [];
      const tris: Tri[] = [];
      for (let j = jmin; j <= jmax; j++) {
        for (let i = Math.floor(xmin - j / 2); i <= Math.ceil(xmax - j / 2); i++) {
          nodes.push([i, j]);
          tris.push({ i, j, up: true }, { i, j, up: false });
        }
      }
      return { nodes, tris };
    }, [cam, width, height, S]);

    return (
      <g>
        {tris.map((t) => {
          const pts = triPoints(t, S);
          const td = triadOf(t);
          const dia = overlay ? isDiatonic(td, overlay) : false;
          const [cx, cy] = centroid(t);
          const fill = dia ? 'var(--brass-soft)' : t.up ? 'var(--bg-elev)' : 'var(--bg-sunk)';
          const label = triadSymbol(td);
          return (
            <g key={triKey(t)}>
              <polygon
                className={s.tri}
                points={pts.map((v) => v.join(',')).join(' ')}
                style={{ fill, stroke: dia ? 'var(--brass)' : 'var(--rule)', strokeWidth: dia ? 1.6 : 1 }}
                onClick={() => onTriClick(t)}
              >
                <title>{`${label} (${td.quality} triad)`}</title>
              </polygon>
              <text className={s.triLabel} x={cx * S} y={cy * S + 3.5} textAnchor="middle" style={dia ? { fill: 'var(--brass)' } : undefined}>
                {label}
              </text>
            </g>
          );
        })}
        {nodes.map(([i, j]) => {
          const [x, y] = nodePos(i, j);
          return (
            <g key={`${i},${j}`} className={s.node} transform={`translate(${x * S} ${y * S})`} onClick={() => onNodeClick(i, j)} onPointerEnter={() => onNodeHover(i, j)}>
              <circle r={S * 0.22} />
              <text y={S * 0.08} textAnchor="middle" fontSize={S * 0.23}>
                {nodeLabel(i, j)}
              </text>
            </g>
          );
        })}
      </g>
    );
  },
  (a, b) => a.cam === b.cam && a.width === b.width && a.height === b.height && a.S === b.S && a.overlayKey === b.overlayKey,
);
