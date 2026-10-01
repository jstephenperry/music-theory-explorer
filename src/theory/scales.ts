/**
 * Scale and mode catalog.
 *
 * Every scale is defined as a list of intervals above the root. Heptatonic scales use one letter
 * per degree, so spelling is always theoretically correct (C# Lydian contains F##, not G).
 */
import { interval, transpose, degreeLabel, type Interval } from './intervals';
import { mod, type Note } from './notes';

export type ScaleFamily =
  | 'Diatonic modes'
  | 'Melodic minor modes'
  | 'Harmonic minor modes'
  | 'Harmonic major modes'
  | 'Pentatonic'
  | 'Blues'
  | 'Bebop'
  | 'Symmetric'
  | 'Exotic & world';

export interface ScaleDef {
  id: string;
  name: string;
  family: ScaleFamily;
  intervals: string[];
  aliases?: string[];
  /** Short description of sound and usage. */
  description: string;
  /** Mood words, used as tags. */
  mood?: string[];
  /** Indices (0-based) of degrees that define the mode's color compared with its nearest major or minor scale. */
  characteristic?: number[];
  /** Parent scale id and 1-based degree, when the scale is a mode of another. */
  modeOf?: { parent: string; degree: number };
  /** For diatonic modes: 1 (darkest) to 7 (brightest). */
  brightness?: number;
  /** Typical chord to play the scale over, as a chord id from the chord catalog. */
  chordId?: string;
}

export const SCALE_FAMILIES: ScaleFamily[] = [
  'Diatonic modes',
  'Melodic minor modes',
  'Harmonic minor modes',
  'Harmonic major modes',
  'Pentatonic',
  'Blues',
  'Bebop',
  'Symmetric',
  'Exotic & world',
];

export const SCALES: ScaleDef[] = [
  // ---------- Diatonic (church) modes ----------
  {
    id: 'ionian', name: 'Ionian (Major)', family: 'Diatonic modes', aliases: ['major'],
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
    description: 'The major scale. Bright and stable, with a strong pull from the leading tone (7) to the tonic.',
    mood: ['bright', 'stable', 'resolved'], characteristic: [3, 6], modeOf: { parent: 'ionian', degree: 1 }, brightness: 6, chordId: 'maj7',
  },
  {
    id: 'dorian', name: 'Dorian', family: 'Diatonic modes',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
    description: 'A minor mode with a raised 6th. Soulful and less dark than natural minor; common in jazz, funk, folk and rock (So What, Oye Como Va).',
    mood: ['soulful', 'cool', 'minor but hopeful'], characteristic: [5], modeOf: { parent: 'ionian', degree: 2 }, brightness: 4, chordId: 'm7',
  },
  {
    id: 'phrygian', name: 'Phrygian', family: 'Diatonic modes',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
    description: 'A minor mode with a lowered 2nd. Dark and tense, with a Spanish or metal flavor from the half step above the tonic.',
    mood: ['dark', 'exotic', 'tense'], characteristic: [1], modeOf: { parent: 'ionian', degree: 3 }, brightness: 2, chordId: 'm7',
  },
  {
    id: 'lydian', name: 'Lydian', family: 'Diatonic modes',
    intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
    description: 'A major mode with a raised 4th. The brightest diatonic mode: dreamy, floating and cinematic (The Simpsons theme, film scores).',
    mood: ['dreamy', 'bright', 'floating'], characteristic: [3], modeOf: { parent: 'ionian', degree: 4 }, brightness: 7, chordId: 'maj7#11',
  },
  {
    id: 'mixolydian', name: 'Mixolydian', family: 'Diatonic modes',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'A major mode with a lowered 7th. Bluesy and rock-flavored; the natural scale of the dominant seventh chord.',
    mood: ['bluesy', 'earthy', 'rock'], characteristic: [6], modeOf: { parent: 'ionian', degree: 5 }, brightness: 5, chordId: '7',
  },
  {
    id: 'aeolian', name: 'Aeolian (Natural minor)', family: 'Diatonic modes', aliases: ['minor', 'natural minor'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
    description: 'The natural minor scale. Melancholic and introspective, without the leading tone of harmonic minor.',
    mood: ['sad', 'melancholic', 'introspective'], characteristic: [5], modeOf: { parent: 'ionian', degree: 6 }, brightness: 3, chordId: 'm7',
  },
  {
    id: 'locrian', name: 'Locrian', family: 'Diatonic modes',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
    description: 'The darkest diatonic mode, with a diminished 5th above the tonic. Unstable because its tonic triad is diminished; heard over half-diminished chords.',
    mood: ['unstable', 'dark', 'eerie'], characteristic: [1, 4], modeOf: { parent: 'ionian', degree: 7 }, brightness: 1, chordId: 'm7b5',
  },

  // ---------- Melodic minor modes ----------
  {
    id: 'melodic-minor', name: 'Melodic minor (Jazz minor)', family: 'Melodic minor modes', aliases: ['jazz minor'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
    description: 'Minor third with a major 6th and 7th. In classical practice used ascending only; in jazz used in both directions over minor-major seventh chords.',
    mood: ['sophisticated', 'bittersweet'], characteristic: [5, 6], modeOf: { parent: 'melodic-minor', degree: 1 }, chordId: 'mMaj7',
  },
  {
    id: 'dorian-b2', name: 'Dorian ♭2 (Phrygian ♮6)', family: 'Melodic minor modes', aliases: ['phrygian natural 6'],
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Second mode of melodic minor. Phrygian darkness with a brighter 6th; used over sus(b9) chords.',
    mood: ['dark', 'modern'], characteristic: [1, 5], modeOf: { parent: 'melodic-minor', degree: 2 }, chordId: '7sus4',
  },
  {
    id: 'lydian-augmented', name: 'Lydian augmented', family: 'Melodic minor modes',
    intervals: ['P1', 'M2', 'M3', 'A4', 'A5', 'M6', 'M7'],
    description: 'Third mode of melodic minor. Lydian with a raised 5th; an otherworldly sound over maj7(#5) chords.',
    mood: ['otherworldly', 'shimmering'], characteristic: [3, 4], modeOf: { parent: 'melodic-minor', degree: 3 }, chordId: 'maj7#5',
  },
  {
    id: 'lydian-dominant', name: 'Lydian dominant (Acoustic)', family: 'Melodic minor modes', aliases: ['acoustic scale', 'overtone scale', 'lydian b7'],
    intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Fourth mode of melodic minor. Mixolydian with a raised 4th; closely matches the lower overtone series. The sound of 7(#11) chords and tritone substitutions.',
    mood: ['bright', 'jazzy', 'acoustic'], characteristic: [3, 6], modeOf: { parent: 'melodic-minor', degree: 4 }, chordId: '7#11',
  },
  {
    id: 'mixolydian-b6', name: 'Mixolydian ♭6 (Aeolian dominant)', family: 'Melodic minor modes', aliases: ['hindu', 'aeolian dominant'],
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'm7'],
    description: 'Fifth mode of melodic minor. A major third with a minor 6th: half major, half minor.',
    mood: ['bittersweet', 'yearning'], characteristic: [2, 5], modeOf: { parent: 'melodic-minor', degree: 5 }, chordId: '7b13',
  },
  {
    id: 'locrian-nat2', name: 'Locrian ♮2 (Half-diminished)', family: 'Melodic minor modes', aliases: ['half diminished', 'aeolian b5'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'm7'],
    description: 'Sixth mode of melodic minor. Locrian with a natural 2nd; the preferred jazz scale over m7(b5) chords.',
    mood: ['dark', 'smooth'], characteristic: [1, 4], modeOf: { parent: 'melodic-minor', degree: 6 }, chordId: 'm7b5',
  },
  {
    id: 'altered', name: 'Altered (Super Locrian)', family: 'Melodic minor modes', aliases: ['super locrian', 'diminished whole tone'],
    intervals: ['P1', 'm2', 'm3', 'd4', 'd5', 'm6', 'm7'],
    description: 'Seventh mode of melodic minor. Contains every altered tension (b9, #9, #11, b13) over a dominant chord: maximum tension before resolution.',
    mood: ['tense', 'outside', 'jazzy'], characteristic: [1, 2, 4, 5], modeOf: { parent: 'melodic-minor', degree: 7 }, chordId: '7alt',
  },

  // ---------- Harmonic minor modes ----------
  {
    id: 'harmonic-minor', name: 'Harmonic minor', family: 'Harmonic minor modes',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Natural minor with a raised 7th, creating a leading tone and a major V chord. The augmented 2nd between 6 and 7 gives an exotic color.',
    mood: ['dramatic', 'exotic', 'classical'], characteristic: [5, 6], modeOf: { parent: 'harmonic-minor', degree: 1 }, chordId: 'mMaj7',
  },
  {
    id: 'locrian-nat6', name: 'Locrian ♮6', family: 'Harmonic minor modes',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'M6', 'm7'],
    description: 'Second mode of harmonic minor. Locrian with a raised 6th.',
    mood: ['dark', 'mysterious'], characteristic: [5], modeOf: { parent: 'harmonic-minor', degree: 2 }, chordId: 'm7b5',
  },
  {
    id: 'ionian-sharp5', name: 'Ionian ♯5 (Ionian augmented)', family: 'Harmonic minor modes',
    intervals: ['P1', 'M2', 'M3', 'P4', 'A5', 'M6', 'M7'],
    description: 'Third mode of harmonic minor. Major with an augmented 5th.',
    mood: ['suspenseful', 'bright'], characteristic: [4], modeOf: { parent: 'harmonic-minor', degree: 3 }, chordId: 'maj7#5',
  },
  {
    id: 'dorian-sharp4', name: 'Dorian ♯4 (Ukrainian Dorian)', family: 'Harmonic minor modes', aliases: ['ukrainian dorian', 'romanian minor'],
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Fourth mode of harmonic minor. Common in Eastern European, Jewish (Misheberakh) and Romani music.',
    mood: ['folk', 'exotic'], characteristic: [3], modeOf: { parent: 'harmonic-minor', degree: 4 }, chordId: 'm7',
  },
  {
    id: 'phrygian-dominant', name: 'Phrygian dominant', family: 'Harmonic minor modes', aliases: ['spanish phrygian', 'freygish', 'hijaz'],
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'],
    description: 'Fifth mode of harmonic minor. A major third over a flat 2nd: the sound of flamenco, klezmer and Middle Eastern music, and of V7(b9) in minor keys.',
    mood: ['spanish', 'exotic', 'fiery'], characteristic: [1, 2], modeOf: { parent: 'harmonic-minor', degree: 5 }, chordId: '7b9',
  },
  {
    id: 'lydian-sharp2', name: 'Lydian ♯2', family: 'Harmonic minor modes',
    intervals: ['P1', 'A2', 'M3', 'A4', 'P5', 'M6', 'M7'],
    description: 'Sixth mode of harmonic minor. Very bright, with an augmented 2nd at the bottom.',
    mood: ['bright', 'exotic'], characteristic: [1, 3], modeOf: { parent: 'harmonic-minor', degree: 6 }, chordId: 'maj7#11',
  },
  {
    id: 'ultralocrian', name: 'Ultralocrian (Altered ♭♭7)', family: 'Harmonic minor modes', aliases: ['super locrian bb7'],
    intervals: ['P1', 'm2', 'm3', 'd4', 'd5', 'm6', 'd7'],
    description: 'Seventh mode of harmonic minor. Fits the diminished seventh chord.',
    mood: ['dark', 'unstable'], characteristic: [3, 6], modeOf: { parent: 'harmonic-minor', degree: 7 }, chordId: 'dim7',
  },

  // ---------- Harmonic major modes ----------
  {
    id: 'harmonic-major', name: 'Harmonic major', family: 'Harmonic major modes',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Major with a lowered 6th. Provides the minor iv chord and the fully diminished vii°7 inside a major key.',
    mood: ['romantic', 'bittersweet'], characteristic: [5], modeOf: { parent: 'harmonic-major', degree: 1 }, chordId: 'maj7',
  },
  {
    id: 'dorian-b5', name: 'Dorian ♭5', family: 'Harmonic major modes',
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'M6', 'm7'],
    description: 'Second mode of harmonic major.', characteristic: [4], modeOf: { parent: 'harmonic-major', degree: 2 }, chordId: 'm7b5',
  },
  {
    id: 'phrygian-b4', name: 'Phrygian ♭4', family: 'Harmonic major modes',
    intervals: ['P1', 'm2', 'm3', 'd4', 'P5', 'm6', 'm7'],
    description: 'Third mode of harmonic major.', characteristic: [3], modeOf: { parent: 'harmonic-major', degree: 3 }, chordId: 'm7',
  },
  {
    id: 'lydian-b3', name: 'Lydian ♭3 (Lydian diminished)', family: 'Harmonic major modes',
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'M6', 'M7'],
    description: 'Fourth mode of harmonic major.', characteristic: [2, 3], modeOf: { parent: 'harmonic-major', degree: 4 }, chordId: 'mMaj7',
  },
  {
    id: 'mixolydian-b2', name: 'Mixolydian ♭2', family: 'Harmonic major modes',
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Fifth mode of harmonic major.', characteristic: [1], modeOf: { parent: 'harmonic-major', degree: 5 }, chordId: '7b9',
  },
  {
    id: 'lydian-augmented-sharp2', name: 'Lydian augmented ♯2', family: 'Harmonic major modes',
    intervals: ['P1', 'A2', 'M3', 'A4', 'A5', 'M6', 'M7'],
    description: 'Sixth mode of harmonic major.', characteristic: [1, 4], modeOf: { parent: 'harmonic-major', degree: 6 }, chordId: 'maj7#5',
  },
  {
    id: 'locrian-bb7', name: 'Locrian ♭♭7', family: 'Harmonic major modes',
    intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'd7'],
    description: 'Seventh mode of harmonic major.', characteristic: [6], modeOf: { parent: 'harmonic-major', degree: 7 }, chordId: 'dim7',
  },

  // ---------- Pentatonic ----------
  {
    id: 'major-pentatonic', name: 'Major pentatonic', family: 'Pentatonic',
    intervals: ['P1', 'M2', 'M3', 'P5', 'M6'],
    description: 'Five notes with no half steps: impossible to play a harsh clash. Found in folk music worldwide, country, pop and rock.',
    mood: ['open', 'happy', 'folk'], modeOf: { parent: 'major-pentatonic', degree: 1 }, chordId: '6',
  },
  {
    id: 'suspended-pentatonic', name: 'Suspended pentatonic (Egyptian)', family: 'Pentatonic', aliases: ['egyptian'],
    intervals: ['P1', 'M2', 'P4', 'P5', 'm7'],
    description: 'Second mode of the major pentatonic. No third, so neither major nor minor.',
    mood: ['open', 'ambiguous'], modeOf: { parent: 'major-pentatonic', degree: 2 }, chordId: '7sus4',
  },
  {
    id: 'blues-minor-pentatonic', name: 'Man Gong (Blues minor pentatonic)', family: 'Pentatonic',
    intervals: ['P1', 'm3', 'P4', 'm6', 'm7'],
    description: 'Third mode of the major pentatonic.',
    mood: ['dark', 'sparse'], modeOf: { parent: 'major-pentatonic', degree: 3 }, chordId: 'm7',
  },
  {
    id: 'ritusen', name: 'Ritusen (Blues major pentatonic)', family: 'Pentatonic',
    intervals: ['P1', 'M2', 'P4', 'P5', 'M6'],
    description: 'Fourth mode of the major pentatonic, used in Japanese court music (gagaku).',
    mood: ['open', 'gentle'], modeOf: { parent: 'major-pentatonic', degree: 4 }, chordId: 'sus2',
  },
  {
    id: 'minor-pentatonic', name: 'Minor pentatonic', family: 'Pentatonic',
    intervals: ['P1', 'm3', 'P4', 'P5', 'm7'],
    description: 'Fifth mode of the major pentatonic. The backbone of blues and rock soloing.',
    mood: ['bluesy', 'rock', 'gritty'], modeOf: { parent: 'major-pentatonic', degree: 5 }, chordId: 'm7',
  },
  {
    id: 'hirajoshi', name: 'Hirajōshi', family: 'Pentatonic',
    intervals: ['P1', 'M2', 'm3', 'P5', 'm6'],
    description: 'A Japanese pentatonic scale used in koto music, containing half steps.',
    mood: ['japanese', 'melancholic'],
  },
  {
    id: 'in-sen', name: 'In sen', family: 'Pentatonic',
    intervals: ['P1', 'm2', 'P4', 'P5', 'm7'],
    description: 'A Japanese pentatonic scale associated with the shakuhachi.',
    mood: ['japanese', 'stark'],
  },
  {
    id: 'iwato', name: 'Iwato', family: 'Pentatonic',
    intervals: ['P1', 'm2', 'P4', 'd5', 'm7'],
    description: 'A Japanese pentatonic with a diminished fifth: very dark.',
    mood: ['japanese', 'dark'],
  },
  {
    id: 'kumoi', name: 'Kumoi', family: 'Pentatonic',
    intervals: ['P1', 'M2', 'm3', 'P5', 'M6'],
    description: 'A Japanese pentatonic resembling melodic minor with notes removed.',
    mood: ['japanese', 'gentle'],
  },

  // ---------- Blues ----------
  {
    id: 'blues', name: 'Blues (minor blues)', family: 'Blues',
    intervals: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'],
    description: 'Minor pentatonic plus the flat 5th "blue note" that slides between the 4th and 5th.',
    mood: ['bluesy', 'gritty'], characteristic: [3], chordId: '7',
  },
  {
    id: 'major-blues', name: 'Major blues', family: 'Blues',
    intervals: ['P1', 'M2', 'm3', 'M3', 'P5', 'M6'],
    description: 'Major pentatonic plus the minor 3rd, used to slide into the major 3rd. Common in country and gospel.',
    mood: ['sweet', 'country', 'gospel'], characteristic: [2], chordId: '6',
  },

  // ---------- Bebop ----------
  {
    id: 'bebop-dominant', name: 'Bebop dominant', family: 'Bebop',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
    description: 'Mixolydian with an added major 7th passing tone, so chord tones land on downbeats when playing eighth notes.',
    mood: ['jazzy', 'swinging'], characteristic: [7], chordId: '7',
  },
  {
    id: 'bebop-major', name: 'Bebop major', family: 'Bebop',
    intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M6', 'M7'],
    description: 'Major scale with an added minor 6th passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [5], chordId: '6',
  },
  {
    id: 'bebop-dorian', name: 'Bebop dorian', family: 'Bebop',
    intervals: ['P1', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'm7'],
    description: 'Dorian with an added major 3rd passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [3], chordId: 'm7',
  },
  {
    id: 'bebop-melodic-minor', name: 'Bebop melodic minor', family: 'Bebop',
    intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M6', 'M7'],
    description: 'Melodic minor with an added minor 6th passing tone.',
    mood: ['jazzy', 'swinging'], characteristic: [5], chordId: 'm6',
  },

  // ---------- Symmetric ----------
  {
    id: 'whole-tone', name: 'Whole tone', family: 'Symmetric',
    intervals: ['P1', 'M2', 'M3', 'A4', 'A5', 'A6'],
    description: 'Six notes, all a whole step apart. No leading tone and no perfect fifths, so there is no sense of a home note: dreamlike and unresolved (Debussy). Only two distinct whole-tone scales exist (Messiaen mode 1).',
    mood: ['dreamy', 'ambiguous', 'floating'], chordId: '7#5',
  },
  {
    id: 'diminished-hw', name: 'Diminished (half-whole)', family: 'Symmetric', aliases: ['dominant diminished', 'octatonic'],
    intervals: ['P1', 'm2', 'A2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Alternating half and whole steps starting with a half step. Fits 7(b9) chords. Repeats every minor third, so only three distinct versions exist (Messiaen mode 2).',
    mood: ['tense', 'symmetric', 'jazzy'], chordId: '13b9',
  },
  {
    id: 'diminished-wh', name: 'Diminished (whole-half)', family: 'Symmetric', aliases: ['octatonic'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'M6', 'M7'],
    description: 'Alternating whole and half steps. The natural scale of the diminished seventh chord.',
    mood: ['tense', 'symmetric'], chordId: 'dim7',
  },
  {
    id: 'augmented', name: 'Augmented (hexatonic)', family: 'Symmetric',
    intervals: ['P1', 'A2', 'M3', 'P5', 'm6', 'M7'],
    description: 'Alternating minor thirds and half steps; two augmented triads a half step apart. Repeats every major third (Coltrane, Liszt).',
    mood: ['symmetric', 'modern'], chordId: 'maj7#5',
  },
  {
    id: 'tritone', name: 'Tritone scale', family: 'Symmetric',
    intervals: ['P1', 'm2', 'M3', 'd5', 'P5', 'm7'],
    description: 'Two major triads a tritone apart (C and F#). Repeats every tritone; used in Stravinsky\'s Petrushka chord.',
    mood: ['clashing', 'modern'], chordId: '7b9',
  },
  {
    id: 'messiaen-3', name: 'Messiaen mode 3', family: 'Symmetric',
    intervals: ['P1', 'M2', 'm3', 'M3', 'A4', 'P5', 'm6', 'm7', 'M7'],
    description: 'Nine notes; the pattern whole-half-half repeats every major third.',
    mood: ['symmetric', 'lush'],
  },
  {
    id: 'chromatic', name: 'Chromatic', family: 'Symmetric',
    intervals: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
    description: 'All twelve pitch classes of equal temperament.',
    mood: ['complete'],
  },

  // ---------- Exotic & world ----------
  {
    id: 'double-harmonic', name: 'Double harmonic major (Byzantine)', family: 'Exotic & world', aliases: ['byzantine', 'arabic', 'gypsy major'],
    intervals: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Two augmented seconds create a strongly Middle Eastern sound (Misirlou). Equivalent to the Hijaz Kar maqam in 12-tone tuning.',
    mood: ['exotic', 'dramatic'], characteristic: [1, 5], chordId: 'maj7',
  },
  {
    id: 'hungarian-minor', name: 'Hungarian minor', family: 'Exotic & world', aliases: ['double harmonic minor', 'gypsy minor'],
    intervals: ['P1', 'M2', 'm3', 'A4', 'P5', 'm6', 'M7'],
    description: 'Harmonic minor with a raised 4th: two augmented seconds.',
    mood: ['exotic', 'dramatic'], characteristic: [3, 6], chordId: 'mMaj7',
  },
  {
    id: 'hungarian-major', name: 'Hungarian major', family: 'Exotic & world',
    intervals: ['P1', 'A2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'A dominant scale with a raised 2nd and 4th.',
    mood: ['exotic'], characteristic: [1, 3], chordId: '7',
  },
  {
    id: 'neapolitan-major', name: 'Neapolitan major', family: 'Exotic & world',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'M6', 'M7'],
    description: 'Melodic minor with a lowered 2nd.',
    mood: ['dark', 'elegant'], characteristic: [1], chordId: 'mMaj7',
  },
  {
    id: 'neapolitan-minor', name: 'Neapolitan minor', family: 'Exotic & world',
    intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'M7'],
    description: 'Harmonic minor with a lowered 2nd.',
    mood: ['dark', 'dramatic'], characteristic: [1], chordId: 'mMaj7',
  },
  {
    id: 'persian', name: 'Persian', family: 'Exotic & world',
    intervals: ['P1', 'm2', 'M3', 'P4', 'd5', 'm6', 'M7'],
    description: 'Double harmonic with a diminished 5th: many half steps and a dense, mysterious color.',
    mood: ['exotic', 'mysterious'], characteristic: [1, 4],
  },
  {
    id: 'enigmatic', name: 'Enigmatic', family: 'Exotic & world',
    intervals: ['P1', 'm2', 'M3', 'A4', 'A5', 'A6', 'M7'],
    description: 'An unusual scale published by Verdi as a harmonization exercise (Ave Maria, 1889).',
    mood: ['strange', 'chromatic'], characteristic: [1, 4, 5],
  },
  {
    id: 'prometheus', name: 'Prometheus', family: 'Exotic & world', aliases: ['mystic'],
    intervals: ['P1', 'M2', 'M3', 'A4', 'M6', 'm7'],
    description: 'The six-note scale behind Scriabin\'s mystic chord, built largely from fourths.',
    mood: ['mystic', 'shimmering'], chordId: 'mystic',
  },
  {
    id: 'pelog', name: 'Pelog (12-TET approximation)', family: 'Exotic & world',
    intervals: ['P1', 'm2', 'm3', 'P5', 'm6'],
    description: 'An approximation of the Javanese gamelan pelog selisir scale. The real tuning does not fit 12-tone equal temperament.',
    mood: ['gamelan', 'exotic'],
  },
];

export const SCALE_BY_ID: Record<string, ScaleDef> = Object.fromEntries(SCALES.map((s) => [s.id, s]));

export function getScale(id: string): ScaleDef {
  const s = SCALE_BY_ID[id];
  if (!s) throw new Error(`Unknown scale: ${id}`);
  return s;
}

export function scaleIntervals(def: ScaleDef): Interval[] {
  return def.intervals.map(interval);
}

/** Spelled notes of a scale built on a root. */
export function buildScale(root: Note, scaleId: string): Note[] {
  return scaleIntervals(getScale(scaleId)).map((i) => transpose(root, i));
}

/** Pitch classes of a scale built on a root. */
export function scalePcs(rootPc: number, scaleId: string): number[] {
  return scaleIntervals(getScale(scaleId)).map((i) => mod(rootPc + i.semis, 12));
}

/** Formula such as "1 2 ♭3 4 5 6 ♭7". */
export function scaleFormula(scaleId: string, unicode = true): string[] {
  return scaleIntervals(getScale(scaleId)).map((i) => degreeLabel(i, unicode));
}

/** Step pattern in semitones, e.g. [2,2,1,2,2,2,1] for major. */
export function stepPattern(scaleId: string): number[] {
  const semis = scaleIntervals(getScale(scaleId)).map((i) => i.semis);
  return semis.map((s, idx) => (idx + 1 < semis.length ? semis[idx + 1] : 12) - s);
}

/** Human readable step names: W, H, W+H (augmented second), etc. */
export function stepNames(scaleId: string): string[] {
  return stepPattern(scaleId).map((s) => (s === 1 ? 'H' : s === 2 ? 'W' : s === 3 ? 'W+H' : s === 4 ? '2W' : `${s}`));
}

/** All modes (rotations) sharing a parent scale, in degree order. */
export function modesOf(parentId: string): ScaleDef[] {
  return SCALES.filter((s) => s.modeOf?.parent === parentId).sort((a, b) => a.modeOf!.degree - b.modeOf!.degree);
}

export function isHeptatonic(scaleId: string): boolean {
  return getScale(scaleId).intervals.length === 7;
}

/**
 * The number of distinct transpositions of a scale (12 for most scales, 2 for whole tone, 3 for octatonic ...).
 */
export function distinctTranspositions(scaleId: string): number {
  const set = new Set(scalePcs(0, scaleId));
  for (let t = 1; t <= 12; t++) {
    const shifted = new Set([...set].map((p) => mod(p + t, 12)));
    if ([...set].every((p) => shifted.has(p))) return t;
  }
  return 12;
}

/** Find every catalog scale (on any root) whose pitch-class set equals the given set. */
export function findScalesByPcs(pcs: number[]): Array<{ rootPc: number; scale: ScaleDef }> {
  const target = [...new Set(pcs.map((p) => mod(p, 12)))].sort((a, b) => a - b).join(',');
  const results: Array<{ rootPc: number; scale: ScaleDef }> = [];
  for (const scale of SCALES) {
    for (const rootPc of new Set(pcs.map((p) => mod(p, 12)))) {
      const key = [...new Set(scalePcs(rootPc, scale.id))].sort((a, b) => a - b).join(',');
      if (key === target) results.push({ rootPc, scale });
    }
  }
  return results;
}

/** Scales containing every given pitch class (supersets), sorted by size. */
export function scalesContaining(pcs: number[]): Array<{ rootPc: number; scale: ScaleDef }> {
  const wanted = new Set(pcs.map((p) => mod(p, 12)));
  const results: Array<{ rootPc: number; scale: ScaleDef }> = [];
  for (const scale of SCALES) {
    if (scale.id === 'chromatic') continue;
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const set = new Set(scalePcs(rootPc, scale.id));
      if ([...wanted].every((p) => set.has(p))) results.push({ rootPc, scale });
    }
  }
  return results.sort((a, b) => a.scale.intervals.length - b.scale.intervals.length);
}

