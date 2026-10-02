import { useMemo, useState } from 'react';
import { Button, Segmented } from '../../components/ui';
import type { Key } from '../../theory/keys';
import { chordSymbol } from '../../theory/chords';
import { describeChord } from '../../theory/harmony';
import { DEFAULT_BEATS, parseNumeralText, parseSymbolText, serializeItems, tryParseNumeral, type ProgItem } from './model';
import { cx, fnClass } from './classes';
import s from './Progressions.module.css';
import ui from '../../components/ui.module.css';

type EntryMode = 'numerals' | 'symbols';

function symbolsText(items: ProgItem[], key: Key): string {
  return items
    .map((it) => {
      const rc = tryParseNumeral(it.numeral, key);
      if (!rc) return '';
      const sym = chordSymbol(rc.root, rc.chordId, rc.inversion > 0 ? rc.bass : null, false);
      return it.beats === DEFAULT_BEATS ? sym : `${sym}:${it.beats}`;
    })
    .filter(Boolean)
    .join(' ');
}

export function TextEntry({ items, keyObj, onApply }: { items: ProgItem[]; keyObj: Key; onApply: (items: ProgItem[]) => void }) {
  const [mode, setMode] = useState<EntryMode>('numerals');
  const current = useMemo(() => (mode === 'numerals' ? serializeItems(items) : symbolsText(items, keyObj)), [mode, items, keyObj]);
  // A draft belongs to the text it was typed over; when the progression changes elsewhere it is discarded.
  const [draftState, setDraftState] = useState<{ base: string; text: string } | null>(null);
  const draft = draftState && draftState.base === current ? draftState.text : null;
  const setDraft = (t: string | null) => setDraftState(t === null ? null : { base: current, text: t });
  const text = draft ?? current;
  const parsed = useMemo(() => (mode === 'numerals' ? parseNumeralText(text, keyObj) : parseSymbolText(text, keyObj)), [mode, text, keyObj]);
  const dirty = draft !== null && draft !== current;
  const canApply = parsed.errors.length === 0 && parsed.items.length > 0;
  const apply = () => {
    if (!canApply) return;
    onApply(parsed.items);
    setDraft(null);
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Segmented<EntryMode>
          size="sm"
          ariaLabel="Entry format"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setDraft(null);
          }}
          options={[
            { value: 'numerals', label: 'Roman numerals' },
            { value: 'symbols', label: 'Chord symbols' },
          ]}
        />
        <span className="faint" style={{ fontSize: '0.8rem' }}>
          {mode === 'numerals' ? 'e.g. ii7 V7 Imaj7:8 (":8" sets beats)' : 'e.g. Dm7 G7 Cmaj7 Ab7 (analyzed in the current key)'}
        </span>
      </div>
      <div className={s.entryRow}>
        <textarea
          className={cx(ui.input, s.entryInput)}
          rows={2}
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              apply();
            }
            if (e.key === 'Escape') setDraft(null);
          }}
          aria-label={mode === 'numerals' ? 'Progression in roman numerals' : 'Progression in chord symbols'}
          aria-invalid={parsed.errors.length > 0}
          spellCheck={false}
          autoComplete="off"
          placeholder={mode === 'numerals' ? 'I vi ii7 V7' : 'C Am Dm7 G7'}
        />
        <Button variant={dirty ? 'primary' : 'secondary'} onClick={apply} disabled={!canApply || !dirty}>
          Apply
        </Button>
      </div>
      {(dirty || mode === 'symbols') && parsed.items.length > 0 && (
        <div className={s.tokens} aria-label="Parsed chords">
          {parsed.items.map((it, i) => {
            const rc = tryParseNumeral(it.numeral, keyObj);
            if (!rc) return null;
            const d = describeChord(rc, keyObj);
            return (
              <span key={i} className={cx(s.token, fnClass(d.fn))}>
                <span className={s.tokenNumeral}>{rc.display}</span>
                <span>{rc.symbol}</span>
                {it.beats !== DEFAULT_BEATS && <span className="faint">{it.beats}b</span>}
              </span>
            );
          })}
        </div>
      )}
      {parsed.errors.length > 0 && (
        <ul className={s.errorList} role="alert">
          {parsed.errors.map((e) => (
            <li key={e.index}>
              Token {e.index + 1} “{e.token}”: {e.message}
            </li>
          ))}
        </ul>
      )}
      {parsed.warnings.length > 0 && (
        <ul className={s.warnList}>
          {parsed.warnings.map((e) => (
            <li key={e.index}>
              “{e.token}”: {e.message}
            </li>
          ))}
        </ul>
      )}
      <p className={s.hint}>
        Upper case is major, lower case minor; ° diminished (type o), ø half-diminished (type h), + augmented. ♭ and ♯ (type b and #) are measured from the
        major scale, so ♭VI is the same chord in major and minor; type n for ♮. Figures: 6, 64, 7, 65, 43, 42. Also V/V, vii°7/ii, N6, It+6, Fr+6, Ger+6, Cad64.
      </p>
    </div>
  );
}
