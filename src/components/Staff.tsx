/**
 * Music notation rendered with VexFlow (loaded lazily, fonts embedded).
 *
 * Supports treble, bass and grand staff; key and time signatures; chords; rests; dotted notes;
 * chord symbols above and analysis text (roman numerals) below; highlighting; automatic
 * accidentals that respect the key signature and earlier accidentals in the bar; line wrapping.
 */
import { useEffect, useRef } from 'react';
import { midi as toMidi, letterIndex, type Pitch } from '../theory/notes';
import { signatureAccidentalMap, keySignatureFifths, vexKeySpec, type Key } from '../theory/keys';
import { resolveColor, cssVar } from './theme';
import s from './Staff.module.css';

import { useVexFlow, type VexModule } from './vexflow';

export type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | 'wd' | 'hd' | 'qd' | '8d' | '16d';

export interface StaffEvent {
  keys: Pitch[];
  /** Default 'w'. A trailing 'd' adds a dot. */
  duration?: Duration;
  rest?: boolean;
  /** Text above the staff (chord symbol). */
  top?: string;
  /** Text below the staff (roman numeral, degree, interval). */
  bottom?: string;
  /** Color role ('root', 'tone', 'accent' ...) or CSS color for the whole event. */
  color?: string;
  /** Per-key colors (same order as keys). */
  keyColors?: Array<string | undefined>;
  /**
   * Per-key accidental overrides for microtonal pitches (same order as keys): a VexFlow accidental
   * code ('d' half-flat, 'k' koron ...) or a SMuFL glyph. Always drawn, whatever the key signature.
   */
  micro?: Array<string | null | undefined>;
}

export interface StaffMeasure {
  events: StaffEvent[];
}

export interface StaffProps {
  /** Either measures, or a flat list of events rendered as a single unmetered bar. */
  measures?: StaffMeasure[];
  events?: StaffEvent[];
  clef?: 'treble' | 'bass' | 'grand' | 'auto';
  keySig?: Key | null;
  timeSig?: string;
  /** Flat index (across all measures) of the event to highlight as currently playing. */
  activeIndex?: number | null;
  /** MIDI split point for the grand staff (default 60: middle C and above go to treble). */
  split?: number;
  beam?: boolean;
  onEventClick?: (index: number) => void;
  /** Minimum width per event in pixels. */
  eventWidth?: number;
  ariaLabel?: string;
  /** Draw a final barline at the end. Default true when measures are given. */
  finalBarline?: boolean;
}

const ACC_SYMBOL: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' };

function vexKeyString(p: Pitch): string {
  return `${p.letter.toLowerCase()}/${p.octave}`;
}

function staffLine(p: Pitch): number {
  return p.octave * 7 + letterIndex(p.letter);
}

function chooseClef(all: Pitch[]): 'treble' | 'bass' | 'grand' {
  if (all.length === 0) return 'treble';
  const ms = all.map(toMidi);
  const lo = Math.min(...ms);
  const hi = Math.max(...ms);
  if (lo >= 55) return 'treble';
  if (hi <= 64) return 'bass';
  return 'grand';
}

export function Staff(props: StaffProps) {
  const { host, width, vf, error, setError, theme } = useVexFlow();
  const clickRef = useRef(props.onEventClick);
  useEffect(() => {
    clickRef.current = props.onEventClick;
  });

  const serialized = JSON.stringify({ ...props, onEventClick: undefined });

  useEffect(() => {
    const el = host.current;
    if (!vf || !el || width < 50) return;
    try {
      render(vf, el, props, width, (i) => clickRef.current?.(i));
      fitSvgHeight(el);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vf, width, serialized, theme]);

  return (
    <div className={s.staff} role="img" aria-label={props.ariaLabel ?? 'Music notation'}>
      <div ref={host} className={s.canvas} />
      {!vf && !error && <div className={s.loading}>Engraving…</div>}
      {error && <div className={s.error}>Could not render notation: {error}</div>}
    </div>
  );
}

/** Grow or shrink the SVG to its drawn content so text below the staff is never clipped. */
function fitSvgHeight(el: HTMLDivElement) {
  const svg = el.querySelector('svg');
  if (!svg) return;
  const bb = svg.getBBox();
  const top = Math.min(0, Math.floor(bb.y - 4));
  const bottom = Math.ceil(bb.y + bb.height + 8);
  const w = Number(svg.getAttribute('width')) || el.clientWidth;
  const h = bottom - top;
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', `0 ${top} ${w} ${h}`);
  svg.style.height = `${h}px`;
}

function render(VF: VexModule, el: HTMLDivElement, props: StaffProps, width: number, onClick: (i: number) => void) {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, StaveConnector, GhostNote, Dot, Beam, Barline, Clef } = VF;
  el.innerHTML = '';
  const measures: StaffMeasure[] = props.measures ?? [{ events: props.events ?? [] }];
  const allKeys = measures.flatMap((m) => m.events.flatMap((e) => (e.rest ? [] : e.keys)));
  const clef = props.clef === 'auto' || !props.clef ? chooseClef(allKeys) : props.clef;
  const grand = clef === 'grand';
  const split = props.split ?? 60;
  const key = props.keySig ?? null;
  const fifths = key ? keySignatureFifths(key) : 0;
  const keySpec = key ? vexKeySpec(key) : null;
  const sigMap = keySpec ? signatureAccidentalMap(fifths) : signatureAccidentalMap(0);
  const hasTop = measures.some((m) => m.events.some((e) => e.top));
  const hasBottom = measures.some((m) => m.events.some((e) => e.bottom));
  const finalBar = props.finalBarline ?? !!props.measures;

  const ink = cssVar('--ink');
  const faint = cssVar('--ink-muted');
  const activeColor = resolveColor('accent')!;

  // ---- Measure width estimation and line breaking ----
  const minEvent = props.eventWidth ?? 40;
  const eventW = (e: StaffEvent) => {
    const accs = e.keys.length;
    // The per-character estimate under-measures wide labels (♭VImaj7, Fm7/A♭); never reserve less than the real width.
    const textW = Math.max((e.top?.length ?? 0) * 7.5, (e.bottom?.length ?? 0) * 7.5, labelWidth(e.top, TOP_FONT), labelWidth(e.bottom, BOTTOM_FONT));
    const durExtra = e.duration?.startsWith('w') || !e.duration ? 8 : 0;
    return Math.max(minEvent + Math.min(accs, 3) * 3 + durExtra, textW + 10);
  };
  const labelW = (e: StaffEvent) => Math.max(labelWidth(e.top, TOP_FONT), labelWidth(e.bottom, BOTTOM_FONT));
  const natural = measures.map((m) => 24 + m.events.reduce((a, e) => a + eventW(e), 0));
  // The narrowest a measure can be squeezed before notes crowd or neighboring labels collide. VexFlow spaces notes
  // of equal value evenly, so two adjacent wide labels set the minimum pitch for the whole measure.
  const tight = measures.map((m) => {
    const sum = m.events.reduce((a, e) => a + Math.max(28 + Math.min(e.keys.length, 3) * 3, labelW(e) + 10), 0);
    let pair = 0;
    for (let i = 1; i < m.events.length; i++) pair = Math.max(pair, (labelW(m.events[i - 1]) + labelW(m.events[i])) / 2 + 10);
    return 24 + Math.max(sum, pair * m.events.length);
  });
  const headerW = (first: boolean) => 44 + (keySpec ? Math.abs(fifths) * 11 + 6 : 0) + (first && props.timeSig ? 30 : 0);
  const leftMargin = grand ? 24 : 6;
  const usable = width - 8 - leftMargin;
  const systems: number[][] = [];
  let line: number[] = [];
  let lineW = 0;
  measures.forEach((_, i) => {
    const w = natural[i] + (line.length === 0 ? headerW(systems.length === 0) : 0);
    if (line.length > 0 && lineW + w > usable) {
      systems.push(line);
      line = [];
      lineW = 0;
    }
    line.push(i);
    lineW += natural[i] + (line.length === 1 ? headerW(systems.length === 0) : 0);
  });
  if (line.length) systems.push(line);

  const topPad = hasTop ? 46 : 26;
  const staffH = 40;
  const grandGap = 70 + (hasBottom ? 10 : 0);
  const bottomPad = hasBottom ? 64 : 34;
  const systemH = topPad + staffH + (grand ? grandGap + staffH : 0) + bottomPad;
  const height = systemH * systems.length + 4;

  // Lines are stretched to fill the width, and squeezed only down to their tight width: a measure that
  // still does not fit (narrow phones) widens the SVG and the host scrolls instead of crowding the labels.
  const systemScale = systems.map((sys, sIdx) => {
    const totalNatural = sys.reduce((a, i) => a + natural[i], 0) + headerW(sIdx === 0);
    const isLast = sIdx === systems.length - 1;
    let scale = usable / totalNatural;
    if (isLast && systems.length > 1) scale = Math.min(scale, 1.25);
    if (systems.length === 1) scale = Math.min(scale, 1.9);
    // Squeeze a line that is too long for the width only down to its tight width; past that it scrolls instead.
    const minScale = (sys.reduce((a, i) => a + tight[i], 0) + headerW(sIdx === 0)) / totalNatural;
    return Math.max(scale, minScale, 0.5);
  });
  const drawnWidth = Math.max(
    width,
    ...systems.map((sys, sIdx) => Math.ceil(leftMargin + (sys.reduce((a, i) => a + natural[i], 0) + headerW(sIdx === 0)) * systemScale[sIdx] + 8)),
  );

  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(drawnWidth, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(ink);
  ctx.setStrokeStyle(ink);

  let flatIndex = 0;
  const eventIndexBase: number[] = [];
  measures.forEach((m, i) => {
    eventIndexBase[i] = flatIndex;
    flatIndex += m.events.length;
  });

  // Bottom of the previous system's drawing, used to push a system down when its labels or ledger lines would collide.
  let prevBottom = -Infinity;
  let shiftSoFar = 0;
  systems.forEach((sys, sIdx) => {
    const y0 = sIdx * systemH + topPad - 20;
    const first = sIdx === 0;
    const header = headerW(first);
    // Stretch to fill the line, but avoid over-stretching very short content.
    const scale = systemScale[sIdx];
    const group = ctx.openGroup('system') as SVGGElement;
    let x = leftMargin;
    let firstTreble: InstanceType<typeof Stave> | null = null;
    let firstBass: InstanceType<typeof Stave> | null = null;
    // Notes drawn on the upper and lower staff of this system, used to keep labels clear of stems and ledger lines.
    const upperNotes: Array<InstanceType<typeof StaveNote>> = [];
    const lowerNotes: Array<InstanceType<typeof StaveNote>> = [];
    const systemTexts: Array<{ note: InstanceType<typeof StaveNote>; text: string; where: 'top' | 'bottom'; color?: string; topStave: InstanceType<typeof Stave>; bottomStave: InstanceType<typeof Stave> }> = [];

    sys.forEach((mIdx, posInSys) => {
      const m = measures[mIdx];
      const w = (natural[mIdx] + (posInSys === 0 ? header : 0)) * scale;
      const trebleY = y0;
      const bassY = y0 + staffH + grandGap;
      const top = new Stave(x, grand || clef === 'treble' ? trebleY : trebleY, w);
      const bottom = grand ? new Stave(x, bassY, w) : null;
      const staves = grand ? [top, bottom!] : [top];
      const clefs = grand ? ['treble', 'bass'] : [clef];
      staves.forEach((st, k) => {
        st.setStyle({ strokeStyle: faint, fillStyle: ink });
        if (posInSys === 0) {
          st.addClef(clefs[k]);
          if (keySpec) st.addKeySignature(keySpec);
          if (first && props.timeSig) st.addTimeSignature(props.timeSig);
        }
        const lastMeasure = mIdx === measures.length - 1;
        if (lastMeasure && finalBar) st.setEndBarType(Barline.type.END);
        else if (!props.measures) st.setEndBarType(Barline.type.NONE);
        st.setContext(ctx);
      });
      if (posInSys === 0) {
        firstTreble = top;
        firstBass = bottom;
      }

      // ---- Notes ----
      const parts: Array<{ clef: string; notes: Array<InstanceType<typeof StaveNote> | InstanceType<typeof GhostNote>> }> = clefs.map((c) => ({ clef: c, notes: [] }));
      const accState: Array<Record<string, number>> = clefs.map(() => ({}));
      const clickable: Array<{ note: InstanceType<typeof StaveNote>; index: number }> = [];
      const texts: Array<{ note: InstanceType<typeof StaveNote>; text: string; where: 'top' | 'bottom'; color?: string }> = [];

      m.events.forEach((ev, evIdx) => {
        const globalIndex = eventIndexBase[mIdx] + evIdx;
        const dur = ev.duration ?? 'w';
        const dotted = dur.endsWith('d');
        const base = dotted ? dur.slice(0, -1) : dur;
        const active = props.activeIndex === globalIndex;
        const color = active ? activeColor : resolveColor(ev.color);
        const keyGroups: Pitch[][] = grand
          ? [ev.keys.filter((p) => toMidi(p) >= split), ev.keys.filter((p) => toMidi(p) < split)]
          : [ev.keys];
        const colorGroups: Array<Array<string | undefined>> = grand
          ? [
              ev.keys.map((p, i) => (toMidi(p) >= split ? ev.keyColors?.[i] : null)).filter((c) => c !== null) as Array<string | undefined>,
              ev.keys.map((p, i) => (toMidi(p) < split ? ev.keyColors?.[i] : null)).filter((c) => c !== null) as Array<string | undefined>,
            ]
          : [ev.keyColors ?? []];
        const microGroups: Array<Array<string | null | undefined>> = grand
          ? [ev.keys.flatMap((p, i) => (toMidi(p) >= split ? [ev.micro?.[i]] : [])), ev.keys.flatMap((p, i) => (toMidi(p) < split ? [ev.micro?.[i]] : []))]
          : [ev.micro ?? []];

        const eventNotes: Array<InstanceType<typeof StaveNote>> = [];
        keyGroups.forEach((group, partIdx) => {
          const part = parts[partIdx];
          if (ev.rest || group.length === 0) {
            if (ev.rest || !grand) {
              const restNote = new StaveNote({ keys: [part.clef === 'bass' ? 'd/3' : 'b/4'], duration: base + 'r', clef: part.clef, dots: dotted ? 1 : 0 });
              if (dotted) Dot.buildAndAttach([restNote], { all: true });
              if (color) restNote.setStyle({ fillStyle: color, strokeStyle: color });
              eventNotes.push(restNote);
              part.notes.push(restNote);
            } else {
              const ghost = new GhostNote({ duration: base, dots: dotted ? 1 : 0 });
              part.notes.push(ghost);
            }
            return;
          }
          const order = group.map((p, i) => ({ p, c: colorGroups[partIdx]?.[i], m: microGroups[partIdx]?.[i] })).sort((a, b) => staffLine(a.p) - staffLine(b.p));
          const note = new StaveNote({ keys: order.map((o) => vexKeyString(o.p)), duration: base, clef: part.clef, dots: dotted ? 1 : 0, autoStem: true });
          order.forEach((o, i) => {
            const slot = `${o.p.letter}${o.p.octave}`;
            const current = accState[partIdx][slot] ?? sigMap[o.p.letter];
            if (o.m) {
              note.addModifier(new Accidental(o.m), i);
              // A microtonal accidental never matches a later plain note on the same line.
              accState[partIdx][slot] = Number.NaN;
            } else if (o.p.acc !== current) {
              note.addModifier(new Accidental(ACC_SYMBOL[o.p.acc] ?? (o.p.acc > 0 ? '##' : 'bb')), i);
              accState[partIdx][slot] = o.p.acc;
            }
            const kc = resolveColor(o.c);
            if (kc && !active) note.setKeyStyle(i, { fillStyle: kc, strokeStyle: kc });
          });
          if (dotted) Dot.buildAndAttach([note], { all: true });
          if (color) note.setStyle({ fillStyle: color, strokeStyle: color });
          eventNotes.push(note);
          part.notes.push(note);
          if (partIdx === 0 || !clickable.some((c) => c.index === globalIndex)) clickable.push({ note, index: globalIndex });
        });
        // Labels are placed on the system's shared baselines, so any real note of the event can carry them
        // (on a grand staff one of the two staves may hold only a spacer).
        const anchor = eventNotes[0];
        if (anchor) {
          const textColor = anchor.getStyle()?.fillStyle as string | undefined;
          if (ev.top) texts.push({ note: anchor, text: ev.top, where: 'top', color: textColor });
          if (ev.bottom) texts.push({ note: anchor, text: ev.bottom, where: 'bottom', color: textColor });
        }
      });

      const voices = parts.map((p) => {
        const v = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
        v.addTickables(p.notes);
        return v;
      });
      const beams = props.beam ? parts.flatMap((p) => Beam.generateBeams(p.notes.filter((n): n is InstanceType<typeof StaveNote> => n instanceof StaveNote))) : [];
      const startX = Math.max(...staves.map((st) => st.getNoteStartX()));
      staves.forEach((st) => st.setNoteStartX(startX));
      const fmt = new Formatter();
      voices.forEach((v) => fmt.joinVoices([v]));
      const avail = top.getNoteEndX() - startX - 14;
      fmt.format(voices, Math.max(avail, 20));
      staves.forEach((st) => st.draw());
      if (grand && bottom) {
        const right = new StaveConnector(top, bottom).setType('singleRight');
        right.setContext(ctx).draw();
        if (mIdx === measures.length - 1 && finalBar) new StaveConnector(top, bottom).setType('boldDoubleRight').setContext(ctx).draw();
      }
      voices.forEach((v, k) => v.draw(ctx, staves[k]));
      beams.forEach((b) => b.setContext(ctx).draw());
      systemTexts.push(...texts.map((t) => ({ ...t, topStave: top, bottomStave: bottom ?? top })));
      const isReal = (n: unknown): n is InstanceType<typeof StaveNote> => n instanceof StaveNote;
      upperNotes.push(...parts[0].notes.filter(isReal));
      lowerNotes.push(...parts[parts.length - 1].notes.filter(isReal));

      clickable.forEach(({ note, index }) => {
        const elNote = note.getSVGElement();
        if (elNote) {
          elNote.style.cursor = 'pointer';
          elNote.addEventListener('click', () => onClick(index));
        }
      });
      x += w;
    });

    // Vertical extent of the notes on this system (stems and ledger lines included), never inside the staff lines.
    const sysTop = firstTreble as InstanceType<typeof Stave> | null;
    const sysBottom = (firstBass ?? firstTreble) as InstanceType<typeof Stave> | null;
    const extent = (where: 'top' | 'bottom') => {
      let y = where === 'top' ? Infinity : -Infinity;
      const ys = sysTop && sysBottom ? [where === 'top' ? sysTop.getYForLine(0) : sysBottom.getYForLine(4)] : [];
      for (const n of where === 'top' ? upperNotes : lowerNotes) {
        const bb = n.getBoundingBox();
        if (bb) ys.push(where === 'top' ? bb.getY() : bb.getY() + bb.getH());
      }
      for (const v of ys) y = where === 'top' ? Math.min(y, v) : Math.max(y, v);
      return y;
    };
    const topY = extent('top') - 10;
    const bottomY = extent('bottom') + 22;
    // Approximate ink box of the system: notes, the clef (which rises and falls past the staff) and the labels.
    let inkTop = Math.min(extent('top'), sysTop ? sysTop.getYForLine(0) - 14 : Infinity);
    let inkBottom = Math.max(extent('bottom'), sysBottom ? sysBottom.getYForLine(4) + 14 : -Infinity);
    if (systemTexts.some((t) => t.where === 'top')) inkTop = Math.min(inkTop, topY - 14);
    if (systemTexts.some((t) => t.where === 'bottom')) inkBottom = Math.max(inkBottom, bottomY + 5);

    // Chord symbols and analysis share a common baseline per system, like a lead sheet.
    if (systemTexts.length) {
      for (const t of systemTexts) {
        const cx = (t.note.getNoteHeadBeginX() + t.note.getNoteHeadEndX()) / 2;
        ctx.save();
        const font = t.where === 'top' ? TOP_FONT : BOTTOM_FONT;
        ctx.setFont(font.family, font.size, font.weight);
        ctx.setFillStyle(t.color ?? ink);
        const w = ctx.measureText(t.text).width;
        // A chord symbol must not run back over the top of the treble clef, which rises above the staff.
        const minX = t.where === 'top' ? clefRight(t.topStave, Clef) + 3 : -Infinity;
        ctx.fillText(t.text, Math.max(cx - w / 2, minX), t.where === 'top' ? topY : bottomY);
        ctx.restore();
      }
    }

    if (grand && firstTreble && firstBass) {
      new StaveConnector(firstTreble, firstBass).setType('brace').setContext(ctx).draw();
      new StaveConnector(firstTreble, firstBass).setType('singleLeft').setContext(ctx).draw();
    }
    ctx.closeGroup();

    // Systems are laid out on a fixed pitch; if this one reaches up into the previous one (high ledger lines
    // under a low system above), push it and the rest down.
    const gap = 4;
    if (inkTop + shiftSoFar < prevBottom + gap) shiftSoFar = prevBottom + gap - inkTop;
    if (shiftSoFar) group.setAttribute('transform', `translate(0 ${shiftSoFar})`);
    prevBottom = inkBottom + shiftSoFar;
  });
}

/** Right edge of the clef drawn at the start of a stave, or -Infinity when the stave has none. */
function clefRight(stave: { getModifiers: (position?: number, category?: string) => Array<{ getX: () => number; getWidth: () => number }> }, ClefClass: { CATEGORY: string }): number {
  const clef = stave.getModifiers(undefined, ClefClass.CATEGORY)[0];
  return clef ? clef.getX() + clef.getWidth() : -Infinity;
}

const TOP_FONT = { family: 'Source Sans 3, Segoe UI, sans-serif', size: 14, weight: 'bold' };
const BOTTOM_FONT = { family: 'Cormorant Garamond, Georgia, serif', size: 17, weight: 'bold' };
let measureCtx: CanvasRenderingContext2D | null = null;

/** Rendered width of a chord symbol or analysis label, so measures reserve enough room for it. */
function labelWidth(text: string | undefined, font: { family: string; size: number; weight: string }): number {
  if (!text) return 0;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return 0;
  // Quote each family: an unquoted name such as Source Sans 3 makes the whole shorthand invalid.
  const families = font.family
    .split(',')
    .map((f) => f.trim())
    .map((f) => (f === 'serif' || f === 'sans-serif' ? f : `"${f}"`))
    .join(', ');
  measureCtx.font = `${font.weight} ${font.size}px ${families}`;
  return measureCtx.measureText(text).width;
}
