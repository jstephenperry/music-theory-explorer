import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface RouteDef {
  path: string;
  title: string;
  /** One-line description used on the home page and in navigation tooltips. */
  blurb: string;
  section: 'Pitch' | 'Harmony' | 'Composition' | 'Rhythm' | 'Sound' | 'Practice';
  component: LazyExoticComponent<ComponentType>;
}

export const SECTIONS: Array<{ id: RouteDef['section']; title: string }> = [
  { id: 'Pitch', title: 'Pitch & Scale' },
  { id: 'Harmony', title: 'Harmony' },
  { id: 'Composition', title: 'Composition' },
  { id: 'Rhythm', title: 'Rhythm & Time' },
  { id: 'Sound', title: 'Sound & Tuning' },
  { id: 'Practice', title: 'Practice Room' },
];

export const ROUTES: RouteDef[] = [
  {
    path: '/intervals', title: 'Intervals', section: 'Pitch',
    blurb: 'Hear and see every interval, its inversion, consonance and spelling.',
    component: lazy(() => import('../features/intervals/IntervalsPage')),
  },
  {
    path: '/scales', title: 'Scales & Modes', section: 'Pitch',
    blurb: 'More than 300 scales, modes, maqamat and ragas from 14 traditions, at their true intonation.',
    component: lazy(() => import('../features/scales/ScalesPage')),
  },
  {
    path: '/circle', title: 'Circle of Fifths', section: 'Pitch',
    blurb: 'An interactive circle: key signatures, relative keys and neighboring keys.',
    component: lazy(() => import('../features/circle/CirclePage')),
  },
  {
    path: '/chords', title: 'Chords', section: 'Harmony',
    blurb: 'Build any chord, change its voicing and inversion, or play notes to name a chord.',
    component: lazy(() => import('../features/chords/ChordsPage')),
  },
  {
    path: '/progressions', title: 'Progression Lab', section: 'Harmony',
    blurb: 'Compose with roman numerals, borrowed chords, secondary dominants and voice leading.',
    component: lazy(() => import('../features/progressions/ProgressionsPage')),
  },
  {
    path: '/modulation', title: 'Modulation', section: 'Harmony',
    blurb: 'Move between any two keys with pivot chords, enharmonic tricks and sequences.',
    component: lazy(() => import('../features/modulation/ModulationPage')),
  },
  {
    path: '/tonnetz', title: 'Tonnetz', section: 'Harmony',
    blurb: 'Navigate triads on the Tonnetz with neo-Riemannian P, L and R transformations.',
    component: lazy(() => import('../features/tonnetz/TonnetzPage')),
  },
  {
    path: '/motive', title: 'Motive & Development', section: 'Composition',
    blurb: 'Repeat, transpose, invert and sequence a motive, as Bach and Beethoven do.',
    component: lazy(() => import('../features/composition/MotivePage')),
  },
  {
    path: '/phrase', title: 'Phrase & Cadence', section: 'Composition',
    blurb: 'Periods, sentences and cadences in Mozart and Beethoven; build eight-bar phrases.',
    component: lazy(() => import('../features/composition/PhrasePage')),
  },
  {
    path: '/meter', title: 'Meter & Time', section: 'Rhythm',
    blurb: 'Simple, compound, irregular and additive meters with a programmable metronome.',
    component: lazy(() => import('../features/meter/MeterPage')),
  },
  {
    path: '/polyrhythm', title: 'Polyrhythm', section: 'Rhythm',
    blurb: 'Layer 3 against 2, 5 against 4 and beyond; hear polymeter and hemiola.',
    component: lazy(() => import('../features/polyrhythm/PolyrhythmPage')),
  },
  {
    path: '/harmonics', title: 'Harmonics & Tuning', section: 'Sound',
    blurb: 'The harmonic series, just intonation, equal temperament and historical tunings.',
    component: lazy(() => import('../features/harmonics/HarmonicsPage')),
  },
  {
    path: '/ear-training', title: 'Ear Training', section: 'Practice',
    blurb: 'Train your ear on intervals, chord qualities, scales and progressions.',
    component: lazy(() => import('../features/ear-training/EarTrainingPage')),
  },
  {
    path: '/playground', title: 'Free Play', section: 'Practice',
    blurb: 'A full keyboard with live chord naming. Connect a MIDI keyboard or use your computer keys.',
    component: lazy(() => import('../features/playground/PlaygroundPage')),
  },
];
