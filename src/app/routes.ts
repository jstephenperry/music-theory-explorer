import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * The site has two modes. Each mode has its own navigation drawer and landing page, and every
 * room belongs to exactly one mode. Room URLs are nested under the mode path (`/theory/intervals`);
 * the old flat paths (`/intervals`) redirect to the nested ones so existing links keep working.
 */
export type ModeId = 'theory' | 'composition';

export interface ModeDef {
  id: ModeId;
  /** Landing page path, which is also the prefix of every room path in the mode. */
  path: string;
  title: string;
  /** One or two sentences for the home page and the landing page. */
  blurb: string;
}

export const MODES: ModeDef[] = [
  {
    id: 'theory',
    path: '/theory',
    title: 'Theory',
    blurb: 'Twelve rooms on pitch, harmony, rhythm and sound, plus ear training and a free keyboard. Each room has a playable piano, notation that follows your choices, and audio.',
  },
  {
    id: 'composition',
    path: '/composition',
    title: 'Composition',
    blurb: 'Five rooms on how pieces are put together: motives, phrases and cadences, texture, species counterpoint and variations. Each pairs an excerpt from Bach, Mozart or Beethoven with a workshop and a drill.',
  },
];

export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m])) as Record<ModeId, ModeDef>;

export type SectionId = 'Pitch' | 'Harmony' | 'Rhythm' | 'Sound' | 'Practice' | 'Melody' | 'Texture' | 'Form';

export interface SectionDef {
  id: SectionId;
  mode: ModeId;
  title: string;
}

export const SECTIONS: SectionDef[] = [
  { id: 'Pitch', mode: 'theory', title: 'Pitch & Scale' },
  { id: 'Harmony', mode: 'theory', title: 'Harmony' },
  { id: 'Rhythm', mode: 'theory', title: 'Rhythm & Time' },
  { id: 'Sound', mode: 'theory', title: 'Sound & Tuning' },
  { id: 'Practice', mode: 'theory', title: 'Practice' },
  { id: 'Melody', mode: 'composition', title: 'Melody & Phrase' },
  { id: 'Texture', mode: 'composition', title: 'Texture & Voices' },
  { id: 'Form', mode: 'composition', title: 'Form' },
];

export interface RouteDef {
  /** The room's path inside its mode, for example `/intervals`. */
  slug: string;
  /** The full path, for example `/theory/intervals`. */
  path: string;
  mode: ModeId;
  title: string;
  /** One sentence used on the landing pages and in navigation tooltips. */
  blurb: string;
  section: SectionId;
  component: LazyExoticComponent<ComponentType>;
}

const SECTION_MODE = Object.fromEntries(SECTIONS.map((s) => [s.id, s.mode])) as Record<SectionId, ModeId>;

function room(slug: string, section: SectionId, title: string, blurb: string, load: () => Promise<{ default: ComponentType }>): RouteDef {
  const mode = SECTION_MODE[section];
  return { slug, path: MODE_BY_ID[mode].path + slug, mode, section, title, blurb, component: lazy(load) };
}

export const ROUTES: RouteDef[] = [
  room('/intervals', 'Pitch', 'Intervals', 'Every interval to two octaves: quality, inversion, consonance, enharmonic spelling and just ratio against equal temperament.', () => import('../features/intervals/IntervalsPage')),
  room('/scales', 'Pitch', 'Scales & Modes', '324 scales, modes, maqamat and ragas from 14 traditions, played at their own intonation.', () => import('../features/scales/ScalesPage')),
  room('/circle', 'Pitch', 'Circle of Fifths', 'Key signatures, relative and closely related keys, diatonic chords, mode overlays and a cycle of dominant sevenths.', () => import('../features/circle/CirclePage')),
  room('/chords', 'Harmony', 'Chords', 'Build any of 58 chord types, change the voicing and inversion, or play notes to have the chord named.', () => import('../features/chords/ChordsPage')),
  room('/progressions', 'Harmony', 'Progression Lab', 'Write progressions in roman numerals or chord symbols, with four-part voice leading, 52 library progressions and reharmonization tools.', () => import('../features/progressions/ProgressionsPage')),
  room('/modulation', 'Harmony', 'Modulation', 'Nine ways between any two keys: pivot chords, common tones, enharmonic reinterpretation, sequences and direct shifts.', () => import('../features/modulation/ModulationPage')),
  room('/tonnetz', 'Harmony', 'Tonnetz', 'Triads on the Tonnetz with the neo-Riemannian P, L and R transformations, and hexatonic and octatonic cycles.', () => import('../features/tonnetz/TonnetzPage')),
  room('/meter', 'Rhythm', 'Meter & Time', 'Simple, compound, irregular and additive meters with an accent grid, a metronome and a rhythm step sequencer.', () => import('../features/meter/MeterPage')),
  room('/polyrhythm', 'Rhythm', 'Polyrhythm', '3 against 2, 5 against 4 and other ratios; polymeter, hemiola, and a polyrhythm sped up until it becomes a chord.', () => import('../features/polyrhythm/PolyrhythmPage')),
  room('/harmonics', 'Sound', 'Harmonics & Tuning', 'The harmonic series, additive synthesis, just intonation against equal temperament, and seven playable tuning systems.', () => import('../features/harmonics/HarmonicsPage')),
  room('/ear-training', 'Practice', 'Ear Training', 'Six drills: intervals, chord qualities, scales, scale degrees, cadences and progressions. Items you miss come up more often.', () => import('../features/ear-training/EarTrainingPage')),
  room('/playground', 'Practice', 'Free Play', 'A five-octave keyboard with live chord naming, MIDI and computer-keyboard input, sustain and a phrase recorder.', () => import('../features/playground/PlaygroundPage')),
  room('/motive', 'Melody', 'Motive & Development', 'Repeat, transpose, invert and sequence a motive, as in Bach’s Invention No. 1 and the opening of Beethoven’s Fifth.', () => import('../features/composition/MotivePage')),
  room('/phrase', 'Melody', 'Phrase & Cadence', 'Periods, sentences and six cadence types in Mozart and Beethoven; build eight-bar phrases of your own.', () => import('../features/composition/PhrasePage')),
  room('/texture', 'Texture', 'Texture & Accompaniment', 'Chorale, Alberti bass, prelude figuration, arpeggio and waltz: one progression written in six textures.', () => import('../features/composition/TexturePage')),
  room('/counterpoint', 'Texture', 'Species Counterpoint', 'First and second species after Fux, with 13 rules checked as you write, hints and a solver.', () => import('../features/composition/CounterpointPage')),
  room('/variations', 'Form', 'Theme & Variations', 'Mozart’s variations on “Ah vous dirai-je, Maman” and a workshop that varies the theme by figuration, rhythm, meter, mode and accompaniment.', () => import('../features/composition/VariationsPage')),
];

/** Full path of a room by its slug, for links between rooms. */
export const roomPath = (slug: string): string => {
  const r = ROUTES.find((x) => x.slug === slug);
  if (!r) throw new Error(`Unknown room ${slug}`);
  return r.path;
};

export const routesInMode = (mode: ModeId) => ROUTES.filter((r) => r.mode === mode);
export const sectionsInMode = (mode: ModeId) => SECTIONS.filter((s) => s.mode === mode);
export const routesInSection = (section: SectionId) => ROUTES.filter((r) => r.section === section);

/** The mode a path belongs to: its landing page or one of its rooms. Undefined for the home page and unknown paths. */
export function modeForPath(pathname: string): ModeDef | undefined {
  return MODES.find((m) => pathname === m.path || pathname.startsWith(m.path + '/'));
}
