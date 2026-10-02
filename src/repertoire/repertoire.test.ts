import { describe, expect, it } from 'vitest';
import { REPERTOIRE, excerpt, fragment, motiveFragment, plainNumeral, quarterEntries, score } from './index';
import { noteById, selectNotes } from '../theory/score';
import { pitch } from '../theory/notes';
import { MOTIVE_PRESETS } from '../features/composition/motivePresets';
import { BASIC_IDEAS } from '../theory/composition/phrase';
import { TEXTURE_PROGRESSIONS } from '../theory/composition/textures';
import { HARMONY_MAJOR, THEME, THEME_BASS, THEME_WORK } from '../theory/composition/variations';

describe('repertoire registry', () => {
  it('has unique ids and builds every score', () => {
    expect(new Set(REPERTOIRE.map((e) => e.work.id)).size).toBe(REPERTOIRE.length);
    for (const e of REPERTOIRE) expect(score(e.work.id).staves.length).toBeGreaterThan(0);
    expect(() => excerpt('nowhere')).toThrow();
  });

  it('resolves every highlight layer and bracket to notes of the work', () => {
    for (const e of REPERTOIRE) {
      const s = score(e.work.id);
      for (const layer of e.analysis.layers ?? []) {
        for (const part of layer.select.split(',')) expect(selectNotes(s, part.trim()).length, `${e.work.id} layer ${layer.id}: ${part}`).toBeGreaterThan(0);
      }
      for (const b of e.analysis.brackets ?? []) {
        expect(noteById(s, b.first), `${e.work.id} bracket ${b.label} first`).toBeDefined();
        expect(noteById(s, b.last), `${e.work.id} bracket ${b.label} last`).toBeDefined();
        if (b.layer) expect(e.analysis.layers?.some((l) => l.id === b.layer), `${e.work.id} bracket layer ${b.layer}`).toBe(true);
      }
    }
  });

  it('is referenced by every workId in presets, basic ideas and texture progressions', () => {
    const ids = new Set(REPERTOIRE.map((e) => e.work.id));
    for (const p of MOTIVE_PRESETS) expect(ids.has(p.workId), p.id).toBe(true);
    for (const b of BASIC_IDEAS) if (b.workId) expect(ids.has(b.workId), b.id).toBe(true);
    for (const t of TEXTURE_PROGRESSIONS) if (t.workId) expect(ids.has(t.workId), t.id).toBe(true);
    expect(ids.has(THEME_WORK)).toBe(true);
  });
});

describe('borrowing helpers', () => {
  it('keeps rests and joins ties in a fragment', () => {
    const fifth = fragment('op67', '0.0.0-4');
    expect(fifth.map((n) => [n.pitches[0]?.letter ?? 'r', n.dur])).toEqual([['r', 0.5], ['G', 0.5], ['G', 0.5], ['G', 0.5], ['E', 2]]);
    const tied = fragment('op67', '0.0.9-10');
    expect(tied).toHaveLength(1);
    expect(tied[0].dur).toBe(4);
    expect(() => fragment('op67', 'motive')).toThrow();
  });

  it('gives the motive presets the notes the excerpts show', () => {
    expect(motiveFragment('bwv772', '0.0.1-7').map((n) => n.pitch!.letter).join('')).toBe('CDEFDEC');
    expect(MOTIVE_PRESETS.find((p) => p.id === 'beethoven')!.motive[0].pitch).toBeNull();
    expect(MOTIVE_PRESETS.find((p) => p.id === 'mozart')!.motive.map((n) => n.dur)).toEqual([2, 1, 1, 1.5, 0.25, 0.25, 1]);
  });

  it('reads the K. 265 theme beat by beat, matching the arrays it replaced', () => {
    const names = (ps: typeof THEME) => ps.map((p) => `${p.letter}${p.acc ? (p.acc > 0 ? '#' : 'b') : ''}${p.octave}`).join(' ');
    expect(names(THEME)).toBe('C5 C5 G5 G5 A5 A5 G5 G5 F5 F5 E5 E5 D5 D5 C5');
    expect(names(THEME_BASS)).toBe('C3 C4 E4 C4 F4 C4 E4 C4 D4 B3 C4 A3 F3 G3 C3');
    expect(HARMONY_MAJOR).toEqual(['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V43', 'V65', 'I', 'vi', 'ii6', 'V', 'I']);
    const entries = quarterEntries('k265theme', 0, 0);
    expect(entries[entries.length - 1].dur).toBe(2);
    expect(entries[0].pitch).toEqual(pitch('C5'));
    expect(plainNumeral('V⁶₅')).toBe('V65');
    expect(plainNumeral('vii°⁷')).toBe('vii°7');
  });
});
