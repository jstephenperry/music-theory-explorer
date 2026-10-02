/**
 * Rhythm notation on single-line percussion staves (VexFlow, custom engraving).
 * Supports several aligned parts, beaming by group, tuplets, accents, time-signature changes,
 * line wrapping, clickable notes and imperative highlighting for playback (no re-engraving).
 */
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { loadVexFlow } from '../../components/vexflow';
import { cssVar, useThemeVersion } from '../../components/theme';
import { isBeamable, type RMeasure, type RPart } from './rhythmNotation';
import s from './RhythmStaff.module.css';

type VexModule = Awaited<ReturnType<typeof loadVexFlow>>;

export interface RhythmStaffHandle {
  /** Highlight the notes with these ids (replacing any previous highlight). */
  highlight: (ids: string[] | null) => void;
}

export interface RhythmStaffProps {
  parts: RPart[];
  ariaLabel: string;
  onNoteClick?: (id: string) => void;
  handle?: Ref<RhythmStaffHandle>;
  /** Minimum width per eighth-note-sized slot. */
  noteWidth?: number;
  /** Keep everything on one line (scaled down if needed). */
  singleLine?: boolean;
  compact?: boolean;
  /** Space notes strictly in proportion to time (for polyrhythms). */
  proportional?: boolean;
  /** CSS custom property for the playback highlight (default --accent). */
  highlightVar?: string;
}

export function RhythmStaff({ parts, ariaLabel, onNoteClick, handle, noteWidth = 26, singleLine, compact, proportional = true, highlightVar }: RhythmStaffProps) {
  const host = useRef<HTMLDivElement>(null);
  const [vf, setVf] = useState<VexModule | null>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeVersion();
  const elements = useRef(new Map<string, Element[]>());
  const lit = useRef<Element[]>([]);
  const clickRef = useRef(onNoteClick);
  clickRef.current = onNoteClick;

  useEffect(() => {
    let alive = true;
    loadVexFlow()
      .then((m) => alive && setVf(m))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(
    handle,
    () => ({
      highlight(ids) {
        lit.current.forEach((e) => e.classList.remove(s.active));
        lit.current = [];
        if (!ids) return;
        for (const id of ids) {
          const els = elements.current.get(id);
          if (els) {
            els.forEach((e) => e.classList.add(s.active));
            lit.current.push(...els);
          }
        }
      },
    }),
    [],
  );

  const serialized = JSON.stringify(parts);
  const clickable = !!onNoteClick;

  useEffect(() => {
    const el = host.current;
    if (!vf || !el || width < 60) return;
    try {
      elements.current = engrave(vf, el, parts, width, { noteWidth, singleLine, compact, clickable, proportional }, (id) => clickRef.current?.(id));
      lit.current = [];
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vf, width, serialized, theme, noteWidth, singleLine, compact, clickable, proportional]);

  return (
    <div className={s.staff} role="img" aria-label={ariaLabel} style={highlightVar ? ({ '--rs-hl': `var(${highlightVar})` } as React.CSSProperties) : undefined}>
      <div ref={host} className={s.canvas} />
      {!vf && !error && <div className={s.loading}>Engraving…</div>}
      {error && <div className={s.error}>Could not render notation: {error}</div>}
    </div>
  );
}

const SLOT: Record<string, number> = { w: 8, h: 4, q: 2, '8': 1, '16': 0.62, '32': 0.45 };

function measureSlots(m: RMeasure): number {
  return m.notes.reduce((a, n) => a + (SLOT[n.dur] ?? 1) * (n.dots ? 1.2 : 1), 0);
}

function engrave(
  VF: VexModule,
  el: HTMLDivElement,
  parts: RPart[],
  physWidth: number,
  opts: { noteWidth: number; singleLine?: boolean; compact?: boolean; clickable: boolean; proportional?: boolean },
  onClick: (id: string) => void,
): Map<string, Element[]> {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Tuplet, Articulation, StaveConnector, Dot, Barline } = VF;
  el.innerHTML = '';
  const map = new Map<string, Element[]>();
  const nMeasures = Math.max(...parts.map((p) => p.measures.length));
  if (nMeasures === 0) return map;

  // Narrow screens: engrave at a larger logical width and scale the SVG down, so notes never collide.
  const slotsTotal = parts.length ? Math.max(...parts.map((p) => p.measures.reduce((a, m) => a + measureSlots(m), 0))) : 0;
  const wanted = 34 + 60 + slotsTotal * opts.noteWidth * 0.8;
  const zoom = opts.singleLine ? Math.max(0.6, Math.min(1, physWidth / wanted)) : physWidth < 520 ? 0.82 : 1;
  const width = physWidth / zoom;
  const ink = cssVar('--ink');
  const faint = cssVar('--ink-muted');
  const hasLabels = parts.some((p) => p.label);
  const labelW = hasLabels ? 34 : 0;
  const left = 4 + labelW;
  const usable = width - left - 6;

  // Natural measure widths (max over parts).
  const natural: number[] = [];
  for (let i = 0; i < nMeasures; i++) {
    const ms = parts.map((p) => p.measures[i]).filter(Boolean);
    const slots = Math.max(...ms.map(measureSlots));
    const sig = ms.some((m) => m.timeSig) ? 30 + Math.max(...ms.map((m) => (m.timeSig ?? '').split('/')[0].length)) * 7 : 0;
    natural.push(22 + slots * opts.noteWidth + sig);
  }
  const clefW = 34;

  // Line breaking.
  const systems: number[][] = [];
  if (opts.singleLine) systems.push(natural.map((_, i) => i));
  else {
    let line: number[] = [];
    let lineW = clefW;
    natural.forEach((w, i) => {
      if (line.length && lineW + w > usable) {
        systems.push(line);
        line = [];
        lineW = clefW;
      }
      line.push(i);
      lineW += w;
    });
    if (line.length) systems.push(line);
  }

  const hasTuplets = parts.some((p) => p.measures.some((m) => m.tuplets?.length));
  const hasAccents = parts.some((p) => p.measures.some((m) => m.notes.some((n) => n.accent)));
  const topPad = (hasTuplets ? 30 : 0) + (hasAccents ? 26 : 12) + (opts.compact ? 0 : 6);
  const partGap = hasTuplets ? 92 : 64;
  const bottomPad = 18;
  const systemH = topPad + parts.length * partGap + bottomPad;

  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(width, systemH * systems.length);
  const ctx = renderer.getContext();
  ctx.setFillStyle(ink);
  ctx.setStrokeStyle(ink);
  const mids: number[] = [];
  const lineConfig = [{ visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false }];

  systems.forEach((sys, sIdx) => {
    const y0 = sIdx * systemH + topPad - 30;
    const total = clefW + sys.reduce((a, i) => a + natural[i], 0);
    let scale = usable / total;
    if (!opts.singleLine) scale = Math.min(Math.max(scale, 0.6), sIdx === systems.length - 1 && systems.length > 1 ? 1.15 : 2.2);
    let x = left;
    const firstStaves: Array<InstanceType<typeof Stave>> = [];

    sys.forEach((mIdx, pos) => {
      const w = (natural[mIdx] + (pos === 0 ? clefW : 0)) * scale;
      const staves = parts.map((_, pi) => {
        const st = new Stave(x, y0 + pi * partGap, w);
        st.setConfigForLines(lineConfig);
        st.setStyle({ strokeStyle: faint, fillStyle: ink });
        if (pos === 0) st.addClef('percussion');
        const m = parts[pi].measures[mIdx];
        if (m?.timeSig) st.addTimeSignature(m.timeSig);
        if (mIdx === nMeasures - 1) st.setEndBarType(Barline.type.END);
        st.setContext(ctx);
        return st;
      });
      if (pos === 0) firstStaves.push(...staves);
      staves.forEach((st) => mids.push(st.getYForLine(2)));

      const built = parts.map((part, pi) => {
        const m = part.measures[mIdx];
        const color = part.colorVar ? cssVar(part.colorVar) : null;
        const notes = (m?.notes ?? []).map((n) => {
          const sn = new StaveNote({ keys: ['b/4'], duration: n.dur + (n.rest ? 'r' : ''), dots: n.dots ?? 0, stemDirection: 1, clef: 'percussion' });
          if (n.dots) Dot.buildAndAttach([sn], { all: true });
          if (n.accent && !n.rest) sn.addModifier(new Articulation('a>').setPosition(3));
          sn.setStyle({ fillStyle: color ?? ink, strokeStyle: color ?? ink });
          return sn;
        });
        const voice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
        voice.addTickables(notes);
        const beams = (m?.beams ?? [])
          .map((idx) => idx.map((i) => notes[i]).filter((n, k) => n && !m!.notes[idx[k]].rest && isBeamable(m!.notes[idx[k]].dur)))
          .filter((g) => g.length >= 2)
          .map((g) => new Beam(g));
        const tuplets = (m?.tuplets ?? []).map(
          (t) =>
            new Tuplet(notes.slice(t.from, t.from + t.count), {
              numNotes: t.numNotes,
              notesOccupied: t.notesOccupied,
              ratioed: t.ratioed ?? false,
              bracketed: !(m?.beams ?? []).some((b) => b.length > 1 && t.from >= b[0] && t.from + t.count - 1 <= b[b.length - 1]),
              location: 1,
            }),
        );
        if (color) {
          beams.forEach((b) => b.setStyle({ fillStyle: color, strokeStyle: color }));
          tuplets.forEach((t) => t.setStyle({ fillStyle: color, strokeStyle: color }));
        }
        return { notes, voice, beams, tuplets, m, pi };
      });

      // VexFlow underestimates the width of additive signatures such as 2+2+3/8.
      const plusCount = Math.max(0, ...parts.map((p) => (p.measures[mIdx]?.timeSig ?? '').split('+').length - 1));
      const startX = Math.max(...staves.map((st) => st.getNoteStartX())) + plusCount * 13;
      staves.forEach((st) => st.setNoteStartX(startX));
      const fmt = new Formatter();
      built.forEach((b) => fmt.joinVoices([b.voice]));
      const avail = Math.max(staves[0].getNoteEndX() - startX - 12, 20);
      fmt.format(
        built.map((b) => b.voice),
        avail,
      );
      if (opts.proportional) {
        // Place every note at its exact time position so simultaneous layers line up visually.
        built.forEach((b) => {
          const total = b.notes.reduce((a, sn) => a + sn.getTicks().value(), 0) || 1;
          let acc = 0;
          b.notes.forEach((sn) => {
            sn.getTickContext().setX(8 + (acc / total) * (avail - 10));
            acc += sn.getTicks().value();
          });
        });
      }
      staves.forEach((st) => st.draw());
      if (staves.length > 1) {
        new StaveConnector(staves[0], staves[staves.length - 1]).setType('singleRight').setContext(ctx).draw();
        if (mIdx === nMeasures - 1) new StaveConnector(staves[0], staves[staves.length - 1]).setType('boldDoubleRight').setContext(ctx).draw();
      }
      built.forEach((b) => {
        b.voice.draw(ctx, staves[b.pi]);
        b.beams.forEach((bm) => bm.setContext(ctx).draw());
        b.tuplets.forEach((t) => t.setContext(ctx).draw());
        b.notes.forEach((sn, i) => {
          const id = b.m?.notes[i].id;
          const svg = sn.getSVGElement();
          if (!id || !svg) return;
          const list = map.get(id) ?? [];
          list.push(svg);
          map.set(id, list);
          if (opts.clickable) {
            svg.classList.add(s.clickable);
            svg.addEventListener('click', () => onClick(id));
          }
        });
      });
      x += w;
    });

    if (firstStaves.length > 1) {
      new StaveConnector(firstStaves[0], firstStaves[firstStaves.length - 1]).setType('singleLeft').setContext(ctx).draw();
      new StaveConnector(firstStaves[0], firstStaves[firstStaves.length - 1]).setType('bracket').setContext(ctx).draw();
    }
    if (hasLabels) {
      parts.forEach((p, pi) => {
        if (!p.label || !firstStaves[pi]) return;
        ctx.save();
        ctx.setFont('Source Sans 3, Segoe UI, sans-serif', 13, 'bold');
        ctx.setFillStyle(p.colorVar ? cssVar(p.colorVar) : faint);
        const yMid = firstStaves[pi].getYForLine(2) + 4;
        const tw = ctx.measureText(p.label).width;
        ctx.fillText(p.label, Math.max(2, labelW - tw - 6 - (firstStaves.length > 1 ? 10 : 0)), yMid);
        ctx.restore();
      });
    }
  });

  // Fit the SVG height to the drawn staves (glyph text boxes from the music font are too tall to trust).
  const svg = el.querySelector('svg');
  if (svg && mids.length) {
    const top = Math.floor(Math.min(...mids) - 44 - (hasAccents ? 16 : 0) - (hasTuplets ? 24 : 0));
    const bottom = Math.ceil(Math.max(...mids) + 26);
    const h = bottom - top;
    svg.setAttribute('width', String(physWidth));
    svg.setAttribute('height', String(h * zoom));
    svg.setAttribute('viewBox', `0 ${top} ${width} ${h}`);
    svg.style.width = `${physWidth}px`;
    svg.style.height = `${h * zoom}px`;
  }
  return map;
}
