import { audio } from '../../audio/engine';
import { Button, Empty, Tag } from '../../components/ui';
import { keyName, type Key } from '../../theory/keys';
import { midi } from '../../theory/notes';
import { voiceChord } from '../../theory/voicing';
import { FN_LABEL, type Pivot } from './logic';
import s from './Modulation.module.css';

const RATING_TONE = { ideal: 'verdigris', good: 'brass', fair: 'default' } as const;

/** Table of pivot chords with both analyses; a row click selects that pivot for the example. */
export function PivotTable({ pivots, from, to, selectedId, onSelect, borrowed }: { pivots: Pivot[]; from: Key; to: Key; selectedId?: string; onSelect: (id: string) => void; borrowed?: boolean }) {
  if (!pivots.length) {
    return <Empty>{borrowed ? `No chord borrowed from the parallel of ${keyName(from)} is diatonic in ${keyName(to)}.` : `${keyName(from)} and ${keyName(to)} share no diatonic triads or seventh chords.`}</Empty>;
  }
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Chord</th>
            <th>In {keyName(from)}</th>
            <th>In {keyName(to)}</th>
            <th className={s.hideNarrow}>New function</th>
            <th>Fit</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {pivots.map((p) => (
            <tr key={p.id} className={p.id === selectedId ? s.rowActive : undefined}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.symbol}</td>
              <td className={s.numCell}>{p.old.display}</td>
              <td className={s.numCell} style={{ color: 'var(--verdigris)' }}>
                {p.new.display}
              </td>
              <td className={`${s.hideNarrow} ${s.why}`} title={p.why}>
                {FN_LABEL[p.new.fn]}
                {p.old.source === 'harmonic' || p.new.source === 'harmonic' ? ' (harmonic minor)' : ''}
              </td>
              <td>
                <Tag tone={RATING_TONE[p.rating]} title={p.why}>
                  {p.rating}
                </Tag>
              </td>
              <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                <Button size="sm" variant="ghost" icon="sound" aria-label={`Hear ${p.symbol}`} onClick={() => audio.playChord(voiceChord(p.old.chord.notes, { low: 52 }).map(midi), 1.3, undefined, 0.6)} />
                <Button size="sm" variant={p.id === selectedId ? 'primary' : 'secondary'} onClick={() => onSelect(p.id)} aria-pressed={p.id === selectedId}>
                  {p.id === selectedId ? 'In use' : 'Use'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
