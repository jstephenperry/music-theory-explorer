import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { SCALES, TRADITIONS, TRADITION_BY_ID, familiesOf, hasMicrotones, scalesInFamily, type ScaleDef, type TraditionId } from '../../theory/scales';
import { formulaText, searchScales } from './browse';
import s from './ScaleBrowser.module.css';

type Level = 'tradition' | 'family' | 'scale';

const COUNTS = new Map<TraditionId, number>();
for (const sc of SCALES) COUNTS.set(sc.tradition, (COUNTS.get(sc.tradition) ?? 0) + 1);

/**
 * Structured scale picker: tradition, then family (maqam family, thaat, chakra ...), then scale.
 * On wide screens the three levels sit side by side; on phones they are shown one at a time,
 * with a breadcrumb to step back. A search box finds scales across every tradition.
 */
export function ScaleBrowser({ scale, onPick }: { scale: ScaleDef; onPick: (id: string) => void }) {
  const narrow = useMediaQuery('(max-width: 760px)');
  const [tradition, setTradition] = useState<TraditionId>(scale.tradition);
  const [family, setFamily] = useState<string>(scale.family);
  const [level, setLevel] = useState<Level>('scale');
  const [query, setQuery] = useState('');
  const scaleListRef = useRef<HTMLUListElement>(null);

  // Follow the loaded scale when it changes elsewhere (previous/next buttons, links, the URL).
  const [followed, setFollowed] = useState(scale.id);
  if (followed !== scale.id) {
    setFollowed(scale.id);
    setTradition(scale.tradition);
    setFamily(scale.family);
  }

  // Keep the current scale in view inside its list.
  useEffect(() => {
    const el = scaleListRef.current?.querySelector('[aria-current="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [scale.id, family]);

  const trad = TRADITION_BY_ID[tradition];
  const families = useMemo(() => familiesOf(tradition), [tradition]);
  const scales = useMemo(() => scalesInFamily(tradition, family), [tradition, family]);
  const results = useMemo(() => searchScales(query), [query]);

  const chooseTradition = (id: TraditionId) => {
    setTradition(id);
    const fams = familiesOf(id);
    setFamily(id === scale.tradition ? scale.family : fams[0]);
    setLevel(fams.length === 1 ? 'scale' : 'family');
  };
  const chooseFamily = (f: string) => {
    setFamily(f);
    setLevel('scale');
  };
  const pick = (id: string) => {
    onPick(id);
    setQuery('');
  };

  const show = (l: Level) => !narrow || level === l;

  return (
    <div className={s.browser}>
      <div className={s.searchRow}>
        <label className={s.search}>
          <Icon name="search" size={15} />
          <span className="sr-only">Search scales</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) pick(results[0].id);
              if (e.key === 'Escape') setQuery('');
            }}
            placeholder={`Search ${SCALES.length} scales, modes, maqamat and ragas`}
            aria-controls="scale-search-results"
          />
        </label>
        {narrow && !query && (
          <nav className={s.crumbs} aria-label="Scale browser location">
            <button className={s.crumb} onClick={() => setLevel('tradition')} aria-current={level === 'tradition'}>
              All traditions
            </button>
            {level !== 'tradition' && (
              <>
                <Icon name="chevron-right" size={13} />
                <button className={s.crumb} onClick={() => setLevel('family')} aria-current={level === 'family'}>
                  {trad.short}
                </button>
              </>
            )}
            {level === 'scale' && (
              <>
                <Icon name="chevron-right" size={13} />
                <span className={s.crumbHere}>{family}</span>
              </>
            )}
          </nav>
        )}
      </div>

      {query ? (
        <div id="scale-search-results" className={s.results} aria-live="polite">
          {results.length === 0 ? (
            <p className={s.empty}>No scale matches “{query}”.</p>
          ) : (
            <ul className={s.list}>
              {results.map((r) => (
                <li key={r.id}>
                  <button className={s.item} aria-current={r.id === scale.id} onClick={() => pick(r.id)}>
                    <span className={s.itemName}>{r.name}</span>
                    <span className={s.itemMeta}>
                      {TRADITION_BY_ID[r.tradition].short} · {r.family}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={s.columns}>
          {show('tradition') && (
            <section className={s.column} aria-labelledby="col-tradition">
              <h3 id="col-tradition" className={s.columnTitle}>
                Tradition
              </h3>
              <ul className={s.list}>
                {TRADITIONS.map((t) => (
                  <li key={t.id}>
                    <button className={`${s.item} ${t.id === tradition ? s.itemOpen : ''}`} aria-current={t.id === scale.tradition} onClick={() => chooseTradition(t.id)}>
                      <span className={s.itemName}>
                        {t.name}
                        <span className={s.count}>{COUNTS.get(t.id)}</span>
                      </span>
                      <span className={s.itemMeta}>{t.blurb}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show('family') && (
            <section className={s.column} aria-labelledby="col-family">
              <h3 id="col-family" className={s.columnTitle}>
                {trad.familyLabel}
              </h3>
              <ul className={s.list}>
                {families.map((f) => (
                  <li key={f}>
                    <button className={`${s.item} ${f === family ? s.itemOpen : ''}`} aria-current={tradition === scale.tradition && f === scale.family} onClick={() => chooseFamily(f)}>
                      <span className={s.itemName}>
                        {f}
                        <span className={s.count}>{scalesInFamily(tradition, f).length}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className={s.about}>{trad.about}</p>
            </section>
          )}

          {show('scale') && (
            <section className={`${s.column} ${s.scaleColumn}`} aria-labelledby="col-scale">
              <h3 id="col-scale" className={s.columnTitle}>
                {family}
              </h3>
              <ul className={s.list} ref={scaleListRef}>
                {scales.map((sc) => (
                  <li key={sc.id}>
                    <button className={s.item} aria-current={sc.id === scale.id} onClick={() => pick(sc.id)}>
                      <span className={s.itemName}>
                        {sc.name}
                        {hasMicrotones(sc) && (
                          <span className={s.microBadge} title="Uses pitches between the piano keys">
                            microtonal
                          </span>
                        )}
                      </span>
                      <span className={s.formula}>{formulaText(sc)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
