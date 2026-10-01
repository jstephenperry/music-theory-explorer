import { describe, expect, it } from 'vitest';
import {
  SCALES,
  SCALE_BY_ID,
  TRADITIONS,
  familiesOf,
  findScalesByPcs,
  hasMicrotones,
  scaleCents,
  scaleDeviations,
  scalesInFamily,
} from '../scales';
import { CHORDS } from '../chords';
import { interval } from '../intervals';
import { note } from '../notes';
import { parseToken } from '../catalog/define';

const rounded = (id: string) => scaleCents(SCALE_BY_ID[id]).map((c) => Math.round(c));

describe('scale catalog', () => {
  it('has unique ids', () => {
    const ids = SCALES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every tradition at least one family, and every family at least one scale', () => {
    for (const t of TRADITIONS) {
      const fams = familiesOf(t.id);
      expect(fams.length, t.id).toBeGreaterThan(0);
      for (const f of fams) expect(scalesInFamily(t.id, f).length, `${t.id}/${f}`).toBeGreaterThan(0);
    }
    for (const s of SCALES) expect(TRADITIONS.some((t) => t.id === s.tradition), s.id).toBe(true);
  });

  it('has valid intervals, ascending, with matching cents and degree names', () => {
    for (const s of SCALES) {
      const semis = s.intervals.map((iv) => interval(iv).semis);
      for (let i = 1; i < semis.length; i++) expect(semis[i], `${s.id} degree ${i}`).toBeGreaterThanOrEqual(semis[i - 1]);
      const cents = scaleCents(s);
      for (let i = 1; i < cents.length; i++) expect(cents[i], `${s.id} cents ${i}`).toBeGreaterThan(cents[i - 1]);
      expect(cents[cents.length - 1], s.id).toBeLessThan(1200);
      if (s.cents) expect(s.cents.length, s.id).toBe(s.intervals.length);
      if (s.degreeNames) expect(s.degreeNames.length, s.id).toBe(s.intervals.length);
    }
  });

  it('refers only to chords that exist', () => {
    const ids = new Set(CHORDS.map((c) => c.id));
    for (const s of SCALES) if (s.chordId) expect(ids.has(s.chordId), `${s.id} -> ${s.chordId}`).toBe(true);
  });

  it('has parseable tonics', () => {
    for (const s of SCALES) if (s.tonic) expect(() => note(s.tonic!), s.id).not.toThrow();
  });

  it('uses only scale notes in raga ascents and descents and in church-mode ranges', () => {
    // Maqam and Western ascending/descending forms may bring in alternative notes (Rast descends with B♭),
    // but a raga's aroha and avaroha and a mode's ambitus must stay within the scale.
    for (const s of SCALES) {
      if (!s.forms) continue;
      const dev = scaleDeviations(s);
      const pcs = s.intervals.map((iv, i) => (((interval(iv).semis * 100 + dev[i]) % 1200) + 1200) % 1200);
      for (const f of s.forms.filter((x) => /^(Aroha|Avaroha|Ambitus)/.test(x.label))) {
        for (const st of f.steps) {
          const c = (((st.interval.semis * 100 + st.cents) % 1200) + 1200) % 1200;
          const ok = pcs.some((p) => Math.abs(p - c) < 1 || Math.abs(p - c) > 1199);
          expect(ok, `${s.id} ${f.label} ${st.name}`).toBe(true);
        }
      }
    }
  });

  it('parses microtonal tokens', () => {
    expect(parseToken('M3-50')).toEqual({ name: 'M3', cents: -50, octave: 0 });
    expect(parseToken('-M7')).toEqual({ name: 'M7', cents: 0, octave: -1 });
    expect(parseToken('m2+24.5')).toEqual({ name: 'm2', cents: 24.5, octave: 0 });
    expect(() => parseToken('X3')).toThrow();
  });
});

describe('intonation of microtonal traditions', () => {
  it('Arabic maqamat use MaqamWorld pitches', () => {
    expect(rounded('rast')).toEqual([0, 204, 355, 498, 702, 906, 1064]);
    expect(rounded('bayati')).toEqual([0, 151, 281, 498, 702, 792, 996]);
    // Sikah starts on E half-flat: its first step is a three-quarter tone.
    expect(rounded('sikah')).toEqual([0, 132, 336, 540, 698, 834, 1038]);
    expect(SCALE_BY_ID.sikah.cents![0]).toBeCloseTo(-34, 0);
    expect(rounded('saba')).toEqual([0, 151, 294, 393, 690, 792, 996]);
  });

  it('Turkish makamlar follow the 53-comma division', () => {
    const comma = 1200 / 53;
    const rast = scaleCents(SCALE_BY_ID['makam-rast']);
    [0, 9, 17, 22, 31, 40, 48].forEach((c, i) => expect(rast[i]).toBeCloseTo(c * comma, 0));
    const hicaz = scaleCents(SCALE_BY_ID['makam-hicaz']);
    [0, 5, 17, 22, 31, 39, 44].forEach((c, i) => expect(hicaz[i]).toBeCloseTo(c * comma, 0));
  });

  it('Byzantine echoi follow the 72-moria division', () => {
    const moria = (m: number) => (m * 1200) / 72;
    const first = scaleCents(SCALE_BY_ID['echos-1']);
    [0, 10, 18, 30, 42, 52, 60].forEach((m, i) => expect(first[i]).toBeCloseTo(moria(m), 0));
    const plagal2 = scaleCents(SCALE_BY_ID['echos-plagal-2']);
    [0, 6, 26, 30, 42, 48, 68].forEach((m, i) => expect(plagal2[i]).toBeCloseTo(moria(m), 0));
  });

  it('Persian koron notes are quarter tones', () => {
    expect(rounded('dastgah-shur')).toEqual([0, 150, 300, 500, 700, 800, 1000]);
    expect(rounded('dastgah-chahargah')).toEqual([0, 150, 400, 500, 700, 850, 1100]);
    expect(rounded('dastgah-segah')).toEqual([0, 150, 350, 500, 650, 850, 1050]);
  });

  it('marks only audibly non-equal-tempered scales as microtonal', () => {
    expect(hasMicrotones(SCALE_BY_ID.rast)).toBe(true);
    expect(hasMicrotones(SCALE_BY_ID['makam-cargah'])).toBe(false);
    expect(hasMicrotones(SCALE_BY_ID['echos-3'])).toBe(false);
    expect(hasMicrotones(SCALE_BY_ID.ionian)).toBe(false);
    expect(hasMicrotones(SCALE_BY_ID.slendro)).toBe(true);
  });

  it('leaves microtonal scales out of pitch-class matching', () => {
    const found = findScalesByPcs([0, 2, 4, 5, 7, 9, 11]).map((r) => r.scale.id);
    expect(found).toContain('ionian');
    expect(found).toContain('thaat-bilawal');
    expect(found).toContain('melakarta-29');
    expect(found).not.toContain('rast');
  });
});

describe('Carnatic melakartas', () => {
  const melas = SCALES.filter((s) => s.id.startsWith('melakarta-'));
  it('has all 72, each a distinct seven-note scale with Sa and Pa', () => {
    expect(melas.length).toBe(72);
    const sets = new Set(melas.map((m) => m.intervals.map((iv) => interval(iv).semis).join(',')));
    expect(sets.size).toBe(72);
    for (const m of melas) {
      expect(m.intervals[0]).toBe('P1');
      expect(m.intervals[4]).toBe('P5');
      expect(new Set(m.intervals.map((iv) => iv.slice(-1))).size, m.id).toBe(7);
    }
  });
  it('matches the well-known melakartas', () => {
    const semis = (n: number) => SCALE_BY_ID[`melakarta-${n}`].intervals.map((iv) => interval(iv).semis);
    expect(semis(29)).toEqual([0, 2, 4, 5, 7, 9, 11]); // Dheerasankarabharanam: major
    expect(semis(65)).toEqual([0, 2, 4, 6, 7, 9, 11]); // Mechakalyani: Lydian
    expect(semis(15)).toEqual([0, 1, 4, 5, 7, 8, 11]); // Mayamalavagowla: double harmonic
    expect(semis(8)).toEqual([0, 1, 3, 5, 7, 8, 10]); // Hanumatodi: Phrygian
    expect(semis(22)).toEqual([0, 2, 3, 5, 7, 9, 10]); // Kharaharapriya: Dorian
    expect(semis(1)).toEqual([0, 1, 2, 5, 7, 8, 9]); // Kanakangi: R1 G1 D1 N1
    expect(semis(72)).toEqual([0, 3, 4, 6, 7, 10, 11]); // Rasikapriya: R3 G3 D3 N3
  });
});
