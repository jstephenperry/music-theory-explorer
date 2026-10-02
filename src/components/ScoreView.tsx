/**
 * Engraves a Score (see theory/score.ts) with VexFlow: one or more staves joined by a brace,
 * independent voices with their own rhythms, ties (also across line breaks), tuplets, grace
 * notes, ornaments, a pickup measure, labels above and below notes, and brackets that mark
 * passages (a motive, a phrase, a cadence).
 *
 * Sounding notes are highlighted without re-engraving: each note's SVG group gets a class.
 */
import { useEffect, useRef, useState } from 'react';
import { midi as toMidi, letterIndex, type Pitch } from '../theory/notes';
import { keySignatureFifths, signatureAccidentalMap, vexKeySpec } from '../theory/keys';
import { measureLen, measureStart, type Score, type ScoreNote } from '../theory/score';
import { loadVexFlow } from './Staff';
import { cssVar, resolveColor, useThemeVersion } from './theme';
import s from './ScoreView.module.css';

type VexModule = Awaited<ReturnType<typeof loadVexFlow>>;

export interface ScoreBracket {
  /** First and last note ids of the passage. */
  first: string;
  last: string;
  label: string;
  /** Color role ('root', 'alt', 'extra', 'other', 'tone') or CSS color. */
  color?: string;
  /** Stacking row above the staff, 0 nearest. */
  row?: number;
}

export interface ScoreViewProps {
  score: Score;
  /** Note id to color role or CSS color. */
  colors?: Record<string, string | undefined>;
  /** Ids of notes currently sounding. */
  active?: ReadonlySet<string>;
  brackets?: ScoreBracket[];
  onNoteClick?: (id: string) => void;
  ariaLabel: string;
  /** Show the time signature (default true). */
  showTime?: boolean;
  /** Draw a final double barline (default true). */
  finalBarline?: boolean;
  /** Keep groups of this many bars on one line when they fit, e.g. 4 for four-bar phrases. */
  barsPerLine?: number;
}

export function ScoreView(props: ScoreViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [vf, setVf] = useState<VexModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeVersion();
  const clickRef = useRef(props.onNoteClick);
  clickRef.current = props.onNoteClick;
  const elements = useRef(new Map<string, SVGElement[]>());

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

  const key = JSON.stringify([props.score, props.colors, props.brackets, props.showTime, props.finalBarline, props.barsPerLine, !!props.onNoteClick]);
  useEffect(() => {
    const el = host.current;
    if (!vf || !el || width < 50) return;
    try {
      elements.current = engrave(vf, el, props, width, (id) => clickRef.current?.(id));
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vf, width, key, theme]);

  // Highlight sounding notes by toggling a class, which is far cheaper than engraving again.
  const activeKey = props.active ? [...props.active].sort().join(',') : '';
  useEffect(() => {
    const map = elements.current;
    map.forEach((els, id) => {
      const on = props.active?.has(id) ?? false;
      els.forEach((e) => e.classList.toggle(s.sounding, on));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, vf, width, key, theme]);

  return (
    <div className={s.score} role="img" aria-label={props.ariaLabel}>
      <div ref={host} className={s.canvas} />
      {!vf && !error && <div className={s.loading}>Engraving…</div>}
      {error && <div className={s.error}>Could not render notation: {error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

const ACC: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' };
const VEX_DUR: Record<number, string> = { 1: 'w', 2: 'h', 4: 'q', 8: '8', 16: '16', 32: '32' };
const ORN: Record<string, { kind: 'orn' | 'art'; code: string }> = {
  tr: { kind: 'orn', code: 'tr' },
  // VexFlow's "mordent" is the short trill (prall) glyph and its "mordentInverted" the mordent with a line.
  mordent: { kind: 'orn', code: 'mordentInverted' },
  prall: { kind: 'orn', code: 'mordent' },
  turn: { kind: 'orn', code: 'turn' },
  stacc: { kind: 'art', code: 'a.' },
  fermata: { kind: 'art', code: 'a@a' },
};
/** Horizontal room a note needs, by note value. */
const NOTE_W: Record<number, number> = { 1: 44, 2: 36, 4: 29, 8: 23, 16: 18, 32: 15 };
/** Vertical space between the ink of consecutive systems. */
const SYSTEM_GAP = 26;
const LABEL_FONT = { family: '"Cormorant Garamond", Georgia, serif', size: 16, weight: 'bold' };
// Family names are quoted: an unquoted name with a word starting with a digit ("Source Sans 3") is invalid CSS.
const BRACKET_FONT = { family: '"Source Sans 3", "Segoe UI", sans-serif', size: 12, weight: 'bold' };

const keyString = (p: Pitch) => `${p.letter.toLowerCase()}/${p.octave}`;
const staffLine = (p: Pitch) => p.octave * 7 + letterIndex(p.letter);

type StaveNoteT = InstanceType<VexModule['StaveNote']>;
type StaveT = InstanceType<VexModule['Stave']>;

interface Built {
  note: ScoreNote;
  vex: StaveNoteT | InstanceType<VexModule['GhostNote']>;
  staff: number;
  system: number;
}

function engrave(VF: VexModule, el: HTMLDivElement, props: ScoreViewProps, width: number, onClick: (id: string) => void): Map<string, SVGElement[]> {
  const { Renderer, Stave, StaveNote, GhostNote, Voice, Formatter, Accidental, StaveConnector, Dot, Beam, Barline, StaveTie, Tuplet, GraceNote, GraceNoteGroup, Ornament, Articulation, Stem } = VF;
  const score = props.score;
  el.innerHTML = '';
  const map = new Map<string, SVGElement[]>();
  if (score.measures === 0) return map;

  const ink = cssVar('--ink');
  const faint = cssVar('--ink-muted');
  const fifths = keySignatureFifths(score.key);
  const keySpec = vexKeySpec(score.key);
  const sigMap = signatureAccidentalMap(keySpec ? fifths : 0);
  const showTime = props.showTime ?? true;
  const timeSig = `${score.time[0]}/${score.time[1]}`;
  const nStaves = score.staves.length;
  // Beat length in quarter notes: a dotted quarter in compound meters (6/8, 9/8, 12/8), else the beat unit.
  const beatLen = score.time[1] === 8 && score.time[0] % 3 === 0 ? 1.5 : 4 / score.time[1];

  // ---- Notes per measure, per staff and voice ----
  const perMeasure: ScoreNote[][][][] = Array.from({ length: score.measures }, () => score.staves.map((st) => st.voices.map(() => [] as ScoreNote[])));
  score.staves.forEach((st, si) => st.voices.forEach((v, vi) => v.notes.forEach((n) => perMeasure[n.measure]?.[si][vi].push(n))));
  const hasBelow = score.staves.map((st) => st.voices.some((v) => v.notes.some((n) => n.below)));
  const hasAbove = score.staves.map((st) => st.voices.some((v) => v.notes.some((n) => n.above)));

  // ---- Measure widths and line breaks ----
  const noteW = (n: ScoreNote) => {
    const label = Math.max(textWidth(n.below, LABEL_FONT), textWidth(n.above, LABEL_FONT)) + 8;
    const base = NOTE_W[n.value] + n.dots * 5 + (n.grace?.length ?? 0) * 11 + (n.pitches.some((p) => p.acc !== 0) ? 7 : 0);
    return Math.max(base * (n.tuplet ? n.tuplet.normal / n.tuplet.actual + 0.25 : 1), label);
  };
  const natural = perMeasure.map((m) => 26 + Math.max(...m.flatMap((st) => st.map((v) => v.reduce((a, n) => a + noteW(n), 0)))));
  const headerW = (first: boolean) => 46 + (keySpec ? Math.abs(fifths) * 11 + 6 : 0) + (first && showTime ? 28 : 0);
  const leftMargin = nStaves > 1 ? 24 : 6;
  const usable = width - 8 - leftMargin;
  const systems: number[][] = [];
  let line: number[] = [];
  let lineW = 0;
  const place = (i: number) => {
    const add = natural[i] + (line.length === 0 ? headerW(systems.length === 0) : 0);
    if (line.length > 0 && lineW + add > usable) {
      systems.push(line);
      line = [];
      lineW = 0;
    }
    line.push(i);
    lineW += natural[i] + (line.length === 1 ? headerW(systems.length === 0) : 0);
  };
  // Groups of bars kept on one line when they fit (whole phrases); a pickup joins the first group.
  const per = props.barsPerLine ?? 1;
  const groups: number[][] = [];
  for (let i = 0; i < natural.length; ) {
    const n = i === 0 && score.pickup > 0 ? per + 1 : per;
    groups.push(natural.slice(i, i + n).map((_, j) => i + j));
    i += n;
  }
  // A phrase may be squeezed a little to stay on one line; one that still does not fit is halved.
  const SQUEEZE = 0.86;
  const placeGroup = (g: number[]) => {
    if (g.length === 1) return place(g[0]);
    const gw = g.reduce((a, i) => a + natural[i], 0);
    const room = usable / SQUEEZE;
    if (line.length > 0 && lineW + gw <= room) {
      g.forEach((i) => line.push(i));
      lineW += gw;
      return;
    }
    if (headerW(systems.length + (line.length ? 1 : 0) === 0) + gw <= room) {
      if (line.length) systems.push(line);
      line = [...g];
      lineW = headerW(systems.length === 0) + gw;
      return;
    }
    const half = Math.ceil(g.length / 2);
    placeGroup(g.slice(0, half));
    placeGroup(g.slice(half));
  };
  groups.forEach(placeGroup);
  if (line.length) systems.push(line);

  // Vertical layout: room for brackets above, labels between staves and below.
  const bracketRows = Math.max(0, ...(props.brackets ?? []).map((b) => (b.row ?? 0) + 1));
  const topPad = 34 + bracketRows * 20 + (hasAbove[0] ? 18 : 0);
  const staffH = 40;
  const gaps = score.staves.map((_, i) => (i === 0 ? 0 : 74 + (hasBelow[i - 1] ? 22 : 0) + (hasAbove[i] ? 18 : 0)));
  const staffY = (i: number) => gaps.slice(0, i + 1).reduce((a, g) => a + g, 0) + staffH * i;
  const bottomPad = 40 + (hasBelow[nStaves - 1] ? 26 : 0);
  const systemH = topPad + staffY(nStaves - 1) + staffH + bottomPad;

  const scales = systems.map((sys, sIdx) => {
    const total = sys.reduce((a, i) => a + natural[i], 0) + headerW(sIdx === 0);
    let k = usable / total;
    if (sIdx === systems.length - 1 && systems.length > 1) k = Math.min(k, 1.3);
    if (systems.length === 1) k = Math.min(k, 1.8);
    // A line holding a single bar may be squeezed a little on narrow screens before it has to scroll.
    return Math.max(k, sys.length === 1 ? 0.82 : SQUEEZE);
  });
  const drawnWidth = Math.max(width, ...systems.map((sys, sIdx) => Math.ceil(leftMargin + (sys.reduce((a, i) => a + natural[i], 0) + headerW(sIdx === 0)) * scales[sIdx] + 8)));

  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(drawnWidth, systemH * systems.length + 4);
  const ctx = renderer.getContext();
  ctx.setFillStyle(ink);
  ctx.setStrokeStyle(ink);

  const built: Built[] = [];
  const builtById = new Map<string, Built>();
  const systemOfMeasure: number[] = [];
  systems.forEach((sys, i) => sys.forEach((m) => (systemOfMeasure[m] = i)));
  const noteIndex = new Map<string, ScoreNote>();
  score.staves.forEach((st) => st.voices.forEach((v) => v.notes.forEach((n) => noteIndex.set(n.id, n))));
  const addBuilt = (b: Built) => {
    built.push(b);
    builtById.set(b.note.id, b);
  };
  const staveOf: Array<Array<StaveT>> = [];
  let prevBottom = -Infinity;
  let firstInkTop = 0;

  systems.forEach((sys, sIdx) => {
    const y0 = sIdx * systemH + topPad - 20;
    const group = ctx.openGroup('system') as SVGGElement;
    let x = leftMargin;
    const firstStaves: StaveT[] = [];
    const sysNotes: Array<{ staff: number; vex: StaveNoteT; note: ScoreNote }> = [];
    // Ink extent of the system, from VexFlow's own bounding boxes (SVG text boxes of music glyphs are far too tall).
    let inkTop = Infinity;
    let inkBottom = -Infinity;
    const extend = (top: number, bottom: number) => {
      inkTop = Math.min(inkTop, top);
      inkBottom = Math.max(inkBottom, bottom);
    };

    sys.forEach((mIdx, pos) => {
      const w = (natural[mIdx] + (pos === 0 ? headerW(sIdx === 0) : 0)) * scales[sIdx];
      const staves = score.staves.map((st, si) => {
        const stave = new Stave(x, y0 + staffY(si), w);
        stave.setStyle({ strokeStyle: faint, fillStyle: ink });
        if (pos === 0) {
          stave.addClef(st.clef);
          if (keySpec) stave.addKeySignature(keySpec);
          if (sIdx === 0 && showTime) stave.addTimeSignature(timeSig);
        }
        if (mIdx === score.measures - 1 && (props.finalBarline ?? true)) stave.setEndBarType(Barline.type.END);
        stave.setContext(ctx);
        return stave;
      });
      staveOf[mIdx] = staves;
      if (pos === 0) firstStaves.push(...staves);

      const voices: Array<InstanceType<typeof Voice>> = [];
      const perStaffVoices: Array<Array<InstanceType<typeof Voice>>> = [];
      const beams: Array<InstanceType<typeof Beam>> = [];
      const tuplets: Array<InstanceType<typeof Tuplet>> = [];
      const len = measureLen(score, mIdx);

      score.staves.forEach((st, si) => {
        const multi = st.voices.length > 1;
        const accState: Record<string, number> = {};
        const staffVoices: Array<InstanceType<typeof Voice>> = [];
        st.voices.forEach((_, vi) => {
          const notes = perMeasure[mIdx][si][vi];
          const tickables: Array<StaveNoteT | InstanceType<typeof GhostNote>> = [];
          notes.forEach((n) => {
            const dur = VEX_DUR[n.value];
            if (n.rest === 'space') {
              tickables.push(new GhostNote({ duration: dur, dots: n.dots }));
              addBuilt({ note: n, vex: tickables[tickables.length - 1], staff: si, system: sIdx });
              return;
            }
            if (n.rest) {
              const restKey = st.clef === 'bass' ? (multi ? (vi === 0 ? 'f/3' : 'f/2') : 'd/3') : multi ? (vi === 0 ? 'd/5' : 'f/4') : 'b/4';
              const r = new StaveNote({ keys: [restKey], duration: dur + 'r', dots: n.dots, clef: st.clef });
              if (n.dots) Dot.buildAndAttach([r], { all: true });
              if (n.orn?.includes('fermata')) r.addModifier(new Articulation(ORN.fermata.code), 0);
              tickables.push(r);
              addBuilt({ note: n, vex: r, staff: si, system: sIdx });
              return;
            }
            const order = [...n.pitches].sort((a, b) => staffLine(a) - staffLine(b));
            const vn = new StaveNote({
              keys: order.map(keyString),
              duration: dur,
              dots: n.dots,
              clef: st.clef,
              ...(multi ? { stemDirection: vi % 2 === 0 ? Stem.UP : Stem.DOWN } : { autoStem: true }),
            });
            const prev = notes[notes.indexOf(n) - 1] ?? previousNote(score, n);
            const continuesTie = prev?.tie && sameSet(prev.pitches, n.pitches);
            order.forEach((p, i) => {
              const slot = `${p.letter}${p.octave}`;
              const current = accState[slot] ?? sigMap[p.letter];
              if (p.acc !== current) {
                if (!(continuesTie && prev && prev.measure === n.measure)) vn.addModifier(new Accidental(ACC[p.acc] ?? (p.acc > 0 ? '##' : 'bb')), i);
                accState[slot] = p.acc;
              } else if (continuesTie && prev && prev.measure !== n.measure) {
                accState[slot] = p.acc;
              }
            });
            if (n.dots) Dot.buildAndAttach([vn], { all: true });
            if (n.grace?.length) {
              const graces = n.grace.map((g) => {
                const sorted = [...g].sort((a, b) => staffLine(a) - staffLine(b));
                const gn = new GraceNote({ keys: sorted.map(keyString), duration: '16', slash: n.grace!.length === 1, clef: st.clef });
                sorted.forEach((p, i) => {
                  if (p.acc !== sigMap[p.letter]) gn.addModifier(new Accidental(ACC[p.acc] ?? '#'), i);
                });
                return gn;
              });
              const gg = new GraceNoteGroup(graces, false);
              if (graces.length > 1) gg.beamNotes();
              vn.addModifier(gg, 0);
            }
            n.orn?.forEach((o) => {
              const spec = ORN[o];
              if (!spec) return;
              vn.addModifier(spec.kind === 'orn' ? new Ornament(spec.code) : new Articulation(spec.code), 0);
            });
            const color = resolveColor(props.colors?.[n.id]);
            if (color) vn.setStyle({ fillStyle: color, strokeStyle: color });
            tickables.push(vn);
            addBuilt({ note: n, vex: vn, staff: si, system: sIdx });
            sysNotes.push({ staff: si, vex: vn, note: n });
          });

          // Tuplets change the notes' ticks, so they are made before the voice is filled.
          const groups = new Map<number, Array<StaveNoteT>>();
          notes.forEach((n, i) => {
            if (!n.tuplet) return;
            const t = tickables[i];
            if (t instanceof StaveNote) groups.set(n.tuplet.group, [...(groups.get(n.tuplet.group) ?? []), t]);
          });
          groups.forEach((g, gid) => {
            const first = notes.find((n) => n.tuplet?.group === gid)!.tuplet!;
            tuplets.push(new Tuplet(g, { numNotes: first.actual, notesOccupied: first.normal, bracketed: false }));
          });

          const voice = new Voice({ numBeats: (len * score.time[1]) / 4, beatValue: score.time[1] }).setMode(Voice.Mode.SOFT);
          voice.addTickables(tickables);
          voices.push(voice);
          staffVoices.push(voice);
          // Beam consecutive eighths and shorter within each beat (a dotted quarter in compound meters).
          const mStart = measureStart(score, mIdx);
          let group: StaveNoteT[] = [];
          let groupBeat = -1;
          const flush = () => {
            if (group.length > 1) beams.push(new Beam(group, !multi));
            group = [];
          };
          notes.forEach((n, i) => {
            const t = tickables[i];
            const beat = Math.floor((n.start - mStart + 1e-6) / beatLen);
            if (!(t instanceof StaveNote) || n.rest || n.value < 8 || beat !== groupBeat) flush();
            if (t instanceof StaveNote && !n.rest && n.value >= 8) {
              group.push(t);
              groupBeat = beat;
            } else groupBeat = -1;
          });
          flush();
        });
        perStaffVoices.push(staffVoices);
      });

      const startX = Math.max(...staves.map((st) => st.getNoteStartX()));
      staves.forEach((st) => st.setNoteStartX(startX));
      const fmt = new Formatter();
      perStaffVoices.forEach((vs) => fmt.joinVoices(vs));
      fmt.format(voices, Math.max(staves[0].getNoteEndX() - startX - 12, 20));
      staves.forEach((st) => st.draw());
      if (nStaves > 1) {
        new StaveConnector(staves[0], staves[nStaves - 1]).setType('singleRight').setContext(ctx).draw();
        if (mIdx === score.measures - 1 && (props.finalBarline ?? true)) new StaveConnector(staves[0], staves[nStaves - 1]).setType('boldDoubleRight').setContext(ctx).draw();
      }
      perStaffVoices.forEach((vs, si) => vs.forEach((v) => v.draw(ctx, staves[si])));
      beams.forEach((b) => b.setContext(ctx).draw());
      tuplets.forEach((t) => t.setContext(ctx).draw());
      x += w;
    });

    // ---- Labels above and below, on shared baselines per staff ----
    score.staves.forEach((_, si) => {
      const mine = sysNotes.filter((n) => n.staff === si);
      const stave = firstStaves[si];
      if (!stave) return;
      let low = stave.getYForLine(4);
      let high = stave.getYForLine(0);
      for (const n of mine) {
        const bb = inkBox(n);
        if (!bb) continue;
        low = Math.max(low, bb.bottom);
        high = Math.min(high, bb.top);
      }
      for (const n of mine) {
        const cx = (n.vex.getNoteHeadBeginX() + n.vex.getNoteHeadEndX()) / 2;
        const color = resolveColor(props.colors?.[n.note.id]) ?? ink;
        if (n.note.below) {
          drawText(ctx, n.note.below, cx, low + 20, LABEL_FONT, color);
          extend(low, low + 24);
        }
        if (n.note.above) {
          drawText(ctx, n.note.above, cx, high - 8, LABEL_FONT, color);
          extend(high - 24, high);
        }
      }
    });

    if (firstStaves.length) extend(firstStaves[0].getYForLine(0) - 16, firstStaves[nStaves - 1].getYForLine(4) + 16);
    for (const n of sysNotes) {
      const bb = inkBox(n);
      if (bb) extend(bb.top, bb.bottom);
    }

    if (nStaves > 1 && firstStaves.length) {
      new StaveConnector(firstStaves[0], firstStaves[nStaves - 1]).setType('brace').setContext(ctx).draw();
      new StaveConnector(firstStaves[0], firstStaves[nStaves - 1]).setType('singleLeft').setContext(ctx).draw();
    }

    // ---- Brackets over passages that start in this system ----
    const topStave = firstStaves[0];
    if (topStave) {
      let highest = topStave.getYForLine(0) - 6;
      for (const n of sysNotes.filter((x) => x.staff === 0)) {
        const bb = inkBox(n);
        if (bb) highest = Math.min(highest, bb.top - 4);
      }
      if (hasAbove[0]) highest -= 20;
      for (const b of props.brackets ?? []) {
        const a = noteIndex.get(b.first);
        const z = noteIndex.get(b.last);
        if (!a || !z) continue;
        const aSys = systemOfMeasure[a.measure];
        const zSys = systemOfMeasure[z.measure];
        if (sIdx < aSys || sIdx > zSys) continue;
        // Draw the part of the bracket that falls in this system.
        const firstStave = staveOf[sys[0]][0];
        const lastStave = staveOf[sys[sys.length - 1]][0];
        const av = builtById.get(a.id)?.vex as StaveNoteT | undefined;
        const zv = builtById.get(z.id)?.vex as StaveNoteT | undefined;
        const x1 = aSys === sIdx && av ? av.getAbsoluteX() - 3 : firstStave.getNoteStartX() - 4;
        const x2 = zSys === sIdx && zv ? zv.getAbsoluteX() + 14 : lastStave.getX() + lastStave.getWidth();
        const y = highest - 8 - (b.row ?? 0) * 20;
        const color = resolveColor(b.color) ?? faint;
        ctx.save();
        ctx.setStrokeStyle(color);
        ctx.setFillStyle(color);
        ctx.setLineWidth(1.4);
        ctx.beginPath();
        ctx.moveTo(x1, y + (aSys === sIdx ? 6 : 0));
        ctx.lineTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.lineTo(x2, y + (zSys === sIdx ? 6 : 0));
        ctx.stroke();
        const text = aSys === sIdx ? b.label : `${b.label} (cont.)`;
        // Keep the label inside the drawing on narrow screens.
        const tx = Math.max(2, Math.min(x1 + 2, drawnWidth - textWidth(text, BRACKET_FONT) - 6));
        drawText(ctx, text, tx, y - 4, BRACKET_FONT, color, 'start');
        extend(y - 18, y);
        ctx.restore();
      }
    }

    // ---- Ties: within this system, or halves where a line break interrupts them ----
    const tie = (first: StaveNoteT | null, last: StaveNoteT | null, count: number) => {
      const idx = Array.from({ length: count }, (_, i) => i);
      new StaveTie({ firstNote: first, lastNote: last, firstIndexes: idx, lastIndexes: idx }).setContext(ctx).draw();
    };
    for (const { note: n, vex } of sysNotes) {
      if (n.tie) {
        const next = nextNote(score, n);
        if (next && !next.rest) {
          if (systemOfMeasure[next.measure] === sIdx) {
            const nv = builtById.get(next.id)?.vex;
            if (nv instanceof StaveNote) tie(vex, nv, n.pitches.length);
          } else tie(vex, null, n.pitches.length);
        }
      }
      const prev = previousNote(score, n);
      if (prev?.tie && !prev.rest && systemOfMeasure[prev.measure] < sIdx) tie(null, vex, n.pitches.length);
    }
    ctx.closeGroup();

    // Stack each system a fixed gap below the ink of the previous one (up or down from its nominal place).
    const shift = sIdx === 0 ? 0 : prevBottom + SYSTEM_GAP - inkTop;
    if (shift) group.setAttribute('transform', `translate(0 ${shift})`);
    prevBottom = inkBottom + shift;
    if (sIdx === 0) firstInkTop = inkTop;
  });

  // Fit the SVG to its content.
  const svg = el.querySelector('svg');
  if (svg) {
    const top = Math.floor(firstInkTop - 10);
    const h = Math.ceil(prevBottom + 14) - top;
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 ${top} ${drawnWidth} ${h}`);
    svg.style.height = `${h}px`;
  }

  // ---- Clicks and highlight handles ----
  for (const b of built) {
    if (!(b.vex instanceof StaveNote)) continue;
    const g = b.vex.getSVGElement();
    if (!g) continue;
    const list = map.get(b.note.id) ?? [];
    list.push(g);
    map.set(b.note.id, list);
    if (props.onNoteClick && !b.note.rest) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => onClick(b.note.id));
    }
  }
  return map;
}

function sameSet(a: Pitch[], b: Pitch[]): boolean {
  return a.length === b.length && a.every((p, i) => toMidi(p) === toMidi(b[i]));
}

function voiceOf(score: Score, n: ScoreNote): ScoreNote[] {
  const [s, v] = n.id.split('.').map(Number);
  return score.staves[s].voices[v].notes;
}

function nextNote(score: Score, n: ScoreNote): ScoreNote | undefined {
  const notes = voiceOf(score, n);
  return notes[notes.indexOf(n) + 1];
}

function previousNote(score: Score, n: ScoreNote): ScoreNote | undefined {
  const notes = voiceOf(score, n);
  return notes[notes.indexOf(n) - 1];
}

type Ctx = { save: () => unknown; restore: () => unknown; setFont: (f: string, s: number, w: string) => unknown; setFillStyle: (c: string) => unknown; measureText: (t: string) => { width: number }; fillText: (t: string, x: number, y: number) => unknown };

/**
 * Vertical extent of a note's ink. VexFlow's bounding box is used, except for notes with grace notes,
 * whose box wrongly reaches the top of the drawing: those are measured from note heads and stem.
 */
function inkBox(n: { note: ScoreNote; vex: { getBoundingBox(): { getY(): number; getH(): number } | undefined } }): { top: number; bottom: number } | null {
  const v = n.vex as unknown as { getYs?: () => number[]; hasStem?: () => boolean; getStemExtents?: () => { topY: number; baseY: number } };
  if (n.note.grace?.length && v.getYs) {
    const ys = v.getYs();
    let top = Math.min(...ys) - 6;
    let bottom = Math.max(...ys) + 6;
    if (v.hasStem?.() && v.getStemExtents) {
      const e = v.getStemExtents();
      top = Math.min(top, e.topY, e.baseY);
      bottom = Math.max(bottom, e.topY, e.baseY);
    }
    // Room for an ornament or articulation above.
    return { top: top - 14, bottom };
  }
  const bb = n.vex.getBoundingBox();
  return bb ? { top: bb.getY(), bottom: bb.getY() + bb.getH() } : null;
}

function drawText(ctx: Ctx, text: string, x: number, y: number, font: { family: string; size: number; weight: string }, color: string, align: 'center' | 'start' = 'center') {
  ctx.save();
  ctx.setFont(font.family, font.size, font.weight);
  ctx.setFillStyle(color);
  const w = ctx.measureText(text).width;
  ctx.fillText(text, align === 'center' ? x - w / 2 : x, y);
  ctx.restore();
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string | undefined, font: { family: string; size: number; weight: string }): number {
  if (!text) return 0;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 8;
  const families = font.family
    .split(',')
    .map((f) => f.trim())
    .map((f) => f.replace(/^"|"$/g, ''))
    .map((f) => (f === 'serif' || f === 'sans-serif' ? f : `"${f}"`))
    .join(', ');
  // VexFlow sets numeric font sizes in points.
  measureCtx.font = `${font.weight} ${font.size}pt ${families}`;
  return measureCtx.measureText(text).width;
}
