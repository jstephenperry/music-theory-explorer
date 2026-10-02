import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MODES, ROUTES, routesInMode, routesInSection, sectionsInMode } from '../../app/routes';
import { Icon } from '../../components/Icon';
import { Piano, marksFromMidi } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { PlayButton } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { chordEvents } from '../../audio/sequencer';
import { makeKey } from '../../theory/keys';
import { midi, pitchName } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { SCALES, TRADITIONS } from '../../theory/scales';
import { voiceProgression } from '../../theory/voicing';
import s from './HomePage.module.css';

const DEMO = ['I', 'vi', 'ii65', 'V7', 'bVImaj7', 'bVII7', 'Imaj7'];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/** A small count as a capitalized word: 17 becomes Seventeen. */
const countWord = (n: number) => (WORDS[n] ?? String(n)).replace(/^./, (c) => c.toUpperCase());

export default function HomePage() {
  const key = makeKey('Eb');
  const player = usePlayer();
  const [selected, setSelected] = useState(0);
  const chords = useMemo(() => DEMO.map((r) => parseRoman(r, key)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const voicings = useMemo(() => voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass }))), [chords]);
  const current = player.playing && player.activeIndex !== null ? player.activeIndex : selected;
  const currentMidi = voicings[current].map(midi);

  return (
    <div className={s.home}>
      <section className={s.hero}>
        <div className={s.arch} aria-hidden="true" />
        <div className={s.heroInner}>
          <div className="eyebrow">Free, in the browser, no account</div>
          <h1 className={s.title}>Music Theory Explorer</h1>
          <p className={s.lede}>
            {countWord(ROUTES.length)} rooms in two modes. Theory covers intervals, {SCALES.length} scales from{' '}
            {TRADITIONS.length} traditions, chords, progressions, modulation, the Tonnetz, meter, polyrhythm, tuning and ear training. Composition covers
            motives, phrases, texture, species counterpoint and variations, with excerpts from Bach, Mozart and Beethoven. Every room has a playable
            piano, notation that follows your choices, and audio.
          </p>
          <div className={s.overture}>
            <div className={s.overtureHead}>
              <div>
                <div className={s.overtureLabel}>Seven chords in E♭ major</div>
                <div className={s.overtureChords}>
                  {chords.map((c, i) => (
                    <button
                      key={i}
                      className={`${s.chip} ${i === current ? s.chipActive : ''}`}
                      onClick={() => {
                        setSelected(i);
                        player.stop();
                        audio.playChord(voicings[i].map(midi), 1.6);
                      }}
                    >
                      <span className={s.chipRoman}>{c.display}</span>
                      <span className={s.chipSymbol}>{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
              <PlayButton
                playing={player.playing}
                onPlay={() => player.play(chordEvents(voicings.map((v) => v.map(midi)), 2), { bpm: 84 })}
                onStop={player.stop}
                label="Play"
              />
            </div>
            <Staff
              clef="grand"
              keySig={key}
              events={voicings.map((v, i) => ({ keys: v, duration: 'h', bottom: chords[i].display, top: chords[i].symbol }))}
              activeIndex={current}
              onEventClick={(i) => setSelected(i)}
              ariaLabel={`Grand staff showing ${DEMO.join(', ')} in E flat major`}
            />
            <Piano from={36} to={84} marks={marksFromMidi(currentMidi, voicings[current].map((p) => pitchName(p)), 'tone', 'root')} pressed={player.playing ? currentMidi : []} />
            <p className={s.caption}>
              ♭VImaj7 and ♭VII7 are borrowed from E♭ minor. The Progression Lab voices any progression this way, in four parts.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="modes">
        <h2 id="modes" className={s.programTitle}>
          Two modes
        </h2>
        <div className={s.doors}>
          {MODES.map((m) => {
            const rooms = routesInMode(m.id);
            return (
              <Link key={m.id} to={m.path} className={s.door} data-mode={m.id}>
                <span className="eyebrow">
                  {countWord(rooms.length)} rooms
                </span>
                <span className={s.doorTitle}>{m.title}</span>
                <span className={s.doorBlurb}>{m.blurb}</span>
                <span className={s.doorSections}>
                  {sectionsInMode(m.id).map((sec) => (
                    <span key={sec.id} className={s.doorSection}>
                      <span className={s.doorSectionTitle}>{sec.title}</span>
                      <span className={s.doorRooms}>{routesInSection(sec.id).map((r) => r.title).join(', ')}</span>
                    </span>
                  ))}
                </span>
                <span className={s.doorGo}>
                  Open {m.title} <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
