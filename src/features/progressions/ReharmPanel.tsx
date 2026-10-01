import { Button } from '../../components/ui';
import type { Key } from '../../theory/keys';
import { tryParseNumeral, chordLabel } from './model';
import type { ReharmOption, ReharmTool } from './reharm';
import s from './Progressions.module.css';

function describeOption(o: ReharmOption, keyObj: Key) {
  const parts = o.numerals.map((n) => {
    const rc = tryParseNumeral(n, keyObj);
    return rc ? `${rc.display} (${chordLabel(rc)})` : n;
  });
  return `${o.kind === 'insert' ? 'Insert' : 'Replace with'} ${parts.join(', then ')}`;
}

export function ReharmPanel({ tools, keyObj, onApply }: { tools: ReharmTool[]; keyObj: Key; onApply: (o: ReharmOption) => void }) {
  return (
    <div>
      {tools.map((t) => (
        <div key={t.id} className={s.tool}>
          <div className={s.toolHead}>
            <span className={s.toolTitle}>{t.title}</span>
          </div>
          <p className={s.toolDesc}>{t.description}</p>
          {t.unavailable ? (
            <span className={s.unavailable}>{t.unavailable}</span>
          ) : (
            <div className={s.toolOptions}>
              {t.options.map((o) => {
                const text = describeOption(o, keyObj);
                return (
                  <Button key={o.label} size="sm" icon={o.kind === 'insert' ? 'plus' : 'shuffle'} onClick={() => onApply(o)} title={text} aria-label={text}>
                    <span className="display" style={{ fontSize: '1.05rem' }}>
                      {o.numerals.map((n) => tryParseNumeral(n, keyObj)?.display ?? n).join(' ')}
                    </span>
                    {o.tag && <span className="muted" style={{ fontWeight: 400 }}>{o.tag}</span>}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
