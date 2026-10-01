import { useMemo } from 'react';
import type { Player } from '../../audio/usePlayer';
import { Staff } from '../../components/Staff';
import { Button, PlayButton, Select } from '../../components/ui';
import { SCALES, getScale, type ScaleDef } from '../../theory/scales';
import { noteName, type Note } from '../../theory/notes';
import { compareScales, differenceSummary, scaleTones } from './scaleLogic';
import { SCALE_GROUPS, melody, shortName, type PlayData } from './shared';
import s from './ScalesPage.module.css';

export function ComparePanel({
  root,
  scale,
  otherId,
  onOther,
  onSwap,
  player,
  bpm,
}: {
  root: Note;
  scale: ScaleDef;
  otherId: string;
  onOther: (id: string) => void;
  onSwap: () => void;
  player: Player;
  bpm: number;
}) {
  const other = getScale(otherId);
  const data = player.playing ? (player.activeData as PlayData | null) : null;
  const a = scaleTones(root, scale.id);
  const b = scaleTones(root, other.id);
  const rows = compareScales(root, scale.id, other.id);
  const diff = differenceSummary(root, scale.id, other.id);
  const rootName = noteName(root);

  // Scales with the same number of notes that differ from the current one by a single note.
  const neighbors = useMemo(
    () =>
      SCALES.filter((x) => x.id !== scale.id && x.intervals.length === scale.intervals.length).filter((x) => {
        const d = differenceSummary(root, scale.id, x.id);
        return d.onlyA.length === 1 && d.onlyB.length === 1;
      }),
    [root, scale.id, scale.intervals.length],
  );

  const playBoth = () => {
    const evA = melody(a.map((t, i) => ({ midi: t.midi, index: i })), 'cmp', 0, 0.5);
    const evB = melody(b.map((t, i) => ({ midi: t.midi, index: a.length + i })), 'cmp', a.length * 0.5 + 1.5, 0.5);
    player.play([...evA, ...evB], { bpm });
  };

  return (
    <div className="stack">
      <div className={s.panelBar}>
        <Select label="Compare with" value={other.id} onChange={onOther} groups={SCALE_GROUPS} />
        <PlayButton playing={player.playing && data?.kind === 'cmp'} onPlay={playBoth} onStop={player.stop} label="Play both" />
        <Button icon="shuffle" onClick={onSwap}>
          Swap
        </Button>
      </div>

      <p className={s.compareSummary}>
        <strong>
          {rootName} {shortName(scale.name)}
        </strong>{' '}
        and{' '}
        <strong>
          {rootName} {shortName(other.name)}
        </strong>{' '}
        share {diff.shared} {diff.shared === 1 ? 'note' : 'notes'}.{' '}
        {diff.onlyA.length + diff.onlyB.length === 0
          ? 'They contain exactly the same pitches.'
          : `${diff.onlyA.length ? `Only in ${shortName(scale.name)}: ${diff.onlyA.join(' ')}.` : ''} ${diff.onlyB.length ? `Only in ${shortName(other.name)}: ${diff.onlyB.join(' ')}.` : ''}`}
      </p>

      <div className={s.compareLayout}>
        <table className={s.compareTable}>
          <caption className="sr-only">Formula comparison by semitones above the root</caption>
          <thead>
            <tr>
              <th scope="col">Semitones</th>
              <th scope="col">{shortName(scale.name)}</th>
              <th scope="col">{shortName(other.name)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = r.a && r.b ? 'shared' : r.a ? 'onlyA' : 'onlyB';
              return (
                <tr key={r.semis} className={status === 'shared' ? '' : status === 'onlyA' ? s.rowOnlyA : s.rowOnlyB}>
                  <td className="tabular">{r.semis}</td>
                  <td>{r.a ? <Cell degree={r.a.degree} note={r.a.note} /> : <span className={s.absent}>none</span>}</td>
                  <td>{r.b ? <Cell degree={r.b.degree} note={r.b.note} /> : <span className={s.absent}>none</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="stack">
          <div className={s.staffCaption}>
            First bar: {rootName} {shortName(scale.name)}. Second bar: {rootName} {shortName(other.name)}, with the notes it does not share in blue.
          </div>
          <Staff
            clef="treble"
            measures={[
              { events: a.map((t) => ({ keys: [t.pitch], duration: 'q', bottom: t.degree })) },
              {
                events: b.map((t) => ({
                  keys: [t.pitch],
                  duration: 'q',
                  bottom: t.degree,
                  color: a.some((x) => x.midi === t.midi) ? undefined : 'extra',
                })),
              },
            ]}
            activeIndex={data?.kind === 'cmp' ? data.index : null}
            ariaLabel={`${rootName} ${scale.name} followed by ${rootName} ${other.name}`}
          />
          {neighbors.length > 0 && (
            <div>
              <div className={s.subhead}>One note away</div>
              <div className={s.neighborList}>
                {neighbors.map((n) => {
                  const d = differenceSummary(root, scale.id, n.id);
                  return (
                    <button key={n.id} className={`${s.neighbor} ${n.id === other.id ? s.neighborActive : ''}`} onClick={() => onOther(n.id)}>
                      <span>{shortName(n.name)}</span>
                      <span className={s.neighborDiff}>
                        {d.onlyA[0]} to {d.onlyB[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ degree, note }: { degree: string; note: Note }) {
  return (
    <span className={s.cell}>
      <span className={s.cellDegree}>{degree}</span>
      <span className={s.cellNote}>{noteName(note)}</span>
    </span>
  );
}
