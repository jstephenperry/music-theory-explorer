# Music Theory Explorer

An interactive music theory reference that runs in the browser. Each topic has a playable piano,
notation that updates as you change things, and audio. It is free, has no accounts, and needs no
server.

Live site: https://jstephenperry.github.io/music-theory-explorer/ (available once GitHub Pages is
enabled; see [Deploying](#deploying)).

## What is in it

| Room | What you can do |
| --- | --- |
| Intervals | Pick two keys or an interval name. See quality, inversion, consonance, enharmonic spellings, and the just ratio against equal temperament. |
| Scales & Modes | 324 scales, modes, maqamat and ragas from 14 traditions, picked by tradition, then family, then scale, or by search: Western modes, jazz and blues, Messiaen's modes, Arabic maqam, Turkish makam, Persian dastgāh, Byzantine echoi, Jewish prayer modes and cantillation, Hindustani ragas by thaat, all 72 Carnatic melakartas plus janya ragas, Chinese, Japanese and Korean scales, gamelan and Thai tunings, Ethiopian qenet and ancient Greek harmoniai. Microtonal scales play at their true intonation and are notated with half-flat, koron or comma accidentals. Ragas show aroha and avaroha; maqamat show their ajnas and alternative descents. Compare scales by cents, walk the brightness ladder, play over a drone, see the chords each 12-tone scale produces, and find scales that contain a set of notes. |
| Circle of Fifths | Key signatures, relative and closely related keys, diatonic chords, mode overlays, and a cycle of dominant sevenths played around the circle. |
| Chords | Build any chord from triads to altered dominants, augmented sixths and quartal voicings. Change inversion and voicing (close, open, drop 2, drop 3, shell, rootless). Play notes to have the chord named. |
| Progression Lab | Write progressions in roman numerals or chord symbols. Add borrowed chords, secondary dominants, tritone substitutes, Neapolitan and augmented sixth chords, and chromatic mediants. Includes four-part voice leading, seven accompaniment styles, a library of 52 named progressions, next-chord suggestions, and reharmonization tools. |
| Modulation | Choose two keys and compare nine techniques: pivot chord, direct, secondary dominant, common tone, enharmonic diminished seventh, enharmonic German sixth, sequence, modal interchange, and truck driver. A map shows how reachable every key is from the source key. |
| Tonnetz | A neo-Riemannian lattice. Apply P, L, R, N, S and H transformations and play hexatonic, octatonic and other cycles. |
| Motive & Development | Bach's Invention No. 1 and the opening of Beethoven's Fifth with the motive, its transposition, inversion and sequence highlighted. Develop a motive of your own (or one of four presets) by chaining up to ten operations: sequence, real transposition, inversion, retrograde, augmentation, diminution and fragmentation. A drill asks which technique produced a passage. |
| Phrase & Cadence | Mozart's K. 331 theme (a period) and Beethoven's Op. 2 No. 1 (a sentence) with their phrase members marked. A gallery of six cadences in four-part harmony. A phrase builder assembles an eight-bar period or sentence from a basic idea, its repetition, fragments and a chosen cadence, in seven keys, and analyzes the result. A cadence ear-training drill. |
| Texture & Accompaniment | Bach's chorale BWV 269, Mozart's K. 545 and Bach's Prelude BWV 846 as examples of homophony, melody with Alberti bass and broken-chord figuration. A texture lab writes one voice-led progression as a chorale, repeated chords, Alberti bass, prelude figuration, wide arpeggio or waltz. A texture ear-training drill. |
| Species Counterpoint | Write first or second species counterpoint above or below a cantus firmus (Fux's Dorian melody or four practice melodies). Thirteen rules are checked as you write, with problem notes marked; hints keep your notes and suggest the next one; a solver shows a model solution. |
| Theme & Variations | Mozart's K. 265 theme and the opening of Variation I with the theme's notes marked inside the figuration. A workshop varies the theme by figuration, rhythm, meter, mode and accompaniment. A drill asks what changed. |
| Meter & Time | Simple, compound, irregular, additive and mixed meters with an editable accent grid, a metronome with swing and tap tempo, beamed notation, and a rhythm step sequencer (clave, tresillo, bossa nova and others). |
| Polyrhythm | Layered polyrhythms on a clock and a grid, polymeter, hemiola, and a demo that speeds a polyrhythm up until it becomes a chord. |
| Harmonics & Tuning | The harmonic series, additive synthesis, just versus equal intervals with audible beating, and playable historical tunings (Pythagorean, meantone, just, Werckmeister III, 19 and 31 equal). |
| Ear Training | Intervals, chord qualities, scales, scale degrees, cadences and progressions. Items you miss come up more often. Results are kept in your browser. |
| Free Play | A five-octave keyboard that names chords as you play them, with MIDI input, computer-keyboard input, sustain, and a phrase recorder. |

Input: mouse or touch on the on-screen piano, the computer keyboard (A W S E D F T G Y H U J K,
with Z and X to change octave), or a MIDI keyboard in browsers that support Web MIDI
(Chrome, Edge, Opera).

Most rooms store their state in the URL, so a link reproduces what you were looking at.

## Running locally

Requires Node.js 22 or later.

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```sh
npm test           # unit tests (Vitest)
npm run typecheck
npm run lint       # oxlint
npm run build      # production build in dist/
npm run preview    # serve dist/ locally
```

## How it is built

- React 19, TypeScript and Vite. Routing uses `HashRouter`, so the build runs from any path
  without server rewrites.
- `src/theory` is a self-contained theory engine with no UI code: spelled notes and intervals,
  the scale and chord catalogs, keys, roman numeral parsing and analysis, and voice leading.
  Spelling is always derived from interval arithmetic, so C♯ Lydian contains F𝄪, not G.
- Notation is engraved with [VexFlow](https://www.vexflow.com/). It is loaded on demand.
- Instruments are sampled: the grand piano is the Salamander Grand Piano (CC BY 3.0), and the
  electric piano, organ, strings and harp come from the Musyng Kite soundfont (CC BY-SA 3.0). The
  recordings (4.6 MB) are in `public/samples` and load in the background for the chosen
  instrument only; a synthesized stand-in plays until they arrive or if they cannot be fetched.
  See [public/samples/CREDITS.md](public/samples/CREDITS.md). Clicks and percussion are synthesized.
- Each room lives in `src/features/<room>` with its own components, styles and tested logic.
- Classical excerpts in the Composition rooms are encoded by hand in a compact text format and,
  where a Mutopia Project edition exists, checked note by note (pitch and onset) against its MIDI
  file. Each excerpt states how it was checked.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) documents the modules and the shared components.

### Roman numeral conventions

The Progression Lab and the rest of the app read numerals this way:

- Case gives quality: `V` major, `ii` minor. `°` (or `o`) diminished, `ø` (or `h`) half-diminished, `+` augmented.
- Unmarked numerals use the key's own scale (natural minor in minor keys). In minor, `vii°` and
  `vii°7` use the raised leading tone.
- Numerals with an accidental are measured from the major scale on the tonic, so `bVI` is A♭ in
  both C major and C minor. `n` or `♮` marks a natural (`nvi` in C minor is A minor).
- Figures: `6` and `64` for triad inversions; `7`, `65`, `43`, `42` for seventh chords.
- Secondary functions chain: `V7/V`, `vii°7/ii`, `V/V/V`.
- Special chords: `N6`, `It+6`, `Fr+6`, `Ger+6`, `Cad64`.
- Suffixes: `maj7`, `9`, `11`, `13`, `add9`, `sus4`, `7sus4`, `7b9`, `7#9`, `7alt`, `6/9` and others.

## Deploying

### GitHub Pages

`.github/workflows/deploy.yml` runs the type check, tests and build on every push and pull
request. Pushes to `main` are also published to Pages.

One-time setup: in the repository on GitHub, open Settings, then Pages, and set Source to
"GitHub Actions". The next push to `main` publishes the site at
`https://<user>.github.io/music-theory-explorer/`.

To use a custom domain with Pages, add it under Settings, then Pages, then Custom domain, and
create the DNS record GitHub shows you. No code changes are needed because asset paths are relative.

### AWS Amplify

`amplify.yml` contains the build settings. In the Amplify console, connect the repository, choose
the branch, and Amplify picks up the file. Custom domains are added under Hosting, then Custom
domains. No rewrite rules are needed.

## License

The source code is MIT licensed; see [LICENSE](LICENSE). The instrument recordings in
`public/samples` keep their own Creative Commons licenses; see
[public/samples/CREDITS.md](public/samples/CREDITS.md).
