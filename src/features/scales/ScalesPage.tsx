import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff, type StaffEvent } from '../../components/Staff';
import { Button, Callout, Panel, PageHeader, PlayButton, RootPicker, Segmented, Slider, Stat, Tabs, Tag, Toggle } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useComputerKeyboard } from '../../hooks/useComputerKeyboard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  SCALE_BY_ID,
  TRADITION_BY_ID,
  distinctTranspositions,
  
  getScale,
  hasMicrotones,
  
  
  
  
  
  type ScaleForm,
} from '../../theory/scales';
import { chordIntervals, chordSymbol } from '../../theory/chords';
import { transposePitch } from '../../theory/intervals';
import { midi, mod, note, noteName, pc, pitchAtOrAbove, sameNote, type Note } from '../../theory/notes';
import { bestRootSpelling, formTones, parentRoot, rootFromParam, rootToParam, scaleFromParam, scaleHarmony, scaleTones, type ScaleTone } from './scaleLogic';
import { melody, shortName, type LabelMode, type PlayData, type View } from './shared';
import { traditionOrder } from './browse';
import { ScaleBrowser } from './ScaleBrowser';
import { useUrlParams } from '../../hooks/useUrlState';
import { useDrone } from './useDrone';
import { ModesPanel } from './ModesPanel';
import { HarmonyPanel } from './HarmonyPanel';
import { ComparePanel } from './ComparePanel';
import { FinderPanel } from './FinderPanel';
import { Equivalents, FormulaRow, StepBar, FormList, Legend } from './parts';
import { compareMarks, nameForPc, sameNotesElsewhere, toneLabel } from './marks';
import s from './ScalesPage.module.css';

const PIANO_FROM = 55;
const PIANO_TO = 84;

type Direction = 'up' | 'down' | 'updown';


export default function ScalesPage() {
  const [params, setParams] = useUrlParams({ root: 'C', scale: 'ionian', view: 'modes', cmp: '' });
  const root = rootFromParam(params.root);
  const scale = scaleFromParam(params.scale);
  const view = (['modes', 'harmony', 'compare', 'finder'].includes(params.view) ? params.view : 'modes') as View;

  const [labelMode, setLabelMode] = usePersistentState<LabelMode>('scales.labels', 'degrees');
  const [direction, setDirection] = usePersistentState<Direction>('scales.direction', 'up');
  const [bpm, setBpm] = usePersistentState<number>('scales.bpm', 132);
  const [droneFifth, setDroneFifth] = usePersistentState<boolean>('scales.droneFifth', true);
  const [pinned, setPinned] = usePersistentState<boolean>('scales.pin', true);
  const [drone, setDrone] = useState(false);
  const [kbd, setKbd] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [selectedChord, setSelectedChord] = useState<number | null>(null);
  const [finderPcs, setFinderPcs] = useState<number[]>([]);
  const [sevenths, setSevenths] = usePersistentState<boolean>('scales.sevenths', false);
  const player = usePlayer();
  const narrow = useMediaQuery('(max-width: 640px)');
  const flashTimer = useRef<number | undefined>(undefined);

  const tones = useMemo(() => scaleTones(root, scale.id), [root.letter, root.acc, scale.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const micro = hasMicrotones(scale);
  const tradition = TRADITION_BY_ID[scale.tradition];
  const harmony = useMemo(() => (micro ? [] : scaleHarmony(root, scale.id, sevenths)), [root.letter, root.acc, scale.id, sevenths, micro]); // eslint-disable-line react-hooks/exhaustive-deps
  const rootName = tones[0].name;
  const title = `${rootName} ${scale.name}`;
  const data = (player.playing ? (player.activeData as PlayData | null) : null) ?? null;

  const setRootScale = useCallback(
    (r: Note, id: string) => {
      player.stop();
      setSelectedChord(null);
      setParams({ root: rootToParam(r), scale: id });
    },
    [player, setParams],
  );

  /** Load a scale from the browser: traditions with a customary tonic (maqam, makam, dastgāh) bring it along. */
  const pickScale = (id: string) => setRootScale(getScale(id).tonic ? note(getScale(id).tonic!) : root, id);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // Drone: tonic in the octave F2..E3, so it sits below the keyboard range, at the tonic's exact pitch.
  const droneMidi = 41 + mod(pc(root) - 5, 12) + tones[0].cents / 100;
  useDrone(drone, droneMidi, droneFifth);

  // Computer keyboard: improvise over the drone, or pick notes for the scale finder.
  const finderToggle = useCallback((m: number) => {
    setFinderPcs((prev) => {
      const p = mod(m, 12);
      return prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
    });
  }, []);
  useComputerKeyboard({
    onNoteOn: (m) => {
      audio.noteOn(m);
      setKbd((k) => [...k, m]);
      if (view === 'finder') finderToggle(m);
    },
    onNoteOff: (m) => {
      audio.noteOff(m);
      setKbd((k) => k.filter((x) => x !== m));
    },
  });

  const flashNote = (m: number) => {
    setFlash(m);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 450);
  };

  // Ascending and descending forms where the tradition defines them (aroha and avaroha, maqam descents ...).
  const ascForm = scale.forms?.[0];
  const descForm = scale.forms?.[1];
  const staffIndexOf = (t: ScaleTone) => (t.index === 0 && t.rel >= 1199 ? tones.length - 1 : t.index);
  const playScale = () => {
    const asIdx = (ts: ScaleTone[]) => ts.map((t) => ({ midi: t.play, index: staffIndexOf(t) }));
    const up = asIdx(ascForm ? formTones(root, scale.id, ascForm) : tones);
    const down = descForm ? asIdx(formTones(root, scale.id, descForm)) : [...up].reverse();
    const seq = direction === 'up' ? up : direction === 'down' ? down : [...up, ...down.slice(1)];
    player.play(melody(seq, 'scale'), { bpm });
  };
  const playForm = (form: ScaleForm, i: number) => {
    const ts = formTones(root, scale.id, form);
    player.play(melody(ts.map((t, j) => ({ midi: t.play, index: i, sub: j })), 'form', 0, 1, form.label), { bpm });
  };

  // ---- Piano marks ----
  const scalePcMarks = useMemo(() => {
    const out: Record<number, KeyMark> = {};
    tones.slice(0, -1).forEach((t) => {
      // A ring marks keys that only approximate the pitch (it lies between the keys).
      out[mod(t.midi, 12)] = { role: t.index === 0 ? 'root' : t.characteristic ? 'alt' : 'tone', label: toneLabel(t, labelMode), ring: Math.abs(t.cents) >= 15 };
    });
    return out;
  }, [tones, labelMode]);

  const cmpId = params.cmp && params.cmp !== scale.id && SCALE_BY_ID[params.cmp] ? params.cmp : scale.id === 'ionian' ? 'aeolian' : 'ionian';

  let pcMarks: Record<number, KeyMark> = scalePcMarks;
  let marks: Record<number, KeyMark> | undefined;
  if (view === 'finder') {
    pcMarks = {};
    Object.keys(scalePcMarks).forEach((k) => (pcMarks[Number(k)] = { role: 'muted', ring: true }));
    finderPcs.forEach((p) => (pcMarks[p] = { role: 'other', label: noteName(nameForPc(p, tones)) }));
  } else if (view === 'compare') {
    pcMarks = compareMarks(root, scale.id, cmpId, labelMode);
  } else if (view === 'harmony' && (data?.kind === 'chord' || selectedChord !== null)) {
    const chordPitches = harmony[data?.kind === 'chord' ? data.index : selectedChord!]?.pitches;
    if (chordPitches) {
      marks = {};
      chordPitches.forEach((p, i) => (marks![midi(p)] = { role: 'extra', label: i === 0 ? 'R' : noteName(p) }));
    }
  }

  const pressed = [...(data?.midi ?? []).map(Math.round), ...kbd, ...(flash !== null ? [flash] : [])];

  // ---- Staff ----
  const staffEvents: StaffEvent[] = tones.map((t) => ({
    keys: [t.pitch],
    micro: [t.vex],
    duration: 'q',
    bottom: labelMode === 'none' ? undefined : labelMode === 'names' ? t.name : labelMode === 'intervals' ? t.intervalName : t.degree,
    color: t.characteristic ? 'alt' : undefined,
  }));

  const typicalChord = scale.chordId && tradition.harmonic ? chordSymbol(root, scale.chordId) : null;
  const playTypical = () => {
    if (!scale.chordId) return;
    const base = pitchAtOrAbove(root, 48);
    const ms = chordIntervals(scale.chordId).map((iv) => midi(transposePitch(base, iv)));
    player.stop();
    audio.playChord(ms, 2.2);
  };

  const transpositions = micro ? 12 : distinctTranspositions(scale.id);
  const pr = parentRoot(root, scale.id);
  const order = traditionOrder(scale);
  const scaleIndex = order.findIndex((x) => x.id === scale.id);
  const step = (d: number) => pickScale(order[mod(scaleIndex + d, order.length)].id);
  const equivalents = useMemo(() => (micro ? [] : sameNotesElsewhere(root, scale)), [root.letter, root.acc, scale.id, micro]); // eslint-disable-line react-hooks/exhaustive-deps
  const customaryTonic = scale.tonic ? note(scale.tonic) : null;
  const simpler = tones.some((t) => Math.abs(t.note.acc) > 1) ? bestRootSpelling(pc(root), scale.id) : null;
  const characteristic = tones.filter((t, i) => t.characteristic && i < tones.length - 1);

  const instrumentActions = (
    <>
      <Segmented<LabelMode>
        ariaLabel="Key labels"
        size="sm"
        value={labelMode}
        onChange={setLabelMode}
        options={[
          { value: 'names', label: 'Names' },
          { value: 'degrees', label: 'Degrees' },
          { value: 'intervals', label: 'Intervals' },
          { value: 'none', label: 'None' },
        ]}
      />
      <span className={s.pin} title="Keep the keyboard and staff in view while the panels below scroll">
        <Toggle label="Keep in view" checked={pinned} onChange={setPinned} />
      </span>
    </>
  );

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Pitch & Scale"
        title="Scales & Modes"
        lede="Choose a root and a scale, then play it, hold a drone under it, walk through its modes, compare it with another scale and hear the chords it contains."
      />

      <Panel className={s.controls}>
        <div className={s.controlRow}>
          <div className={s.rootFix}>
            <RootPicker value={root} onChange={(r) => setRootScale(r, scale.id)} />
          </div>
          <div className={s.current}>
            <span className={s.currentPath}>
              {tradition.name} <span aria-hidden="true">›</span> {scale.family}
            </span>
            <span className={s.currentName}>{scale.name}</span>
          </div>
          <div className={s.stepButtons}>
            <Button size="sm" variant="ghost" icon="chevron-left" aria-label={`Previous scale in ${tradition.name}`} onClick={() => step(-1)} />
            <Button size="sm" variant="ghost" icon="chevron-right" aria-label={`Next scale in ${tradition.name}`} onClick={() => step(1)} />
          </div>
        </div>
      </Panel>

      <Panel className={`${s.instrument} ${pinned ? 'dock' : ''}`} title="Keyboard and staff" actions={instrumentActions}>
        <div className={s.instrumentRow}>
          <div className={s.pianoCol}>
            <Piano
              from={narrow && (view === 'modes' || view === 'compare') ? tones[0].midi - 2 : PIANO_FROM}
              to={narrow && (view === 'modes' || view === 'compare') ? tones[tones.length - 1].midi + 2 : PIANO_TO}
              height={narrow ? undefined : 180}
              pcMarks={pcMarks}
              marks={marks}
              pressed={pressed}
              onKeyClick={view === 'finder' ? finderToggle : undefined}
              ariaLabel={`Piano showing ${title}`}
            />
          </div>
          <div className={s.staffCol}>
            <Staff
              clef="treble"
              events={staffEvents}
              activeIndex={data?.kind === 'scale' ? data.index : null}
              onEventClick={(i) => {
                audio.playNote(tones[i].play, 0.9);
                flashNote(tones[i].midi);
              }}
              ariaLabel={`Staff showing ${title} ascending: ${tones.map((t) => t.spoken).join(', ')}`}
            />
          </div>
        </div>
        <div className={s.transport}>
          <PlayButton playing={player.playing && data?.kind === 'scale'} onPlay={playScale} onStop={player.stop} label="Play scale" />
          <Segmented<Direction>
            ariaLabel="Direction"
            size="sm"
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'up', label: scale.tradition === 'hindustani' && ascForm ? 'Aroha' : 'Ascending' },
              { value: 'down', label: scale.tradition === 'hindustani' && descForm ? 'Avaroha' : 'Descending' },
              { value: 'updown', label: 'Up and down' },
            ]}
          />
          <Slider
            label="Tempo"
            min={50}
            max={260}
            step={2}
            value={bpm}
            onChange={(v) => {
              setBpm(v);
              player.setBpm(v);
            }}
            format={(v) => `${v} bpm`}
            width={110}
          />
          <div className={s.droneControls}>
            <Toggle
              label={<strong>Drone on {rootName}</strong>}
              checked={drone}
              onChange={(v) => {
                setDrone(v);
                // The shared computer-keyboard hook ignores keys while an <input> has focus; release it so playing can start at once.
                (document.activeElement as HTMLElement | null)?.blur();
              }}
            />
            <Segmented<string>
              ariaLabel="Drone voicing"
              size="sm"
              value={droneFifth ? 'fifth' : 'tonic'}
              onChange={(v) => setDroneFifth(v === 'fifth')}
              options={[
                { value: 'tonic', label: 'Tonic and octave' },
                { value: 'fifth', label: 'With fifth' },
              ]}
            />
          </div>
          <Legend view={view} micro={micro} />
        </div>
        {drone && (
          <p className={s.droneHint}>
            Play over the drone on the keys or the computer keyboard: <kbd>A</kbd> to <kbd>K</kbd> for white keys, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> for
            black keys, <kbd>Z</kbd> and <kbd>X</kbd> to shift octaves. The characteristic notes are what distinguish the mode.
            {droneFifth && !scale.intervals.includes('P5') && ' This scale has no perfect fifth, so the drone fifth clashes; use the tonic and octave instead.'}
          </p>
        )}
      </Panel>

      <Panel title="Choose a scale" eyebrow="By tradition, family and name, or by search">
        <ScaleBrowser scale={scale} onPick={pickScale} />
      </Panel>

      <section className={s.hero} aria-labelledby="scale-title">
        <div className={s.heroMain}>
          <div className="eyebrow">
            {tradition.name} · {scale.family}
          </div>
          <h2 id="scale-title" className={s.scaleTitle}>
            {title}
          </h2>
          {scale.aliases && scale.aliases.length > 0 && <div className={s.aliases}>Also called {scale.aliases.join(', ')}</div>}
          {scale.mood && (
            <div className={s.tags}>
              {scale.mood.map((m) => (
                <Tag key={m} tone="brass">
                  {m}
                </Tag>
              ))}
            </div>
          )}
          <p className={s.description}>{scale.description}</p>
          <div className={s.facts}>
            <Stat size="sm" label="Notes" value={String(scale.intervals.length)} />
            {scale.facts?.map(([label, value]) => <Stat key={label} size="xs" label={label} value={value} />)}
            {customaryTonic && !sameNote(customaryTonic, root) && (
              <Stat
                size="sm"
                label="Customary tonic"
                value={
                  <button className={s.linkButton} onClick={() => setRootScale(customaryTonic, scale.id)}>
                    Load on {scaleTones(customaryTonic, scale.id)[0].name}
                  </button>
                }
              />
            )}
            {pr && (
              <Stat
                size="sm"
                label="Parent"
                value={
                  <button className={s.linkButton} onClick={() => setRootScale(pr.root, pr.parent.id)}>
                    {noteName(pr.root)} {shortName(pr.parent.name)}, mode {scale.modeOf!.degree}
                  </button>
                }
              />
            )}
            {scale.brightness !== undefined && <Stat size="sm" label="Brightness" value={`${scale.brightness} of 7`} />}
            {typicalChord && (
              <Stat
                size="sm"
                label="Fits over"
                value={
                  <button className={s.linkButton} onClick={playTypical} title="Play the chord">
                    {typicalChord}
                  </button>
                }
              />
            )}
            {transpositions < 12 && <Stat size="sm" label="Distinct transpositions" value={String(transpositions)} />}
          </div>
          {simpler && !sameNote(simpler, root) && (
            <p className={s.note}>
              Spelled on {rootName}, this scale needs double accidentals. The enharmonic{' '}
              <button className={s.linkButton} onClick={() => setRootScale(simpler, scale.id)}>
                {noteName(simpler)} {shortName(scale.name)}
              </button>{' '}
              sounds identical and is easier to read.
            </p>
          )}
          {equivalents.length > 0 && <Equivalents list={equivalents} root={root} onLoad={(id) => setRootScale(root, id)} />}
          {transpositions < 12 && (
            <p className={s.note}>
              This scale is symmetric: transposing it by {transpositions} semitone{transpositions === 1 ? '' : 's'} reproduces the same notes, so only {transpositions} different version
              {transpositions === 1 ? '' : 's'} exist.
            </p>
          )}
        </div>
        <div className={s.heroSide}>
          <FormulaRow tones={tones} showCents={!!scale.cents} />
          <StepBar scale={scale} tones={tones} micro={!!scale.cents} />
          {scale.forms && (
            <FormList
              forms={scale.forms}
              root={root}
              scale={scale}
              onPlay={playForm}
              onStop={player.stop}
              playing={data?.kind === 'form' ? { form: data.index, note: data.sub ?? -1 } : null}
            />
          )}
          {characteristic.length > 0 && (
            <p className={s.note}>
              <span className={s.charDot} aria-hidden="true" /> Characteristic {characteristic.length === 1 ? 'note' : 'notes'}:{' '}
              {characteristic.map((t) => `${t.degree} (${t.name})`).join(', ')}. {characteristic.length === 1 ? 'It sets' : 'These set'} the scale apart
              {tradition.harmonic ? ' from plain major or minor' : ''}.
            </p>
          )}
        </div>
      </section>

      <Panel>
        <Tabs<View>
          ariaLabel="Scale tools"
          value={view}
          onChange={(v) => {
            player.stop();
            setParams({ view: v });
          }}
          tabs={[
            { id: 'modes', label: 'Modes' },
            { id: 'harmony', label: 'Harmony' },
            { id: 'compare', label: 'Compare' },
            { id: 'finder', label: 'Scale finder' },
          ]}
        />
        {view === 'modes' && <ModesPanel root={root} scale={scale} player={player} bpm={bpm} onSelect={setRootScale} />}
        {view === 'harmony' && micro && (
          <Callout title="Chords need equal-tempered pitches">
            {shortName(scale.name)} uses pitches that lie between the piano keys, and its tradition does not build chords from stacked thirds. The keyboard above shows the nearest keys
            with a ring; the Play and drone controls use the exact intonation.
          </Callout>
        )}
        {view === 'harmony' && !micro && !tradition.harmonic && (
          <Callout title="For study only">
            {tradition.name} is melodic music, accompanied by drones rather than chord progressions. These are the chords that stacking the scale's notes in thirds would produce.
          </Callout>
        )}
        {view === 'harmony' && !micro && (
          <HarmonyPanel
            root={root}
            scale={scale}
            player={player}
            selected={selectedChord}
            onSelect={setSelectedChord}
            harmony={harmony}
            sevenths={sevenths}
            onSevenths={setSevenths}
          />
        )}
        {view === 'compare' && (
          <ComparePanel
            root={root}
            scale={scale}
            otherId={cmpId}
            onOther={(id) => setParams({ cmp: id })}
            onSwap={() => setParams({ scale: cmpId, cmp: scale.id })}
            player={player}
            bpm={bpm}
          />
        )}
        {view === 'finder' && micro && (
          <Callout title="Only 12-tone scales can be found from piano keys">
            The finder matches the notes you choose on the keyboard, so it searches the scales whose pitches lie on the keys. {shortName(scale.name)} is not among them.
          </Callout>
        )}
        {view === 'finder' && (
          <FinderPanel
            pcs={finderPcs}
            onChange={setFinderPcs}
            onLoad={(r, id) => setRootScale(r, id)}
            current={{ root, scaleId: scale.id }}
            spellFor={(p) => nameForPc(p, tones)}
          />
        )}
      </Panel>
    </div>
  );
}
