# Architecture and contributor guide

Music Theory Explorer is a static single-page app (Vite, React 19, TypeScript). There is no backend:
everything, including audio synthesis and notation, runs in the browser.

## Layout

```
src/
  theory/      Pure music-theory engine (no React, no DOM). Fully unit tested.
  audio/       Web Audio synthesis engine, lookahead sequencer, playback hooks.
  components/  Shared UI: Piano, Staff (VexFlow), ui.tsx primitives, Icon, theme helpers.
  hooks/       usePersistentState, useUrlState, useMidiInput, useComputerKeyboard.
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
- `scales.ts`: `SCALES` catalog (59 scales with families, descriptions, mode parents, brightness),
  `buildScale(root, id)`, `scalePcs`, `scaleFormula`, `stepPattern`, `stepNames`, `modesOf(parent)`,
  `distinctTranspositions`, `findScalesByPcs`, `scalesContaining`.
- `chords.ts`: `CHORDS` catalog (triads to altered dominants, quartal, augmented sixths),
  `buildChord(root, id)`, `chordPcs`, `chordToneLabels`, `chordSymbol(root, id, bass)`,
  `parseChordSymbol('F#m7b5')`, `identifyChord(pcs, { bassPc, spelled })`, `chordQualityClass`,
  `figuredBass`, `inversionName`.
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

## Audio (`src/audio`)

- `audio` singleton (`engine.ts`): `playNote(midi, dur, when?, vel)`, `playChord(midis, dur, when?, vel, strum)`,
  `playArpeggio`, `noteOn/noteOff`, `playFrequency(hz, ...)` for tuning work, `click(when, level)` and
  `percussion(when, pitchHz, gain, decay)` for rhythm, `now` (AudioContext time). Instruments are synthesized.
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
  Events: `{ keys: Pitch[], duration, rest, top, bottom, color, keyColors }`. Accidentals are computed
  automatically against the key signature. `loadVexFlow()` exposes VexFlow for custom engraving.
- Hooks: `useUrlState(key, default)` and `useUrlParams(defaults)` keep shareable state in the URL;
  `usePersistentState` keeps preferences in localStorage; `useMidiInput`; `useComputerKeyboard`.
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
- `.github/workflows/deploy.yml` builds, tests and publishes to GitHub Pages on pushes to `main`.
- `amplify.yml` provides equivalent settings for AWS Amplify Hosting.
- The build uses a relative base path and hash routing, so it can be served from any path or domain.
