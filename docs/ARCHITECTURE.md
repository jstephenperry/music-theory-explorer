# Architecture and contributor guide

Music Theory Explorer is a static single-page app (Vite, React 19, TypeScript). There is no backend:
everything, including audio synthesis and notation, runs in the browser.

## Layout

```
src/
  theory/      Pure music-theory engine (no React, no DOM). Fully unit tested.
  audio/       Web Audio synthesis engine, lookahead sequencer, playback hooks.
  components/  Shared UI: Piano, Staff (VexFlow), ui.tsx primitives, Icon, theme helpers.
  hooks/       usePersistentState, useUrlState, useMediaQuery, useMidiInput, useComputerKeyboard.
  app/         App shell, routing (HashRouter), route registry, layout.
  features/    One folder per page ("room"). Each owns its components, styles and logic.
  styles/      global.css: design tokens and a few utility classes.
```

## Theory engine (`src/theory`)

Import from `src/theory` (barrel) or from individual modules.

- `notes.ts`: `Note` = `{ letter, acc }` (spelled pitch class), `Pitch` = `Note & { octave }`.
  `note('F#')`, `pitch('Bb3')`, `pc(n)`, `midi(p)`, `noteName(n)` (unicode by default: F♯),
  `pitchFromMidi(m, pref)`, `pitchAtOrAbove(n, minMidi)`, `pitchNear(n, targetMidi)`, `midiToFreq`,
  `fifthsFromC`, `noteFromFifths`, `COMMON_ROOTS`.
- `intervals.ts`: `Interval` = `{ num, semis }`. `interval('m3')`, `intervalName`, `intervalLongName`,
  `transpose(note, interval)` (always correctly spelled), `transposeDown`, `transposePitch`,
  `intervalBetween(a, b)`, `pitchInterval(a, b)`, `invert`, `degreeLabel` (♭3, ♯11), `consonance`.
- `scales.ts`: `SCALES` catalog assembled from `catalog/*.ts` (one file per tradition), `TRADITIONS`
  (name, family label, microtonal notation style, whether chord-scale theory applies), `familiesOf`,
  `scalesInFamily`, `buildScale(root, id)`, `scalePcs`, `scaleFormula`, `stepPattern`, `stepNames`,
  `modesOf(parent)`, `distinctTranspositions`, `findScalesByPcs`, `scalesContaining`, and for
  intonation `scaleDeviations`, `scaleCents` (cents above the tonic) and `hasMicrotones`.
- `catalog/define.ts`: the `ScaleDef` type and helpers for writing scales. A degree is a spelled
  interval plus an optional deviation in cents ("M3-50" is a half-flat third). `fromAbsolute` builds
  degrees from note names and pitches in cents (used for maqamat), `fromSteps` from step sizes in
  commas or moria (Turkish makam, Byzantine echoi). `forms` hold ascents, descents and ranges (aroha
  and avaroha, maqam descents, Gregorian ambitus); a leading "-" puts a note an octave lower.
  `tonic` is the customary tonic, `facts` are label and value pairs (vadi, ajnas, final),
  `degreeNames` override the automatic degree labels. Microtonal scales are left out of
  pitch-class matching, the scale finder and chord scales; `catalog.test.ts` checks the data.
- `micro.ts`: names and notation for microtonal pitches: `microNoteName` ("E½♭", "F♯↓"),
  `microNoteSpoken` for screen readers, and `vexMicroAccidental` (half-flat signs, Persian koron and
  sori, Arel-Ezgi-Uzdilek comma accidentals, arrow accidentals).
- `keys.ts`: `Key` = `{ tonic, mode: 'major' | 'minor' }`. `makeKey('Eb', 'minor')`, `keyName`,
  `keyNotes`, `keySignature`, `keySignatureFifths`, `vexKeySpec`, `relativeKey`, `parallelKey`,
  `dominantKey`, `closelyRelatedKeys`, `diatonicChords(key, sevenths, minorVariant)`,
  `diatonicChordsOfScale(tonic, scaleId, sevenths)`, `MAJOR_KEYS`, `MINOR_KEYS`, `fifthsDistance`.
- `roman.ts`: `parseRoman('V7/V', key)` returns `{ root, chordId, notes, bass, inversion, symbol, display }`.
  Supports figures (6, 64, 7, 65, 43, 42), borrowed numerals (♭VI, ♭VII, iv), secondary functions
  (V/V, vii°7/ii, chains), N6, It+6, Fr+6, Ger+6, Cad64 and explicit suffixes (maj7, 9, sus4, 7♭9 ...).
  Accidental numerals are measured from the major scale on the tonic. `analyzeChord(root, id, key, inv)`
  produces a numeral; `formatRoman` renders figures as super/subscripts; `splitProgression` tokenizes.
- `voicing.ts`: `voiceChord(tones, { style, inversion, low })` (close, open, drop 2, drop 3, drop 2&4,
  shell, spread, rootless), `voiceProgression(chords)` and `voiceLead(prev, next)` for smooth
  four-part voice leading that avoids crossings and parallel fifths and octaves.

- `score.ts`: a small score model for notated music. `Score` = `{ key, time, pickup, measures,
  ending?, staves }`; each staff has voices of `ScoreNote` (`id` "staff.voice.index", `pitches`,
  `value`, `dots`, `tuplet`, `dur`, `start`, `measure`, `tie`, `grace`, `orn`, `below`, `above`).
  `buildScore(spec)` parses the text format documented at the top of the file (`C4/16 D4 E4`,
  `(C4 E4 G4)/2`, `~` ties, `3:2[ ... ]` tuplets, `^C5/16` grace notes, `!tr` and other ornaments,
  `_"V7"` labels, `|` barlines checked against the meter, a pickup and a short last bar).
  `notateVoice(plainNotes, { time })` writes generated music into measures, splitting at barlines
  and at the beat with ties and grouping triplets. `scoreSounds(score)` turns a score into timed
  sounds (ties joined, grace notes before the beat); `selectNotes(score, "0.0.1-7, 1.0.2")` selects
  notes for highlighting.
- `composition/motive.ts`: motivic transformations on `Motive` (`{ pitch, dur }[]`): `sequence`
  (tonal, by scale steps), `transposeReal`, `invertDiatonic`, `invertChromatic`, `retrograde`,
  `scaleRhythm`, `fragment`, `stepPitch`, and `develop(original, ops, key)` for chains of `DEV_OPS`.
- `composition/counterpoint.ts`: two-voice species counterpoint after Fux. `checkCounterpoint(ex, cp)`
  returns issues (slots, error or warning, rule, message) for first and second species, judging
  intervals by spelling. `solveCounterpoint(ex, { fixed })` is a backtracking solver that writes
  backward from the cadence; it powers hints and model solutions. `CANTUS_FIRMI`, `RULES`.

## Audio (`src/audio`)

- `audio` singleton (`engine.ts`): `playNote(midi, dur, when?, vel)`, `playChord(midis, dur, when?, vel, strum)`,
  `playArpeggio`, `noteOn/noteOff`, `playFrequency(hz, ...)` for tuning work, `click(when, level)` and
  `percussion(when, pitchHz, gain, decay)` for rhythm, `now` (AudioContext time). MIDI numbers may be
  fractional for microtonal pitches. `preload()` fetches the chosen instrument's recordings and
  `instrumentStatus` reports their loading state.
- `SampleBank` (`samples.ts`): sampled instruments. Recordings (one every minor third) are fetched
  from `public/samples`, decoded on an OfflineAudioContext, trimmed to the attack, looped with a
  crossfade for sustained instruments, and resampled to the requested pitch. Until a recording near
  the pitch is loaded the engine falls back to a synthesized voice.
- `Sequence` (`sequencer.ts`): sample-accurate lookahead scheduling with UI callbacks; events are in beats.
  Helpers `chordEvents` and `melodyEvents`.
- `usePlayer()` (`usePlayer.ts`): `play(events, { bpm, loop, length, onEvent })`, `stop`, `setBpm`, `playing`,
  `activeIndex`, `activeData`, `position()`. Only one sequence plays at a time app-wide, and playback
  stops on navigation. Custom Web Audio graphs call `registerStopper(fn)` so they are silenced too.

## Components

- `Piano`: SVG keyboard. Props: `from`, `to`, `marks` (per MIDI), `pcMarks` (per pitch class), `pressed`,
  `onNoteOn`, `onNoteOff`, `onKeyClick`, `labels`, `sound`. Mark roles: root, tone, alt, extra, other, muted.
  Helpers `marksFromPcs`, `marksFromMidi`.
- `Staff`: VexFlow notation. Props: `events` (single unmetered bar) or `measures`, `clef`
  ('treble' | 'bass' | 'grand' | 'auto'), `keySig`, `timeSig`, `activeIndex`, `onEventClick`, `beam`.
  Events: `{ keys: Pitch[], duration, rest, top, bottom, color, keyColors, micro }` (`micro` holds
  per-key microtonal accidentals). Accidentals are computed
  automatically against the key signature. `loadVexFlow()` exposes VexFlow for custom engraving.
- `ScoreView`: engraves a `Score` with VexFlow: grand staves with independent voices, line breaking
  (`barsPerLine` keeps phrases together), beaming by beat, tuplets, grace notes, ornaments, ties
  across lines, labels between the staves, colored notes (`colors`: note id to a color role),
  `brackets` over passages, `active` note ids highlighted during playback without re-engraving, and
  `onNoteClick`.
- Composition rooms (`src/features/composition`): `useScorePlayer()` plays a `Score` and reports
  the sounding note ids; `ExcerptView` shows an `Excerpt` (in `excerpts/`) with switchable
  highlight layers, brackets, commentary and its source; `Quiz` is the shared multiple-choice drill.
  Generators with tests: `phrase.ts` (periods, sentences, cadence analysis), `cadences.ts`,
  `textures.ts`, `variations.ts`.
- Hooks: `useUrlState(key, default)` and `useUrlParams(defaults)` keep shareable state in the URL;
  `usePersistentState` keeps preferences in localStorage; `useMediaQuery`; `useMidiInput`; `useComputerKeyboard`.
- `ui.tsx`: `Button`, `PlayButton`, `Segmented`, `Select`, `TextInput`, `Slider`, `Toggle`, `Panel`,
  `PageHeader`, `Tag`, `Callout`, `Tabs`, `RootPicker`, `Stat`, `Empty`.
- `theme.ts`: `cssVar`, `resolveColor`, `useThemeVersion` for canvas/SVG drawings that need theme colors.

## Design language

"Elegant functionalism" in a concert hall: ivory score paper, walnut and ebony, burgundy velvet,
aged brass. Use the tokens in `styles/global.css` (`--bg`, `--bg-elev`, `--bg-sunk`, `--ink`,
`--ink-muted`, `--rule`, `--rule-strong`, `--accent`, `--brass`, `--verdigris`, `--royal`, `--plum` and
their `-soft` variants). Headings use `--font-display` (Cormorant Garamond), UI text `--font-ui`
(Source Sans 3), prose `--font-serif` (Source Serif 4). Soft radii, thin rules, no neon, no heavy shadows.
Both themes (Matinee light, Evening dark) must look right; never hard-code colors that ignore the theme.

Writing style: American English, concise, no emoji, no em or en dashes used as punctuation.

## Testing and deployment

- `npm test` runs Vitest; `npm run typecheck`; `npm run build` produces `dist/`.
- Excerpts were checked by hand-run comparison with Mutopia MIDI files; the `source` field of each
  excerpt records what was checked and how.
- `.github/workflows/deploy.yml` builds, tests and publishes to GitHub Pages on pushes to `main`.
- `amplify.yml` provides equivalent settings for AWS Amplify Hosting.
- The build uses a relative base path and hash routing, so it can be served from any path or domain.
