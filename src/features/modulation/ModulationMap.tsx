import { useMemo } from 'react';
import { sameKey, type Key } from '../../theory/keys';
import { Segmented } from '../../components/ui';
import { keyLabel, keyShort, mapColumns, mapEntry, TECHNIQUES, type MapEntry } from './logic';
import s from './Modulation.module.css';

export type MapMode = 'pivots' | 'techniques';

/**
 * All 24 keys arranged by key signature around the source, shaded by how many pivot chords
 * (or techniques) connect them to the source. Clicking a key makes it the target.
 */
export function ModulationMap({ from, to, onPick, mode, onMode }: { from: Key; to: Key; onPick: (k: Key) => void; mode: MapMode; onMode: (m: MapMode) => void }) {
  const cols = useMemo(() => mapColumns(from, to), [from, to]);
  const entries = useMemo(() => {
    const out = new Map<Key, MapEntry>();
    for (const c of cols) for (const k of [c.major, c.minor]) out.set(k, mapEntry(from, k));
    return out;
  }, [cols, from]);
  const maxPivots = Math.max(1, ...[...entries.values()].map((e) => e.pivots));

  const cell = (k: Key, id: string) => {
    const e = entries.get(k)!;
    const isFrom = sameKey(k, from);
    const isTo = sameKey(k, to);
    const frac = mode === 'pivots' ? e.pivots / maxPivots : e.available.length / TECHNIQUES.length;
    const pct = isFrom ? 0 : Math.round(6 + frac * 58);
    const bg = isFrom ? 'var(--brass-soft)' : `color-mix(in srgb, var(--verdigris) ${pct}%, var(--bg-elev))`;
    const dark = !isFrom && pct > 42;
    const rel = e.relations.filter((r) => r.id !== 'close').map((r) => r.label);
    const title = isFrom
      ? `${keyLabel(k)} (source)`
      : `${keyLabel(k)}: ${e.pivots} pivot chord${e.pivots === 1 ? '' : 's'}; ${e.available.length} of 9 techniques${rel.length ? `; ${rel.join(', ')}` : ''}`;
    return (
      <button
        key={id}
        type="button"
        className={`${s.cell} ${isFrom ? s.cellFrom : ''} ${isTo ? s.cellTo : ''}`}
        style={{ background: bg, color: dark ? 'var(--bg-elev)' : 'var(--ink)' }}
        onClick={() => !isFrom && onPick(k)}
        aria-pressed={isTo}
        aria-label={title}
        title={title}
      >
        {isFrom && (
          <span className={s.cellBadge} style={{ color: 'var(--brass)' }}>
            from
          </span>
        )}
        {isTo && !isFrom && (
          <span className={s.cellBadge} style={{ color: dark ? 'var(--bg-elev)' : 'var(--accent)' }}>
            to
          </span>
        )}
        <span className={s.cellKey}>{keyShort(k)}</span>
        <span className={s.cellCount} style={{ color: dark ? 'var(--bg-elev)' : undefined }}>
          {isFrom ? 'source' : mode === 'pivots' ? `${e.pivots} pivot${e.pivots === 1 ? '' : 's'}` : `${e.available.length}/9`}
        </span>
        {!isFrom && (
          <span className={s.pips} aria-hidden="true">
            {TECHNIQUES.map((t) => (
              <span
                key={t.id}
                className={`${s.pip} ${e.available.includes(t.id) ? s.pipOn : ''}`}
                style={e.available.includes(t.id) && dark ? { background: 'var(--bg-elev)' } : undefined}
              />
            ))}
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      <div className={s.mapHead}>
        <span className="muted" style={{ fontSize: '0.9rem' }}>
          Shade by
        </span>
        <Segmented
          size="sm"
          ariaLabel="Shade the map by"
          value={mode}
          onChange={onMode}
          options={[
            { value: 'pivots', label: 'Pivot chords' },
            { value: 'techniques', label: 'Techniques available' },
          ]}
        />
      </div>
      <div className={s.map} role="group" aria-label="Modulation map of all 24 keys">
        {cols.flatMap((c) => [cell(c.major, `${c.offset}M`), cell(c.minor, `${c.offset}m`)])}
      </div>
      <div className={s.pipLegend}>
        {TECHNIQUES.map((t, i) => (
          <span key={t.id}>
            <b>{i + 1}</b>
            {t.name}
          </span>
        ))}
      </div>
      <p className={s.mapNote}>
        Columns follow the circle of fifths, centered on the source; each column pairs a major key with its relative minor. The bars show which of the nine
        techniques (in the order listed) are available.
      </p>
    </div>
  );
}
