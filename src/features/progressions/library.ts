/**
 * Library of named progressions. Numerals are relative to the key; a ":n" suffix gives the
 * duration in beats (default 4). `mode` is the mode the progression is written for ("both" means
 * it works unchanged in either mode).
 */
import type { AccompStyle } from './accompaniment';

export type LibraryGroup = 'Cadences and schemata' | 'Grounds and sequences' | 'Jazz' | 'Blues and gospel' | 'Modal and rock' | 'Pop' | 'Chromatic and cinematic';

export const LIBRARY_GROUPS: LibraryGroup[] = ['Cadences and schemata', 'Grounds and sequences', 'Jazz', 'Blues and gospel', 'Modal and rock', 'Pop', 'Chromatic and cinematic'];

export interface LibraryEntry {
  id: string;
  name: string;
  group: LibraryGroup;
  era: string;
  description: string;
  progression: string;
  mode: 'major' | 'minor' | 'both';
  bpm?: number;
  style?: AccompStyle;
}

export const LIBRARY: LibraryEntry[] = [
  // ---------- Cadences and schemata ----------
  {
    id: 'cad64', name: 'Authentic cadence with Cad⁶₄', group: 'Cadences and schemata', era: 'Classical',
    description: 'Predominant, then the cadential six-four delays V before the final tonic. The textbook close.',
    progression: 'I IV Cad64:2 V7:2 I', mode: 'major', style: 'alberti', bpm: 84,
  },
  {
    id: 'deceptive', name: 'Deceptive cadence', group: 'Cadences and schemata', era: 'Classical to film',
    description: 'V⁷ resolves to vi instead of I. The bass rises a step and the phrase is extended.',
    progression: 'I ii6 V7 vi', mode: 'major', bpm: 80,
  },
  {
    id: 'minor-plagal', name: 'Minor plagal (IV to iv to I)', group: 'Cadences and schemata', era: 'Romantic, Beatles, film',
    description: 'The major IV turns minor (♭6 borrowed from the parallel minor) before home.',
    progression: 'I IV iv I', mode: 'major', style: 'arpeggio', bpm: 72,
  },
  {
    id: 'picardy', name: 'Picardy third', group: 'Cadences and schemata', era: 'Renaissance, Baroque',
    description: 'A minor progression that ends on a major tonic, borrowed from the parallel major.',
    progression: 'i iv V7 I:8', mode: 'minor', bpm: 72,
  },
  {
    id: 'neapolitan', name: 'Neapolitan cadence', group: 'Cadences and schemata', era: 'Baroque to Romantic',
    description: 'The ♭II chord in first inversion as a dark predominant; ♭2 falls through the leading tone to the tonic.',
    progression: 'i N6 V7 i', mode: 'minor', bpm: 76,
  },
  {
    id: 'italian6', name: 'Italian augmented sixth', group: 'Cadences and schemata', era: 'Classical',
    description: '♭6 in the bass and ♯4 above spread outward by half steps to the octave on 5.',
    progression: 'i VI It+6 V i', mode: 'minor', bpm: 76,
  },
  {
    id: 'french6', name: 'French augmented sixth', group: 'Cadences and schemata', era: 'Classical, Romantic',
    description: 'The bass slides from IV⁶ down to ♭6; the French sixth adds 2, a whole-tone tinge.',
    progression: 'I IV6 Fr+6 V7 I', mode: 'major', bpm: 76,
  },
  {
    id: 'german6', name: 'German sixth to Cad⁶₄', group: 'Cadences and schemata', era: 'Classical, Romantic',
    description: 'The German sixth (it sounds like a dominant seventh) moves to Cad⁶₄ first, avoiding parallel fifths.',
    progression: 'I Ger+6 Cad64:2 V7:2 I', mode: 'major', bpm: 76,
  },
  {
    id: 'phrygian-half', name: 'Phrygian half cadence', group: 'Cadences and schemata', era: 'Baroque',
    description: 'iv⁶ to V in minor: the bass falls a half step from ♭6 to 5. Often ends a slow movement.',
    progression: 'i VI iv6 V:8', mode: 'minor', bpm: 66,
  },
  {
    id: 'monte', name: 'Monte (rising sequence)', group: 'Cadences and schemata', era: 'Galant',
    description: 'Each chord is approached by its own dominant, and the pair repeats a step higher: a rising sequence.',
    progression: 'V7/IV:2 IV:2 V7/V:2 V:2 V7:2 I:6', mode: 'major', style: 'alberti', bpm: 96,
  },
  {
    id: 'fonte', name: 'Fonte (falling sequence)', group: 'Cadences and schemata', era: 'Galant',
    description: 'A tonicized ii, then the same move a step lower to I.',
    progression: 'V7/ii:2 ii:2 V7:2 I:2', mode: 'major', style: 'alberti', bpm: 96,
  },

  // ---------- Grounds and sequences ----------
  {
    id: 'andalusian', name: 'Andalusian cadence', group: 'Grounds and sequences', era: 'Renaissance, flamenco, rock',
    description: 'A descending tetrachord in minor: i, ♭VII, ♭VI, V. The major V puts a half step between ♭6 and 5 in the bass.',
    progression: 'i bVII bVI V', mode: 'minor', style: 'strum', bpm: 100,
  },
  {
    id: 'lament', name: 'Lament bass', group: 'Grounds and sequences', era: 'Baroque',
    description: 'The bass falls stepwise from tonic to dominant (1, ♭7, ♭6, 5) under first-inversion chords.',
    progression: 'i v6 iv6 V', mode: 'minor', bpm: 66,
  },
  {
    id: 'chromatic-descent', name: 'Chromatic descending bass', group: 'Grounds and sequences', era: 'Baroque to pop ballad',
    description: 'A major-key passus duriusculus: the bass walks down by half steps from 1 to 5 using inversions and borrowed iv⁶.',
    progression: 'I:2 V6:2 V42/IV:2 IV6:2 iv6:2 I64:2 V7:2 I:2', mode: 'major', style: 'arpeggio', bpm: 80,
  },
  {
    id: 'pachelbel', name: 'Pachelbel canon', group: 'Grounds and sequences', era: 'Baroque',
    description: 'A ground bass of falling fourths and rising seconds. Eight chords, two beats each.',
    progression: 'I:2 V:2 vi:2 iii:2 IV:2 I:2 IV:2 V:2', mode: 'major', style: 'arpeggio', bpm: 72,
  },
  {
    id: 'folia', name: 'La Folia', group: 'Grounds and sequences', era: 'Renaissance, Baroque',
    description: 'A ground bass with its relative-major middle (VII to III); Corelli, Vivaldi and Rachmaninoff wrote variations.',
    progression: 'i V i VII III VII i V', mode: 'minor', style: 'waltz', bpm: 120,
  },
  {
    id: 'romanesca', name: 'Romanesca', group: 'Grounds and sequences', era: 'Renaissance',
    description: 'Starts on the relative major and falls by alternating fourths and seconds to the dominant.',
    progression: 'III VII i V', mode: 'minor', style: 'arpeggio', bpm: 84,
  },
  {
    id: 'circle-major', name: 'Diatonic circle of fifths', group: 'Grounds and sequences', era: 'Baroque to jazz',
    description: 'Every root falls a fifth (one diminished fifth, IV to vii) through all seven diatonic seventh chords.',
    progression: 'Imaj7:2 IVmaj7:2 viiø7:2 iii7:2 vi7:2 ii7:2 V7:2 Imaj7:2', mode: 'major', bpm: 100,
  },
  {
    id: 'circle-minor', name: 'Minor circle of fifths', group: 'Grounds and sequences', era: 'Baroque, jazz standards',
    description: 'The same circle in minor: a ii–V to the relative major, then a minor ii–V home.',
    progression: 'iv7:2 VII7:2 IIImaj7:2 VImaj7:2 iiø7:2 V7:2 i:4', mode: 'minor', style: 'comp', bpm: 112,
  },

  // ---------- Jazz ----------
  {
    id: 'two-five-one', name: 'Major ii–V–I', group: 'Jazz', era: 'Jazz standards',
    description: 'The backbone of jazz harmony: guide tones (thirds and sevenths) move by half step.',
    progression: 'ii7 V7 Imaj7:8', mode: 'major', style: 'comp', bpm: 120,
  },
  {
    id: 'altered-two-five', name: 'ii–V–I with altered V', group: 'Jazz', era: 'Bebop, modern jazz',
    description: 'V⁷alt adds ♭9, ♯9 and ♭13, all of which resolve by half step into Imaj7.',
    progression: 'ii7 V7alt Imaj7:8', mode: 'major', style: 'comp', bpm: 120,
  },
  {
    id: 'minor-two-five', name: 'Minor ii–V–i', group: 'Jazz', era: 'Jazz standards',
    description: 'Half-diminished ii and V⁷♭9, both from harmonic minor, resolving to a minor tonic.',
    progression: 'iiø7 V7b9 i7:8', mode: 'minor', style: 'comp', bpm: 112,
  },
  {
    id: 'tritone-sub', name: 'Tritone substitution', group: 'Jazz', era: 'Swing, bebop',
    description: '♭II⁷ replaces V⁷: same tritone, and the bass slides down chromatically from 2 to ♭2 to 1.',
    progression: 'ii7 bII7 Imaj7:8', mode: 'major', style: 'comp', bpm: 120,
  },
  {
    id: 'backdoor', name: 'Backdoor ii–V', group: 'Jazz', era: 'Jazz standards',
    description: 'iv⁷ to ♭VII⁷, both from the parallel minor, entering the tonic from the flat side; hence the name.',
    progression: 'iv7 bVII7 Imaj7:8', mode: 'major', style: 'comp', bpm: 112,
  },
  {
    id: 'coltrane', name: 'Coltrane cycle (Giant Steps)', group: 'Jazz', era: 'Post-bop, 1959',
    description: 'Three tonal centers a major third apart (I, ♭VI, III), each reached by its own dominant.',
    progression: 'Imaj7:2 V7/bVI:2 bVImaj7:2 V7/III:2 IIImaj7:2 V7:2 Imaj7:4', mode: 'major', style: 'comp', bpm: 160,
  },
  {
    id: 'countdown', name: 'Coltrane substitution over ii–V–I', group: 'Jazz', era: 'Post-bop',
    description: 'A plain ii–V–I reharmonized through the major-third cycle, as on "Countdown".',
    progression: 'ii7:2 V7/bVI:2 bVImaj7:2 V7/III:2 IIImaj7:2 V7:2 Imaj7:4', mode: 'major', style: 'comp', bpm: 160,
  },
  {
    id: 'rhythm-a', name: 'Rhythm changes, A section', group: 'Jazz', era: 'Swing, bebop',
    description: 'From Gershwin\'s "I Got Rhythm": turnarounds, a secondary dominant to IV and a passing ♯iv°⁷.',
    progression: 'I:2 vi7:2 ii7:2 V7:2 iii7:2 VI7:2 ii7:2 V7:2 I:2 V7/IV:2 IV:2 #iv°7:2 I64:2 V7:2 I:4', mode: 'major', style: 'stride', bpm: 152,
  },
  {
    id: 'montgomery-ward', name: 'Montgomery-Ward bridge', group: 'Jazz', era: 'Swing era',
    description: 'I⁷ to IV, then II⁷ to V⁷: two short tonicizations, the bridge of many standards.',
    progression: 'I7:8 IV:8 II7:8 V7:8', mode: 'major', style: 'stride', bpm: 152,
  },
  {
    id: 'lady-bird', name: 'Lady Bird turnaround', group: 'Jazz', era: 'Bebop (Tadd Dameron)',
    description: 'Major sevenths on I, ♭III, ♭VI and ♭II: a borrowed, planed turnaround that glides home by half step.',
    progression: 'Imaj7:2 bIIImaj7:2 bVImaj7:2 bIImaj7:2', mode: 'major', style: 'comp', bpm: 132,
  },
  {
    id: 'line-cliche', name: 'Minor line cliché', group: 'Jazz', era: 'Jazz, Broadway, Bond themes',
    description: 'A held minor chord with one inner voice descending chromatically: 1, 7, ♭7, 6.',
    progression: 'i imaj7 i7 iadd6', mode: 'minor', style: 'arpeggio', bpm: 92,
  },

  // ---------- Blues and gospel ----------
  {
    id: 'twelve-bar', name: '12-bar blues', group: 'Blues and gospel', era: 'Blues, rock and roll',
    description: 'Three four-bar phrases on I⁷, IV⁷ and V⁷. Every chord is a dominant seventh.',
    progression: 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', mode: 'major', style: 'stride', bpm: 132,
  },
  {
    id: 'jazz-blues', name: 'Jazz blues', group: 'Blues and gospel', era: 'Bebop',
    description: 'The 12-bar form with a ii–V into IV, a passing ♯iv°⁷, a secondary dominant VI⁷ and turnarounds.',
    progression: 'I7 IV7 I7 v7:2 I7:2 IV7 #iv°7 I7 VI7 ii7 V7 I7:2 VI7:2 ii7:2 V7:2', mode: 'major', style: 'comp', bpm: 144,
  },
  {
    id: 'minor-blues', name: 'Minor blues', group: 'Blues and gospel', era: 'Jazz, soul',
    description: 'Minor tonic and iv; ♭VI⁷ to V⁷ in bars 9 and 10 gives a chromatic slide.',
    progression: 'i7 i7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7', mode: 'minor', style: 'comp', bpm: 120,
  },
  {
    id: 'gospel', name: 'Gospel turnaround with passing diminished', group: 'Blues and gospel', era: 'Gospel, soul',
    description: 'I⁷ tonicizes IV; ♯iv°⁷ pushes the bass up chromatically into I⁶₄, then V⁷ to I.',
    progression: 'I:2 I7:2 IV:2 #iv°7:2 I64:2 V7:2 I:4', mode: 'major', style: 'arpeggio', bpm: 76,
  },
  {
    id: 'ragtime', name: 'Ragtime circle of dominants', group: 'Blues and gospel', era: 'Ragtime, early jazz',
    description: 'A chain of secondary dominants falling by fifths: III⁷, VI⁷, II⁷, V⁷, home.',
    progression: 'III7 VI7 II7 V7 I', mode: 'major', style: 'stride', bpm: 132,
  },
  {
    id: 'doo-wop', name: 'Doo-wop', group: 'Blues and gospel', era: '1950s',
    description: 'The fifties progression: I, vi, IV, V, often with a triplet piano feel.',
    progression: 'I vi IV V', mode: 'major', style: 'waltz', bpm: 132,
  },

  // ---------- Modal and rock ----------
  {
    id: 'mixolydian', name: 'Mixolydian rock', group: 'Modal and rock', era: 'Rock',
    description: '♭VII from Mixolydian replaces V; the plagal ♭VII to IV to I avoids the leading tone.',
    progression: 'I bVII IV I', mode: 'major', style: 'strum', bpm: 112,
  },
  {
    id: 'dorian', name: 'Dorian vamp', group: 'Modal and rock', era: 'Funk, Latin rock, modal jazz',
    description: 'Minor i with a major IV: the raised 6th is the Dorian signature.',
    progression: 'i7 IV7', mode: 'minor', style: 'comp', bpm: 104,
  },
  {
    id: 'lydian', name: 'Lydian vamp', group: 'Modal and rock', era: 'Film, fusion',
    description: 'I to a major II: the ♯4 in II gives the Lydian color.',
    progression: 'Imaj7 II', mode: 'major', style: 'arpeggio', bpm: 92,
  },
  {
    id: 'phrygian', name: 'Phrygian vamp', group: 'Modal and rock', era: 'Flamenco, metal',
    description: 'Minor i with ♭II a half step above: the Phrygian signature.',
    progression: 'i bII', mode: 'minor', style: 'strum', bpm: 100,
  },
  {
    id: 'aeolian', name: 'Aeolian rock', group: 'Modal and rock', era: 'Rock, pop',
    description: 'i, ♭VI, ♭VII, i: natural minor with no leading tone; ♭VII rises a step to the tonic.',
    progression: 'i bVI bVII i', mode: 'minor', style: 'strum', bpm: 108,
  },
  {
    id: 'mario', name: 'Aeolian cadence (♭VI ♭VII I)', group: 'Modal and rock', era: 'Video games, rock anthems',
    description: 'Two borrowed major chords climb by whole steps into a major tonic.',
    progression: 'I:8 bVI:2 bVII:2 I:4', mode: 'major', style: 'block', bpm: 112,
  },
  {
    id: 'rock-biii', name: 'Blues-rock ♭III', group: 'Modal and rock', era: 'Rock',
    description: 'Major I with ♭III from the minor pentatonic, climbing to IV.',
    progression: 'I bIII IV I', mode: 'major', style: 'strum', bpm: 116,
  },

  // ---------- Pop ----------
  {
    id: 'axis', name: 'Axis progression', group: 'Pop', era: 'Contemporary pop',
    description: 'I, V, vi, IV. Included for contrast: a fully diatonic loop with no chromatic tones at all.',
    progression: 'I V vi IV', mode: 'major', style: 'strum', bpm: 100,
  },
  {
    id: 'royal-road', name: 'Royal Road', group: 'Pop', era: 'J-pop, anime',
    description: 'IVmaj7, V⁷, iii⁷, vi: starts on the predominant and ends on the relative minor, never quite home.',
    progression: 'IVmaj7 V7 iii7 vi', mode: 'major', style: 'arpeggio', bpm: 96,
  },
  {
    id: 'mediant-plagal', name: 'Major III and minor iv', group: 'Pop', era: '1990s alternative rock',
    description: 'A major III (a chromatic mediant with a raised 5th) and a borrowed iv.',
    progression: 'I III IV iv', mode: 'major', style: 'strum', bpm: 92,
  },

  // ---------- Chromatic and cinematic ----------
  {
    id: 'film-mediants', name: 'Chromatic mediant film progression', group: 'Chromatic and cinematic', era: 'Film scores',
    description: 'Major triads a major third apart share one tone; the other two notes move by half step.',
    progression: 'I bVI I III', mode: 'major', style: 'block', bpm: 72,
  },
  {
    id: 'dark-mediants', name: 'Minor mediant shadows', group: 'Chromatic and cinematic', era: 'Film scores',
    description: 'Minor triads a third apart, each keeping one common tone with i.',
    progression: 'i bvi i biii', mode: 'minor', style: 'block', bpm: 66,
  },
  {
    id: 'hexatonic', name: 'Hexatonic cycle (neo-Riemannian)', group: 'Chromatic and cinematic', era: 'Late Romantic, film',
    description: 'Alternating P and L transformations: each step moves a single voice by half step, cycling through six triads.',
    progression: 'I i bVI bvi III iii I', mode: 'major', style: 'block', bpm: 72,
  },
  {
    id: 'octatonic', name: 'Minor-third cycle', group: 'Chromatic and cinematic', era: 'Romantic, film',
    description: 'Major triads a minor third apart divide the octave in four (I, ♭III, ♭V, VI): an octatonic sound.',
    progression: 'I bIII bV VI I', mode: 'major', style: 'block', bpm: 80,
  },
  {
    id: 'rising-cliche', name: 'Rising line cliché', group: 'Chromatic and cinematic', era: 'Broadway, pop',
    description: 'The fifth of I rises chromatically (5, ♯5, 6, ♭7) through I⁺ to set up IV.',
    progression: 'I I+ Iadd6 I7 IV:8', mode: 'major', style: 'arpeggio', bpm: 88,
  },
  {
    id: 'ct-dim', name: 'Common-tone diminished', group: 'Chromatic and cinematic', era: 'Romantic, barbershop, ragtime',
    description: '♯ii°⁷ decorates I: the tonic is held while the other voices move by half step.',
    progression: 'I:2 #ii°7:2 I:4 V7 I', mode: 'major', style: 'arpeggio', bpm: 80,
  },
];
