import type { Player } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { Staff } from '../../components/Staff';
import { Callout, Empty, PlayButton, Segmented, Tag, Legend, Chip } from '../../components/ui';
import { scaleIntervals, type ScaleDef } from '../../theory/scales';
import { midi, noteName, pc, type Note } from '../../theory/notes';
import { transpose } from '../../theory/intervals';
import type { ScaleChord } from './scaleLogic';
import { shortName, type PlayData } from './shared';
import s from './ScalesPage.module.css';

export function HarmonyPanel({
  root,
  scale,
  player,
  selected,
  onSelect,
  harmony,
  sevenths,
  onSevenths,
}: {
  root: Note;
  scale: ScaleDef;
  player: Player;
  selected: number | null;
  onSelect: (i: number | null) => void;
  harmony: ScaleChord[];
  sevenths: boolean;
  onSevenths: (v: boolean) => void;
}) {
  const data = player.playing ? (player.activeData as PlayData | null) : null;
  if (harmony.length === 0) {
    return (
      <Empty>
        Diatonic chords stack every other note of a seven-note scale. {shortName(scale.name)} has {scale.intervals.length} notes, so its chords are not built by
        thirds in the usual way.
      </Empty>
    );
  }
  const active = data?.kind === 'chord' ? data.index : selected;
  const charPcs = new Set((scale.characteristic ?? []).map((i) => pc(transpose(root, scaleIntervals(scale)[i]))));

  const playChord = (i: number) => {
    player.stop();
    onSelect(i);
    audio.playChord(harmony[i].pitches.map(midi), 1.8);
  };
  const playAll = () => {
    const events = harmony.map((c, i) => ({
      time: i * 2,
      duration: 1.9,
      midi: c.pitches.map(midi),
      data: { kind: 'chord', index: i, midi: c.pitches.map(midi) } satisfies PlayData,
    }));
    events.push({ ...events[0], time: harmony.length * 2, duration: 3, data: { ...events[0].data } });
    player.play(events, { bpm: 96 });
  };

  return (
    <div className="stack">
      <div className={s.panelBar}>
        <Segmented<string>
          ariaLabel="Chord size"
          value={sevenths ? '7' : '3'}
          onChange={(v) => onSevenths(v === '7')}
          options={[
            { value: '3', label: 'Triads' },
            { value: '7', label: 'Seventh chords' },
          ]}
        />
        <PlayButton playing={player.playing && data?.kind === 'chord'} onPlay={playAll} onStop={player.stop} label="Play all" variant="secondary" />
        <span className={s.barHint}>Click a chord to hear it and see it on the keyboard.</span>
      </div>
      <div className={s.chordChips}>
        {harmony.map((c, i) => {
          const colorful = c.notes.some((n) => charPcs.has(pc(n)));
          return (
            <Chip key={i} tone="royal" active={active === i} className={s.chordChip} onClick={() => playChord(i)} aria-pressed={active === i}>
              <span className={s.chordNumeral}>{c.numeral}</span>
              <span className={s.chordSymbol}>{c.symbol}</span>
              <span className={s.chordNotes}>{c.notes.map((n) => noteName(n)).join(' ')}</span>
              {colorful && <span className={s.chordColorDot} title="Contains a characteristic note" />}
            </Chip>
          );
        })}
      </div>
      <Staff
        clef="treble"
        events={harmony.map((c) => ({ keys: c.pitches, duration: 'w', top: c.symbol.replace(/^≈ /, ''), bottom: c.numeral }))}
        activeIndex={active}
        onEventClick={playChord}
        eventWidth={56}
        ariaLabel={`Diatonic ${sevenths ? 'seventh chords' : 'triads'} of ${noteName(root)} ${scale.name}: ${harmony.map((c) => c.symbol).join(', ')}`}
      />
      <Legend
        items={[{ color: 'var(--hl-alt)', label: "Contains a characteristic note: these chords carry the scale's color.", dot: true }]}
        note={harmony.some((c) => !c.chordId) && <Tag tone="plum">≈ marks stacks with no standard name; the nearest enharmonic chord is shown</Tag>}
      />
      <Callout title="Numerals from the scale's own tonic">
        Roman numerals here count from {noteName(root)}, not from a parent major key. Case shows quality (upper case major, lower case minor, ° diminished, + augmented),
        and an accidental shows a degree that differs from the major scale on the same tonic, so {shortName(scale.name)} reads {harmony.map((c) => c.numeral).join(' ')}.
      </Callout>
    </div>
  );
}
