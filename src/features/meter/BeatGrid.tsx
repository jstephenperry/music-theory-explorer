/**
 * Editable beat grid: pulses grouped into beats with three accent levels.
 * Click a pulse to cycle its accent; click the gap between pulses to split or merge beat groups.
 */
import { Fragment, useImperativeHandle, useRef, type Ref } from 'react';
import { groupStarts, noteValue, type AccentLevel, type Bar } from './meter';
import s from './MeterPage.module.css';

export interface BeatGridHandle {
  highlight: (pulse: number | null) => void;
}

const LEVEL_NAME = ['weak pulse', 'secondary accent', 'downbeat'];

/** Counting syllables: beat numbers with "&" and "a" for divisions (1 & a 2 & a ...). */
export function countSyllables(groups: number[], allOnes: boolean): string[] {
  if (allOnes) return groups.map((_, i) => String(i + 1));
  const out: string[] = [];
  groups.forEach((g, i) => {
    const subs = g === 2 ? ['&'] : g === 3 ? ['&', 'a'] : g === 4 ? ['e', '&', 'a'] : Array(g - 1).fill('·');
    out.push(String(i + 1), ...subs);
  });
  return out;
}

export function BeatGrid({
  bars,
  accents,
  onAccent,
  onBoundary,
  handle,
  selectedBar,
  onSelectBar,
}: {
  bars: Bar[];
  accents: AccentLevel[][];
  onAccent: (bar: number, pulse: number) => void;
  onBoundary: (bar: number, pulse: number) => void;
  handle?: Ref<BeatGridHandle>;
  selectedBar: number;
  onSelectBar: (bar: number) => void;
}) {
  const pulseEls = useRef<Array<HTMLButtonElement | null>>([]);
  const lit = useRef<HTMLButtonElement | null>(null);

  useImperativeHandle(
    handle,
    () => ({
      highlight(pulse) {
        const el = pulse === null ? null : pulseEls.current[pulse] ?? null;
        if (el === lit.current) return;
        lit.current?.classList.remove(s.pulseNow);
        el?.classList.add(s.pulseNow);
        lit.current = el;
      },
    }),
    [],
  );

  let global = 0;
  return (
    <div className={s.grid}>
      {bars.map((bar, bi) => {
        const starts = groupStarts(bar.groups);
        const allOnes = bar.groups.every((g) => g === 1);
        const syl = countSyllables(bar.groups, allOnes);
        const base = global;
        global += bar.num;
        return (
          <div key={bi} className={`${s.gridBar} ${bars.length > 1 && bi === selectedBar ? s.gridBarSelected : ''}`}>
            <button type="button" className={s.gridBarHead} onClick={() => onSelectBar(bi)} aria-label={`Bar ${bi + 1}, ${bar.num}/${bar.den}. Select to edit`}>
              <span className={s.miniSig}>
                <span>{bar.num}</span>
                <span>{bar.den}</span>
              </span>
            </button>
            <div className={s.gridGroups}>
              {bar.groups.map((g, gi) => {
                const start = starts[gi];
                return (
                  <Fragment key={gi}>
                    {gi > 0 && (
                      <button
                        type="button"
                        className={s.boundary}
                        onClick={() => onBoundary(bi, start)}
                        title="Merge these two beats"
                        aria-label={`Merge beat ${gi} and beat ${gi + 1} of bar ${bi + 1}`}
                      >
                        <span />
                      </button>
                    )}
                    <div className={s.group}>
                      <div className={s.groupPulses}>
                        {Array.from({ length: g }, (_, k) => {
                          const p = start + k;
                          const level = accents[bi]?.[p] ?? 0;
                          return (
                            <Fragment key={k}>
                              {k > 0 && (
                                <button
                                  type="button"
                                  className={s.split}
                                  onClick={() => onBoundary(bi, p)}
                                  title="Split the beat here"
                                  aria-label={`Split beat ${gi + 1} of bar ${bi + 1} before pulse ${p + 1}`}
                                />
                              )}
                              <button
                                type="button"
                                ref={(el) => {
                                  pulseEls.current[base + p] = el;
                                }}
                                className={`${s.pulse} ${s[`lvl${level}`]}`}
                                onClick={() => onAccent(bi, p)}
                                aria-label={`Bar ${bi + 1}, pulse ${p + 1}: ${LEVEL_NAME[level]}. Click to change accent`}
                              >
                                <span className={s.pulseDot} />
                                <span className={s.pulseSyl}>{syl[p]}</span>
                              </button>
                            </Fragment>
                          );
                        })}
                      </div>
                      <div className={`${s.groupBracket} ${allOnes ? s.groupBracketNone : ''}`} aria-hidden="true">
                        {!allOnes && <span>{noteValue(g / bar.den).symbol}</span>}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
