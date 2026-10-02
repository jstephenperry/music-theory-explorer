import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader, Panel, PlayButton, Segmented, Select, Slider, Toggle, Button, RootPicker, Empty, Callout } from '../../components/ui';
import { Piano, type KeyMark } from '../../components/Piano';
import { Staff, type StaffMeasure } from '../../components/Staff';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { usePersistentState } from '../../hooks/usePersistentState';
import { keyName, makeKey, type Key } from '../../theory/keys';
import { midi, pc, pitchName, type Pitch } from '../../theory/notes';
import { initialVoicing, voiceLead, voiceProgression } from '../../theory/voicing';
import { ACCOMP_STYLES, buildAccompaniment, type AccompStyle } from './accompaniment';
import { ChordEditor } from './ChordEditor';
import { describeChord, detectCadence } from './harmony';
import { LibraryPanel } from './LibraryPanel';
import { LIBRARY, type LibraryEntry } from './library';
import { chordLabel, DEFAULT_BEATS, itemsFromUrl, keyFromParams, parseNumeral, parseNumeralText, serializeItems, tonicParam, tryParseNumeral, type ProgItem } from './model';
import { durationFor, packMeasures } from './notation';
import type { PaletteGroup } from './palette';
import { PalettePanel } from './PalettePanel';
import { FunctionLegend, type LabChord } from './parts';
import { ProgressionStrip } from './ProgressionStrip';
import { reharmTools, type ReharmOption } from './reharm';
import { ReharmPanel } from './ReharmPanel';
import { suggestNext } from './suggest';
import { SuggestionsPanel } from './SuggestionsPanel';
import { TextEntry } from './TextEntry';
import { useLabUrl } from './useLabUrl';
import { VoiceLeadingView } from './VoiceLeadingView';
import s from './Progressions.module.css';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function buildChords(items: ProgItem[], key: Key): LabChord[] {
  const rcs = items.map((it) => parseNumeral(it.numeral, key));
  const voicings = rcs.length ? voiceProgression(rcs.map((rc) => ({ notes: rc.notes, bass: rc.bass }))) : [];
  return rcs.map((rc, i) => ({ item: items[i], rc, desc: describeChord(rc, key), voicing: voicings[i] }));
}

function accompFor(chords: LabChord[]) {
  return chords.map((c) => ({ voicing: c.voicing.map(midi), beats: c.item.beats, tonePcs: c.rc.notes.map(pc) }));
}

export default function ProgressionsPage() {
  const [params, update] = useLabUrl();
  const key = useMemo(() => keyFromParams(params.key, params.mode), [params.key, params.mode]);
  const items = useMemo(() => itemsFromUrl(params.p, key), [params.p, key]);
  const bpm = clamp(Number(params.bpm) || 92, 40, 240);
  const style: AccompStyle = ACCOMP_STYLES.some((x) => x.id === params.style) ? (params.style as AccompStyle) : 'block';
  const loop = params.loop !== '0';

  const [click, setClick] = usePersistentState('progressions:click', false);
  const [pinned, setPinned] = usePersistentState<boolean>('progressions:pin', true);
  const [showVL, setShowVL] = usePersistentState('progressions:voiceLeading', true);
  const [paletteTab, setPaletteTab] = usePersistentState<PaletteGroup['id']>('progressions:paletteTab', 'borrowed');
  const [selected, setSelected] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const history = useRef<string[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();

  const chords = useMemo(() => buildChords(items, key), [items, key]);
  // With nothing chosen, the last chord is selected, so new chords append and suggestions follow the ending.
  const sel = selected !== null && selected < chords.length ? selected : chords.length ? chords.length - 1 : null;
  const accomp = useMemo(() => buildAccompaniment(accompFor(chords), style, { click }), [chords, style, click]);

  const mainPlaying = player.playing && previewId === null;
  const activeChord = mainPlaying ? ((player.activeData as { chord: number } | null)?.chord ?? null) : null;
  const focusIdx = activeChord ?? sel;

  // ---------- Editing ----------
  const setItems = useCallback(
    (next: ProgItem[], select?: number | null) => {
      history.current.push(params.p);
      if (history.current.length > 100) history.current.shift();
      setHistorySize(history.current.length);
      update({ p: serializeItems(next) });
      if (select !== undefined) setSelected(select);
    },
    [params.p, update],
  );

  const undo = () => {
    const prev = history.current.pop();
    setHistorySize(history.current.length);
    if (prev !== undefined) update({ p: prev });
  };

  const voicingFor = useCallback(
    (numeral: string, after: number | null): Pitch[] | null => {
      const rc = tryParseNumeral(numeral, key);
      if (!rc) return null;
      const target = { notes: rc.notes, bass: rc.bass };
      const prev = after !== null ? chords[after]?.voicing : undefined;
      return prev ? voiceLead(prev, target) : initialVoicing(target);
    },
    [chords, key],
  );

  const audition = useCallback((v: Pitch[] | null | undefined) => {
    if (!v) return;
    audio.playChord(v.map(midi), 1.5);
  }, []);

  const insertAfterSelection = (numeral: string) => {
    const at = (sel ?? chords.length - 1) + 1;
    const beats = sel !== null ? chords[sel].item.beats : chords.length ? chords[chords.length - 1].item.beats : DEFAULT_BEATS;
    const next = [...items];
    next.splice(at, 0, { numeral, beats });
    if (!mainPlaying) audition(voicingFor(numeral, at > 0 ? at - 1 : null));
    setItems(next, at);
  };

  const selectChord = (i: number) => {
    setSelected(i);
    if (!mainPlaying) audition(chords[i]?.voicing);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next, j);
  };
  const remove = (i: number) => {
    const next = items.filter((_, k) => k !== i);
    setItems(next, next.length ? Math.min(i, next.length - 1) : null);
  };
  const duplicate = (i: number) => {
    const next = [...items];
    next.splice(i + 1, 0, { ...items[i] });
    setItems(next, i + 1);
  };

  // ---------- Playback ----------
  const play = useCallback(() => {
    setPreviewId(null);
    if (!accomp.events.length) return;
    player.play(accomp.events, { bpm, loop, length: accomp.length });
  }, [accomp, bpm, loop, player]);

  // Restart with the new material when the progression or arrangement changes mid-playback.
  const restartRef = useRef({ mainPlaying, play });
  useEffect(() => {
    restartRef.current = { mainPlaying, play };
  });
  useEffect(() => {
    if (restartRef.current.mainPlaying) restartRef.current.play();
  }, [accomp, loop]);

  const setBpm = (v: number) => {
    update({ bpm: String(v) });
    if (mainPlaying) player.setBpm(v);
  };

  const preview = (e: LibraryEntry) => {
    if (previewId === e.id && player.playing) {
      player.stop();
      setPreviewId(null);
      return;
    }
    const k = e.mode === 'both' ? key : makeKey(key.tonic, e.mode);
    const ch = buildChords(parseNumeralText(e.progression, k).items, k);
    const acc = buildAccompaniment(accompFor(ch), e.style ?? style);
    setPreviewId(e.id);
    player.play(acc.events, { bpm: e.bpm ?? bpm, loop: false, length: acc.length, onEnd: () => setPreviewId((id) => (id === e.id ? null : id)) });
  };

  const load = (e: LibraryEntry) => {
    player.stop();
    setPreviewId(null);
    const mode = e.mode === 'both' ? key.mode : e.mode;
    const k = makeKey(key.tonic, mode);
    const parsed = parseNumeralText(e.progression, k).items;
    history.current.push(params.p);
    setHistorySize(history.current.length);
    update({ p: serializeItems(parsed), mode, style: e.style ?? params.style, bpm: e.bpm ? String(e.bpm) : params.bpm });
    setSelected(null);
    stripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  };

  // ---------- Derived views ----------
  const cadence = useMemo(() => {
    const last = chords[chords.length - 1];
    return detectCadence(
      chords.map((c) => c.rc),
      key,
      last ? pc(last.voicing[last.voicing.length - 1]) : undefined,
    );
  }, [chords, key]);

  const suggestFrom = sel ?? (chords.length ? chords.length - 1 : null);
  const suggestions = useMemo(() => suggestNext(suggestFrom !== null ? chords[suggestFrom].item.numeral : key.mode === 'major' ? 'I' : 'i', key), [suggestFrom, chords, key]);
  const tools = useMemo(() => (sel !== null ? reharmTools(items, sel, key) : []), [items, sel, key]);

  const meter = style === 'waltz' ? 3 : 4;
  const measures: StaffMeasure[] = useMemo(
    () =>
      packMeasures(
        chords.map((c) => c.item.beats),
        meter,
      ).map((idxs) => ({
        events: idxs.map((i) => ({ keys: chords[i].voicing, duration: durationFor(chords[i].item.beats), top: chordLabel(chords[i].rc), bottom: chords[i].rc.display })),
      })),
    [chords, meter],
  );

  const pianoMarks = useMemo(() => {
    const out: Record<number, KeyMark> = {};
    if (focusIdx === null || !chords[focusIdx]) return out;
    const c = chords[focusIdx];
    c.voicing.forEach((p) => {
      out[midi(p)] = { role: pc(p) === pc(c.rc.root) ? 'root' : 'tone', label: pitchName(p) };
    });
    return out;
  }, [focusIdx, chords]);

  const totalBeats = items.reduce((a, it) => a + it.beats, 0);
  const waltzMismatch = style === 'waltz' && items.some((it) => it.beats % 3 !== 0);
  const styleDef = ACCOMP_STYLES.find((x) => x.id === style)!;
  const applyReharm = (o: ReharmOption) => {
    setItems(o.items, o.select);
    if (!mainPlaying) {
      const ch = buildChords(o.items, key);
      audition(ch[o.select]?.voicing);
    }
  };

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Harmony"
        title="Progression Lab"
        lede="Build chord progressions with roman numerals, from the diatonic basics to borrowed chords, applied dominants, tritone substitutes, augmented sixths and chromatic mediants. Hear them voiced in four parts, see every voice move, and get suggestions for the next chord."
      />

      <Panel>
        <div className={s.controls}>
          <div className={s.controlGroup}>
            <RootPicker label="Tonic" value={key.tonic} onChange={(n) => update({ key: tonicParam(n) })} />
            <Segmented<'major' | 'minor'>
              ariaLabel="Mode"
              value={key.mode}
              onChange={(m) => update({ mode: m })}
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
              ]}
            />
            <span className={s.keyTitle} aria-live="polite">
              {keyName(key)}
            </span>
          </div>
          <div className={s.controlGroup}>
            <div className={s.transport}>
              <PlayButton playing={mainPlaying} onPlay={play} onStop={player.stop} disabled={!chords.length} />
              <Toggle label="Loop" checked={loop} onChange={(v) => update({ loop: v ? '1' : '0' })} />
              <Toggle label="Click" checked={click} onChange={setClick} />
              <Button size="sm" icon={copied ? 'check' : 'link'} onClick={copyLink}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            <Slider label="Tempo" value={bpm} min={40} max={240} onChange={setBpm} format={(v) => `${v} bpm`} width={150} />
            <Select
              label="Accompaniment"
              value={style}
              onChange={(v) => update({ style: v })}
              options={ACCOMP_STYLES.map((x) => ({ value: x.id, label: x.name }))}
              hint={styleDef.description}
            />
          </div>
        </div>
        {waltzMismatch && (
          <p className={s.hint}>
            Waltz style groups beats in threes; some chords are not a multiple of 3 beats.{' '}
            <Button size="sm" variant="ghost" onClick={() => setItems(items.map((it) => ({ ...it, beats: 3 })))}>
              Set all chords to 3 beats
            </Button>
          </p>
        )}
      </Panel>

      <div ref={stripRef} style={{ scrollMarginTop: '1rem' }} className={pinned ? 'dock' : undefined}>
        <Panel
          className={s.stripPanel}
          eyebrow={`${keyName(key)} · ${chords.length} chord${chords.length === 1 ? '' : 's'} · ${totalBeats} beats`}
          title="Progression"
          actions={
            <>
              <span className={s.pin} title="Keep the progression in view while the editing panels below scroll">
                <Toggle label="Keep in view" checked={pinned} onChange={setPinned} />
              </span>
              <Button size="sm" icon="undo" onClick={undo} disabled={historySize === 0}>
                Undo
              </Button>
              <Button size="sm" icon="trash" variant="ghost" onClick={() => setItems([], null)} disabled={!chords.length}>
                Clear
              </Button>
            </>
          }
        >
          <ProgressionStrip
            chords={chords}
            selected={sel}
            playing={activeChord}
            onSelect={selectChord}
            onMove={move}
            onDelete={remove}
            onAdd={() => paletteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <div className={s.stripFooter}>
            <FunctionLegend />
            <div className={s.cadence} aria-live="polite">
              <span className="eyebrow">Ending</span>
              <span className={s.cadenceLabel}>{cadence.label}</span>
              <span className="muted">{cadence.detail}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Notation and keyboard" eyebrow="Four-part voice leading" actions={<Toggle label="Voice-leading view" checked={showVL} onChange={setShowVL} />}>
        <div className={s.notation}>
          {chords.length ? (
            <Staff
              clef="grand"
              keySig={key}
              measures={measures}
              activeIndex={focusIdx}
              onEventClick={selectChord}
              eventWidth={58}
              ariaLabel={`Grand staff: ${chords.map((c) => c.rc.display).join(', ')} in ${keyName(key)}`}
            />
          ) : (
            <Empty>Add chords to see them engraved.</Empty>
          )}
          <div className={s.pianoWrap}>
            <div className={s.pianoInner}>
              <Piano from={36} to={84} marks={pianoMarks} pressed={activeChord !== null ? chords[activeChord]?.voicing.map(midi) ?? [] : []} labels="c" ariaLabel="Piano showing the current voicing" />
            </div>
          </div>
          {showVL && chords.length > 1 && <VoiceLeadingView chords={chords} active={focusIdx} onSelect={selectChord} />}
        </div>
        <details className={s.glossary}>
            <summary>Harmonic function and cadence types</summary>
            <dl>
              <dt>Tonic</dt>
              <dd>Rest and arrival: I, and its substitutes vi and iii (i, III and VI in minor).</dd>
              <dt>Predominant</dt>
              <dd>Motion away from home that prepares the dominant: ii, IV, and their chromatic cousins iv, N⁶ and the augmented sixths.</dd>
              <dt>Dominant</dt>
              <dd>Tension that seeks the tonic: V, V⁷, vii°, Cad⁶₄. A secondary dominant lends that pull to another chord.</dd>
              <dt>Authentic</dt>
              <dd>V to I. Perfect when both are in root position with the tonic on top; otherwise imperfect.</dd>
              <dt>Half</dt>
              <dd>Ends on V. In minor, iv⁶ to V is a Phrygian half cadence.</dd>
              <dt>Plagal</dt>
              <dd>IV or iv to I, the cadence sung to Amen at the end of hymns.</dd>
              <dt>Deceptive</dt>
              <dd>V to vi (or ♭VI): the expected tonic is replaced.</dd>
              <dt>Backdoor, tritone</dt>
              <dd>♭VII⁷ to I and ♭II⁷ to I: jazz substitutes for V⁷ to I.</dd>
            </dl>
        </details>
      </Panel>

      <Panel title="Type or paste a progression" eyebrow="Text entry">
        <TextEntry items={items} keyObj={key} onApply={(next) => setItems(next, null)} />
      </Panel>

      <div className={s.workGrid}>
        <div className={s.column}>
        <Panel title="Selected chord" eyebrow={sel !== null ? `Chord ${sel + 1} of ${chords.length}` : 'Edit'}>
          {sel !== null ? (
            <ChordEditor
              key={`${sel}:${chords[sel].item.numeral}`}
              chord={chords[sel]}
              index={sel}
              count={chords.length}
              keyObj={key}
              onNumeral={(n) => setItems(items.map((it, k) => (k === sel ? { ...it, numeral: n } : it)))}
              onBeats={(b) => setItems(items.map((it, k) => (k === sel ? { ...it, beats: b } : it)))}
              onMove={(d) => move(sel, d)}
              onDuplicate={() => duplicate(sel)}
              onDelete={() => remove(sel)}
              onPlay={() => audition(chords[sel].voicing)}
            />
          ) : (
            <Empty>Select a chord card (or a chord on the staff) to edit, move, duplicate or reharmonize it.</Empty>
          )}
        </Panel>
        <div ref={paletteRef} style={{ scrollMarginTop: '1rem' }}>
          <Panel title="Chord palette" eyebrow={sel !== null ? `Inserts after chord ${sel + 1}` : 'Inserts at the end'}>
            <PalettePanel keyObj={key} tab={paletteTab} onTab={setPaletteTab} onPick={insertAfterSelection} />
          </Panel>
        </div>
        </div>
        <div className={s.column}>
        <Panel title="Reharmonize" eyebrow={sel !== null ? `Tools for ${chords[sel].rc.display}` : 'Tools'}>
          {sel !== null ? (
            <ReharmPanel tools={tools} keyObj={key} onApply={applyReharm} />
          ) : (
            <Empty>Select a chord to insert its secondary dominant or a ii–V, substitute a tritone, borrow from another mode, or swap in a chromatic mediant.</Empty>
          )}
        </Panel>
        <Panel title="What could come next?" eyebrow={suggestFrom !== null ? `After ${chords[suggestFrom].rc.display} (${chordLabel(chords[suggestFrom].rc)})` : 'Starting from the tonic'}>
          <SuggestionsPanel groups={suggestions} keyObj={key} onPick={insertAfterSelection} />
          <div style={{ marginTop: '0.75rem' }}>
            <Callout tone="verdigris">Suggestions follow common-practice and jazz habits, not rules. Click one to insert it and hear it in context.</Callout>
          </div>
        </Panel>
        </div>
      </div>

      <Panel title="Progression library" eyebrow={`${LIBRARY.length} named progressions`}>
        <LibraryPanel keyObj={key} previewId={player.playing ? previewId : null} onLoad={load} onPreview={preview} />
      </Panel>
    </div>
  );
}

