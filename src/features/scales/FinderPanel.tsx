import { useMemo, useState } from 'react';
import { Button, Callout, Empty, Tag } from '../../components/ui';
import { noteName, sameNote, type Note } from '../../theory/notes';
import { findScales, scalePcSet, type FinderResult } from './scaleLogic';
import { shortName } from './shared';
import s from './ScalesPage.module.css';

const GROUP_LIMIT = 24;

export function FinderPanel({
  pcs,
  onChange,
  onLoad,
  current,
  spellFor,
}: {
  pcs: number[];
  onChange: (pcs: number[]) => void;
  onLoad: (root: Note, id: string) => void;
  current: { root: Note; scaleId: string };
  spellFor: (pc: number) => Note;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const results = useMemo(() => findScales(pcs), [pcs]);
  const exact = results.filter((r) => r.exact);
  const groups = useMemo(() => {
    const m = new Map<number, FinderResult[]>();
    for (const r of results) {
      if (r.exact) continue;
      const n = r.scale.intervals.length;
      m.set(n, [...(m.get(n) ?? []), r]);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [results]);

  const sorted = [...pcs].sort((a, b) => a - b);
  const isCurrent = (r: FinderResult) => r.scale.id === current.scaleId && sameNote(r.root, current.root);

  const chip = (r: FinderResult, i: number) => (
    <button key={`${r.scale.id}-${i}`} className={`${s.resultChip} ${isCurrent(r) ? s.resultChipActive : ''}`} onClick={() => onLoad(r.root, r.scale.id)}>
      {noteName(r.root)} {shortName(r.scale.name)}
    </button>
  );

  return (
    <div className="stack">
      <div className={s.panelBar}>
        <div className={s.selectedNotes} aria-live="polite">
          {sorted.length === 0 ? (
            <span className={s.barHint}>Click keys on the piano above (or use your computer keyboard) to choose notes.</span>
          ) : (
            sorted.map((p) => (
              <button key={p} className={s.noteChip} onClick={() => onChange(pcs.filter((x) => x !== p))} aria-label={`Remove ${noteName(spellFor(p))}`}>
                {noteName(spellFor(p))} <span aria-hidden="true">×</span>
              </button>
            ))
          )}
        </div>
        <Button size="sm" icon="sparkle" onClick={() => onChange([...scalePcSet(current.root, current.scaleId)])}>
          Use current scale
        </Button>
        <Button size="sm" icon="trash" onClick={() => onChange([])} disabled={pcs.length === 0}>
          Clear
        </Button>
      </div>

      {pcs.length === 0 && (
        <Callout title="Which scales contain these notes?">
          Pick a few notes, for example the notes of a melody or a chord, and every scale in the catalog that contains all of them is listed, smallest scales first. Click a
          result to load it.
        </Callout>
      )}

      {pcs.length > 0 && results.length === 0 && <Empty>No catalogued scale contains all {pcs.length} of these notes.</Empty>}

      {pcs.length > 0 && results.length > 0 && (
        <>
          <div className={s.resultCount}>
            {results.length} {results.length === 1 ? 'scale contains' : 'scales contain'} {pcs.length === 1 ? 'this note' : `all ${pcs.length} notes`}.
          </div>
          {exact.length > 0 && (
            <div className={s.resultGroup}>
              <div className={s.subhead}>
                Exactly these notes <Tag tone="verdigris">{exact.length}</Tag>
              </div>
              <div className={s.resultList}>{exact.map(chip)}</div>
            </div>
          )}
          {groups.map(([n, list]) => {
            const open = expanded.has(n);
            const shown = open ? list : list.slice(0, GROUP_LIMIT);
            return (
              <div key={n} className={s.resultGroup}>
                <div className={s.subhead}>
                  {n}-note scales <Tag>{list.length}</Tag>
                </div>
                <div className={s.resultList}>
                  {shown.map(chip)}
                  {list.length > GROUP_LIMIT && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setExpanded((e) => {
                          const next = new Set(e);
                          if (open) next.delete(n);
                          else next.add(n);
                          return next;
                        })
                      }
                    >
                      {open ? 'Show fewer' : `Show all ${list.length}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
