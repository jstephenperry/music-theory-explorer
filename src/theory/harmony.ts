/**
 * Harmonic function, chromatic role and cadence analysis for the Progression Lab.
 */
import { chordQualityClass } from './chords';
import { interval, intervalBetween, transpose, transposeDown } from './intervals';
import { parallelKey, type Key } from './keys';
import { mod, noteName, pc, type Note } from './notes';
import { buildScale, scalePcs } from './scales';
import { parseRoman, type RomanChord } from './roman';

export type HarmonicFunction = 'tonic' | 'predominant' | 'dominant' | 'chromatic';
export type Tendency = 'tonic' | 'predominant' | 'dominant';

export interface ChordDescription {
  /** Color category shown on cards. Every non-diatonic chord is 'chromatic'. */
  fn: HarmonicFunction;
  /** What the chord tends to do, even when chromatic. */
  tendency: Tendency;
  /** Short role tag. */
  role: string;
  /** One sentence explanation. */
  detail: string;
  /** Source of a borrowed chord, e.g. "C minor" or "C Dorian". */
  source?: string;
}

export const FUNCTION_LABEL: Record<HarmonicFunction, string> = {
  tonic: 'Tonic',
  predominant: 'Predominant',
  dominant: 'Dominant',
  chromatic: 'Chromatic or borrowed',
};

export const DOMINANT_IDS = new Set([
  '7', '9', '11', '13', '7b9', '7#9', '7#11', '7b13', '9#11', '7#5#9', '7b5b9', '13b9', '13#11', '7alt', '7sus4', '9sus4', '7b5', '7#5',
]);

export function isDominantType(chordId: string): boolean {
  return DOMINANT_IDS.has(chordId);
}

/** Spelled-note membership: G♯ is not A♭, so a major III is not mistaken for harmonic major. */
function spelled(n: Note): string {
  return `${n.letter}${n.acc}`;
}

function pcsIn(notes: Note[], set: Set<string>): boolean {
  return notes.every((n) => set.has(spelled(n)));
}

function scaleSet(tonic: Note, id: string): Set<string> {
  return new Set(buildScale(tonic, id).map(spelled));
}

/** Diatonic test: natural scale of the key; in minor the harmonic minor also counts (V, vii°7). */
export function isDiatonicIn(notes: Note[], key: Key): boolean {
  if (key.mode === 'major') return pcsIn(notes, scaleSet(key.tonic, 'ionian'));
  return pcsIn(notes, scaleSet(key.tonic, 'aeolian')) || pcsIn(notes, scaleSet(key.tonic, 'harmonic-minor'));
}

/** Scale degree (1..7) of a root relative to the tonic, by letter distance. */
export function degreeOf(root: Note, key: Key): number {
  return intervalBetween(key.tonic, root).num;
}

const DEGREE_TENDENCY: Record<number, Tendency> = { 1: 'tonic', 2: 'predominant', 3: 'tonic', 4: 'predominant', 5: 'dominant', 6: 'tonic', 7: 'dominant' };

/** Diatonic triads/sevenths of the key as roots with qualities, used to find resolution targets. */
function diatonicRootQualities(key: Key): Array<{ pc: number; quality: string }> {
  const scale = key.mode === 'major' ? 'ionian' : 'aeolian';
  const pcs = scalePcs(pc(key.tonic), scale);
  return pcs.map((p, i) => {
    const third = mod(pcs[(i + 2) % 7] - p, 12);
    const fifth = mod(pcs[(i + 4) % 7] - p, 12);
    const quality = fifth === 6 ? 'diminished' : fifth === 8 ? 'augmented' : third === 4 ? 'major' : 'minor';
    return { pc: p, quality };
  });
}

function diatonicTargetAt(rootPc: number, key: Key): boolean {
  return diatonicRootQualities(key).some((d) => d.pc === mod(rootPc, 12) && (d.quality === 'major' || d.quality === 'minor'));
}

function normalizedInput(rc: RomanChord): string {
  return rc.input.trim().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, '');
}

const MODES: Array<{ id: string; name: string }> = [
  { id: 'dorian', name: 'Dorian' },
  { id: 'mixolydian', name: 'Mixolydian' },
  { id: 'lydian', name: 'Lydian' },
  { id: 'phrygian', name: 'Phrygian' },
  { id: 'melodic-minor', name: 'melodic minor' },
  { id: 'harmonic-major', name: 'harmonic major' },
];

/** Describe the harmonic function and chromatic role of a parsed chord in a key. */
export function describeChord(rc: RomanChord, key: Key): ChordDescription {
  const input = normalizedInput(rc);
  const tonicName = noteName(key.tonic);
  const degree = degreeOf(rc.root, key);
  const quality = chordQualityClass(rc.chordId);
  const dominantType = isDominantType(rc.chordId);

  // Special chords.
  if (/^(N|N6|bII6)$/.test(input)) {
    return { fn: 'chromatic', tendency: 'predominant', role: 'Neapolitan', detail: `Major triad on ♭2 (${rc.symbol}), usually in first inversion. A dark predominant that moves to V or the cadential six-four.` };
  }
  if (/^(It|Fr|Ger)/.test(input)) {
    const kind = input.startsWith('It') ? 'Italian' : input.startsWith('Fr') ? 'French' : 'German';
    return {
      fn: 'chromatic',
      tendency: 'predominant',
      role: 'Augmented sixth',
      detail: `${kind} augmented sixth: ♭6 in the bass and ♯4 above expand outward by half step to the octave on 5, so it resolves to V or Cad⁶₄.`,
    };
  }
  if (input === 'Cad64') {
    return { fn: 'dominant', tendency: 'dominant', role: 'Cadential six-four', detail: 'Looks like a tonic chord over 5 in the bass, but it embellishes V: the sixth and fourth fall to the fifth and third.' };
  }

  // Secondary (applied) chords.
  if (rc.tonicized) {
    const slash = input.indexOf('/');
    const primary = input.slice(0, slash);
    const targetText = input.slice(slash + 1);
    let target: RomanChord | null = null;
    try {
      target = parseRoman(targetText, key);
    } catch {
      target = null;
    }
    const tName = target ? `${target.display} (${target.symbol})` : targetText;
    if (/^bII/.test(primary)) {
      return { fn: 'chromatic', tendency: 'dominant', role: 'Tritone substitute', detail: `Substitute for the secondary dominant of ${tName}: a dominant a tritone away that slides down a half step into the target.` };
    }
    if (/^V/.test(primary)) {
      return { fn: 'chromatic', tendency: 'dominant', role: 'Secondary dominant', detail: `Dominant of ${tName}. It borrows the pull of V → I to make ${target?.display ?? targetText} sound like a momentary tonic.` };
    }
    if (/^vii/.test(primary)) {
      return { fn: 'chromatic', tendency: 'dominant', role: 'Secondary leading-tone', detail: `Leading-tone chord of ${tName}: its root rises a half step into the target.` };
    }
    if (/^(ii|iv|IV)/.test(primary)) {
      return { fn: 'chromatic', tendency: 'predominant', role: 'Secondary predominant', detail: `Predominant of ${tName}, often paired with its dominant as a tonicizing ii–V.` };
    }
    return { fn: 'chromatic', tendency: DEGREE_TENDENCY[degree], role: 'Applied chord', detail: `Read in the key of ${target?.symbol ?? targetText} for a moment.` };
  }

  // Diatonic chords.
  if (isDiatonicIn(rc.notes, key)) {
    const tendency = DEGREE_TENDENCY[degree];
    const details: Record<number, string> = {
      1: 'Home. Stable, the goal of cadences.',
      2: 'Predominant: leads to V.',
      3: key.mode === 'major' ? 'Weak tonic substitute that shares two tones with I; often leads to vi or IV.' : 'The relative major. A tonic-family chord that often moves to iv or VI.',
      4: 'Predominant: moves to V, or straight home to I in a plagal cadence.',
      5: key.mode === 'major' || quality === 'major' ? 'Dominant: its leading tone and tritone pull to the tonic.' : 'Minor v has no leading tone, so its pull home is gentle and modal.',
      6: key.mode === 'major' ? 'Tonic substitute and the classic deceptive-cadence target; also leads to ii or IV.' : 'Submediant: a soft predominant that often moves to ii° or V.',
      7: quality === 'diminished' ? 'Leading-tone chord: dominant function without the root.' : 'Subtonic: acts like the dominant of III, or a modal dominant.',
    };
    const inv64 = rc.inversion === 2 && degree === 1;
    return {
      fn: tendency,
      tendency,
      role: 'Diatonic',
      detail: inv64 ? 'Tonic in second inversion. Before V it acts as a cadential six-four (dominant function).' : details[degree],
    };
  }

  const chromaticTendency: Tendency = degree === 6 ? 'predominant' : DEGREE_TENDENCY[degree];
  const rootFromTonic = mod(pc(rc.root) - pc(key.tonic), 12);

  // Backdoor dominant (♭VII7) and tritone substitute of V (♭II7).
  if (dominantType && rootFromTonic === 10 && degree === 7) {
    return { fn: 'chromatic', tendency: 'dominant', role: 'Backdoor dominant', detail: `♭VII⁷ resolves up a whole step to ${tonicName}: a softer dominant borrowed from the parallel minor.` };
  }
  if (dominantType && rootFromTonic === 1 && degree === 2) {
    return { fn: 'chromatic', tendency: 'dominant', role: 'Tritone substitute', detail: 'Shares the tritone of V⁷ (with the roles of its third and seventh swapped) and slides down a half step to I.' };
  }

  // Borrowed from the parallel key.
  const par = parallelKey(key);
  const parScale = par.mode === 'minor' ? ['aeolian', 'harmonic-minor'] : ['ionian'];
  for (const id of parScale) {
    if (pcsIn(rc.notes, scaleSet(key.tonic, id))) {
      const src = `${tonicName} ${par.mode}${id === 'harmonic-minor' ? ' (harmonic)' : ''}`;
      const picardy = key.mode === 'minor' && degree === 1;
      return {
        fn: 'chromatic',
        tendency: chromaticTendency,
        role: picardy ? 'Picardy third' : 'Borrowed',
        source: src,
        detail: picardy ? 'A major tonic at the end of a minor piece: borrowed from the parallel major.' : `Modal interchange: borrowed from ${src}, same tonic, different color.`,
      };
    }
  }
  if (dominantType) {
    if (rootFromTonic === 5 && degree === 4) {
      return { fn: 'chromatic', tendency: 'predominant', role: 'Blues subdominant', detail: 'IV⁷: a dominant-quality subdominant, the color of the blues (from the Mixolydian ♭7 of IV).' };
    }
    const resolvesTo = mod(pc(rc.root) + 5, 12);
    if (diatonicTargetAt(resolvesTo, key)) {
      const t = transpose(rc.root, interval('P4'));
      return { fn: 'chromatic', tendency: 'dominant', role: 'Secondary dominant', detail: `An unlabeled applied dominant: it resolves down a fifth to the diatonic chord on ${noteName(t)}.` };
    }
    const halfBelow = mod(pc(rc.root) - 1, 12);
    if (diatonicTargetAt(halfBelow, key)) {
      const t = transposeDown(rc.root, interval('m2'));
      return { fn: 'chromatic', tendency: 'dominant', role: 'Tritone substitute', detail: `Resolves down a half step to the diatonic chord on ${noteName(t)}: a tritone substitute for its dominant.` };
    }
  }

  for (const m of MODES) {
    if (pcsIn(rc.notes, scaleSet(key.tonic, m.id))) {
      const src = `${tonicName} ${m.name}`;
      return { fn: 'chromatic', tendency: chromaticTendency, role: 'Modal interchange', source: src, detail: `Borrowed from ${src}: the characteristic color of that mode over the same tonic.` };
    }
  }

  if (rc.chordId === 'dim7' || rc.chordId === 'dim') {
    const up = mod(pc(rc.root) + 1, 12);
    if (diatonicTargetAt(up, key)) {
      return { fn: 'chromatic', tendency: 'dominant', role: 'Passing diminished', detail: `A chromatic leading-tone chord: its root rises a half step to the chord on ${noteName(transpose(rc.root, interval('m2')))}.` };
    }
    return { fn: 'chromatic', tendency: 'dominant', role: 'Common-tone diminished', detail: 'A diminished seventh that decorates a chord it shares a tone with, by neighbor motion.' };
  }

  if ((quality === 'major' || quality === 'minor') && [3, 4, 8, 9].includes(rootFromTonic)) {
    return {
      fn: 'chromatic',
      tendency: 'tonic',
      role: 'Chromatic mediant',
      detail: 'Root a third from the tonic, with altered quality: a shift common in film scores that keeps one common tone (or none).',
    };
  }
  if (quality === 'augmented') {
    return { fn: 'chromatic', tendency: 'dominant', role: 'Augmented', detail: 'Symmetrical augmented triad: its raised fifth acts as a chromatic passing tone pushing upward.' };
  }
  return { fn: 'chromatic', tendency: chromaticTendency, role: 'Chromatic', detail: 'A chromatic chord outside the key and its common borrowings.' };
}

// ---------- Cadences ----------

export interface Cadence {
  id: 'pac' | 'iac' | 'half' | 'phrygian' | 'plagal' | 'deceptive' | 'backdoor' | 'tritone' | 'none';
  label: string;
  detail: string;
}

function isTonicTriad(rc: RomanChord, key: Key): boolean {
  const q = chordQualityClass(rc.chordId);
  return pc(rc.root) === pc(key.tonic) && (q === 'major' || q === 'minor') && !rc.tonicized && normalizedInput(rc) !== 'Cad64';
}

function isDominantOfKey(rc: RomanChord, key: Key): boolean {
  if (rc.tonicized) return false;
  const fromTonic = mod(pc(rc.root) - pc(key.tonic), 12);
  const q = chordQualityClass(rc.chordId);
  if (fromTonic === 7 && (q === 'major' || isDominantType(rc.chordId))) return true;
  if (fromTonic === 11 && q === 'diminished') return true;
  return false;
}

/**
 * Classify the cadence formed by the last two chords. `sopranoPc` (the top voice of the final chord)
 * distinguishes perfect from imperfect authentic cadences.
 */
export function detectCadence(chords: RomanChord[], key: Key, sopranoPc?: number): Cadence {
  if (chords.length < 2) return { id: 'none', label: 'No cadence yet', detail: 'Add at least two chords.' };
  const prev = chords[chords.length - 2];
  const last = chords[chords.length - 1];
  const fromTonic = (rc: RomanChord) => mod(pc(rc.root) - pc(key.tonic), 12);
  const prevIn = normalizedInput(prev);

  if (isTonicTriad(last, key)) {
    if (isDominantOfKey(prev, key)) {
      const rootPos = prev.inversion === 0 && last.inversion === 0 && fromTonic(prev) === 7;
      const perfect = rootPos && sopranoPc !== undefined && sopranoPc === pc(key.tonic);
      return perfect
        ? { id: 'pac', label: 'Perfect authentic cadence', detail: 'V to I with both chords in root position and the tonic in the soprano: the strongest close.' }
        : { id: 'iac', label: 'Imperfect authentic cadence', detail: 'Dominant to tonic, but with an inversion, a leading-tone chord, or the third or fifth on top: a lighter close.' };
    }
    if (isDominantType(prev.chordId) && fromTonic(prev) === 10) {
      return { id: 'backdoor', label: 'Backdoor cadence', detail: '♭VII⁷ to I: the dominant borrowed from the parallel minor, rising a whole step home.' };
    }
    if (isDominantType(prev.chordId) && fromTonic(prev) === 1) {
      return { id: 'tritone', label: 'Tritone-substitute cadence', detail: '♭II⁷ to I: the bass slides down a half step instead of falling a fifth.' };
    }
    if (fromTonic(prev) === 5 && !prev.tonicized) {
      return { id: 'plagal', label: 'Plagal cadence', detail: 'IV (or iv) to I: the Amen close of hymns, without the leading tone.' };
    }
  }
  if (isDominantOfKey(last, key) && fromTonic(last) === 7) {
    if (key.mode === 'minor' && fromTonic(prev) === 5 && prev.inversion === 1 && chordQualityClass(prev.chordId) === 'minor') {
      return { id: 'phrygian', label: 'Phrygian half cadence', detail: 'iv⁶ to V in minor: the bass falls a half step (♭6 to 5), a Baroque signature.' };
    }
    return { id: 'half', label: 'Half cadence', detail: 'The phrase pauses on V: a question waiting for an answer.' };
  }
  if (isDominantOfKey(prev, key) && !last.tonicized && [8, 9].includes(fromTonic(last)) && prevIn !== 'Cad64') {
    return { id: 'deceptive', label: 'Deceptive cadence', detail: 'V moves to vi (or ♭VI) instead of I: the bass rises a step and the ear is surprised.' };
  }
  return { id: 'none', label: 'Open ending', detail: 'The progression does not end on a standard cadence. Loop it, or end on I, V or vi to hear one.' };
}
