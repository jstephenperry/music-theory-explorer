import { useMemo, useState } from 'react';
import {
  analyzeChord,
  chordQualityClass,
  chordSymbol,
  closelyRelatedKeys,
  diatonicChords,
  dominantKey,
  formatRoman,
  keyName,
  keyNotes,
  keySignature,
  keySignatureFifths,
  makeKey,
  midi,
  noteName,
  parallelKey,
  parseRoman,
  pitchAtOrAbove,
  pitchName,
  relativeKey,
  stackClose,
  subdominantKey,
  tryNote,
  voiceChord,
  voiceProgression,
  type Key,
  type KeyMode,
} from '../../theory';
import { Staff } from '../../components/Staff';
import { PageHeader, Panel, PlayButton, Segmented, Slider, Stat, Toggle, Legend } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { chordEvents } from '../../audio/sequencer';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlParams } from '../../hooks/useUrlState';
import { CircleWheel } from './CircleWheel';
import {
  FLAT_MNEMONIC,
  SHARP_MNEMONIC,
  circleWalkChords,
  signatureLabel,
  signatureWords,
  slotKeys,
  slotOfKey,
  slotOfMajorRoot,
  slotOfMinorRoot,
  type Orientation,
} from './circle';
import s from './Circle.module.css';

type Ring = 'major' | 'minor';
type SeqKind = 'scale' | 'cadence' | 'walk';
interface ChordData {
  slot: number;
  ring: Ring;
  index: number;
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function ringOf(chordId: string): Ring {
  const q = chordQualityClass(chordId);
  return q === 'major' || q === 'augmented' ? 'major' : 'minor';
}

function placeOf(root: Parameters<typeof slotOfMajorRoot>[0], chordId: string): { slot: number; ring: Ring } {
  const ring = ringOf(chordId);
  return { slot: ring === 'major' ? slotOfMajorRoot(root) : slotOfMinorRoot(root), ring };
}

export default function CirclePage() {
  const [q, update] = useUrlParams({ key: 'C', mode: 'major' });
  const mode: KeyMode = q.mode === 'minor' ? 'minor' : 'major';
  const tonic = tryNote(q.key) ?? { letter: 'C' as const, acc: 0 };
  let key: Key = makeKey(tonic, mode);
  if (Math.abs(keySignatureFifths(key)) > 7) key = makeKey('C', mode);

  const [orientation, setOrientation] = usePersistentState<Orientation>('circle:orientation', 'fifths');
  const [rotateTop, setRotateTop] = usePersistentState('circle:rotate', false);
  const [showFunctions, setShowFunctions] = usePersistentState('circle:functions', true);
  const [showModes, setShowModes] = usePersistentState('circle:modes', false);
  const [showParallel, setShowParallel] = usePersistentState('circle:parallel', false);
  const [sevenths, setSevenths] = usePersistentState('circle:sevenths', false);
  const [minorVariant, setMinorVariant] = usePersistentState<'natural' | 'harmonic'>('circle:minorVariant', 'natural');
  const [walkBpm, setWalkBpm] = usePersistentState('circle:walkBpm', 96);
  const [picked, setPicked] = useState<{ slot: number; ring: Ring } | null>(null);
  const [seqKind, setSeqKind] = useState<SeqKind | null>(null);
  const player = usePlayer();

  const select = (k: Key) => {
    setPicked(null);
    update({ key: noteName(k.tonic, false), mode: k.mode });
  };

  const rel = relativeKey(key);
  const par = parallelKey(key);
  const sig = keySignature(key);
  const fifths = sig.fifths;
  const slotPair = slotKeys(slotOfKey(key), key.mode);

  // ---- Scale ----
  const scaleNotes = keyNotes(key);
  const scalePitches = stackClose([...scaleNotes, key.tonic], midi(pitchAtOrAbove(key.tonic, 60)));
  const playScale = () => {
    const ms = scalePitches.map(midi);
    const seq = [...ms, ...ms.slice(0, -1).reverse()];
    setSeqKind('scale');
    player.play(
      seq.map((m, i) => ({ time: i * 0.5, duration: 0.48, midi: [m], data: i < ms.length ? i : seq.length - 1 - i })),
      { bpm: 120 },
    );
  };

  // ---- Diatonic chords ----
  const diatonic = useMemo(
    () =>
      diatonicChords(key, sevenths, key.mode === 'minor' ? minorVariant : 'natural').map((c) => {
        let numeral = '';
        try {
          numeral = formatRoman(analyzeChord(c.root, c.chordId, key));
        } catch {
          numeral = String(c.degree);
        }
        return { ...c, numeral, symbol: chordSymbol(c.root, c.chordId), place: placeOf(c.root, c.chordId) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key.tonic.letter, key.tonic.acc, key.mode, sevenths, minorVariant],
  );

  // ---- I IV V I ----
  const cadenceRomans = key.mode === 'major' ? ['I', 'IV', 'V', 'I'] : ['i', 'iv', 'V', 'i'];
  const playCadence = () => {
    const chords = cadenceRomans.map((r) => parseRoman(r, key));
    const voiced = voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass })));
    const events = chordEvents(voiced.map((v) => v.map(midi)), 2).map((e, i) => ({
      ...e,
      data: { ...placeOf(chords[i].root, chords[i].chordId), index: i } satisfies ChordData,
    }));
    setSeqKind('cadence');
    player.play(events, { bpm: 92 });
  };

  // ---- Walk the circle ----
  const walk = useMemo(() => {
    const chain = circleWalkChords(key.tonic, key.mode === 'minor' ? 'min' : 'maj');
    const voiced = voiceProgression(chain.map((c) => ({ notes: c.notes, bass: c.root })));
    return chain.map((c, i) => ({ ...c, voiced: voiced[i], symbol: chordSymbol(c.root, c.chordId), slot: slotOfMajorRoot(c.root) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key.tonic.letter, key.tonic.acc, key.mode]);
  const playWalk = () => {
    const events = chordEvents(walk.map((w) => w.voiced.map(midi)), 2).map((e, i) => ({
      ...e,
      data: { ...placeOf(walk[i].root, walk[i].chordId), index: i } satisfies ChordData,
    }));
    setSeqKind('walk');
    player.play(events, { bpm: walkBpm });
  };

  const active = player.playing ? player.activeData : null;
  const chordActive = active && typeof active === 'object' ? (active as ChordData) : null;
  const scaleActive = player.playing && seqKind === 'scale' && typeof active === 'number' ? active : null;
  const walkIndex = player.playing && seqKind === 'walk' && chordActive ? chordActive.index : null;
  const cadenceIndex = player.playing && seqKind === 'cadence' && chordActive ? chordActive.index : null;
  const pointer = chordActive ? { slot: chordActive.slot, ring: chordActive.ring } : picked;

  let centerTitle = noteName(key.tonic) + (key.mode === 'minor' ? 'm' : '');
  let centerSub = `${key.mode} · ${signatureLabel(fifths)}`;
  let centerNote: string | undefined = `relative ${noteName(rel.tonic)}${rel.mode === 'minor' ? 'm' : ''}`;
  if (walkIndex !== null) {
    const w = walk[walkIndex];
    centerTitle = w.symbol;
    const next = walk[walkIndex + 1];
    centerSub = next ? `leads to ${next.symbol}` : 'home';
    centerNote = `${walkIndex + 1} of ${walk.length}`;
  } else if (cadenceIndex !== null) {
    const r = parseRoman(cadenceRomans[cadenceIndex], key);
    centerTitle = r.symbol;
    centerSub = formatRoman(cadenceRomans[cadenceIndex]);
    centerNote = undefined;
  }

  const related = closelyRelatedKeys(key);
  const orderLetters = fifths >= 0 ? SHARP_ORDER : FLAT_ORDER;
  const accSymbol = fifths >= 0 ? '♯' : '♭';
  const parentMajor = key.mode === 'major' ? key : rel;

  return (
    <>
      <PageHeader
        eyebrow="Pitch & Scale"
        title="Circle of Fifths"
        lede="Every key arranged by its signature. Neighbors share all but one note, so the circle maps how far apart keys are, which chords belong together and where modulations lead."
      />

      <div className={s.layout}>
        <Panel className={s.wheelPanel}>
          <div className={s.wheelControls}>
            <Segmented
              size="sm"
              ariaLabel="Direction"
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: 'fifths', label: 'Fifths clockwise', title: 'Each step clockwise rises a perfect fifth' },
                { value: 'fourths', label: 'Fourths clockwise', title: 'Each step clockwise rises a perfect fourth' },
              ]}
            />
            <Toggle label="Selected key on top" checked={rotateTop} onChange={setRotateTop} />
          </div>
          <div className={s.overlays} role="group" aria-label="Overlays">
            <span className={s.overlayLabel}>Show</span>
            <Toggle label="Chord functions" checked={showFunctions} onChange={setShowFunctions} />
            <Toggle label="Modes" checked={showModes} onChange={setShowModes} />
            <Toggle label="Parallel key" checked={showParallel} onChange={setShowParallel} />
          </div>
          <div className={s.wheelWrap}>
            <CircleWheel
              selected={key}
              orientation={orientation}
              rotateToTop={rotateTop}
              showFunctions={showFunctions}
              showModes={showModes}
              showParallel={showParallel}
              pointer={pointer}
              handSlot={pointer ? pointer.slot : undefined}
              centerTitle={centerTitle}
              centerSub={centerSub}
              centerNote={centerNote}
              onSelect={select}
            />
          </div>
          <Legend
            center
            items={[
              { color: 'var(--accent)', label: 'Selected' },
              { color: 'var(--accent-soft)', label: 'Relative' },
              { color: 'var(--brass-soft)', label: 'Closely related' },
              ...(showParallel ? [{ color: 'var(--plum-soft)', label: 'Parallel' }] : []),
              { color: 'var(--verdigris-soft)', label: 'Sounding chord' },
            ]}
          />
          {slotPair.length > 1 && (
            <div className={s.enharmonic}>
              <span className={s.overlayLabel}>Enharmonic spelling</span>
              <Segmented
                size="sm"
                ariaLabel="Enharmonic spelling"
                value={noteName(key.tonic, false)}
                onChange={(v) => select(slotPair.find((k) => noteName(k.tonic, false) === v)!)}
                options={slotPair.map((k) => ({ value: noteName(k.tonic, false), label: `${keyName(k)} (${signatureLabel(keySignatureFifths(k))})` }))}
              />
            </div>
          )}
        </Panel>

        <div className={s.side}>
          <Panel eyebrow={key.mode === 'major' ? 'Major key' : 'Minor key'} title={keyName(key)}>
            <div className={s.stats}>
              <Stat label="Signature" value={signatureLabel(fifths)} title={signatureWords(key)} />
              <Stat label="Relative" value={<KeyLink k={rel} onSelect={select} />} />
              <Stat label="Parallel" value={<KeyLink k={par} onSelect={select} />} />
              <Stat label="Dominant" value={<KeyLink k={dominantKey(key)} onSelect={select} />} />
              <Stat label="Subdominant" value={<KeyLink k={subdominantKey(key)} onSelect={select} />} />
            </div>
            <div className={s.order}>
              <div className={s.overlayLabel}>Order of {fifths >= 0 ? 'sharps' : 'flats'}</div>
              <div className={s.orderRow}>
                {orderLetters.map((l, i) => (
                  <span key={l} className={`${s.orderCell} ${i < Math.abs(fifths) ? s.orderOn : ''}`}>
                    {l}
                    {accSymbol}
                  </span>
                ))}
              </div>
              <div className={s.mnemonic}>{fifths >= 0 ? SHARP_MNEMONIC : FLAT_MNEMONIC}</div>
              <p className={s.note}>
                {fifths === 0
                  ? `${keyName(key)} uses only natural notes.`
                  : `${keyName(key)} has ${signatureWords(key)}: ${sig.accidentals.map((n) => noteName(n)).join(' ')}.`}{' '}
                {fifths > 0 && key.mode === 'major' && 'The last sharp is the leading tone, a half step below the tonic.'}
                {fifths < -1 && key.mode === 'major' && 'The second-to-last flat names the key.'}
              </p>
            </div>
            <div className={s.overlayLabel}>Closely related keys</div>
            <div className={s.relatedList}>
              {related.map((r) => (
                <button key={keyName(r.key)} type="button" className={s.relatedChip} onClick={() => select(r.key)}>
                  <span className={s.relatedKey}>{keyName(r.key)}</span>
                  <span className={s.relatedRel}>{r.relation}</span>
                </button>
              ))}
            </div>
            <div className={s.playRow}>
              <PlayButton playing={player.playing && seqKind === 'scale'} onPlay={playScale} onStop={player.stop} label="Play scale" />
              <PlayButton
                playing={player.playing && seqKind === 'cadence'}
                onPlay={playCadence}
                onStop={player.stop}
                label={`Play ${cadenceRomans.join(' ')}`}
                variant="secondary"
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className={s.lower}>
        <Panel eyebrow="Notation" title="Key signature and scale">
          <Staff
            clef="treble"
            keySig={key}
            events={scalePitches.map((p, i) => ({ keys: [p], duration: 'q', bottom: String(i + 1) }))}
            activeIndex={scaleActive}
            onEventClick={(i) => audio.playNote(midi(scalePitches[i]), 0.8)}
            ariaLabel={`${keyName(key)} scale with its key signature: ${scalePitches.map((p) => pitchName(p)).join(', ')}`}
          />
          <p className={s.note}>
            {key.mode === 'minor'
              ? `Natural minor shown. The key signature is shared with ${keyName(rel)}; minor-key music usually raises the seventh degree with an accidental.`
              : 'Click a note to hear it. Turn on the Modes overlay to see where each mode of this scale begins on the circle.'}
          </p>
        </Panel>

        <Panel
          eyebrow="Harmony"
          title="Diatonic chords"
          actions={
            <>
              <Segmented
                size="sm"
                ariaLabel="Chord size"
                value={sevenths ? 'sevenths' : 'triads'}
                onChange={(v) => setSevenths(v === 'sevenths')}
                options={[
                  { value: 'triads', label: 'Triads' },
                  { value: 'sevenths', label: 'Sevenths' },
                ]}
              />
              {key.mode === 'minor' && (
                <Segmented
                  size="sm"
                  ariaLabel="Minor scale"
                  value={minorVariant}
                  onChange={setMinorVariant}
                  options={[
                    { value: 'natural', label: 'Natural' },
                    { value: 'harmonic', label: 'Harmonic' },
                  ]}
                />
              )}
            </>
          }
        >
          <div className={s.chordRow}>
            {diatonic.map((c) => {
              const on = pointer && pointer.slot === c.place.slot && pointer.ring === c.place.ring;
              return (
                <button
                  key={c.degree}
                  type="button"
                  className={`${s.chordChip} ${on ? s.chordChipOn : ''}`}
                  onClick={() => {
                    player.stop();
                    setPicked(c.place);
                    audio.playChord(voiceChord(c.notes, { low: 52 }).map(midi), 1.8);
                  }}
                  title={`${c.symbol}: ${c.notes.map((n) => noteName(n)).join(' ')}`}
                >
                  <span className={s.chordNumeral}>{c.numeral}</span>
                  <span className={s.chordSymbol}>{c.symbol}</span>
                </button>
              );
            })}
          </div>
          <p className={s.note}>
            Click a chord to hear it and see where it lives on the circle. The six consonant triads of {keyName(parentMajor)} and its relative fill the framed wedge;
            the diminished triad sits just outside it.
          </p>
        </Panel>
      </div>

      <Panel
        eyebrow="Cycle of fifths"
        title="Walk the circle"
        actions={
          <>
            <Slider
              label="Tempo"
              min={50}
              max={160}
              value={walkBpm}
              onChange={(v) => {
                setWalkBpm(v);
                player.setBpm(v);
              }}
              format={(v) => `${v} bpm`}
              width={110}
            />
            <PlayButton playing={player.playing && seqKind === 'walk'} onPlay={playWalk} onStop={player.stop} label="Walk the circle" />
          </>
        }
      >
        <p className={s.note} style={{ marginTop: 0 }}>
          Twelve dominant seventh chords, each resolving down a fifth to the next, all the way around and home to {keyName(key)}. Watch the index travel
          counterclockwise and listen to the voices move by step: each chord&apos;s third falls a half step to become the next chord&apos;s seventh.
        </p>
        <div className={s.walkChips}>
          {walk.map((w, i) => (
            <button
              key={i}
              type="button"
              className={`${s.walkChip} ${walkIndex === i ? s.walkChipOn : ''}`}
              onClick={() => {
                player.stop();
                setPicked(placeOf(w.root, w.chordId));
                audio.playChord(w.voiced.map(midi), 1.6);
              }}
            >
              {w.symbol}
            </button>
          ))}
        </div>
        <Staff
          clef="grand"
          measures={Array.from({ length: Math.ceil(walk.length / 2) }, (_, m) => ({
            events: walk.slice(m * 2, m * 2 + 2).map((w, _j, arr) => ({
              keys: w.voiced,
              duration: arr.length === 1 ? ('w' as const) : ('h' as const),
              top: w.symbol,
            })),
          }))}
          timeSig="4/4"
          activeIndex={walkIndex}
          onEventClick={(i) => audio.playChord(walk[i].voiced.map(midi), 1.6)}
          ariaLabel={`Voice-led cycle of dominant sevenths from ${noteName(key.tonic)}`}
        />
      </Panel>
    </>
  );
}

function KeyLink({ k, onSelect }: { k: Key; onSelect: (k: Key) => void }) {
  return (
    <button type="button" className={s.keyLink} onClick={() => onSelect(k)} title={`Go to ${keyName(k)}`}>
      {noteName(k.tonic)}
      {k.mode === 'minor' ? 'm' : ''}
    </button>
  );
}
