import { describe, expect, it } from 'vitest';
import { MODES, ROUTES, SECTIONS, modeForPath, roomPath, routesInMode, sectionsInMode } from './routes';
import { SCALES, TRADITIONS } from '../theory/scales';
import { CHORDS } from '../theory/chords';
import { LIBRARY } from '../features/progressions/library';
import { RULES } from '../theory/composition/counterpoint';
import { TECHNIQUES } from '../features/modulation/logic';
import { TUNING_SYSTEMS } from '../features/harmonics/tuning';
import { EXERCISES } from '../features/ear-training/earTraining';
import { CADENCE_TYPES } from '../features/composition/cadences';
import { TEXTURES } from '../features/composition/textures';

const blurbOf = (slug: string) => ROUTES.find((r) => r.slug === slug)!.blurb;

describe('route registry', () => {
  it('nests every room under its mode and keeps paths unique', () => {
    for (const r of ROUTES) {
      expect(r.path).toBe(MODES.find((m) => m.id === r.mode)!.path + r.slug);
      expect(modeForPath(r.path)?.id).toBe(r.mode);
      expect(SECTIONS.find((s) => s.id === r.section)!.mode).toBe(r.mode);
    }
    expect(new Set(ROUTES.map((r) => r.path)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((r) => r.slug)).size).toBe(ROUTES.length);
    expect(roomPath('/scales')).toBe('/theory/scales');
    expect(() => roomPath('/nowhere')).toThrow();
  });

  it('gives each mode at least one section and each section at least one room', () => {
    for (const m of MODES) {
      expect(sectionsInMode(m.id).length).toBeGreaterThan(0);
      expect(routesInMode(m.id).length).toBeGreaterThan(0);
    }
    for (const s of SECTIONS) expect(ROUTES.some((r) => r.section === s.id)).toBe(true);
    expect(ROUTES.length).toBe(MODES.reduce((n, m) => n + routesInMode(m.id).length, 0));
  });

  it('recognizes mode landing pages and nothing else', () => {
    expect(modeForPath('/theory')?.id).toBe('theory');
    expect(modeForPath('/composition/motive')?.id).toBe('composition');
    expect(modeForPath('/')).toBeUndefined();
    expect(modeForPath('/theoryx')).toBeUndefined();
    expect(modeForPath('/intervals')).toBeUndefined();
  });

  it('quotes numbers that match the data', () => {
    // Every count written into a blurb must stay true when the catalogs change.
    expect(blurbOf('/scales')).toContain(`${SCALES.length} scales`);
    expect(blurbOf('/scales')).toContain(`${TRADITIONS.length} traditions`);
    expect(blurbOf('/chords')).toContain(`${CHORDS.length} chord types`);
    expect(blurbOf('/progressions')).toContain(`${LIBRARY.length} library progressions`);
    expect(blurbOf('/counterpoint')).toContain(`${RULES.length} rules`);
    expect(TECHNIQUES).toHaveLength(9);
    expect(TUNING_SYSTEMS).toHaveLength(7);
    expect(EXERCISES).toHaveLength(6);
    expect(CADENCE_TYPES).toHaveLength(6);
    expect(TEXTURES).toHaveLength(6);
    expect(routesInMode('theory')).toHaveLength(12);
    expect(routesInMode('composition')).toHaveLength(5);
  });
});
