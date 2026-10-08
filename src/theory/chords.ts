/**
 * Chord catalog, chord symbols and chord identification.
 */
import { interval, transpose, degreeLabel, type Interval } from './intervals';
import { mod, note, noteFromPc, noteName, pc, type Note, type SpellingPreference } from './notes';

export type ChordCategory =
  | 'Triads'
  | 'Suspended & power'
  | 'Sixths'
  | 'Sevenths'
  | 'Extended'
  | 'Added tone'
  | 'Altered dominants'
  | 'Quartal & named'
  | 'Augmented sixths';

export interface ChordDef {
  id: string;
  name: string;
  /** Display suffix after the root, e.g. "maj7", "ø7", "7♯9". */
  symbol: string;
  /** ASCII suffixes accepted when parsing chord symbols (case sensitive). */
  aliases: string[];
  intervals: string[];
  category: ChordCategory;
  description?: string;
  /** Excluded from automatic identification (enharmonic duplicates that need context). */
  noIdentify?: boolean;
}

export const CHORD_CATEGORIES: ChordCategory[] = [
  'Triads',
  'Suspended & power',
  'Sixths',
  'Sevenths',
  'Extended',
  'Added tone',
  'Altered dominants',
  'Quartal & named',
  'Augmented sixths',
];

export const CHORDS: ChordDef[] = [
  // Triads
  { id: 'maj', name: 'Major triad', symbol: '', aliases: ['', 'M', 'maj', 'major'], intervals: ['P1', 'M3', 'P5'], category: 'Triads', description: 'Root, major third, perfect fifth. Stable and bright.' },
  { id: 'min', name: 'Minor triad', symbol: 'm', aliases: ['m', 'min', '-', 'mi', 'minor'], intervals: ['P1', 'm3', 'P5'], category: 'Triads', description: 'Root, minor third, perfect fifth. Stable and darker.' },
  { id: 'dim', name: 'Diminished triad', symbol: '°', aliases: ['dim', 'o', '°'], intervals: ['P1', 'm3', 'd5'], category: 'Triads', description: 'Two stacked minor thirds. Unstable; contains a tritone.' },
  { id: 'aug', name: 'Augmented triad', symbol: '+', aliases: ['aug', '+', '#5', '(#5)'], intervals: ['P1', 'M3', 'A5'], category: 'Triads', description: 'Two stacked major thirds. Symmetric: divides the octave into three equal parts.' },
  { id: 'majb5', name: 'Major flat five', symbol: '(♭5)', aliases: ['b5', '(b5)', 'majb5'], intervals: ['P1', 'M3', 'd5'], category: 'Triads', description: 'Major third with a diminished fifth; the top of a French augmented sixth.' },

  // Suspended & power
  { id: 'sus2', name: 'Suspended second', symbol: 'sus2', aliases: ['sus2'], intervals: ['P1', 'M2', 'P5'], category: 'Suspended & power', description: 'The third is replaced by a major second; neither major nor minor.' },
  { id: 'sus4', name: 'Suspended fourth', symbol: 'sus4', aliases: ['sus4', 'sus'], intervals: ['P1', 'P4', 'P5'], category: 'Suspended & power', description: 'The third is replaced by a fourth, which traditionally resolves down to the third.' },
  { id: '5', name: 'Power chord', symbol: '5', aliases: ['5', '(no3)'], intervals: ['P1', 'P5'], category: 'Suspended & power', description: 'Root and fifth only. Neither major nor minor; the staple of distorted guitar.' },

  // Sixths
  { id: '6', name: 'Major sixth', symbol: '6', aliases: ['6', 'M6', 'maj6', 'add6'], intervals: ['P1', 'M3', 'P5', 'M6'], category: 'Sixths', description: 'Major triad with an added major sixth. A tonic chord of swing-era and early pop harmony.' },
  { id: 'm6', name: 'Minor sixth', symbol: 'm6', aliases: ['m6', 'min6', '-6'], intervals: ['P1', 'm3', 'P5', 'M6'], category: 'Sixths', description: 'Minor triad with a major sixth: the Dorian tonic chord.' },
  { id: '69', name: 'Six-nine', symbol: '6/9', aliases: ['69', '6/9', '6add9'], intervals: ['P1', 'M3', 'P5', 'M6', 'M9'], category: 'Sixths', description: 'Major sixth with an added ninth. A pentatonic, consonant jazz tonic.' },
  { id: 'm69', name: 'Minor six-nine', symbol: 'm6/9', aliases: ['m69', 'm6/9', '-69'], intervals: ['P1', 'm3', 'P5', 'M6', 'M9'], category: 'Sixths' },

  // Sevenths
  { id: 'maj7', name: 'Major seventh', symbol: 'maj7', aliases: ['maj7', 'M7', 'Δ7', 'Δ', 'ma7', 'j7'], intervals: ['P1', 'M3', 'P5', 'M7'], category: 'Sevenths', description: 'Major triad plus major seventh. A tonic chord in jazz and bossa nova.' },
  { id: '7', name: 'Dominant seventh', symbol: '7', aliases: ['7', 'dom7', 'dom'], intervals: ['P1', 'M3', 'P5', 'm7'], category: 'Sevenths', description: 'Major triad plus minor seventh. The tritone between 3 and ♭7 pulls toward resolution.' },
  { id: 'm7', name: 'Minor seventh', symbol: 'm7', aliases: ['m7', 'min7', '-7', 'mi7'], intervals: ['P1', 'm3', 'P5', 'm7'], category: 'Sevenths', description: 'Minor triad plus minor seventh. The ii chord of a major key.' },
  { id: 'mMaj7', name: 'Minor major seventh', symbol: 'm(maj7)', aliases: ['mMaj7', 'm(maj7)', 'mM7', 'm(M7)', '-maj7', 'minmaj7', 'mmaj7'], intervals: ['P1', 'm3', 'P5', 'M7'], category: 'Sevenths', description: 'Minor triad plus major seventh. Used for suspense in film and television scores.' },
  { id: 'm7b5', name: 'Half-diminished seventh', symbol: 'ø7', aliases: ['m7b5', 'ø7', 'ø', 'min7b5', '-7b5', 'm7(b5)'], intervals: ['P1', 'm3', 'd5', 'm7'], category: 'Sevenths', description: 'Diminished triad plus minor seventh. The ii chord of a minor key.' },
  { id: 'dim7', name: 'Diminished seventh', symbol: '°7', aliases: ['dim7', 'o7', '°7'], intervals: ['P1', 'm3', 'd5', 'd7'], category: 'Sevenths', description: 'Three stacked minor thirds. Symmetric: any note can be heard as the root, which makes it a useful pivot for modulation.' },
  { id: '7#5', name: 'Augmented seventh', symbol: '7♯5', aliases: ['7#5', 'aug7', '+7', '7+', '7(#5)'], intervals: ['P1', 'M3', 'A5', 'm7'], category: 'Sevenths', description: 'Dominant seventh with a raised fifth that leads up chromatically.' },
  { id: 'maj7#5', name: 'Augmented major seventh', symbol: 'maj7♯5', aliases: ['maj7#5', '+maj7', 'augmaj7', 'maj7+', '+M7', 'Δ7#5', 'maj7(#5)'], intervals: ['P1', 'M3', 'A5', 'M7'], category: 'Sevenths', description: 'Augmented triad with a major seventh.' },
  { id: '7b5', name: 'Dominant seventh flat five', symbol: '7♭5', aliases: ['7b5', '7(b5)'], intervals: ['P1', 'M3', 'd5', 'm7'], category: 'Sevenths', description: 'Contains two tritones; identical to its own tritone substitution.' },
  { id: '7sus4', name: 'Dominant seventh suspended', symbol: '7sus4', aliases: ['7sus4', '7sus'], intervals: ['P1', 'P4', 'P5', 'm7'], category: 'Sevenths', description: 'A dominant without the tension of the tritone; common in modal jazz.' },
  { id: 'maj7b5', name: 'Major seventh flat five', symbol: 'maj7♭5', aliases: ['maj7b5', 'maj7(b5)'], intervals: ['P1', 'M3', 'd5', 'M7'], category: 'Sevenths' },
  { id: 'dimMaj7', name: 'Diminished major seventh', symbol: '°(maj7)', aliases: ['dimmaj7', 'o(maj7)', 'dim(maj7)', 'oM7'], intervals: ['P1', 'm3', 'd5', 'M7'], category: 'Sevenths' },

  // Extended
  { id: 'maj9', name: 'Major ninth', symbol: 'maj9', aliases: ['maj9', 'M9', 'Δ9'], intervals: ['P1', 'M3', 'P5', 'M7', 'M9'], category: 'Extended' },
  { id: '9', name: 'Dominant ninth', symbol: '9', aliases: ['9'], intervals: ['P1', 'M3', 'P5', 'm7', 'M9'], category: 'Extended' },
  { id: 'm9', name: 'Minor ninth', symbol: 'm9', aliases: ['m9', 'min9', '-9'], intervals: ['P1', 'm3', 'P5', 'm7', 'M9'], category: 'Extended' },
  { id: 'mMaj9', name: 'Minor major ninth', symbol: 'm(maj9)', aliases: ['mMaj9', 'm(maj9)', 'mM9'], intervals: ['P1', 'm3', 'P5', 'M7', 'M9'], category: 'Extended' },
  { id: '11', name: 'Dominant eleventh', symbol: '11', aliases: ['11'], intervals: ['P1', 'M3', 'P5', 'm7', 'M9', 'P11'], category: 'Extended', description: 'In practice the third is usually omitted because it clashes with the eleventh.' },
  { id: 'm11', name: 'Minor eleventh', symbol: 'm11', aliases: ['m11', 'min11', '-11'], intervals: ['P1', 'm3', 'P5', 'm7', 'M9', 'P11'], category: 'Extended' },
  { id: 'maj7#11', name: 'Major seventh sharp eleven', symbol: 'maj7♯11', aliases: ['maj7#11', 'Δ#11', 'maj7(#11)', 'M7#11'], intervals: ['P1', 'M3', 'P5', 'M7', 'A11'], category: 'Extended', description: 'The Lydian chord.' },
  { id: 'maj9#11', name: 'Major ninth sharp eleven', symbol: 'maj9♯11', aliases: ['maj9#11', 'M9#11'], intervals: ['P1', 'M3', 'P5', 'M7', 'M9', 'A11'], category: 'Extended' },
  { id: '13', name: 'Dominant thirteenth', symbol: '13', aliases: ['13'], intervals: ['P1', 'M3', 'P5', 'm7', 'M9', 'M13'], category: 'Extended', description: 'The eleventh is usually omitted because it clashes with the third.' },
  { id: 'm13', name: 'Minor thirteenth', symbol: 'm13', aliases: ['m13', 'min13', '-13'], intervals: ['P1', 'm3', 'P5', 'm7', 'M9', 'P11', 'M13'], category: 'Extended' },
  { id: 'maj13', name: 'Major thirteenth', symbol: 'maj13', aliases: ['maj13', 'M13', 'Δ13'], intervals: ['P1', 'M3', 'P5', 'M7', 'M9', 'M13'], category: 'Extended' },
  { id: '9sus4', name: 'Ninth suspended', symbol: '9sus4', aliases: ['9sus4', '9sus'], intervals: ['P1', 'P4', 'P5', 'm7', 'M9'], category: 'Extended' },

  // Added tone
  { id: 'add9', name: 'Added ninth', symbol: 'add9', aliases: ['add9', 'add2', '(add9)'], intervals: ['P1', 'M3', 'P5', 'M9'], category: 'Added tone' },
  { id: 'madd9', name: 'Minor added ninth', symbol: 'm(add9)', aliases: ['madd9', 'm(add9)', 'madd2'], intervals: ['P1', 'm3', 'P5', 'M9'], category: 'Added tone' },
  { id: 'add11', name: 'Added eleventh', symbol: 'add11', aliases: ['add11', 'add4'], intervals: ['P1', 'M3', 'P5', 'P11'], category: 'Added tone' },
  { id: 'addSharp11', name: 'Added sharp eleventh', symbol: 'add♯11', aliases: ['add#11', '(add#11)'], intervals: ['P1', 'M3', 'P5', 'A11'], category: 'Added tone', description: 'A major triad with the Lydian raised fourth.' },

  // Altered dominants
  { id: '7b9', name: 'Dominant seventh flat nine', symbol: '7♭9', aliases: ['7b9', '7(b9)'], intervals: ['P1', 'M3', 'P5', 'm7', 'm9'], category: 'Altered dominants', description: 'Common minor-key dominant; the top four notes form a diminished seventh chord.' },
  { id: '7#9', name: 'Dominant seventh sharp nine', symbol: '7♯9', aliases: ['7#9', '7(#9)'], intervals: ['P1', 'M3', 'P5', 'm7', 'A9'], category: 'Altered dominants', description: 'The Hendrix chord, from Purple Haze: major and minor third at once.' },
  { id: '7#11', name: 'Dominant seventh sharp eleven', symbol: '7♯11', aliases: ['7#11', '7(#11)'], intervals: ['P1', 'M3', 'P5', 'm7', 'A11'], category: 'Altered dominants', description: 'The Lydian dominant sound.' },
  { id: '7b13', name: 'Dominant seventh flat thirteen', symbol: '7♭13', aliases: ['7b13', '7(b13)'], intervals: ['P1', 'M3', 'P5', 'm7', 'm13'], category: 'Altered dominants' },
  { id: '9#11', name: 'Ninth sharp eleven', symbol: '9♯11', aliases: ['9#11', '9(#11)'], intervals: ['P1', 'M3', 'P5', 'm7', 'M9', 'A11'], category: 'Altered dominants' },
  { id: '7#5#9', name: 'Seventh sharp five sharp nine', symbol: '7♯5♯9', aliases: ['7#5#9', '7(#5#9)', '+7#9'], intervals: ['P1', 'M3', 'A5', 'm7', 'A9'], category: 'Altered dominants' },
  { id: '7b5b9', name: 'Seventh flat five flat nine', symbol: '7♭5♭9', aliases: ['7b5b9', '7(b5b9)'], intervals: ['P1', 'M3', 'd5', 'm7', 'm9'], category: 'Altered dominants' },
  { id: '13b9', name: 'Thirteenth flat nine', symbol: '13♭9', aliases: ['13b9', '13(b9)'], intervals: ['P1', 'M3', 'P5', 'm7', 'm9', 'M13'], category: 'Altered dominants', description: 'The half-whole diminished sound.' },
  { id: '13#11', name: 'Thirteenth sharp eleven', symbol: '13♯11', aliases: ['13#11', '13(#11)'], intervals: ['P1', 'M3', 'P5', 'm7', 'M9', 'A11', 'M13'], category: 'Altered dominants' },
  { id: '7alt', name: 'Altered dominant', symbol: '7alt', aliases: ['7alt', 'alt', '7(#9b13)', '7#9b13'], intervals: ['P1', 'M3', 'm7', 'A9', 'm13'], category: 'Altered dominants', description: 'A dominant with altered fifth and ninth, drawn from the altered scale. Shown with ♯9 and ♭13.' },

  // Quartal & named
  { id: 'quartal', name: 'Quartal (stacked fourths)', symbol: 'quartal', aliases: ['quartal', 'q'], intervals: ['P1', 'P4', 'm7', 'm10'], category: 'Quartal & named', description: 'Built from perfect fourths instead of thirds (McCoy Tyner, Hindemith).' },
  { id: 'sowhat', name: 'So What chord', symbol: ' (So What)', aliases: ['sowhat'], intervals: ['P1', 'P4', 'm7', 'm10', 'P12'], category: 'Quartal & named', description: 'Three fourths topped by a major third, from Miles Davis\'s "So What" (Bill Evans voicing).' },
  { id: 'mystic', name: 'Mystic chord (Scriabin)', symbol: ' (mystic)', aliases: ['mystic'], intervals: ['P1', 'A4', 'm7', 'M10', 'M13', 'M16'], category: 'Quartal & named', description: 'Scriabin\'s chord of fourths: C F♯ B♭ E A D (Prometheus).' },
  { id: 'petrushka', name: 'Petrushka chord', symbol: ' (Petrushka)', aliases: ['petrushka'], intervals: ['P1', 'M3', 'P5', 'A4', 'A6', 'A8'], category: 'Quartal & named', description: 'Two major triads a tritone apart (C and F♯) from Stravinsky\'s Petrushka.' },
  { id: 'tristan', name: 'Tristan chord', symbol: ' (Tristan)', aliases: ['tristan'], intervals: ['P1', 'A4', 'A6', 'A9'], category: 'Quartal & named', noIdentify: true, description: 'F B D♯ G♯, the opening of Wagner\'s Tristan und Isolde. Enharmonically a half-diminished seventh, but spelled and resolved differently.' },

  // Augmented sixths (root = bass note on lowered 6th degree)
  { id: 'it6', name: 'Italian augmented sixth', symbol: ' It⁺⁶', aliases: ['It+6', 'It6'], intervals: ['P1', 'M3', 'A6'], category: 'Augmented sixths', noIdentify: true, description: '♭6, 1, ♯4 of the key. The augmented sixth expands outward to the octave on the dominant.' },
  { id: 'fr6', name: 'French augmented sixth', symbol: ' Fr⁺⁶', aliases: ['Fr+6', 'Fr6', 'Fr43'], intervals: ['P1', 'M3', 'A4', 'A6'], category: 'Augmented sixths', noIdentify: true, description: '♭6, 1, 2, ♯4 of the key; a subset of the whole-tone scale.' },
  { id: 'ger6', name: 'German augmented sixth', symbol: ' Ger⁺⁶', aliases: ['Ger+6', 'Ger6', 'Ger65'], intervals: ['P1', 'M3', 'P5', 'A6'], category: 'Augmented sixths', noIdentify: true, description: '♭6, 1, ♭3, ♯4 of the key. Sounds identical to a dominant seventh, which makes it an enharmonic pivot.' },
];

export const CHORD_BY_ID: Record<string, ChordDef> = Object.fromEntries(CHORDS.map((c) => [c.id, c]));

export function getChord(id: string): ChordDef {
  const c = CHORD_BY_ID[id];
  if (!c) throw new Error(`Unknown chord: ${id}`);
  return c;
}

export function chordIntervals(id: string): Interval[] {
  return getChord(id).intervals.map(interval);
}

/** Spelled chord tones, root first, in stacking order. */
export function buildChord(root: Note, chordId: string): Note[] {
  return chordIntervals(chordId).map((i) => transpose(root, i));
}

export function chordPcs(rootPc: number, chordId: string): number[] {
  return chordIntervals(chordId).map((i) => mod(rootPc + i.semis, 12));
}

/** Labels for chord tones: R, 3, ♭3, 5, ♭7, 9, ♯11 ... */
export function chordToneLabels(chordId: string, unicode = true): string[] {
  return chordIntervals(chordId).map((i) => (i.num === 1 ? 'R' : degreeLabel(i, unicode)));
}

/** Chord symbol such as "F♯m7♭5" or "C/E". */
export function chordSymbol(root: Note, chordId: string, bass?: Note | null, unicode = true): string {
  const def = getChord(chordId);
  let suffix = def.symbol;
  if (!unicode) suffix = def.aliases[0] ?? suffix;
  const base = noteName(root, unicode) + suffix;
  if (bass && pc(bass) !== pc(root)) return `${base}/${noteName(bass, unicode)}`;
  return base;
}

/** Map from normalized suffix to chord id, built from aliases and display symbols. */
const SUFFIX_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const c of CHORDS) {
    for (const a of [...c.aliases, c.symbol, c.symbol.trim()]) {
      const key = normalizeSuffix(a);
      if (!map.has(key)) map.set(key, c.id);
    }
  }
  return map;
})();

function normalizeSuffix(s: string): string {
  return s.replace(/\s+/g, '').replace(/♯/g, '#').replace(/♭/g, 'b');
}

export interface ParsedChord {
  root: Note;
  chordId: string;
  bass: Note | null;
}

const CHORD_SYMBOL_RE = /^([A-G](?:#|♯|b|♭|x|𝄪|𝄫)*)(.*?)(?:\/([A-G](?:#|♯|b|♭)*))?$/;

/** Parse chord symbols like "Cmaj7", "F#m7b5", "Bb7#9", "D/F#", "Ebsus4". */
export function parseChordSymbol(input: string): ParsedChord | null {
  const s = input.trim();
  const m = CHORD_SYMBOL_RE.exec(s);
  if (!m) return null;
  let root: Note;
  try {
    root = note(m[1]);
  } catch {
    return null;
  }
  const suffix = normalizeSuffix(m[2] ?? '');
  const chordId = SUFFIX_MAP.get(suffix);
  if (chordId === undefined) return null;
  const bass = m[3] ? note(m[3]) : null;
  return { root, chordId, bass };
}

export interface ChordMatch {
  root: Note;
  chordId: string;
  bass: Note | null;
  /** Chord tones expected by the definition but absent from the input. */
  omitted: string[];
  symbol: string;
  name: string;
  score: number;
  /** 0 = root position, 1 = first inversion ... -1 when the bass is not a chord tone. */
  inversion: number;
}

export interface IdentifyOptions {
  /** Spelled notes used to choose spellings; when absent, default spellings are used. */
  spelled?: Note[];
  /** Pitch class of the lowest note. */
  bassPc?: number;
  pref?: SpellingPreference;
  /** Allow matches where the perfect fifth is missing (default true). */
  allowOmittedFifth?: boolean;
  maxResults?: number;
}

/**
 * Identify chords from a set of pitch classes.
 * Returns candidates ranked by plausibility (exact matches, root in bass, common chord types first).
 */
export function identifyChord(pcsInput: number[], opts: IdentifyOptions = {}): ChordMatch[] {
  const pcs = [...new Set(pcsInput.map((p) => mod(p, 12)))];
  if (pcs.length < 2) return [];
  const allowNo5 = opts.allowOmittedFifth ?? true;
  const spellFor = (p: number): Note => {
    const spelled = opts.spelled?.find((n) => pc(n) === p);
    return spelled ? { ...spelled } : noteFromPc(p, opts.pref ?? 'default');
  };
  const inputSet = new Set(pcs);
  const results: ChordMatch[] = [];

  CHORDS.forEach((def, index) => {
    if (def.noIdentify) return;
    const ivs = def.intervals.map(interval);
    for (const rootPc of pcs) {
      const defPcs = ivs.map((i) => mod(rootPc + i.semis, 12));
      const defSet = new Set(defPcs);
      // Every input note must belong to the chord.
      if (![...inputSet].every((p) => defSet.has(p))) continue;
      const missing = ivs.filter((i) => !inputSet.has(mod(rootPc + i.semis, 12)));
      let omitted: string[] = [];
      if (missing.length > 0) {
        const onlyFifth = missing.length === 1 && missing[0].semis === 7 && missing[0].num === 5;
        if (!allowNo5 || !onlyFifth || defSet.size < 4) continue;
        omitted = ['5'];
      }
      const root = spellFor(rootPc);
      const bassPc = opts.bassPc ?? null;
      const bass = bassPc !== null && bassPc !== rootPc ? spellFor(bassPc) : null;
      const toneOrder = ivs.map((i) => mod(rootPc + i.semis, 12));
      let inversion = 0;
      if (bassPc !== null) {
        // Inversion counted on the stacked-thirds order: root, 3rd, 5th, 7th.
        const pos = toneOrder.indexOf(bassPc);
        inversion = pos;
      }
      let score = 100 - index * 0.5;
      if (omitted.length) score -= 25;
      if (bassPc !== null) {
        if (bassPc === rootPc) score += 30;
        else score -= 5 * Math.max(inversion, 1);
      }
      if (def.category === 'Quartal & named') score -= 30;
      const bassNote = bass ?? null;
      results.push({
        root,
        chordId: def.id,
        bass: bassNote,
        omitted,
        symbol: chordSymbol(root, def.id, bassNote) + (omitted.length ? '(no5)' : ''),
        name: `${noteName(root)} ${def.name.toLowerCase()}${omitted.length ? ' (no fifth)' : ''}`,
        score,
        inversion,
      });
    }
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, opts.maxResults ?? 8);
}

/** Inversion names for display. */
export function inversionName(inversion: number): string {
  return ['Root position', 'First inversion', 'Second inversion', 'Third inversion', 'Fourth inversion', 'Fifth inversion', 'Sixth inversion'][inversion] ?? `Inversion ${inversion}`;
}

/** Figured-bass inversion symbol for triads and seventh chords. */
export function figuredBass(inversion: number, isSeventh: boolean): string {
  if (isSeventh) return ['7', '65', '43', '42'][inversion] ?? '';
  return ['', '6', '64'][inversion] ?? '';
}

export function isSeventhChord(chordId: string): boolean {
  const ivs = chordIntervals(chordId);
  return ivs.length === 4 && ivs.some((i) => i.num === 7);
}

/** Broad quality bucket used for roman numeral case and color coding. */
export function chordQualityClass(chordId: string): 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended' | 'other' {
  const ivs = chordIntervals(chordId);
  const has = (name: string) => ivs.some((i) => i.num === interval(name).num && i.semis === interval(name).semis);
  if (has('m3') && has('d5')) return 'diminished';
  if (has('M3') && has('A5')) return 'augmented';
  if (has('m3')) return 'minor';
  if (has('M3')) return 'major';
  if (has('P4') || has('M2')) return 'suspended';
  return 'other';
}
