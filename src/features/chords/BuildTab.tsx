import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { roomPath } from '../../app/routes';
import {
  CHORDS,
  CHORD_CATEGORIES,
  LETTERS,
  VOICING_STYLES,
  buildChord,
  chordQualityClass,
  chordToneLabels,
  figuredBass,
  getChord,
  intervalLongName,
  intervalName,
  inversionName,
  isSeventhChord,
  letterIndex,
  midi,
  noteName,
  pc,
  pitchName,
  stackClose,
  type ChordCategory,
  type Note,
  type VoicingStyle,
} from '../../theory';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { Button, Panel, RootPicker, Segmented, Select, Slider, Tag, Toggle, Chip, Legend } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { usePersistentState } from '../../hooks/usePersistentState';
import {
  chordNeighborhood,
  chordScales,
  chordStack,
  displaySymbol,
  figureText,
  inversionCount,
  toneRole,
  voicingFor,
  type BuildState,
  type Neighbor,
  type NeighborKind,
} from './chordLogic';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import s from './Chords.module.css';

const CATEGORY_LABEL: Record<ChordCategory, string> = {
  Triads: 'Triads',
  'Suspended & power': 'Sus & power',
  Sixths: 'Sixths',
  Sevenths: 'Sevenths',
  Extended: 'Extended',
  'Added tone': 'Added tone',
  'Altered dominants': 'Altered',
  'Quartal & named': 'Quartal & named',
  'Augmented sixths': 'Aug. sixths',
};

const ROLE_NAME: Record<ReturnType<typeof toneRole>, string> = {
  root: 'Root',
  tone: 'Chord tone',
  extra: 'Extension',
  alt: 'Altered tone',
};

const ORDINALS = ['Root', '1st', '2nd', '3rd', '4th', '5th', '6th'];

export function BuildTab({ state, onChange }: { state: BuildState; onChange: (patch: Partial<BuildState>) => void }) {
  const { root, chordId, voicing, oct } = state;
  const def = getChord(chordId);
  const player = usePlayer();
  const narrow = useMediaQuery('(max-width: 640px)');
  const [playOnChange, setPlayOnChange] = usePersistentState('chords:playOnChange', true);
  const [browseCat, setBrowseCat] = useState<ChordCategory | null>(null);
  const [showAllScales, setShowAllScales] = useState(false);
  const category = browseCat ?? def.category;

  const tones = useMemo(() => buildChord(root, chordId), [root, chordId]);
  const labels = useMemo(() => chordToneLabels(chordId), [chordId]);
  const invCount = inversionCount(chordId, voicing);
  const inv = Math.min(state.inv, invCount - 1);
  const pitches = useMemo(() => voicingFor({ ...state, inv }), [state, inv]);
  const midis = pitches.map(midi);
  const labelOf = (p: Note) => labels[tones.findIndex((t) => pc(t) === pc(p))] ?? '';
  const bassPitch = pitches[0];
  const rootless = voicing === 'rootless' && tones.length > 3;
  const slashBass = !rootless && bassPitch && pc(bassPitch) !== pc(root) ? bassPitch : null;
  const symbol = displaySymbol(root, chordId, slashBass);
  const triadOrSeventh = tones.length === 3 || isSeventhChord(chordId);
  // The inversion actually heard depends on the bass of the final voicing (drop voicings can move it).
  const actualInv = Math.max(0, tones.findIndex((t) => bassPitch && pc(t) === pc(bassPitch)));
  const fig = triadOrSeventh && !rootless && voicing !== 'shell' ? figuredBass(actualInv, isSeventhChord(chordId)) : '';
  const stack = useMemo(() => chordStack(root, chordId), [root, chordId]);
  const hood = useMemo(() => chordNeighborhood(root, chordId), [root, chordId]);
  const scales = useMemo(() => chordScales(root, chordId), [root, chordId]);
  const voicingDef = VOICING_STYLES.find((v) => v.id === voicing)!;

  // ---- Playback ----
  const playMidis = (ms: number[]) => {
    player.stop();
    audio.playChord(ms, 1.8);
  };
  const go = (patch: Partial<BuildState>) => {
    onChange(patch);
    if (playOnChange) {
      const next = { ...state, ...patch };
      next.inv = Math.min(next.inv, inversionCount(next.chordId, next.voicing) - 1);
      playMidis(voicingFor(next).map(midi));
    }
  };
  const playBlock = () => player.play([{ time: 0, duration: 3, midi: midis, data: -1 }], { bpm: 60 });
  const playStrum = () => player.play([{ time: 0, duration: 3, midi: midis, strum: 0.06, data: -1 }], { bpm: 60 });
  const playArp = (dir: 'up' | 'down') => {
    const seq = dir === 'up' ? midis : [...midis].reverse();
    player.play(
      seq.map((m, i) => ({ time: i * 0.5, duration: (seq.length - i) * 0.5 + 1, midi: [m], data: m })),
      { bpm: 110 },
    );
  };
  const playScale = (notes: Note[]) => {
    const asc = stackClose([...notes, notes[0]], (oct + 1) * 12 + (oct < 3 ? 12 : 0)).map(midi);
    player.play(
      asc.map((m, i) => ({ time: i * 0.5, duration: 0.48, midi: [m], data: m })),
      { bpm: 132 },
    );
  };

  const active = player.playing ? (player.activeData === -1 ? midis : typeof player.activeData === 'number' ? [player.activeData] : []) : [];

  // ---- Piano marks and range ----
  const marks: Record<number, KeyMark> = {};
  pitches.forEach((p) => {
    const lab = labelOf(p);
    marks[midi(p)] = { role: toneRole(lab), label: lab };
  });
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const from = narrow ? Math.floor(lo / 12) * 12 : Math.min(48, Math.floor(lo / 12) * 12);
  const to = narrow ? Math.max(from + 24, Math.ceil((hi + 1) / 12) * 12) : Math.max(from + 36, Math.ceil((hi + 1) / 12) * 12, 84);

  // ---- Letter ladder (thirds skip a letter) ----
  const rootLetter = letterIndex(root.letter);
  const span = Math.max(...stack.tones.map((t) => t.interval.num));
  const ladderLen = Math.max(8, span);
  const ladder = Array.from({ length: ladderLen }, (_, i) => {
    const letter = LETTERS[(rootLetter + i) % 7];
    const hit = stack.tones.find((t) => t.interval.num === i + 1);
    return { letter, hit };
  });

  const neighborGroups: Array<{ kind: NeighborKind; title: string; glyph: string; empty: string }> = [
    { kind: 'add', title: 'Add a note', glyph: '+', empty: 'No catalog chord adds one note to this one.' },
    { kind: 'remove', title: 'Remove a note', glyph: '−', empty: 'No catalog chord is this one minus a note.' },
    { kind: 'move', title: 'Move one note a semitone', glyph: '↕', empty: 'Nothing in the catalog is one semitone away.' },
    { kind: 'same', title: 'Same notes, new name', glyph: '=', empty: 'No other catalog chord has exactly these notes.' },
  ];

  const openNeighbor = (n: Neighbor) => {
    setBrowseCat(null);
    go({ root: n.root, chordId: n.chordId, inv: 0 });
  };

  const visibleScales = showAllScales ? scales : scales.slice(0, 8);

  return (
    <div className="stack">
      <Panel title="Choose a chord" eyebrow="Root and type">
        <div className={s.chooser}>
          <div className={s.rootWrap}>
            <RootPicker value={root} onChange={(n) => go({ root: n })} />
          </div>
          <div className={s.typePicker}>
            <Segmented
              size="sm"
              ariaLabel="Chord category"
              options={CHORD_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
              value={category}
              onChange={(c) => setBrowseCat(c)}
            />
            <div className={s.chips} role="radiogroup" aria-label={`${category} chords`}>
              {CHORDS.filter((c) => c.category === category).map((c) => (
                <Chip key={c.id} role="radio" aria-checked={c.id === chordId} active={c.id === chordId} className={s.chip} onClick={() => go({ chordId: c.id, inv: 0 })} title={c.description ?? c.name}>
                  <span className={s.chipSymbol}>{displaySymbol(root, c.id)}</span>
                  <span className={s.chipName}>{c.name}</span>
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className={s.stage}>
        <div className={s.stageHead}>
          <div className={s.titleBlock}>
            <div className="eyebrow">{def.category}</div>
            <div className={s.bigSymbol}>{symbol}</div>
            <div className={s.chordName}>
              {noteName(root)} {def.name.toLowerCase()}
              {rootless && <span className="faint"> (root omitted)</span>}
            </div>
            <div className={s.tags}>
              <Tag tone="brass">{tones.length} notes</Tag>
              <Tag>{chordQualityClass(chordId)}</Tag>
              {voicing !== 'shell' && !rootless && <Tag tone="royal">{inversionName(actualInv)}</Tag>}
              {fig && <Tag tone="verdigris">figured bass {figureText(fig)}</Tag>}
              {def.noIdentify && <Tag tone="plum">context dependent</Tag>}
            </div>
          </div>
          <div className={s.playCol}>
            <div className={s.playRow}>
              <Button variant="primary" icon={player.playing ? 'stop' : 'play'} onClick={player.playing ? player.stop : playBlock}>
                {player.playing ? 'Stop' : 'Play'}
              </Button>
              <Button onClick={() => playArp('up')} title="Arpeggio, low to high">
                Arpeggio ↑
              </Button>
              <Button onClick={() => playArp('down')} title="Arpeggio, high to low">
                Arpeggio ↓
              </Button>
              <Button onClick={playStrum} title="Quick roll from the bass up">
                Strum
              </Button>
            </div>
            <Toggle label="Play when the chord changes" checked={playOnChange} onChange={setPlayOnChange} />
          </div>
        </div>

        <div className={s.voiceControls}>
          {invCount > 1 && (
            <div className={s.control}>
              <span className={s.controlLabel}>Inversion</span>
              <Segmented
                size="sm"
                ariaLabel="Inversion"
                value={inv}
                onChange={(v) => go({ inv: v })}
                options={Array.from({ length: invCount }, (_, i) => {
                  const toneIdx = rootless ? i + 1 : i;
                  return { value: i, label: ORDINALS[i] ?? `${i}th`, title: `${noteName(tones[toneIdx])} (${labels[toneIdx]}) in the bass` };
                })}
              />
            </div>
          )}
          <Select
            label="Voicing"
            value={voicing}
            onChange={(v) => go({ voicing: v as VoicingStyle })}
            options={VOICING_STYLES.map((v) => ({ value: v.id, label: v.name }))}
          />
          <Slider label="Register" min={1} max={5} value={oct} onChange={(v) => go({ oct: v })} format={(v) => `from C${v}`} width={110} />
        </div>
        <p className={s.voicingNote}>
          <strong>{voicingDef.name}.</strong> {voicingDef.description}
          {!rootless && voicing !== 'shell' && actualInv !== inv && (
            <>
              {' '}
              Here the drop moves {noteName(tones[actualInv])} into the bass, so the chord sounds in {inversionName(actualInv).toLowerCase()}.
            </>
          )}
        </p>

        <div className={s.stageGrid}>
          <div className={s.staffBox}>
            <Staff
              clef="auto"
              events={[{ keys: pitches, duration: 'w', top: symbol, bottom: fig ? figureText(fig) : undefined }]}
              eventWidth={70}
              ariaLabel={`${symbol}: ${pitches.map((p) => pitchName(p)).join(', ')}`}
            />
            <div className={s.staffCaption}>
              {pitches
                .slice()
                .reverse()
                .map((p) => pitchName(p))
                .join('  ')}
            </div>
          </div>
          <div className={s.describe}>
            <p className={s.description}>{def.description ?? `${def.name}: ${labels.join(', ')}.`}</p>
            <table className={s.toneTable}>
              <thead>
                <tr>
                  <th scope="col">Tone</th>
                  <th scope="col">Note</th>
                  <th scope="col">Above the root</th>
                  <th scope="col" className={s.num}>
                    Semitones
                  </th>
                </tr>
              </thead>
              <tbody>
                {stack.tones.map((t) => (
                  <tr key={t.label}>
                    <td>
                      <button
                        type="button"
                        className={`${s.toneDot} ${s[`role-${toneRole(t.label)}`]}`}
                        onClick={() => {
                          const p = pitches.find((x) => pc(x) === pc(t.note));
                          audio.playNote(p ? midi(p) : 60 + pc(t.note), 1);
                        }}
                        aria-label={`Play ${noteName(t.note)}`}
                        title={ROLE_NAME[toneRole(t.label)]}
                      >
                        {t.label}
                      </button>
                    </td>
                    <td className={s.noteCell}>{noteName(t.note)}</td>
                    <td>
                      {t.interval.num === 1 ? 'root' : intervalLongName(t.interval)}
                      {t.interval.num > 1 && <span className="faint"> ({intervalName(t.interval)})</span>}
                    </td>
                    <td className={s.num}>{t.interval.semis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Piano from={from} to={to} marks={marks} pressed={active} ariaLabel={`Piano showing ${symbol}`} />
        <Legend className={s.pianoLegend} items={(['root', 'tone', 'extra', 'alt'] as const).map((r) => ({ color: `var(--hl-${r})`, label: ROLE_NAME[r], dot: true }))} />
      </Panel>

      <div className="grid-2">
        <Panel title="How it is built" eyebrow="Interval stack">
          <div className={s.anatomy}>
            <ol className={s.tower} aria-label="Chord tones from the bottom up with the intervals between them">
              {stack.tones
                .map((t, i) => ({ t, i }))
                .reverse()
                .map(({ t, i }) => (
                  <li key={t.label} className={s.towerItem}>
                    <div className={`${s.plaque} ${s[`role-${toneRole(t.label)}`]}`}>
                      <span className={s.plaqueLabel}>{t.label}</span>
                      <span className={s.plaqueNote}>{noteName(t.note)}</span>
                    </div>
                    {i > 0 && (
                      <div className={`${s.step} ${stack.steps[i - 1].isThird ? s.stepThird : s.stepOther}`} title={stack.steps[i - 1].longName}>
                        <span className={s.stepName}>{stack.steps[i - 1].name}</span>
                        <span className={s.stepLong}>{stack.steps[i - 1].longName}</span>
                      </div>
                    )}
                  </li>
                ))}
            </ol>
            <div className={s.anatomyText}>
              <p>
                {stack.steps.every((x) => x.isThird)
                  ? 'Every step is a third: a pure tertian chord, built by skipping every other letter.'
                  : stack.steps.some((x) => x.isThird)
                    ? 'Mostly thirds, with other intervals (shown in plum) where a tone is added, suspended or skipped.'
                    : 'Not built from thirds at all: the stack uses other intervals throughout.'}
              </p>
              <div className={s.ladder} aria-label="Letter names from the root; chord tones highlighted">
                {ladder.map((c, i) => (
                  <span key={i} className={`${s.rung} ${c.hit ? s.rungHit : ''}`} title={c.hit ? `${c.hit.label}: ${noteName(c.hit.note)}` : undefined}>
                    <span className={s.rungLetter}>{c.hit ? noteName(c.hit.note) : c.letter}</span>
                    <span className={s.rungNum}>{i + 1}</span>
                  </span>
                ))}
              </div>
              <p className="faint" style={{ fontSize: '0.85rem', margin: 0 }}>
                Letters above the root, numbered by scale step. Chord tones are lit.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Scales that fit" eyebrow="Chord scales">
          {scales.length === 0 ? (
            <p className="muted">No catalog scale on {noteName(root)} contains every note of this chord.</p>
          ) : (
            <>
              <p className={s.small}>
                Scales on {noteName(root)} containing every chord tone. <strong>Bold</strong> notes are chord tones; faded notes sit a half step above a
                chord tone (traditional avoid notes).
              </p>
              <ul className={s.scaleList}>
                {visibleScales.map((sc) => (
                  <li key={sc.scale.id} className={s.scaleItem}>
                    <div className={s.scaleHead}>
                      <span className={s.scaleName}>
                        {noteName(root)} {sc.scale.name}
                      </span>
                      {sc.primary && <Tag tone="accent">classic pairing</Tag>}
                      <Tag>{sc.scale.family}</Tag>
                    </div>
                    <div className={s.scaleRow}>
                      <span className={s.scaleNotes}>
                        {sc.notes.map((n, i) => (
                          <span key={i} className={s[`sn-${sc.roles[i]}`]} title={sc.roles[i] === 'avoid' ? 'Avoid note' : sc.roles[i] === 'chord' ? 'Chord tone' : 'Tension'}>
                            {noteName(n)}
                          </span>
                        ))}
                      </span>
                      <span className={s.scaleActions}>
                        <Button size="sm" variant="ghost" icon="play" aria-label={`Play ${noteName(root)} ${sc.scale.name}`} onClick={() => playScale(sc.notes)} />
                        <Link
                          className={s.scaleLink}
                          to={{ pathname: roomPath('/scales'), search: `?${new URLSearchParams({ root: noteName(root, false), scale: sc.scale.id })}` }}
                          title="Open in Scales & Modes"
                        >
                          Open
                        </Link>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {scales.length > 8 && (
                <Button size="sm" variant="ghost" onClick={() => setShowAllScales((v) => !v)}>
                  {showAllScales ? 'Show fewer' : `Show all ${scales.length}`}
                </Button>
              )}
            </>
          )}
        </Panel>
      </div>

      <Panel title="Related chords" eyebrow="One note added, removed or moved">
        <p className={s.small}>
          Every chord one small step from <strong>{displaySymbol(root, chordId)}</strong>. Click one to open it.
        </p>
        <div className={s.hood}>
          {neighborGroups.map((g) => (
            <section key={g.kind} className={s.hoodGroup} aria-label={g.title}>
              <h3 className={s.hoodTitle}>
                <span className={s.hoodGlyph} aria-hidden="true">
                  {g.glyph}
                </span>
                {g.title}
              </h3>
              {hood[g.kind].length === 0 ? (
                <p className={s.hoodEmpty}>{g.empty}</p>
              ) : (
                <div className={s.hoodChips}>
                  {hood[g.kind].map((n) => (
                    <button
                      key={`${n.symbol}-${n.chordId}`}
                      type="button"
                      className={s.hoodChip}
                      onClick={() => openNeighbor(n)}
                      title={n.aka.length ? `Same notes as ${n.aka.join(', ')}` : getChord(n.chordId).name}
                    >
                      <span className={s.hoodSymbol}>{n.symbol}</span>
                      <span className={s.hoodDetail}>{n.detail}</span>
                      {n.aka.length > 0 && <span className={s.hoodAka}>= {n.aka.join(', ')}</span>}
                      {n.kind === 'same' && n.sameSpelling === false && <span className={s.hoodAka}>enharmonic respelling</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}
