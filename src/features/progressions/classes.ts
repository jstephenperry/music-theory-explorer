import type { HarmonicFunction } from '../../theory/harmony';
import s from './Progressions.module.css';

/** CSS class that sets --fn and --fn-soft for a harmonic function. */
export const fnClass = (fn: HarmonicFunction) => s[`fn-${fn}`];

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
