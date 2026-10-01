import type { Key } from '../../theory/keys';
import type { SuggestionGroup } from './suggest';
import { ChordChip } from './parts';
import s from './Progressions.module.css';

export function SuggestionsPanel({ groups, keyObj, onPick }: { groups: SuggestionGroup[]; keyObj: Key; onPick: (numeral: string) => void }) {
  return (
    <div>
      {groups.map((g) => (
        <div key={g.id} className={s.suggestGroup}>
          <div className={s.suggestHead}>
            <span className={s.suggestTitle}>{g.title}</span>
            <span className={s.suggestBlurb}>{g.blurb}</span>
          </div>
          <div className={s.chips}>
            {g.items.map((it) => (
              <ChordChip key={it.numeral} numeral={it.numeral} keyObj={keyObj} reason={it.reason} onClick={() => onPick(it.numeral)} label="Insert next" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
