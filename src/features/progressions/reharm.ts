/**
 * Reharmonization tools for a selected chord. Each option is a complete new progression,
 * so the UI can preview and apply it in one step.
 */
import { chordQualityClass, isSeventhChord } from '../../theory/chords';
import { interval, intervalBetween, transpose, transposeDown } from '../../theory/intervals';
import { parallelKey, diatonicChordsOfScale, type Key } from '../../theory/keys';
import { mod, noteName, pc, type Note } from '../../theory/notes';
import { analyzeChord, tryParseRoman, type RomanChord } from '../../theory/roman';
import { isDiatonicIn, isDominantType } from '../../theory/harmony';
import { normalizeNumeral, type ProgItem } from './model';
import { baseTriad } from './suggest';

export type ReharmToolId = 'secondary' | 'twofive' | 'tritone' | 'borrowed' | 'mediant';

export interface ReharmOption {
  label: string;
  kind: 'insert' | 'replace';
  /** Short qualifier shown next to the numerals (source mode, interval). */
  tag?: string;
  /** Numerals added or substituted (for preview chips). */
  numerals: string[];
  items: ProgItem[];
  /** Index to select after applying. */
  select: number;
}

export interface ReharmTool {
  id: ReharmToolId;
  title: string;
  description: string;
  options: ReharmOption[];
  /** Why the tool does not apply to this chord. */
  unavailable?: string;
}

/**
 * Insert chords before `index`, borrowing time from the previous chord when it is long enough
 * (so the overall form keeps its length); otherwise each new chord gets 2 beats.
 */
export function insertBefore(items: ProgItem[], index: number, numerals: string[]): ProgItem[] {
  const out = items.map((it) => ({ ...it }));
  const prev = index > 0 ? out[index - 1] : null;
  const k = numerals.length;
  let each = 2;
  if (prev && prev.beats >= 2 * k) {
    const give = prev.beats / 2;
    prev.beats -= give;
    each = give / k;
  }
  out.splice(index, 0, ...numerals.map((n) => ({ numeral: n, beats: each })));
  return out;
}

function replaceAt(items: ProgItem[], index: number, numeral: string): ProgItem[] {
  return items.map((it, i) => (i === index ? { ...it, numeral } : { ...it }));
}

function sameNotes(a: Note[], b: Note[]): boolean {
  const s = (x: Note[]) => x.map(pc).sort((m, n) => m - n).join(',');
  return s(a) === s(b);
}

const isTonic = (rc: RomanChord, key: Key) => pc(rc.root) === pc(key.tonic);

export function reharmTools(items: ProgItem[], index: number, key: Key): ReharmTool[] {
  const item = items[index];
  const rc = item ? tryParseRoman(normalizeNumeral(item.numeral), key) : null;
  if (!item || !rc) return [];
  const q = chordQualityClass(rc.chordId);
  const input = normalizeNumeral(rc.input);
  const special = /^(N|N6|bII6|It|Fr|Ger|Cad64)/.test(input);
  const tonicizable = (q === 'major' || q === 'minor') && !special;
  const base = tonicizable ? (isTonic(rc, key) && !rc.tonicized ? null : baseTriad(rc, key)) : null;
  const tools: ReharmTool[] = [];

  // Secondary dominant before the chord.
  {
    const tool: ReharmTool = {
      id: 'secondary',
      title: 'Secondary dominant',
      description: 'Precede the chord with its own dominant (time is taken from the previous chord when possible).',
      options: [],
    };
    if (!tonicizable) tool.unavailable = 'Only major or minor chords can be tonicized.';
    else {
      const dom = base ? `V7/${base}` : 'V7';
      const lt = base ? `vii°7/${base}` : 'vii°7';
      tool.options.push({ kind: 'insert', label: `Insert ${dom} before`, numerals: [dom], items: insertBefore(items, index, [dom]), select: index + 1 });
      tool.options.push({ kind: 'insert', label: `Insert ${lt} before`, numerals: [lt], items: insertBefore(items, index, [lt]), select: index + 1 });
    }
    tools.push(tool);
  }

  // ii–V into the chord.
  {
    const tool: ReharmTool = {
      id: 'twofive',
      title: 'ii–V approach',
      description: 'Approach the chord with its own ii–V (or ii and tritone sub), as jazz players do.',
      options: [],
    };
    if (!tonicizable) tool.unavailable = 'Only major or minor chords can be the goal of a ii–V.';
    else {
      const two = q === 'minor' ? 'iiø7' : 'ii7';
      const pair = base ? [`${two}/${base}`, `V7/${base}`] : [two, 'V7'];
      const subPair = base ? [`${two}/${base}`, `bII7/${base}`] : [two, 'bII7'];
      tool.options.push({ kind: 'insert', label: `Insert ${pair.join(' ')} before`, numerals: pair, items: insertBefore(items, index, pair), select: index + 2 });
      tool.options.push({ kind: 'insert', tag: 'tritone sub', label: `Insert ${subPair.join(' ')} before`, numerals: subPair, items: insertBefore(items, index, subPair), select: index + 2 });
    }
    tools.push(tool);
  }

  // Tritone substitution.
  {
    const tool: ReharmTool = {
      id: 'tritone',
      title: 'Tritone substitute',
      description: 'Swap a dominant for the dominant a tritone away: same tritone, root a half step above the goal.',
      options: [],
    };
    const fromTonic = mod(pc(rc.root) - pc(key.tonic), 12);
    const dominantLike = isDominantType(rc.chordId) || (q === 'major' && !special && (fromTonic === 7 || /^V\//.test(input)));
    if (!dominantLike) tool.unavailable = 'Only dominant chords (V, V⁷, secondary dominants) have tritone substitutes.';
    else {
      let sub: string;
      const sec = /^V[^/]*\/(.+)$/.exec(input);
      const subSec = /^bII[^/]*\/(.+)$/.exec(input);
      if (sec) sub = `bII7/${sec[1]}`;
      else if (subSec) sub = `V7/${subSec[1]}`;
      else if (/^bII/.test(input) && !rc.tonicized && fromTonic === 1) sub = 'V7';
      else if (fromTonic === 7 && !rc.tonicized) sub = 'bII7';
      else sub = analyzeChord(transpose(rc.root, interval('d5')), '7', key);
      if (tryParseRoman(sub, key)) tool.options.push({ kind: 'replace', label: `Replace with ${sub}`, numerals: [sub], items: replaceAt(items, index, sub), select: index });
    }
    tools.push(tool);
  }

  // Borrowed equivalent (modal interchange at the same scale degree).
  {
    const tool: ReharmTool = {
      id: 'borrowed',
      title: 'Borrowed equivalent',
      description: 'Replace the chord with the chord on the same degree from the parallel key or another mode.',
      options: [],
    };
    if (rc.tonicized || special) tool.unavailable = 'Applies to chords built on a scale degree, not to secondary or special chords.';
    else {
      const degree = intervalBetween(key.tonic, rc.root).num;
      const seventh = isSeventhChord(rc.chordId) && rc.notes.length === 4;
      const par = parallelKey(key);
      const sources: Array<{ id: string; name: string }> = [
        { id: key.mode === 'major' ? 'ionian' : 'aeolian', name: 'diatonic' },
        { id: par.mode === 'minor' ? 'aeolian' : 'ionian', name: `${noteName(key.tonic)} ${par.mode}` },
        { id: 'dorian', name: 'Dorian' },
        { id: 'phrygian', name: 'Phrygian' },
        { id: 'lydian', name: 'Lydian' },
        { id: 'mixolydian', name: 'Mixolydian' },
        ...(key.mode === 'major' ? [{ id: 'harmonic-minor', name: 'harmonic minor' }] : [{ id: 'melodic-minor', name: 'melodic minor' }]),
      ];
      const seen: Note[][] = [rc.notes];
      for (const src of sources) {
        const chords = diatonicChordsOfScale(key.tonic, src.id, seventh);
        const ch = chords[degree - 1];
        if (!ch || seen.some((s) => sameNotes(s, ch.notes))) continue;
        if (src.name === 'diatonic' && isDiatonicIn(rc.notes, key)) continue;
        const inv = rc.inversion < ch.notes.length ? rc.inversion : 0;
        let n = analyzeChord(ch.root, ch.chordId, key, inv);
        let check = tryParseRoman(n, key);
        if (!check || !sameNotes(check.notes, ch.notes)) {
          n = analyzeChord(ch.root, ch.chordId, key, 0);
          check = tryParseRoman(n, key);
        }
        if (!check || !sameNotes(check.notes, ch.notes)) continue;
        seen.push(ch.notes);
        tool.options.push({ kind: 'replace', tag: src.name === 'diatonic' ? 'diatonic' : src.name, label: src.name === 'diatonic' ? `Back to diatonic ${n}` : `${n} from ${src.name}`, numerals: [n], items: replaceAt(items, index, n), select: index });
      }
      if (!tool.options.length) tool.unavailable = 'No different chord on this degree in the related modes.';
    }
    tools.push(tool);
  }

  // Chromatic mediant substitute.
  {
    const tool: ReharmTool = {
      id: 'mediant',
      title: 'Chromatic mediant',
      description: 'Replace the chord with one of the same quality whose root is a third away and outside the key.',
      options: [],
    };
    if (!tonicizable) tool.unavailable = 'Applies to major and minor chords.';
    else {
      const cands: Array<[Note, string]> = [
        [transpose(rc.root, interval('M3')), 'up M3'],
        [transposeDown(rc.root, interval('M3')), 'down M3'],
        [transpose(rc.root, interval('m3')), 'up m3'],
        [transposeDown(rc.root, interval('m3')), 'down m3'],
      ];
      for (const [root, label] of cands) {
        const n = analyzeChord(root, rc.chordId, key);
        const t = tryParseRoman(n, key);
        if (!t || isDiatonicIn(t.notes, key)) continue;
        tool.options.push({ kind: 'replace', tag: label, label: `${n} (${label})`, numerals: [n], items: replaceAt(items, index, n), select: index });
      }
      if (!tool.options.length) tool.unavailable = 'Every mediant of this chord is diatonic here.';
    }
    tools.push(tool);
  }

  return tools;
}
