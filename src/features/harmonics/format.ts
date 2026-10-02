import { intervalLongName, type Interval } from '../../theory/intervals';

export { formatCents } from '../../lib/format';

export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const OCTAVE_WORDS = ['', 'an octave', 'two octaves', 'three octaves', 'four octaves'];

/** "minor seventh plus two octaves" rather than "minor 21th". */
export function compoundName(i: Interval): string {
  if (i.semis === 0) return 'unison';
  const oct = Math.floor((i.num - 1) / 7);
  if (i.semis % 12 === 0 && (i.num - 1) % 7 === 0) return oct === 1 ? 'octave' : OCTAVE_WORDS[oct];
  const simple = intervalLongName({ num: i.num - 7 * oct, semis: i.semis - 12 * oct });
  return oct ? `${simple} plus ${OCTAVE_WORDS[oct]}` : simple;
}

