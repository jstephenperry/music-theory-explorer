/**
 * Pack chords into measures for the grand staff.
 */
import type { Duration } from '../../components/Staff';

/** Note value for a duration in beats (quarter-note beats). */
export function durationFor(beats: number): Duration {
  if (beats >= 8) return 'w';
  if (beats >= 6) return 'wd';
  if (beats >= 4) return 'w';
  if (beats >= 3) return 'hd';
  if (beats >= 2) return 'h';
  if (beats >= 1.5) return 'qd';
  if (beats >= 1) return 'q';
  return '8';
}

/**
 * Group chord indices into measures of `meter` beats. A chord that would overflow the current
 * measure starts a new one; chords longer than a measure get a measure of their own.
 */
export function packMeasures(beats: number[], meter: number): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  let acc = 0;
  beats.forEach((b, i) => {
    if (cur.length > 0 && acc + b > meter + 1e-9) {
      out.push(cur);
      cur = [];
      acc = 0;
    }
    cur.push(i);
    acc += b;
    if (acc >= meter - 1e-9) {
      out.push(cur);
      cur = [];
      acc = 0;
    }
  });
  if (cur.length) out.push(cur);
  return out;
}
