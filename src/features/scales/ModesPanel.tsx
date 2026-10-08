import type { Player } from '../../audio/usePlayer';
import { Button, Callout, Empty, PlayButton, Segmented } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import type { ScaleDef } from '../../theory/scales';
import { noteName, sameNote, type Note } from '../../theory/notes';
import { brightnessLadder, differenceSummary, parallelModes, relativeModes, scaleTones } from './scaleLogic';
import { melody, shortName, type PlayData } from './shared';
import { formulaText } from './browse';
import s from './ScalesPage.module.css';

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

type ModeView = 'relative' | 'parallel';

export function ModesPanel({
  root,
  scale,
  player,
  bpm,
  onSelect,
}: {
  root: Note;
  scale: ScaleDef;
  player: Player;
  bpm: number;
  onSelect: (root: Note, id: string) => void;
}) {
  const [mode, setMode] = usePersistentState<ModeView>('scales.modeView', 'relative');
  const data = player.playing ? (player.activeData as PlayData | null) : null;
  const relatives = relativeModes(root, scale.id);
  const parallels = parallelModes(scale.id);
  const isDiatonic = scale.family === 'Diatonic modes';

  const preview = (r: Note, id: string) => {
    const tag = `${noteName(r, false)}:${id}`;
    if (player.playing && data?.tag === tag) {
      player.stop();
      return;
    }
    const tones = scaleTones(r, id);
    player.play(melody(tones.map((t, i) => ({ midi: t.play, index: i })), 'preview', 0, 0.5, tag), { bpm });
  };
  const isPreviewing = (r: Note, id: string) => data?.kind === 'preview' && data.tag === `${noteName(r, false)}:${id}`;

  return (
    <div className="stack">
      <div className={s.panelBar}>
        <Segmented<ModeView>
          ariaLabel="Mode view"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'relative', label: 'Relative modes' },
            { value: 'parallel', label: 'Parallel modes' },
          ]}
        />
        <span className={s.barHint}>
          {mode === 'relative'
            ? 'Same notes, a different home note. Each mode starts on another degree of the parent scale.'
            : scale.modeOf
              ? 'Same home note, different notes. Each mode alters some degrees above the tonic.'
              : `The other members of the ${scale.family} on the same tonic.`}
        </span>
      </div>

      {mode === 'relative' && (
        <>
          {!scale.modeOf && (
            <Callout title="Rotations">
              {shortName(scale.name)} is not catalogued as a mode of a parent scale, so these are its rotations: the same notes started on each degree, named when the catalog
              knows the result.
            </Callout>
          )}
          <div className={s.modeGrid}>
            {relatives.map((m, i) => {
              const current = sameNote(m.root, root) && (m.scale?.id === scale.id || (!m.scale && i === 0));
              return (
                <div key={i} className={`${s.modeCard} ${current ? s.modeCardActive : ''}`}>
                  <button
                    className={s.modeCardMain}
                    disabled={!m.scale}
                    onClick={() => m.scale && onSelect(m.root, m.scale.id)}
                    aria-label={m.scale ? `Load ${noteName(m.root)} ${m.scale.name}` : undefined}
                  >
                    <span className={s.modeDegree}>
                      {ORDINALS[m.degree - 1] ?? m.degree} {scale.modeOf ? 'mode' : 'rotation'}
                    </span>
                    <span className={s.modeName}>
                      {noteName(m.root)} {m.scale ? shortName(m.scale.name) : 'rotation'}
                    </span>
                    <span className={s.modeFormula}>{m.scale ? formulaText(m.scale) : 'not in the catalog'}</span>
                  </button>
                  {m.scale && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={isPreviewing(m.root, m.scale.id) ? 'stop' : 'play'}
                      aria-label={`Play ${noteName(m.root)} ${m.scale.name}`}
                      onClick={() => preview(m.root, m.scale!.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {mode === 'parallel' && isDiatonic && <Ladder root={root} scale={scale} player={player} bpm={bpm} onSelect={onSelect} />}

      {mode === 'parallel' && !isDiatonic && parallels.length === 0 && (
        <Empty>{shortName(scale.name)} has no family of modes in the catalog. Try the relative view to see its rotations.</Empty>
      )}

      {mode === 'parallel' && !isDiatonic && parallels.length > 0 && (
        <div className={s.modeGrid}>
          {parallels.map((m) => {
            const diff = differenceSummary(root, scale.id, m.id);
            const current = m.id === scale.id;
            return (
              <div key={m.id} className={`${s.modeCard} ${current ? s.modeCardActive : ''}`}>
                <button className={s.modeCardMain} onClick={() => onSelect(root, m.id)} aria-label={`Load ${noteName(root)} ${m.name}`}>
                  <span className={s.modeDegree}>{m.modeOf && scale.modeOf ? `${ORDINALS[m.modeOf.degree - 1]} mode` : m.family}</span>
                  <span className={s.modeName}>
                    {noteName(root)} {shortName(m.name)}
                  </span>
                  <span className={s.modeFormula}>{formulaText(m)}</span>
                  <span className={s.modeDiff}>{current ? 'current scale' : diff.onlyB.length ? `${diff.onlyB.join(' ')} instead of ${diff.onlyA.join(' ')}` : 'same notes'}</span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={isPreviewing(root, m.id) ? 'stop' : 'play'}
                  aria-label={`Play ${noteName(root)} ${m.name}`}
                  onClick={() => preview(root, m.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ladder({ root, scale, player, bpm, onSelect }: { root: Note; scale: ScaleDef; player: Player; bpm: number; onSelect: (root: Note, id: string) => void }) {
  const rungs = brightnessLadder();
  const data = player.playing ? (player.activeData as PlayData | null) : null;
  const ladderPlaying = data?.kind === 'ladder';

  const playLadder = (descending: boolean) => {
    const order = descending ? rungs.map((_, i) => i) : rungs.map((_, i) => rungs.length - 1 - i);
    const events = order.flatMap((ri, k) => {
      const tones = scaleTones(root, rungs[ri].scale.id);
      return melody(
        tones.map((t, j) => ({ midi: t.play, index: ri, sub: j })),
        'ladder',
        k * 5.5,
        0.5,
      );
    });
    player.play(events, { bpm });
  };

  return (
    <div className="stack">
      <div className={s.panelBar}>
        <PlayButton playing={ladderPlaying} onPlay={() => playLadder(true)} onStop={player.stop} label="Descend the ladder" />
        <Button icon="play" onClick={() => playLadder(false)} disabled={ladderPlaying}>
          Climb the ladder
        </Button>
        <span className={s.barHint}>From brightest to darkest, each rung lowers exactly one degree by a half step.</span>
      </div>
      <ol className={s.ladder} aria-label={`Brightness ladder of the diatonic modes on ${noteName(root)}`}>
        {rungs.map((r, i) => {
          const tones = scaleTones(root, r.scale.id).slice(0, -1);
          const active = r.scale.id === scale.id;
          const sounding = ladderPlaying && data?.index === i;
          return (
            <li key={r.scale.id} className={`${s.rung} ${active ? s.rungActive : ''} ${sounding ? s.rungSounding : ''}`}>
              <button className={s.rungMain} onClick={() => onSelect(root, r.scale.id)} aria-label={`Load ${noteName(root)} ${r.scale.name}`}>
                <span className={s.rungMeter} aria-hidden="true">
                  <span style={{ width: `${(r.scale.brightness! / 7) * 100}%` }} />
                </span>
                <span className={s.rungName}>{shortName(r.scale.name)}</span>
                <span className={s.rungChange}>{r.lowered === null ? 'brightest' : `${r.from} lowered to ${r.to}`}</span>
              </button>
              <div className={s.rungDegrees}>
                {tones.map((t, j) => (
                  <span
                    key={j}
                    className={`${s.rungDeg} ${r.lowered === j ? s.rungDegLowered : ''} ${sounding && data?.sub === j ? s.rungDegSounding : ''}`}
                    title={noteName(t.note)}
                  >
                    {t.degree}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon="play"
                aria-label={`Play ${noteName(root)} ${r.scale.name}`}
                onClick={() => {
                  const ts = scaleTones(root, r.scale.id);
                  player.play(melody(ts.map((t, j) => ({ midi: t.play, index: i, sub: j })), 'ladder', 0, 0.5), { bpm });
                }}
              />
            </li>
          );
        })}
      </ol>
      <p className={s.note}>
        Going one rung further down from Locrian would lower the tonic itself, landing on Lydian a half step lower ({noteName({ ...root, acc: root.acc - 1 })} Lydian):
        the cycle of brightness is closed.
      </p>
    </div>
  );
}
