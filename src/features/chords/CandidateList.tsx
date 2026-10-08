import type { Key } from '../../theory';
import { Button } from '../../components/ui';
import { describeAlternative, describeInversion, romanFor, type Candidate } from './chordLogic';
import s from './CandidateList.module.css';

/**
 * Ranked chord names for a set of notes: the best reading large, alternatives below with
 * a short explanation of how the same notes can be heard differently.
 */
export function CandidateList({
  candidates,
  keyCtx,
  onOpen,
  onHear,
  maxAlternatives = 6,
  tone = 'paper',
}: {
  candidates: Candidate[];
  keyCtx?: Key | null;
  onOpen?: (c: Candidate) => void;
  onHear?: (c: Candidate) => void;
  maxAlternatives?: number;
  /** "wood" renders light text for use on a dark wood placard. */
  tone?: 'paper' | 'wood';
}) {
  if (candidates.length === 0) return null;
  const [top, ...rest] = candidates;
  const topRoman = romanFor(top, keyCtx);
  return (
    <div className={`${s.wrap} ${tone === 'wood' ? s.wood : ''}`}>
      <div className={s.top} aria-live="polite">
        <div className={s.topMain}>
          <div className={s.symbol}>{top.symbol}</div>
          <div className={s.name}>{top.name}</div>
          <div className={s.inv}>{describeInversion(top)}</div>
        </div>
        {topRoman && (
          <div className={s.roman} title="Roman numeral in the chosen key">
            {topRoman}
          </div>
        )}
        {(onOpen || onHear) && (
          <div className={s.actions}>
            {onHear && (
              <Button size="sm" icon="play" onClick={() => onHear(top)} title={`Play with ${top.root.letter} reinforced in the bass`}>
                Hear
              </Button>
            )}
            {onOpen && (
              <Button size="sm" variant="ghost" iconRight="arrow-right" onClick={() => onOpen(top)} title="Open in the chord builder">
                Open
              </Button>
            )}
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <div className={s.altBlock}>
          <div className={s.altHead}>Other readings</div>
          <ul className={s.alts}>
            {rest.slice(0, maxAlternatives).map((c) => {
              const roman = romanFor(c, keyCtx);
              return (
                <li key={c.symbol} className={s.alt}>
                  <div className={s.altSymbol}>
                    {c.symbol}
                    {roman && <span className={s.altRoman}>{roman}</span>}
                  </div>
                  <div className={s.altText}>{describeAlternative(c, top)}</div>
                  {(onOpen || onHear) && (
                    <div className={s.altActions}>
                      {onHear && <Button size="sm" variant="ghost" icon="play" aria-label={`Hear as ${c.symbol} with its root in the bass`} title="Hear with this root in the bass" onClick={() => onHear(c)} />}
                      {onOpen && <Button size="sm" variant="ghost" icon="arrow-right" aria-label={`Open ${c.symbol} in the chord builder`} title="Open in the chord builder" onClick={() => onOpen(c)} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
