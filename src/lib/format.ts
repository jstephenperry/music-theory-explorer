/** Small text formatters shared by rooms. */

/** Signed cents with a true minus sign: +4, −31.2, 0. */
export function formatCents(c: number, digits = 0): string {
  const r = Number(c.toFixed(digits));
  if (r === 0) return '0';
  return (r > 0 ? '+' : '−') + Math.abs(r).toFixed(digits);
}

/** A note name typed with "b" shown with a flat sign: "Eb" becomes "E♭". */
export const flat = (t: string) => t.replace('b', '♭');

/** First letter capitalized. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

/** A small count as a capitalized word: 17 becomes Seventeen; larger counts stay digits. */
export const countWord = (n: number) => cap(WORDS[n] ?? String(n));
