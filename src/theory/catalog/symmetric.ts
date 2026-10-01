import { define } from './define';

/** Symmetric scales and twentieth-century synthetic scales. */
export const SYMMETRIC = [
  ...define('symmetric', 'Messiaen modes of limited transposition', [
  {
    id: 'whole-tone', name: 'Whole tone (Messiaen mode 1)',
    intervals: ['P1', 'M2', 'M3', 'A4', 'A5', 'A6'],
    description: 'Six notes, all a whole step apart. No leading tone and no perfect fifths, so there is no sense of a home note: dreamlike and unresolved (Debussy). Only two distinct whole-tone scales exist (Messiaen mode 1).',
    mood: ['dreamy', 'ambiguous', 'floating'], chordId: '7#5',
  },
  {
    id: 'diminished-hw', name: 'Octatonic, half-whole (Messiaen mode 2)', aliases: ['dominant diminished', 'octatonic'],
    intervals: ['P1', 'm2', 'A2', 'M3', 'A4', 'P5', 'M6', 'm7'],
    description: 'Alternating half and whole steps starting with a half step. Fits 7(b9) chords. Repeats every minor third, so only three distinct versions exist (Messiaen mode 2).',
    mood: ['tense', 'symmetric', 'jazzy'], chordId: '13b9',
  },
  {
    id: 'messiaen-3', name: 'Messiaen mode 3',
    intervals: ['P1', 'M2', 'm3', 'M3', 'A4', 'P5', 'm6', 'm7', 'M7'],
    description: 'Nine notes; the pattern whole-half-half repeats every major third.',
    mood: ['symmetric', 'lush'],
  },
    {
      id: 'messiaen-4', name: 'Messiaen mode 4',
      intervals: ['P1', 'm2', 'M2', 'P4', 'A4', 'P5', 'm6', 'M7'],
      description: 'Eight notes: half, half, minor third, half step, repeated at the tritone. Six distinct transpositions.',
      mood: ['symmetric', 'chromatic'],
    },
    {
      id: 'messiaen-5', name: 'Messiaen mode 5',
      intervals: ['P1', 'm2', 'P4', 'A4', 'P5', 'M7'],
      description: 'Six notes: half step, major third, half step, repeated at the tritone. Six distinct transpositions.',
      mood: ['symmetric', 'stark'],
    },
    {
      id: 'messiaen-6', name: 'Messiaen mode 6',
      intervals: ['P1', 'M2', 'M3', 'P4', 'A4', 'A5', 'A6', 'M7'],
      description: 'Eight notes: whole, whole, half, half, repeated at the tritone. Six distinct transpositions.',
      mood: ['symmetric', 'luminous'],
    },
    {
      id: 'messiaen-7', name: 'Messiaen mode 7',
      intervals: ['P1', 'm2', 'M2', 'm3', 'P4', 'A4', 'P5', 'm6', 'M6', 'M7'],
      description: 'Ten notes: half, half, half, whole, half, repeated at the tritone. Six distinct transpositions.',
      mood: ['symmetric', 'dense'],
    },
  ]),

  ...define('symmetric', 'Other symmetric scales', [
  {
    id: 'diminished-wh', name: 'Diminished (whole-half)', aliases: ['octatonic'],
    intervals: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'M6', 'M7'],
    description: 'Alternating whole and half steps. The natural scale of the diminished seventh chord.',
    mood: ['tense', 'symmetric'], chordId: 'dim7',
  },
  {
    id: 'augmented', name: 'Augmented (hexatonic)',
    intervals: ['P1', 'A2', 'M3', 'P5', 'm6', 'M7'],
    description: 'Alternating minor thirds and half steps; two augmented triads a half step apart. Repeats every major third (Coltrane, Liszt).',
    mood: ['symmetric', 'modern'], chordId: 'maj7#5',
  },
  {
    id: 'tritone', name: 'Tritone scale',
    intervals: ['P1', 'm2', 'M3', 'd5', 'P5', 'm7'],
    description: 'Two major triads a tritone apart (C and F#). Repeats every tritone; used in Stravinsky\'s Petrushka chord.',
    mood: ['clashing', 'modern'], chordId: '7b9',
  },
  {
    id: 'chromatic', name: 'Chromatic',
    intervals: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
    description: 'All twelve pitch classes of equal temperament.',
    mood: ['complete'],
  },
  ]),

  ...define('symmetric', 'Synthetic scales', [
  {
    id: 'enigmatic', name: 'Enigmatic',
    intervals: ['P1', 'm2', 'M3', 'A4', 'A5', 'A6', 'M7'],
    description: 'An unusual scale published by Verdi as a harmonization exercise (Ave Maria, 1889).',
    mood: ['strange', 'chromatic'], characteristic: [1, 4, 5],
  },
  {
    id: 'prometheus', name: 'Prometheus', aliases: ['mystic'],
    intervals: ['P1', 'M2', 'M3', 'A4', 'M6', 'm7'],
    description: 'The six-note scale behind Scriabin\'s mystic chord, built largely from fourths.',
    mood: ['mystic', 'shimmering'], chordId: 'mystic',
  },
  ]),
];
