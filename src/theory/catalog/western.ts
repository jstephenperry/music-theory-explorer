import { define } from './define';

/** Western common-practice and modal scales: diatonic modes and the modes of the minor and major variants. */
export const WESTERN = [
  ...define('western', 'Diatonic modes', [
  {
    id: 'ionian', name: 'Ionian (Major)', aliases: ['major'],
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
    description: 'The major scale. Bright and stable, with a strong pull from the leading tone (7) to the tonic.',
    mood: ['bright', 'stable', 'resolved'], characteristic: [3, 6], modeOf: { parent: 'ionian', degree: 1 }, brightness: 6, chordId: 'maj7',
  },
  {
    id: 'dorian', name: 'Dorian',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
    description: 'A minor mode with a raised 6th, which makes it brighter than natural minor. Common in jazz, funk, folk and rock (So What, Oye Como Va).',
    mood: ['jazzy', 'funk', 'folk'], characteristic: [5], modeOf: { parent: 'ionian', degree: 2 }, brightness: 4, chordId: 'm7',
  },
  {
    id: 'phrygian', name: 'Phrygian',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
    description: 'A minor mode with a lowered 2nd. Dark and tense; the half step above the tonic is typical of Spanish music and metal.',
    mood: ['dark', 'tense', 'Spanish'], characteristic: [1], modeOf: { parent: 'ionian', degree: 3 }, brightness: 2, chordId: 'm7',
  },
  {
    id: 'lydian', name: 'Lydian',
    intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
    description: 'A major mode with a raised 4th. The brightest diatonic mode, heard in film scores and in The Simpsons theme.',
    mood: ['bright', 'film'], characteristic: [3], modeOf: { parent: 'ionian', degree: 4 }, brightness: 7, chordId: 'maj7#11',
  },
  {
    id: 'mixolydian', name: 'Mixolydian',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'A major mode with a lowered 7th, common in blues and rock; the natural scale of the dominant seventh chord.',
    mood: ['bluesy', 'rock'], characteristic: [6], modeOf: { parent: 'ionian', degree: 5 }, brightness: 5, chordId: '7',
  },
  {
    id: 'aeolian', name: 'Aeolian (Natural minor)', aliases: ['minor', 'natural minor'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
    description: 'The natural minor scale. Its 7th lies a whole step below the tonic, so it lacks the leading tone of harmonic minor.',
    mood: ['dark', 'sad'], characteristic: [5], modeOf: { parent: 'ionian', degree: 6 }, brightness: 3, chordId: 'm7',
  },
  {
    id: 'locrian', name: 'Locrian',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
    description: 'The darkest diatonic mode, with a diminished 5th above the tonic. Unstable because its tonic triad is diminished; heard over half-diminished chords.',
    mood: ['unstable', 'dark'], characteristic: [1, 4], modeOf: { parent: 'ionian', degree: 7 }, brightness: 1, chordId: 'm7b5',
  },
  ]),

  ...define('western', 'Medieval church modes', [
    {
      id: 'gregorian-1', name: 'Mode 1: Dorian (authentic protus)', tonic: 'D',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
      forms: [{ label: 'Ambitus', notes: 'P1 M2 m3 P4 P5 M6 m7 P8' }],
      facts: [['Final', 'D'], ['Reciting tone (tenor)', 'A'], ['Range', 'D to d']],
      description: 'The first of the eight modes of Gregorian chant. Authentic modes run from the final up an octave; the reciting tone a fifth above the final carries most of a psalm tone. B♭ was often sung instead of B to avoid a tritone with F.',
    },
    {
      id: 'gregorian-2', name: 'Mode 2: Hypodorian (plagal protus)', tonic: 'D',
      intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
      forms: [{ label: 'Ambitus', notes: '-P5 -M6 -m7 P1 M2 m3 P4 P5' }],
      facts: [['Final', 'D'], ['Reciting tone (tenor)', 'F'], ['Range', 'A to a']],
      description: 'The plagal partner of mode 1. It shares the final D, but the melody lies a fourth lower, from the A below the final to the A above it, and recites on F.',
    },
    {
      id: 'gregorian-3', name: 'Mode 3: Phrygian (authentic deuterus)', tonic: 'E',
      intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      forms: [{ label: 'Ambitus', notes: 'P1 m2 m3 P4 P5 m6 m7 P8' }],
      facts: [['Final', 'E'], ['Reciting tone (tenor)', 'C'], ['Range', 'E to e']],
      description: 'Final E with the half step above it. The reciting tone moved from B to C in the Middle Ages, because B was unstable (it could be flattened).',
    },
    {
      id: 'gregorian-4', name: 'Mode 4: Hypophrygian (plagal deuterus)', tonic: 'E',
      intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
      forms: [{ label: 'Ambitus', notes: '-P5 -m6 -m7 P1 m2 m3 P4 P5' }],
      facts: [['Final', 'E'], ['Reciting tone (tenor)', 'A'], ['Range', 'B to b']],
      description: 'The plagal partner of mode 3: final E, range from the B below to the B above, reciting on A.',
    },
    {
      id: 'gregorian-5', name: 'Mode 5: Lydian (authentic tritus)', tonic: 'F',
      intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
      forms: [{ label: 'Ambitus', notes: 'P1 M2 M3 A4 P5 M6 M7 P8' }],
      facts: [['Final', 'F'], ['Reciting tone (tenor)', 'C'], ['Range', 'F to f']],
      description: 'Final F. In practice B♭ was used so often that many mode 5 chants sound like F major, which is one source of the later major mode.',
    },
    {
      id: 'gregorian-6', name: 'Mode 6: Hypolydian (plagal tritus)', tonic: 'F',
      intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
      forms: [{ label: 'Ambitus', notes: '-P5 -M6 -M7 P1 M2 M3 A4 P5' }],
      facts: [['Final', 'F'], ['Reciting tone (tenor)', 'A'], ['Range', 'C to c']],
      description: 'The plagal partner of mode 5: final F, range from the C below to the C above, reciting on A. Usually sung with B♭.',
    },
    {
      id: 'gregorian-7', name: 'Mode 7: Mixolydian (authentic tetrardus)', tonic: 'G',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      forms: [{ label: 'Ambitus', notes: 'P1 M2 M3 P4 P5 M6 m7 P8' }],
      facts: [['Final', 'G'], ['Reciting tone (tenor)', 'D'], ['Range', 'G to g']],
      description: 'Final G with a whole step below the upper octave. Bright, with melodies that often rise high above the final.',
    },
    {
      id: 'gregorian-8', name: 'Mode 8: Hypomixolydian (plagal tetrardus)', tonic: 'G',
      intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
      forms: [{ label: 'Ambitus', notes: '-P5 -M6 -m7 P1 M2 M3 P4 P5' }],
      facts: [['Final', 'G'], ['Reciting tone (tenor)', 'C'], ['Range', 'D to d']],
      description: 'The plagal partner of mode 7: final G, range from the D below to the D above, reciting on C.',
    },
  ]),

  ...define('western', 'Melodic minor modes', [
  {
    id: 'melodic-minor', name: 'Melodic minor (Jazz minor)', aliases: ['jazz minor'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
    description: 'Minor third with a major 6th and 7th. In classical practice used ascending only; in jazz used in both directions over minor-major seventh chords.',
    mood: ['jazzy', 'bittersweet'], characteristic: [5, 6], modeOf: { parent: 'melodic-minor', degree: 1 }, chordId: 'mMaj7',
    forms: [
      { label: 'Ascending (classical)', notes: 'P1 M2 m3 P4 P5 M6 M7 P8' },
      { label: 'Descending (classical, natural minor)', notes: 'P8 m7 m6 P5 P4 m3 M2 P1' },
    ],
  },
  {
    id: 'dorian-b2', name: 'Dorian ♭2 (Phrygian ♮6)', aliases: ['phrygian natural 6'],
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Second mode of melodic minor. Phrygian with a major 6th; used over sus(b9) chords.',
    mood: ['dark', 'modern'], characteristic: [1, 5], modeOf: { parent: 'melodic-minor', degree: 2 }, chordId: '7sus4',
  },
  {
    id: 'lydian-augmented', name: 'Lydian augmented',
    intervals: ['P1', 'M2', 'M3', 'A4', 'A5', 'M6', 'M7'],
    description: 'Third mode of melodic minor. Lydian with a raised 5th; used over maj7(#5) chords.',
    mood: ['bright', 'jazzy'], characteristic: [3, 4], modeOf: { parent: 'melodic-minor', degree: 3 }, chordId: 'maj7#5',
  },
  {
    id: 'lydian-dominant', name: 'Lydian dominant (Acoustic)', aliases: ['acoustic scale', 'overtone scale', 'lydian b7'],
    intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Fourth mode of melodic minor. Mixolydian with a raised 4th; closely matches the lower overtone series. The sound of 7(#11) chords and tritone substitutions.',
    mood: ['bright', 'jazzy', 'acoustic'], characteristic: [3, 6], modeOf: { parent: 'melodic-minor', degree: 4 }, chordId: '7#11',
  },
  {
    id: 'mixolydian-b6', name: 'Mixolydian ♭6 (Aeolian dominant)', aliases: ['hindu', 'aeolian dominant'],
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'm7'],
    description: 'Fifth mode of melodic minor. A major third with a minor 6th: half major, half minor.',
    mood: ['bittersweet'], characteristic: [2, 5], modeOf: { parent: 'melodic-minor', degree: 5 }, chordId: '7b13',
  },
  {
    id: 'locrian-nat2', name: 'Locrian ♮2 (Half-diminished)', aliases: ['half diminished', 'aeolian b5'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'm7'],
    description: 'Sixth mode of melodic minor. Locrian with a natural 2nd; the preferred jazz scale over m7(b5) chords.',
    mood: ['dark', 'jazzy'], characteristic: [1, 4], modeOf: { parent: 'melodic-minor', degree: 6 }, chordId: 'm7b5',
  },
  {
    id: 'altered', name: 'Altered (Super Locrian)', aliases: ['super locrian', 'diminished whole tone'],
    intervals: ['P1', 'm2', 'm3', 'd4', 'd5', 'm6', 'm7'],
    description: 'Seventh mode of melodic minor. Contains every altered tension (b9, #9, #11, b13) over a dominant chord: maximum tension before resolution.',
    mood: ['tense', 'outside', 'jazzy'], characteristic: [1, 2, 4, 5], modeOf: { parent: 'melodic-minor', degree: 7 }, chordId: '7alt',
  },
  ]),

  ...define('western', 'Harmonic minor modes', [
  {
    id: 'harmonic-minor', name: 'Harmonic minor',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Natural minor with a raised 7th, creating a leading tone and a major V chord. The raised 7th leaves an augmented 2nd between 6 and 7.',
    mood: ['dramatic', 'classical'], characteristic: [5, 6], modeOf: { parent: 'harmonic-minor', degree: 1 }, chordId: 'mMaj7',
  },
  {
    id: 'locrian-nat6', name: 'Locrian ♮6',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'M6', 'm7'],
    description: 'Second mode of harmonic minor. Locrian with a raised 6th.',
    mood: ['dark', 'unstable'], characteristic: [5], modeOf: { parent: 'harmonic-minor', degree: 2 }, chordId: 'm7b5',
  },
  {
    id: 'ionian-sharp5', name: 'Ionian ♯5 (Ionian augmented)',
    intervals: ['P1', 'M2', 'M3', 'P4', 'A5', 'M6', 'M7'],
    description: 'Third mode of harmonic minor. Major with an augmented 5th.',
    mood: ['tense', 'bright'], characteristic: [4], modeOf: { parent: 'harmonic-minor', degree: 3 }, chordId: 'maj7#5',
  },
  {
    id: 'dorian-sharp4', name: 'Dorian ♯4 (Ukrainian Dorian)', aliases: ['ukrainian dorian', 'romanian minor'],
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Fourth mode of harmonic minor. Common in Eastern European, Jewish (Misheberakh) and Romani music.',
    mood: ['folk', 'klezmer'], characteristic: [3], modeOf: { parent: 'harmonic-minor', degree: 4 }, chordId: 'm7',
  },
  {
    id: 'phrygian-dominant', name: 'Phrygian dominant', aliases: ['spanish phrygian', 'freygish', 'hijaz'],
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'],
    description: 'Fifth mode of harmonic minor. A major third over a flat 2nd: the sound of flamenco, klezmer and Middle Eastern music, and of V7(b9) in minor keys.',
    mood: ['Spanish', 'flamenco', 'klezmer'], characteristic: [1, 2], modeOf: { parent: 'harmonic-minor', degree: 5 }, chordId: '7b9',
  },
  {
    id: 'lydian-sharp2', name: 'Lydian ♯2',
    intervals: ['P1', 'A2', 'M3', 'A4', 'P5', 'M6', 'M7'],
    description: 'Sixth mode of harmonic minor. Brighter than Lydian, with an augmented 2nd at the bottom.',
    mood: ['bright'], characteristic: [1, 3], modeOf: { parent: 'harmonic-minor', degree: 6 }, chordId: 'maj7#11',
  },
  {
    id: 'ultralocrian', name: 'Ultralocrian (Altered ♭♭7)', aliases: ['super locrian bb7'],
    intervals: ['P1', 'm2', 'm3', 'd4', 'd5', 'm6', 'd7'],
    description: 'Seventh mode of harmonic minor. Fits the diminished seventh chord.',
    mood: ['dark', 'unstable'], characteristic: [3, 6], modeOf: { parent: 'harmonic-minor', degree: 7 }, chordId: 'dim7',
  },
  ]),

  ...define('western', 'Harmonic major modes', [
  {
    id: 'harmonic-major', name: 'Harmonic major',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Major with a lowered 6th. Provides the minor iv chord and the fully diminished vii°7 inside a major key.',
    mood: ['romantic', 'bittersweet'], characteristic: [5], modeOf: { parent: 'harmonic-major', degree: 1 }, chordId: 'maj7',
  },
  {
    id: 'dorian-b5', name: 'Dorian ♭5',
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'M6', 'm7'],
    description: 'Second mode of harmonic major.', characteristic: [4], modeOf: { parent: 'harmonic-major', degree: 2 }, chordId: 'm7b5',
  },
  {
    id: 'phrygian-b4', name: 'Phrygian ♭4',
    intervals: ['P1', 'm2', 'm3', 'd4', 'P5', 'm6', 'm7'],
    description: 'Third mode of harmonic major.', characteristic: [3], modeOf: { parent: 'harmonic-major', degree: 3 }, chordId: 'm7',
  },
  {
    id: 'lydian-b3', name: 'Lydian ♭3 (Lydian diminished)',
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'M7'],
    description: 'Fourth mode of harmonic major.', characteristic: [2, 3], modeOf: { parent: 'harmonic-major', degree: 4 }, chordId: 'mMaj7',
  },
  {
    id: 'mixolydian-b2', name: 'Mixolydian ♭2',
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Fifth mode of harmonic major.', characteristic: [1], modeOf: { parent: 'harmonic-major', degree: 5 }, chordId: '7b9',
  },
  {
    id: 'lydian-augmented-sharp2', name: 'Lydian augmented ♯2',
    intervals: ['P1', 'A2', 'M3', 'A4', 'A5', 'M6', 'M7'],
    description: 'Sixth mode of harmonic major.', characteristic: [1, 4], modeOf: { parent: 'harmonic-major', degree: 6 }, chordId: 'maj7#5',
  },
  {
    id: 'locrian-bb7', name: 'Locrian ♭♭7',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'd7'],
    description: 'Seventh mode of harmonic major.', characteristic: [6], modeOf: { parent: 'harmonic-major', degree: 7 }, chordId: 'dim7',
  },
  ]),

  ...define('western', 'Double harmonic modes', [
  {
    id: 'double-harmonic', name: 'Double harmonic major (Byzantine)', aliases: ['byzantine', 'arabic', 'gypsy major'],
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Its two augmented seconds are associated with Middle Eastern music (Misirlou). Equivalent to the Hijaz Kar maqam in 12-tone tuning.',
    mood: ['dramatic'], characteristic: [1, 5], chordId: 'maj7', modeOf: { parent: 'double-harmonic', degree: 1 },
  },
    {
      id: 'lydian-sharp2-sharp6', name: 'Lydian ♯2 ♯6',
      intervals: ['P1', 'A2', 'M3', 'A4', 'P5', 'A6', 'M7'],
      description: 'Second mode of the double harmonic major scale. Lydian with a raised 2nd and 6th, which creates two augmented seconds.',
      characteristic: [1, 5], modeOf: { parent: 'double-harmonic', degree: 2 },
    },
    {
      id: 'ultraphrygian', name: 'Ultraphrygian',
      intervals: ['P1', 'm2', 'm3', 'd4', 'P5', 'm6', 'd7'],
      description: 'Third mode of the double harmonic major scale. Phrygian with a diminished 4th and diminished 7th.',
      characteristic: [3, 6], modeOf: { parent: 'double-harmonic', degree: 3 },
    },
  {
    id: 'hungarian-minor', name: 'Hungarian minor', aliases: ['double harmonic minor', 'gypsy minor'],
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'm6', 'M7'],
    description: 'Harmonic minor with a raised 4th: two augmented seconds.',
    mood: ['dramatic'], characteristic: [3, 6], chordId: 'mMaj7', modeOf: { parent: 'double-harmonic', degree: 4 },
  },
    {
      id: 'oriental', name: 'Oriental',
      intervals: ['P1', 'm2', 'M3', 'P4', 'd5', 'M6', 'm7'],
      description: 'Fifth mode of the double harmonic major scale: a dominant-like scale with a flat 2nd and flat 5th.',
      characteristic: [1, 4], modeOf: { parent: 'double-harmonic', degree: 5 },
    },
    {
      id: 'ionian-sharp2-sharp5', name: 'Ionian ♯2 ♯5',
      intervals: ['P1', 'A2', 'M3', 'P4', 'A5', 'M6', 'M7'],
      description: 'Sixth mode of the double harmonic major scale.',
      characteristic: [1, 4], modeOf: { parent: 'double-harmonic', degree: 6 },
    },
    {
      id: 'locrian-bb3-bb7', name: 'Locrian 𝄫3 𝄫7',
      intervals: ['P1', 'm2', 'd3', 'P4', 'd5', 'm6', 'd7'],
      description: 'Seventh mode of the double harmonic major scale. Its tonic triad is a diminished triad with a doubly flattened third.',
      characteristic: [2, 6], modeOf: { parent: 'double-harmonic', degree: 7 },
    },
  ]),

  ...define('western', 'Other heptatonic scales', [
  {
    id: 'hungarian-major', name: 'Hungarian major',
    intervals: ['P1', 'A2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'A dominant scale with a raised 2nd and 4th.',
    characteristic: [1, 3], chordId: '7',
  },
  {
    id: 'neapolitan-major', name: 'Neapolitan major',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'M6', 'M7'],
    description: 'Melodic minor with a lowered 2nd.',
    mood: ['dark'], characteristic: [1], chordId: 'mMaj7',
  },
  {
    id: 'neapolitan-minor', name: 'Neapolitan minor',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Harmonic minor with a lowered 2nd.',
    mood: ['dark', 'dramatic'], characteristic: [1], chordId: 'mMaj7',
  },
  {
    id: 'persian', name: 'Persian',
    intervals: ['P1', 'm2', 'M3', 'P4', 'd5', 'm6', 'M7'],
    description: 'Double harmonic with a diminished 5th: four half steps and two augmented seconds.',
    characteristic: [1, 4],
  },
    {
      id: 'major-locrian', name: 'Major Locrian',
      intervals: ['P1', 'M2', 'M3', 'P4', 'd5', 'm6', 'm7'],
      description: 'A major third and a lowered 5th, 6th and 7th: the upper half of a whole-tone scale over a major lower tetrachord.',
      characteristic: [4, 5], chordId: '7b5',
    },
    {
      id: 'leading-whole-tone', name: 'Leading whole tone',
      intervals: ['P1', 'M2', 'M3', 'A4', 'A5', 'A6', 'M7'],
      description: 'A whole-tone scale with a leading tone added below the upper tonic.',
      characteristic: [4, 5],
    },
  ]),
];
