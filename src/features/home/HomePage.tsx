import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES, SECTIONS } from '../../app/routes';
import { Piano, marksFromMidi } from '../../components/Piano';
import { Staff } from '../../components/Staff';
import { PlayButton } from '../../components/ui';
import { usePlayer } from '../../audio/usePlayer';
import { audio } from '../../audio/engine';
import { chordEvents } from '../../audio/sequencer';
import { makeKey } from '../../theory/keys';
import { midi, pitchName } from '../../theory/notes';
import { parseRoman } from '../../theory/roman';
import { voiceProgression } from '../../theory/voicing';
import s from './HomePage.module.css';

const OVERTURE = ['I', 'vi', 'ii65', 'V7', 'bVImaj7', 'bVII7', 'Imaj7'];

export default function HomePage() {
  const key = makeKey('Eb');
  const player = usePlayer();
  const [selected, setSelected] = useState(0);
  const chords = useMemo(() => OVERTURE.map((r) => parseRoman(r, key)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const voicings = useMemo(() => voiceProgression(chords.map((c) => ({ notes: c.notes, bass: c.bass }))), [chords]);
  const current = player.playing && player.activeIndex !== null ? player.activeIndex : selected;
  const currentMidi = voicings[current].map(midi);

  return (
    <div className={s.home}>
      <section className={s.hero}>
        <div className={s.arch} aria-hidden="true" />
        <div className={s.heroInner}>
          <div className="eyebrow">An open concert hall for music theory</div>
          <h1 className={s.title}>Music Theory Explorer</h1>
          <p className={s.lede}>
            Play, hear and see how music works: modes beyond major and minor, chromatic harmony, modulation, meter and
            tuning. Every idea is an instrument you can touch, on a keyboard and on the stave.
          </p>
          <div className={s.overture}>
            <div className={s.overtureHead}>
              <div>
                <div className={s.overtureLabel}>Overture in E♭</div>
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
                label="Play overture"
              />
            </div>
            <Staff
              clef="grand"
              keySig={key}
              events={voicings.map((v, i) => ({ keys: v, duration: 'h', bottom: chords[i].display, top: chords[i].symbol }))}
              activeIndex={current}
              onEventClick={(i) => setSelected(i)}
              ariaLabel={`Grand staff showing ${OVERTURE.join(', ')} in E flat major`}
            />
            <Piano from={36} to={84} marks={marksFromMidi(currentMidi, voicings[current].map((p) => pitchName(p)), 'tone', 'root')} pressed={player.playing ? currentMidi : []} />
            <p className={s.caption}>
              ♭VImaj7 and ♭VII7 are borrowed from E♭ minor: one example of the color waiting in the Progression Lab.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="program">
        <h2 id="program" className={s.programTitle}>
          The Program
        </h2>
        <div className={s.program}>
          {SECTIONS.map((sec) => (
            <div key={sec.id} className={s.movement}>
              <h3 className={s.movementTitle}>{sec.title}</h3>
              <ol className={s.entries}>
                {ROUTES.filter((r) => r.section === sec.id).map((r) => (
                  <li key={r.path}>
                    <Link to={r.path} className={s.entry}>
                      <span className={s.entryTitle}>{r.title}</span>
                      <span className={s.entryLeader} aria-hidden="true" />
                      <span className={s.entryArrow} aria-hidden="true">
                        →
                      </span>
                      <span className={s.entryBlurb}>{r.blurb}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
