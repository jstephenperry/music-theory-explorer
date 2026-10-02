/**
 * Small shared pieces for the Progression Lab.
 */
import type { Key } from '../../theory/keys';
import type { Pitch } from '../../theory/notes';
import type { RomanChord } from '../../theory/roman';
import { describeChord, FUNCTION_LABEL, type ChordDescription, type HarmonicFunction } from '../../theory/harmony';
import { chordLabel, tryParseNumeral, type ProgItem } from './model';
import { cx, fnClass } from './classes';
import s from './Progressions.module.css';
import { Legend } from '../../components/ui';

export interface LabChord {
  item: ProgItem;
  rc: RomanChord;
  desc: ChordDescription;
  voicing: Pitch[];
}

export function ChordChip({
  numeral,
  keyObj,
  note,
  reason,
  onClick,
  label,
}: {
  numeral: string;
  keyObj: Key;
  note?: string;
  reason?: string;
  onClick: () => void;
  /** Accessible action label prefix, e.g. "Insert". */
  label: string;
}) {
  const rc = tryParseNumeral(numeral, keyObj);
  if (!rc) return null;
  const desc = describeChord(rc, keyObj);
  const sym = chordLabel(rc);
  const title = `${rc.display} = ${sym}. ${desc.role}${desc.source ? ` (${desc.source})` : ''}. ${desc.detail}${reason ? ` ${reason}.` : ''}`;
  return (
    <button type="button" className={cx(s.chip, fnClass(desc.fn))} onClick={onClick} title={title} aria-label={`${label} ${rc.display}, ${sym}`}>
      <span className={s.chipNumeral}>{rc.display}</span>
      <span className={s.chipSymbol}>{sym}</span>
      {note && <span className={s.chipNote}>{note}</span>}
      {reason && <span className={s.reason}>{reason}</span>}
    </button>
  );
}

const LEGEND: Array<{ fn: HarmonicFunction; tip: string }> = [
  { fn: 'tonic', tip: 'Tonic function (I, vi, iii): stability, home.' },
  { fn: 'predominant', tip: 'Predominant function (ii, IV): moving away, preparing the dominant.' },
  { fn: 'dominant', tip: 'Dominant function (V, vii°): tension that wants to resolve to the tonic.' },
  { fn: 'chromatic', tip: 'Chromatic or borrowed: secondary dominants, modal interchange, substitutes, Neapolitan, augmented sixths, mediants.' },
];

const FN_COLOR: Record<HarmonicFunction, string> = { tonic: 'var(--verdigris)', predominant: 'var(--royal)', dominant: 'var(--accent)', chromatic: 'var(--plum)' };

export function FunctionLegend() {
  return <Legend ariaLabel="Harmonic function colors" items={LEGEND.map((l) => ({ color: FN_COLOR[l.fn], label: FUNCTION_LABEL[l.fn], title: l.tip }))} />;
}
