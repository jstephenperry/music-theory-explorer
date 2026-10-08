/**
 * Next-chord suggestions: rule-based, grouped by harmonic relationship.
 */
import { chordQualityClass } from '../../theory/chords';
import { interval, transpose, transposeDown } from '../../theory/intervals';
import type { Key } from '../../theory/keys';
import { mod, pc, type Note } from '../../theory/notes';
import { analyzeChord, parseRoman, tryParseRoman, type RomanChord } from '../../theory/roman';
import { describeChord, isDiatonicIn, isDominantType } from '../../theory/harmony';
import { normalizeNumeral } from './model';

export interface Suggestion {
  numeral: string;
  reason: string;
}

export type SuggestionGroupId = 'strong' | 'deceptive' | 'functional' | 'borrowed' | 'secondary' | 'mediant' | 'tritone';

export interface SuggestionGroup {
  id: SuggestionGroupId;
  title: string;
  blurb: string;
  items: Suggestion[];
}

const DIATONIC_TRIADS: Record<Key['mode'], string[]> = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'vii°'],
};
const DIATONIC_SEVENTHS: Record<Key['mode'], string[]> = {
  major: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'],
  minor: ['i7', 'iiø7', 'IIImaj7', 'iv7', 'V7', 'VImaj7', 'VII7', 'vii°7'],
};

/** Diatonic triad numeral whose root has the given pitch class, if any. */
export function diatonicTriadAt(rootPc: number, key: Key): string | null {
  for (const n of DIATONIC_TRIADS[key.mode]) {
    const rc = parseRoman(n, key);
    if (pc(rc.root) === mod(rootPc, 12)) return n;
  }
  return null;
}

export function diatonicSeventhAt(rootPc: number, key: Key): string | null {
  for (const n of DIATONIC_SEVENTHS[key.mode]) {
    const rc = parseRoman(n, key);
    if (pc(rc.root) === mod(rootPc, 12)) return n;
  }
  return null;
}

/** Root-position triad numeral for a root and quality, written relative to the key. */
export function triadNumeral(root: Note, quality: string, key: Key): string {
  const id = quality === 'minor' ? 'min' : quality === 'diminished' ? 'dim' : quality === 'augmented' ? 'aug' : 'maj';
  return analyzeChord(root, id, key);
}

/** Base triad of a chord (root position, no seventh), as a numeral relative to the key. */
export function baseTriad(rc: RomanChord, key: Key): string {
  const q = chordQualityClass(rc.chordId);
  const diat = diatonicTriadAt(pc(rc.root), key);
  if (diat) {
    const d = parseRoman(diat, key);
    if (chordQualityClass(d.chordId) === q) return diat;
  }
  return triadNumeral(rc.root, q, key);
}

/** True when the chord behaves as a dominant or leading-tone chord whose goal we can name. */
export function dominantTarget(rc: RomanChord, key: Key): { numeral: string; root: Note; quality: string } | null {
  const input = normalizeNumeral(rc.input);
  if (rc.tonicized) {
    const primary = input.slice(0, input.indexOf('/'));
    if (!/^(V|vii|bII)/.test(primary)) return null;
    const targetText = input.slice(input.indexOf('/') + 1);
    const t = tryParseRoman(targetText, key);
    if (!t) return null;
    return { numeral: targetText, root: t.root, quality: chordQualityClass(t.chordId) };
  }
  if (input === 'Cad64') return { numeral: 'V', root: transpose(key.tonic, interval('P5')), quality: 'major' };
  const q = chordQualityClass(rc.chordId);
  const fromTonic = mod(pc(rc.root) - pc(key.tonic), 12);
  const leading = (q === 'diminished' && (rc.chordId === 'dim' || rc.chordId === 'dim7' || rc.chordId === 'm7b5'));
  let targetRoot: Note | null = null;
  if (leading) targetRoot = transpose(rc.root, interval('m2'));
  else if (isDominantType(rc.chordId)) {
    const backdoor = key.mode === 'major' && fromTonic === 10;
    targetRoot = fromTonic === 1 || backdoor ? key.tonic : transpose(rc.root, interval('P4'));
  }
  else if (q === 'major' && fromTonic === 7) targetRoot = key.tonic;
  if (!targetRoot) return null;
  const diat = diatonicTriadAt(pc(targetRoot), key);
  if (pc(targetRoot) === pc(key.tonic)) {
    const tonic = key.mode === 'major' ? 'I' : 'i';
    return { numeral: tonic, root: key.tonic, quality: key.mode };
  }
  if (diat) {
    const d = parseRoman(diat, key);
    const dq = chordQualityClass(d.chordId);
    if (dq === 'major' || dq === 'minor') return { numeral: diat, root: d.root, quality: dq };
  }
  return { numeral: triadNumeral(targetRoot, 'major', key), root: targetRoot, quality: 'major' };
}

function isTonicRoot(root: Note, key: Key) {
  return pc(root) === pc(key.tonic);
}

export function suggestNext(current: string, key: Key): SuggestionGroup[] {
  const rc = tryParseRoman(normalizeNumeral(current), key);
  if (!rc) return [];
  const desc = describeChord(rc, key);
  const major = key.mode === 'major';
  const tonicNum = major ? 'I' : 'i';
  const groups: SuggestionGroup[] = [];
  const dom = dominantTarget(rc, key);
  const q = chordQualityClass(rc.chordId);
  const input = normalizeNumeral(rc.input);
  const isSeventh = rc.notes.length >= 4;

  // 1. Strong motion.
  const strong: Suggestion[] = [];
  let fifthDown: string | null = null;
  if (dom) {
    strong.push({ numeral: dom.numeral, reason: `Resolution: the ${dom.quality === 'minor' ? 'minor ' : ''}goal of this ${input === 'Cad64' ? 'six-four' : 'dominant'}` });
    if (isSeventh && !rc.tonicized && isTonicRoot(dom.root, key)) strong.push({ numeral: major ? 'Imaj7' : 'i7', reason: 'Resolution to a seventh-chord tonic (jazz)' });
    if (input === 'Cad64') strong.push({ numeral: 'V7', reason: 'The six-four resolves to V⁷ over the same bass' });
  } else {
    const down5 = transpose(rc.root, interval('P4'));
    fifthDown = diatonicTriadAt(pc(down5), key);
    if (fifthDown) strong.push({ numeral: isSeventh ? (diatonicSeventhAt(pc(down5), key) ?? fifthDown) : fifthDown, reason: 'Root falls a fifth: the strongest root motion' });
    for (const iv of ['m3', 'M3']) {
      const r = transposeDown(rc.root, interval(iv));
      const n = diatonicTriadAt(pc(r), key);
      if (n) {
        strong.push({ numeral: n, reason: 'Root falls a third: two common tones, smooth' });
        break;
      }
    }
    const up2 = transpose(rc.root, interval('M2'));
    const step = diatonicTriadAt(pc(up2), key);
    if (step && desc.tendency === 'predominant') strong.push({ numeral: step, reason: 'Root rises a step' });
  }
  groups.push({ id: 'strong', title: 'Strong motion', blurb: 'Down a fifth or resolution to a goal.', items: strong });

  // 2. Deceptive.
  if (dom && input !== 'Cad64') {
    const dec: Suggestion[] = [];
    if (rc.tonicized || !isTonicRoot(dom.root, key)) {
      const r = dom.quality === 'minor' ? transpose(dom.root, interval('m6')) : transpose(dom.root, interval('M6'));
      const qual = dom.quality === 'minor' ? 'major' : 'minor';
      const diat = diatonicTriadAt(pc(r), key);
      const num = diat && chordQualityClass(parseRoman(diat, key).chordId) === qual ? diat : triadNumeral(r, qual, key);
      dec.push({ numeral: num, reason: `Deceptive: the submediant of ${dom.numeral} instead of ${dom.numeral} itself` });
    } else if (major) {
      dec.push({ numeral: 'vi', reason: 'Deceptive cadence: vi instead of I' });
      dec.push({ numeral: 'bVI', reason: 'Borrowed deceptive cadence: ♭VI from the parallel minor' });
      dec.push({ numeral: 'IV6', reason: 'Retrogression to IV⁶ keeps the phrase open' });
    } else {
      dec.push({ numeral: 'VI', reason: 'Deceptive cadence: VI instead of i' });
      dec.push({ numeral: 'iv6', reason: 'Retrogression to iv⁶ keeps the phrase open' });
    }
    groups.push({ id: 'deceptive', title: 'Deceptive', blurb: 'Avoid the expected resolution.', items: dec });
  }

  // 3. Functional motion.
  const special = /^(N|N6|bII6|It|Fr|Ger)/.test(input);
  if (!dom) {
    if (desc.tendency === 'predominant' || special) {
      const items: Suggestion[] = special || /^(It|Fr|Ger)/.test(input)
        ? [
            { numeral: 'Cad64', reason: 'Resolve outward to the cadential six-four' },
            { numeral: 'V', reason: 'Straight to the dominant' },
            { numeral: 'V7', reason: 'Dominant seventh' },
          ]
        : [
            { numeral: 'V', reason: '' },
            { numeral: 'V7', reason: '' },
            { numeral: 'Cad64', reason: 'Delay V with a cadential six-four' },
            { numeral: 'vii°7', reason: 'Leading-tone seventh' },
          ];
      groups.push({ id: 'functional', title: 'Predominant to dominant', blurb: 'Build tension toward the cadence.', items });
    } else if (desc.tendency === 'tonic') {
      const items = (major ? ['ii', 'IV', 'ii7', 'IVmaj7', 'ii65'] : ['iv', 'iiø7', 'iv7', 'iiø65', 'VI']).map((n) => ({ numeral: n, reason: '' }));
      groups.push({ id: 'functional', title: 'Tonic to predominant', blurb: 'Leave home in the usual direction.', items });
    }
  }

  // 4. Borrowed chords.
  const borrowedByTendency: Record<string, Array<[string, string]>> = major
    ? {
        tonic: [['bVI', 'Borrowed ♭VI: adds ♭3 and ♭6'], ['bVII', 'Mixolydian ♭VII'], ['iv', 'Minor iv: adds ♭6'], ['bIII', 'Borrowed ♭III: adds ♭3 and ♭7'], ['bVImaj7', 'Borrowed ♭VImaj7']],
        predominant: [['iv', 'Turn IV minor: borrowed iv'], ['iiø7', 'Half-diminished ii from minor'], ['iv7', 'Backdoor ii: iv⁷'], ['bVI', 'Borrowed ♭VI as a predominant']],
        dominant: [['bVI', 'Borrowed deceptive resolution'], ['bVII7', 'Backdoor dominant'], ['i', 'Parallel minor tonic: i in place of I']],
      }
    : {
        tonic: [['IV', 'Dorian IV: raised 6th'], ['bII', 'Phrygian ♭II'], ['ii', 'Major-mode ii'], ['I', 'Parallel major tonic']],
        predominant: [['IV', 'Dorian IV instead of iv'], ['ii7', 'Melodic-minor ii⁷'], ['N6', 'Neapolitan ♭II⁶']],
        dominant: [['I', 'Picardy third: end in major'], ['IV', 'Dorian IV']],
      };
  groups.push({
    id: 'borrowed',
    title: 'Borrowed chord',
    blurb: 'Modal interchange from the parallel key or a mode.',
    items: (borrowedByTendency[desc.tendency] ?? []).map(([numeral, reason]) => ({ numeral, reason })),
  });

  // 5. Secondary dominants toward plausible next chords.
  const targetSet: string[] = [];
  const consider = (n: string) => {
    const t = tryParseRoman(n, key);
    if (!t || isTonicRoot(t.root, key)) return;
    const tq = chordQualityClass(t.chordId);
    if (tq !== 'major' && tq !== 'minor') return;
    const base = baseTriad(t, key);
    if (!targetSet.includes(base)) targetSet.push(base);
  };
  strong.forEach((s) => consider(s.numeral));
  if (dom) groups.find((g) => g.id === 'deceptive')?.items.forEach((s) => consider(s.numeral));
  (groups.find((g) => g.id === 'functional')?.items ?? []).forEach((s) => consider(s.numeral));
  for (const t of major ? ['ii', 'IV', 'V', 'vi'] : ['iv', 'V', 'VI', 'III']) consider(t);
  groups.push({
    id: 'secondary',
    title: 'Secondary dominant',
    blurb: 'Tonicize the chord you want next.',
    items: targetSet.slice(0, 4).map((t) => ({ numeral: `V7/${t}`, reason: `then ${t}` })),
  });

  // 6. Chromatic mediants.
  if (q === 'major' || q === 'minor') {
    const items: Suggestion[] = [];
    const cand: Array<[Note, string]> = [
      [transpose(rc.root, interval('M3')), 'Up a major third'],
      [transposeDown(rc.root, interval('M3')), 'Down a major third'],
      [transpose(rc.root, interval('m3')), 'Up a minor third'],
      [transposeDown(rc.root, interval('m3')), 'Down a minor third'],
    ];
    for (const [root, label] of cand) {
      const n = triadNumeral(root, q, key);
      const t = tryParseRoman(n, key);
      if (!t || isDiatonicIn(t.notes, key)) continue;
      const common = t.notes.filter((x) => rc.notes.slice(0, 3).some((y) => pc(x) === pc(y))).length;
      items.push({ numeral: n, reason: `${label}; ${common === 1 ? '1 common tone' : common === 0 ? 'no common tones' : `${common} common tones`}` });
    }
    groups.push({ id: 'mediant', title: 'Chromatic mediant', blurb: 'Same quality, root a third away, outside the key.', items });
  }

  // 7. Tritone substitutes.
  const tri: Suggestion[] = [];
  if (dom && input !== 'Cad64') {
    const t = isTonicRoot(dom.root, key) ? 'bII7' : `bII7/${dom.numeral}`;
    tri.push({ numeral: t, reason: `Slide through the tritone substitute, then ${dom.numeral}` });
  } else {
    if (desc.tendency === 'predominant' || special) tri.push({ numeral: 'bII7', reason: `subV⁷: resolves down a half step to ${tonicNum}` });
    if (fifthDown && fifthDown !== tonicNum) {
      const t = tryParseRoman(fifthDown, key);
      if (t && ['major', 'minor'].includes(chordQualityClass(t.chordId))) tri.push({ numeral: `bII7/${fifthDown}`, reason: `subV⁷ of ${fifthDown}: then ${fifthDown}, a half step below` });
    }
    if (!tri.length) tri.push({ numeral: 'bII7', reason: `subV⁷ of ${tonicNum}` });
  }
  groups.push({ id: 'tritone', title: 'Tritone substitute', blurb: 'A dominant a tritone away, resolving by half step.', items: tri });

  // Validate, dedupe, drop the current chord.
  const seen = new Set<string>([input]);
  for (const g of groups) {
    g.items = g.items.filter((s) => {
      const key2 = normalizeNumeral(s.numeral);
      if (seen.has(key2) || !tryParseRoman(key2, key)) return false;
      seen.add(key2);
      return true;
    });
  }
  return groups.filter((g) => g.items.length > 0);
}
