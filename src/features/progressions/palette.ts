/**
 * Chord palette generated for a key: diatonic, borrowed, secondary, substitutions, chromatic.
 * Every entry is a roman numeral string understood by parseRoman.
 */
import type { Key } from '../../theory/keys';

export interface PaletteChord {
  numeral: string;
  /** Short label shown under the chip (source mode, target ...). */
  note?: string;
}

export interface PaletteSection {
  title: string;
  chords: PaletteChord[];
}

export interface PaletteGroup {
  id: 'diatonic' | 'borrowed' | 'secondary' | 'substitutions' | 'chromatic';
  title: string;
  /** Tooltip and one-line explanation of the group. */
  tooltip: string;
  sections: PaletteSection[];
}

const c = (numeral: string, note?: string): PaletteChord => ({ numeral, note });

/** Diatonic targets that can be tonicized (major or minor triads other than the tonic). */
export function tonicizableTargets(key: Key): string[] {
  return key.mode === 'major' ? ['ii', 'iii', 'IV', 'V', 'vi'] : ['III', 'iv', 'V', 'VI', 'VII'];
}

export function buildPalette(key: Key): PaletteGroup[] {
  const major = key.mode === 'major';

  const diatonic: PaletteGroup = {
    id: 'diatonic',
    title: 'Diatonic',
    tooltip: 'Chords built only from the notes of the key. In minor, V and vii° use the raised leading tone from harmonic minor.',
    sections: major
      ? [
          { title: 'Triads', chords: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'].map((n) => c(n)) },
          { title: 'Sevenths', chords: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'].map((n) => c(n)) },
          { title: 'Inversions', chords: ['I6', 'I64', 'ii6', 'ii65', 'IV6', 'V6', 'V65', 'V43', 'V42', 'vii°6'].map((n) => c(n)) },
        ]
      : [
          { title: 'Triads', chords: [c('i'), c('ii°'), c('III'), c('iv'), c('v'), c('V', 'harmonic'), c('VI'), c('VII'), c('vii°', 'harmonic')] },
          { title: 'Sevenths', chords: [c('i7'), c('iiø7'), c('IIImaj7'), c('iv7'), c('v7'), c('V7', 'harmonic'), c('VImaj7'), c('VII7'), c('vii°7', 'harmonic')] },
          { title: 'Inversions', chords: ['i6', 'i64', 'ii°6', 'iiø65', 'iv6', 'V6', 'V65', 'V43', 'V42', 'vii°42'].map((n) => c(n)) },
        ],
  };

  const borrowed: PaletteGroup = {
    id: 'borrowed',
    title: 'Borrowed',
    tooltip:
      'Modal interchange: chords taken from a mode that shares the same tonic (the parallel minor or major, Dorian, Phrygian, Lydian, Mixolydian). The tonic stays put; only some scale degrees change.',
    sections: major
      ? [
          {
            title: 'Parallel minor',
            chords: ['i', 'ii°', 'iiø7', 'bIII', 'bIIImaj7', 'iv', 'iv7', 'v', 'bVI', 'bVImaj7', 'bVII', 'bVII7'].map((n) => c(n, 'Aeolian')),
          },
          { title: 'Dorian', chords: [c('i7', 'Dorian'), c('IV7', 'Dorian'), c('bIIImaj7', 'Dorian')] },
          { title: 'Phrygian', chords: [c('bII', 'Phrygian'), c('bIImaj7', 'Phrygian'), c('bvii', 'Phrygian')] },
          { title: 'Lydian', chords: [c('II', 'Lydian'), c('II7', 'Lydian'), c('#ivø7', 'Lydian'), c('vii', 'Lydian')] },
          { title: 'Mixolydian', chords: [c('bVII', 'Mixolydian'), c('v7', 'Mixolydian'), c('bVIIadd9', 'Mixolydian')] },
          { title: 'Harmonic minor', chords: [c('vii°7', 'harm. minor'), c('V7b9', 'harm. minor'), c('bIII+', 'harm. minor')] },
        ]
      : [
          {
            title: 'Parallel major',
            chords: [c('I', 'Picardy'), c('Imaj7', 'Ionian'), c('ii', 'Ionian'), c('ii7', 'Ionian'), c('♮iii', 'Ionian'), c('IV', 'Ionian'), c('IVmaj7', 'Ionian'), c('♮vi', 'Ionian'), c('♮vi7', 'Ionian')],
          },
          { title: 'Dorian', chords: [c('IV', 'Dorian'), c('ii7', 'Dorian'), c('♮viø7', 'Dorian')] },
          { title: 'Phrygian', chords: [c('bII', 'Phrygian'), c('bIImaj7', 'Phrygian'), c('bvii', 'Phrygian'), c('v°', 'Phrygian')] },
          { title: 'Lydian', chords: [c('II', 'Lydian'), c('II7', 'Lydian')] },
          { title: 'Melodic minor', chords: [c('imaj7', 'mel. minor'), c('iadd6', 'mel. minor'), c('IV7', 'mel. minor')] },
        ],
  };

  const targets = tonicizableTargets(key);
  const secondary: PaletteGroup = {
    id: 'secondary',
    title: 'Secondary',
    tooltip:
      'Secondary (applied) chords: the dominant or leading-tone chord of a chord other than the tonic. V⁷/ii briefly treats ii as a tonic, adding a chromatic leading tone that pulls into it.',
    sections: targets.map((t) => ({
      title: `To ${t}`,
      chords: [c(`V/${t}`), c(`V7/${t}`), c(`vii°7/${t}`)],
    })),
  };

  const substitutions: PaletteGroup = {
    id: 'substitutions',
    title: 'Substitutions',
    tooltip:
      'Chords that stand in for a dominant. A tritone substitute (subV⁷) shares the dominant\'s tritone and resolves down a half step; the backdoor ♭VII⁷ and minor iv⁷ approach the tonic from the flat side.',
    sections: [
      {
        title: 'Tritone substitutes',
        chords: [c('bII7', 'subV⁷ → I'), ...targets.filter((t) => t !== 'VII').map((t) => c(`bII7/${t}`, `subV⁷ → ${t}`))],
      },
      major
        ? { title: 'Backdoor and minor plagal', chords: [c('bVII7', 'backdoor'), c('iv7', 'backdoor ii'), c('ivadd6', 'minor plagal'), c('bVImaj7', 'Aeolian')] }
        : { title: 'Subtonic and plagal', chords: [c('VII7', 'backdoor'), c('iv7'), c('ivadd6', 'Dorian ♮6'), c('IV7', 'Dorian')] },
      {
        title: 'Dominant variants',
        chords: [c('V7sus4'), c('V9'), c('V13'), c('V7b9'), c('V7#9'), c('V7alt'), c('V+7')],
      },
    ],
  };

  const chromatic: PaletteGroup = {
    id: 'chromatic',
    title: 'Chromatic',
    tooltip:
      'Special chromatic chords: the Neapolitan and augmented sixths (strong predominants), the cadential six-four, chromatic mediants (roots a third away with altered quality), passing diminished sevenths and augmented triads.',
    sections: [
      { title: 'Predominants', chords: [c('N6', 'Neapolitan'), c('It+6', 'Italian'), c('Fr+6', 'French'), c('Ger+6', 'German')] },
      { title: 'Cadential', chords: [c('Cad64', 'before V')] },
      {
        title: 'Chromatic mediants',
        chords: major
          ? ['III', 'bIII', 'VI', 'bVI', 'biii', 'bvi'].map((n) => c(n))
          : ['♮III', '♮VI', 'biii', 'bvi', '♮iii', '♮vi'].map((n) => c(n)),
      },
      { title: 'Diminished sevenths', chords: [c('#iv°7', '→ V'), c('#i°7', major ? '→ ii' : 'passing'), c('#ii°7', 'common tone'), c('#v°7', '→ vi')] },
      { title: 'Augmented', chords: major ? ['I+', 'V+', 'V+7', 'bIII+', 'bVI+'].map((n) => c(n)) : ['III+', 'I+', 'V+', 'V+7'].map((n) => c(n)) },
    ],
  };

  return [diatonic, borrowed, secondary, substitutions, chromatic];
}
