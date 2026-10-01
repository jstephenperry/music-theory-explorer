import { useState, type KeyboardEvent } from 'react';
import { noteName, parallelKey, relativeKey, sameKey, type Key, type KeyMode } from '../../theory';
import {
  SLOT_FIFTHS,
  harmonyPositions,
  nearestAngle,
  polar,
  sectorPath,
  signatureLabel,
  slotAngle,
  slotKeys,
  slotOfKey,
  type HarmonyPosition,
  type Orientation,
} from './circle';
import s from './Circle.module.css';

const C = 320;
const R_RIM = 314;
const R_BEZEL = 282;
const R_MAJOR = 204;
const R_MINOR = 130;
const R_HUB = 76;

export interface WheelProps {
  selected: Key;
  orientation: Orientation;
  rotateToTop: boolean;
  showFunctions: boolean;
  showModes: boolean;
  showParallel: boolean;
  /** Wedge of a chord currently sounding or picked (verdigris highlight). */
  pointer?: { slot: number; ring: 'major' | 'minor' } | null;
  /** Slot the brass index points at (defaults to the selected key). */
  handSlot?: number;
  centerTitle: string;
  centerSub: string;
  centerNote?: string;
  onSelect: (k: Key) => void;
}

function shortKey(k: Key): string {
  return noteName(k.tonic) + (k.mode === 'minor' ? 'm' : '');
}

/**
 * The interactive circle: brass bezel with key-signature counts, an ivory ring of major keys,
 * a ring of relative minors, and a rose-window face with a brass index.
 */
export function CircleWheel(p: WheelProps) {
  const selSlot = slotOfKey(p.selected);
  const rel = relativeKey(p.selected);
  const par = parallelKey(p.selected);
  const positions = harmonyPositions(p.selected);
  const posAt = (slot: number, ring: 'major' | 'minor'): HarmonyPosition | undefined => positions.find((x) => x.slot === slot && x.ring === ring);

  // Accumulate rotations so CSS transitions always take the short way round
  // (derived state: adjust during render when the target angle changes).
  const rotTarget = p.rotateToTop ? -slotAngle(selSlot, p.orientation) : 0;
  const handTarget = slotAngle(p.handSlot ?? selSlot, p.orientation);
  const [rotState, setRotState] = useState({ target: rotTarget, value: rotTarget });
  const [handState, setHandState] = useState({ target: handTarget, value: handTarget });
  let rot = rotState.value;
  if (rotState.target !== rotTarget) {
    rot = nearestAngle(rotState.value, rotTarget);
    setRotState({ target: rotTarget, value: rot });
  }
  let hand = handState.value;
  if (handState.target !== handTarget) {
    hand = nearestAngle(handState.value, handTarget);
    setHandState({ target: handTarget, value: hand });
  }

  const related = (slot: number) => {
    const d = ((slot - selSlot + 18) % 12) - 6;
    return Math.abs(d) <= 1;
  };

  const choose = (slot: number, mode: KeyMode) => {
    const keys = slotKeys(slot, mode);
    const idx = keys.findIndex((k) => sameKey(k, p.selected));
    p.onSelect(idx >= 0 ? keys[(idx + 1) % keys.length] : keys[0]);
  };
  const onKey = (slot: number, mode: KeyMode) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(slot, mode);
    }
  };

  /** A label that stays upright while the ring rotates. */
  const upright = (x: number, y: number, children: React.ReactNode, key?: string) => (
    <g key={key} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <g className={s.counter} style={{ transform: `rotate(${-rot}deg)` }}>
        {children}
      </g>
    </g>
  );

  const ringWedge = (slot: number, ring: 'major' | 'minor') => {
    const a = slotAngle(slot, p.orientation);
    const [r0, r1] = ring === 'major' ? [R_MAJOR, R_BEZEL] : [R_MINOR, R_MAJOR];
    const keys = slotKeys(slot, ring);
    const isSel = keys.some((k) => sameKey(k, p.selected));
    const isRel = keys.some((k) => sameKey(k, rel));
    const isPar = p.showParallel && keys.some((k) => sameKey(k, par));
    const isPointed = p.pointer && p.pointer.slot === slot && p.pointer.ring === ring;
    const isRelated = related(slot);
    const state = isSel ? s.isSelected : isPointed ? s.isPointed : isRel ? s.isRelative : isPar ? s.isParallel : isRelated ? s.isRelated : '';
    const pos = (p.showFunctions || p.showModes) && isRelatedOrDim(slot, ring) ? posAt(slot, ring) : undefined;
    const fifths = SLOT_FIFTHS[slot];
    const primaryIdx = Math.max(
      0,
      keys.findIndex((k) => sameKey(k, p.selected)),
    );
    const primary = keys[primaryIdx];
    const secondary = keys.length > 1 ? keys[1 - primaryIdx] : null;
    const mid = (r0 + r1) / 2;
    const label = `${keys.map((k) => `${noteName(k.tonic)} ${k.mode}`).join(' or ')}, ${fifths.map((f) => (f === 0 ? 'no sharps or flats' : f > 0 ? `${f} sharp${f > 1 ? 's' : ''}` : `${-f} flat${f < -1 ? 's' : ''}`)).join(' or ')}`;
    const big = ring === 'major' ? 27 : 18;
    const hasOverlay = !!pos && (p.showFunctions || p.showModes);
    const lines: Array<{ text: string; size: number; cls: string }> = [];
    lines.push({ text: shortKey(primary), size: big * (secondary ? 0.8 : 1) * (hasOverlay ? 0.88 : 1), cls: s.keyText });
    if (secondary) lines.push({ text: shortKey(secondary), size: big * 0.5, cls: `${s.keyText} ${s.altSpelling}` });
    if (pos && p.showFunctions) lines.push({ text: pos.numeral, size: ring === 'major' ? 16 : 12.5, cls: `${s.overlayText} ${s.numeral}` });
    if (pos && p.showModes) lines.push({ text: `${noteName(pos.root)} ${pos.mode}`, size: ring === 'major' ? 11.5 : 9.5, cls: s.overlayText });
    const total = lines.reduce((acc, l) => acc + l.size * 1.02, 0);
    let top = -total / 2;
    const placed = lines.map((l) => {
      const y = top + l.size * 0.78;
      top += l.size * 1.02;
      return { ...l, y };
    });
    const [nx, ny] = polar(C, C, mid, a);
    return (
      <g
        key={`${ring}-${slot}`}
        className={`${s.wedge} ${state}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={isSel}
        onClick={() => choose(slot, ring)}
        onKeyDown={onKey(slot, ring)}
      >
        <path className={`${s.wedgeShape} ${ring === 'major' ? s.majorShape : s.minorShape}`} d={sectorPath(C, C, r0, r1, a - 15, a + 15)} />
        {upright(
          nx,
          ny,
          <>
            {placed.map((l, i) => (
              <text key={i} className={l.cls} y={l.y} style={{ fontSize: l.size }} textAnchor="middle">
                {l.text}
              </text>
            ))}
          </>,
        )}
      </g>
    );
  };

  function isRelatedOrDim(slot: number, ring: 'major' | 'minor') {
    return !!posAt(slot, ring);
  }

  const selAngle = slotAngle(selSlot, p.orientation);
  const star: string[] = [];
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = polar(C, C, 116, i * 30);
    const [x2, y2] = polar(C, C, 116, (i + 5) * 30);
    star.push(`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }

  return (
    <svg className={s.wheel} viewBox="0 0 640 640" role="group" aria-label={`Circle of fifths. Selected: ${noteName(p.selected.tonic)} ${p.selected.mode}`}>
      <defs>
        <radialGradient id="cof-face" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="var(--bg-elev)" />
          <stop offset="1" stopColor="var(--bg-sunk)" />
        </radialGradient>
      </defs>

      <g className={s.rotor} style={{ transform: `rotate(${rot}deg)` }}>
        {/* Bezel with key-signature counts */}
        <circle cx={C} cy={C} r={(R_RIM + R_BEZEL) / 2} className={s.bezel} style={{ strokeWidth: R_RIM - R_BEZEL }} />
        <circle cx={C} cy={C} r={R_RIM} className={s.rim} />
        <circle cx={C} cy={C} r={R_RIM - 4} className={s.rimFine} />
        <circle cx={C} cy={C} r={R_BEZEL} className={s.rim} />
        {Array.from({ length: 12 }, (_, slot) => {
          const a = slotAngle(slot, p.orientation);
          const [tx0, ty0] = polar(C, C, R_RIM - 4, a + 15);
          const [tx1, ty1] = polar(C, C, R_BEZEL + 6, a + 15);
          const [lx, ly] = polar(C, C, (R_RIM + R_BEZEL) / 2 - 2, a);
          const sel = slot === selSlot;
          return (
            <g key={`b-${slot}`}>
              <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} className={s.tick} />
              {upright(
                lx,
                ly,
                <text className={`${s.sigText} ${sel ? s.sigActive : ''}`} textAnchor="middle" y={4.5}>
                  {SLOT_FIFTHS[slot].map(signatureLabel).join(' ')}
                </text>,
              )}
            </g>
          );
        })}

        {Array.from({ length: 12 }, (_, slot) => ringWedge(slot, 'major'))}
        {Array.from({ length: 12 }, (_, slot) => ringWedge(slot, 'minor'))}

        {/* Closely related keys: a brass frame around the three-slot wedge */}
        <path className={s.relatedFrame} d={sectorPath(C, C, R_MINOR, R_BEZEL, selAngle - 45, selAngle + 45)} />

        {/* Rose-window face */}
        <circle cx={C} cy={C} r={R_MINOR} fill="url(#cof-face)" className={s.faceRing} />
        <circle cx={C} cy={C} r={R_MINOR - 6} className={s.faceFine} />
        <path d={star.join('')} className={s.rose} />
        {Array.from({ length: 12 }, (_, i) => {
          const [x, y] = polar(C, C, 116, i * 30);
          return <circle key={`rp-${i}`} cx={x} cy={y} r={2.2} className={s.rosePoint} />;
        })}

        {/* Brass index pointing at the selected key or the sounding chord */}
        <g className={s.hand} style={{ transform: `rotate(${hand}deg)` }}>
          <path d={`M${C} ${C - R_MINOR + 4} L${C - 9} ${C - R_HUB - 10} L${C + 9} ${C - R_HUB - 10} Z`} className={s.handShape} />
        </g>
      </g>

      {/* Hub with the selected key (does not rotate) */}
      <circle cx={C} cy={C} r={R_HUB} className={s.hub} />
      <circle cx={C} cy={C} r={R_HUB - 5} className={s.hubFine} />
      <text x={C} y={C - 6} textAnchor="middle" className={s.hubTitle} style={{ fontSize: p.centerTitle.length > 6 ? 26 : 34 }}>
        {p.centerTitle}
      </text>
      <text x={C} y={C + 18} textAnchor="middle" className={s.hubSub}>
        {p.centerSub}
      </text>
      {p.centerNote && (
        <text x={C} y={C + 36} textAnchor="middle" className={s.hubNote}>
          {p.centerNote}
        </text>
      )}
    </svg>
  );
}
