/**
 * Scale and mode catalog, organized by musical tradition and, within each tradition, by family
 * (maqam family, thaat, chakra, mode family ...). The definitions live in ./catalog.
 *
 * Every scale is a list of spelled intervals above the root, so spelling is always theoretically
 * correct (C# Lydian contains F##, not G). Scales from traditions that do not use 12-tone equal
 * temperament also carry a deviation in cents for each degree.
 */
import { interval, transpose, degreeLabel, type Interval } from './intervals';
import { mod, type Note } from './notes';
import type { ScaleDef, TraditionId } from './catalog/define';
import { WESTERN } from './catalog/western';
import { JAZZ } from './catalog/jazz';
import { SYMMETRIC } from './catalog/symmetric';
import { ARABIC } from './catalog/arabic';
import { TURKISH } from './catalog/turkish';
import { PERSIAN } from './catalog/persian';
import { BYZANTINE } from './catalog/byzantine';
import { JEWISH } from './catalog/jewish';
import { HINDUSTANI } from './catalog/hindustani';
import { CARNATIC } from './catalog/carnatic';
import { EAST_ASIAN } from './catalog/eastAsian';
import { SOUTHEAST_ASIAN } from './catalog/southeastAsian';
import { ETHIOPIAN } from './catalog/ethiopian';
import { GREEK } from './catalog/greek';

export type { ScaleDef, ScaleForm, FormStep, TraditionId } from './catalog/define';
export type ScaleFamily = string;

/** How a tradition writes notes that fall between the keys of a piano. */
export type MicroNotation = 'quarter' | 'arrows' | 'turkish' | 'persian';

export interface Tradition {
  id: TraditionId;
  name: string;
  /** Short label for chips and grouped lists. */
  short: string;
  /** One-line summary for the browser. */
  blurb: string;
  /** What a "scale" means in this tradition and how to read the entries. */
  about: string;
  /** What the family level groups. */
  familyLabel: string;
  notation: MicroNotation;
  /** Tertian chords and chord-scale theory belong to this tradition. */
  harmonic?: boolean;
}

export const TRADITIONS: Tradition[] = [
  {
    id: 'western', short: 'Western', name: 'Western classical and modal', familyLabel: 'Mode family', notation: 'arrows', harmonic: true,
    blurb: 'Church modes, Gregorian modes and the modes of the minor and major scale variants.',
    about: 'Scales of European art music. The diatonic modes and the modes of melodic minor, harmonic minor, harmonic major and double harmonic major are rotations of one parent scale each.',
  },
  {
    id: 'jazz', short: 'Jazz', name: 'Jazz, blues and popular', familyLabel: 'Family', notation: 'arrows', harmonic: true,
    blurb: 'Pentatonic, blues and bebop scales.',
    about: 'Scales used for improvising over chord changes. Bebop scales add a passing tone so that chord tones fall on the beat.',
  },
  {
    id: 'symmetric', short: 'Symmetric', name: 'Symmetric and synthetic', familyLabel: 'Family', notation: 'arrows', harmonic: true,
    blurb: 'Messiaen\'s modes of limited transposition and other 20th-century scales.',
    about: 'Scales built from a repeating interval pattern, which reproduce themselves when transposed by part of an octave, and scales invented by composers.',
  },
  {
    id: 'arabic', short: 'Maqam', name: 'Arabic maqam', familyLabel: 'Maqam family', notation: 'quarter',
    blurb: 'Maqamat grouped by the jins on their tonic, with half-flat notes.',
    about: 'A maqam is a melodic mode built from ajnas (three- to five-note building blocks) with a characteristic path (sayr), focal notes and intonation. Half-flat notes lie roughly a quarter tone below the natural note; their exact size varies by region and performer. Pitches follow MaqamWorld. Picking a maqam loads it on its customary tonic.',
  },
  {
    id: 'turkish', short: 'Makam', name: 'Turkish makam', familyLabel: 'Family', notation: 'turkish',
    blurb: 'Makamlar in the 53-comma Arel-Ezgi-Uzdilek system.',
    about: 'Turkish theory divides the whole tone into 9 commas (about 22.6 cents each) and builds makamlar from tetrachords and pentachords. Each makam has a tonic (durak), a dominant (güçlü) and a typical melodic progression (seyir). Picking a makam loads it on its customary tonic.',
  },
  {
    id: 'persian', short: 'Dastgāh', name: 'Persian dastgāh', familyLabel: 'Group', notation: 'persian',
    blurb: 'The seven dastgāh and their āvāz, with koron and sori notes.',
    about: 'A dastgāh is a collection of melodic models (gushe) sharing a mode, learned through the radif. Koron (lowered) and sori (raised) notes are shown as quarter tones following Vaziri; performers\' intervals vary. Picking a dastgāh loads it on its customary finalis.',
  },
  {
    id: 'byzantine', short: 'Byzantine', name: 'Byzantine echoi', familyLabel: 'Cycle', notation: 'arrows',
    blurb: 'The eight modes of Orthodox chant in diatonic, chromatic and enharmonic genera.',
    about: 'The Oktoechos organizes Byzantine chant into four authentic and four plagal echoi. Intervals follow the 72-moria division of the Patriarchal Music Committee (1881). Degree names are the phthongoi Ni Pa Vou Ga Di Ke Zo.',
  },
  {
    id: 'jewish', short: 'Jewish', name: 'Jewish prayer modes and cantillation', familyLabel: 'Group', notation: 'quarter',
    blurb: 'Ashkenazi shtayger and the modes of scriptural cantillation.',
    about: 'Ashkenazi cantors improvise within prayer modes named after the prayers where they are used. Cantillation of scripture follows melodic motifs for each accent sign; Middle Eastern communities use the maqam system.',
  },
  {
    id: 'hindustani', short: 'Hindustani', name: 'Hindustani raga', familyLabel: 'Thaat', notation: 'arrows',
    blurb: 'The ten thaats and representative ragas, with aroha and avaroha.',
    about: 'A raga is a melodic framework with its own ascent and descent, important notes (vadi and samvadi), characteristic phrases and time of day. Bhatkhande grouped ragas under ten parent scales (thaats). Sa is movable: choose any root. Degree labels use sargam: lowercase for komal (flat), M for tivra Ma.',
  },
  {
    id: 'carnatic', short: 'Carnatic', name: 'Carnatic raga', familyLabel: 'Chakra', notation: 'arrows',
    blurb: 'All 72 melakarta ragas by chakra, and common janya ragas.',
    about: 'Every melakarta uses Sa, Pa, one Ma and one each of Ri, Ga, Dha and Ni, giving 72 parent scales grouped in twelve chakras. Janya ragas are derived from a melakarta by omitting notes or adding zigzag movement. Degree labels use the sixteen svara names (R1, G3, M2 ...).',
  },
  {
    id: 'east-asian', short: 'East Asian', name: 'Chinese, Japanese and Korean', familyLabel: 'Group', notation: 'arrows',
    blurb: 'Pentatonic modes, Japanese scales and Korean modes.',
    about: 'Much East Asian music is built on pentatonic collections whose modes are chosen by the final note. Japanese scales are often described, after Koizumi Fumio, as pairs of fourths filled with one note each.',
  },
  {
    id: 'southeast-asian', short: 'Gamelan & Thai', name: 'Gamelan and Thai', familyLabel: 'Group', notation: 'arrows',
    blurb: 'Slendro, pelog and Thai seven-tone tuning.',
    about: 'These tunings are not approximations of 12-tone temperament: their steps fall between the keys of a piano. The keyboard shows the nearest keys, and playback uses the exact pitches.',
  },
  {
    id: 'ethiopian', short: 'Ethiopian', name: 'Ethiopian qenet', familyLabel: 'Group', notation: 'arrows',
    blurb: 'Tizita, Bati, Ambassel and Anchihoye.',
    about: 'The four qenet are the basic pentatonic modes of Ethiopian secular music, played on the krar and masenqo.',
  },
  {
    id: 'greek', short: 'Greek', name: 'Ancient Greek', familyLabel: 'Group', notation: 'quarter',
    blurb: 'The seven harmoniai and the three genera.',
    about: 'Greek theory built scales from tetrachords spanning a perfect fourth, divided according to genus: diatonic, chromatic or enharmonic. The Greek mode names differ from the medieval church modes that borrowed them.',
  },
];

export const TRADITION_BY_ID: Record<TraditionId, Tradition> = Object.fromEntries(TRADITIONS.map((t) => [t.id, t])) as Record<TraditionId, Tradition>;

export const SCALES: ScaleDef[] = [
  ...WESTERN,
  ...JAZZ,
  ...SYMMETRIC,
  ...ARABIC,
  ...TURKISH,
  ...PERSIAN,
  ...BYZANTINE,
  ...JEWISH,
  ...HINDUSTANI,
  ...CARNATIC,
  ...EAST_ASIAN,
  ...SOUTHEAST_ASIAN,
  ...ETHIOPIAN,
  ...GREEK,
];

/** Every family, in catalog order. */
export const SCALE_FAMILIES: string[] = [...new Set(SCALES.map((s) => s.family))];

/** Families of a tradition, in catalog order. */
export function familiesOf(tradition: TraditionId): string[] {
  return [...new Set(SCALES.filter((s) => s.tradition === tradition).map((s) => s.family))];
}

/** Scales of one family. */
export function scalesInFamily(tradition: TraditionId, family: string): ScaleDef[] {
  return SCALES.filter((s) => s.tradition === tradition && s.family === family);
}

/** Deviation in cents from 12-TET of each degree (0 when the scale is equal-tempered). */
export function scaleDeviations(def: ScaleDef): number[] {
  return def.cents ?? def.intervals.map(() => 0);
}

/** Size of each degree in cents above the tonic, using the scale's own intonation. */
export function scaleCents(def: ScaleDef): number[] {
  const dev = scaleDeviations(def);
  return def.intervals.map((iv, i) => interval(iv).semis * 100 + dev[i] - dev[0]);
}

/**
 * True when any degree differs audibly from 12-tone equal temperament (15 cents or more relative to
 * the tonic). Such scales are left out of the 12-tone tools: chord building, the scale finder and
 * pitch-class matching.
 */
export function hasMicrotones(def: ScaleDef): boolean {
  const dev = scaleDeviations(def);
  return dev.some((d) => Math.abs(d - dev[0]) >= 15);
}

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
    if (hasMicrotones(scale)) continue;
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
    if (scale.id === 'chromatic' || hasMicrotones(scale)) continue;
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const set = new Set(scalePcs(rootPc, scale.id));
      if ([...wanted].every((p) => set.has(p))) results.push({ rootPc, scale });
    }
  }
  return results.sort((a, b) => a.scale.intervals.length - b.scale.intervals.length);
}

