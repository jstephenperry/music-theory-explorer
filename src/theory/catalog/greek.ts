/**
 * Ancient Greek harmoniai. The seven octave species are the white-key octaves of the Greater
 * Perfect System; note that the Greek names do not match the later church modes (the Greek Dorian
 * runs from E to e). Tetrachords were divided in three genera; the step sizes follow Aristoxenus,
 * whose diatonic genus matches equal temperament.
 */
import { define } from './define';

export const GREEK = [
  ...define('greek', 'Octave species (diatonic genus)', [
    { id: 'greek-mixolydian', name: 'Mixolydian (B to b)', intervals: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'], description: 'The octave species from B: the same notes as the church Locrian mode.' },
    { id: 'greek-lydian', name: 'Lydian (C to c)', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'], description: 'The octave species from C: the same notes as the major scale.' },
    { id: 'greek-phrygian', name: 'Phrygian (D to d)', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'], description: 'The octave species from D: the same notes as the church Dorian mode.' },
    { id: 'greek-dorian', name: 'Dorian (E to e)', intervals: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'], description: 'The central harmonia of Greek theory, praised by Plato as manly and dignified. Two descending tetrachords (A G F E and E D C B) joined by a whole tone; the same notes as the church Phrygian mode.' },
    { id: 'greek-hypolydian', name: 'Hypolydian (F to f)', intervals: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'], description: 'The octave species from F: the same notes as the church Lydian mode.' },
    { id: 'greek-hypophrygian', name: 'Hypophrygian (G to g)', intervals: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'], description: 'The octave species from G: the same notes as the church Mixolydian mode.' },
    { id: 'greek-hypodorian', name: 'Hypodorian (A to a)', intervals: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'], description: 'The octave species from A: the same notes as natural minor.' },
  ]),

  ...define('greek', 'Genera of the Dorian tetrachord', [
    {
      id: 'greek-dorian-chromatic', name: 'Dorian, tonic chromatic genus',
      intervals: ['P1', 'm2', 'd3', 'P4', 'P5', 'm6', 'd7'],
      facts: [['Tetrachord (cents)', '100 + 100 + 300']],
      description: 'Each tetrachord is divided into two half steps and a minor third (Aristoxenus\'s tonic chromatic): E F G♭ A, B C D♭ E.',
    },
    {
      id: 'greek-dorian-enharmonic', name: 'Dorian, enharmonic genus',
      intervals: ['P1', 'P1+50', 'm2', 'P4', 'P5', 'P5+50', 'm6'],
      facts: [['Tetrachord (cents)', '50 + 50 + 400']],
      description: 'Each tetrachord is divided into two quarter tones and a major third: E, E a quarter tone higher, F, A. Aristoxenus considered it the most refined genus; it had fallen out of use by late antiquity.',
      mood: ['archaic'],
    },
  ]),
];
