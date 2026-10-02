import { useMemo, useState } from 'react';
import { Button, Select, Tag, TextInput } from '../../components/ui';
import type { Key } from '../../theory/keys';
import { makeKey } from '../../theory/keys';
import { LIBRARY, LIBRARY_GROUPS, type LibraryEntry } from './library';
import { parseNumeralText, tryParseNumeral, chordLabel } from './model';
import s from './Progressions.module.css';

function entryKey(e: LibraryEntry, key: Key): Key {
  return e.mode === 'both' ? key : makeKey(key.tonic, e.mode);
}

function EntryCard({ e, keyObj, onLoad, onPreview, previewing }: { e: LibraryEntry; keyObj: Key; onLoad: () => void; onPreview: () => void; previewing: boolean }) {
  const k = entryKey(e, keyObj);
  const items = parseNumeralText(e.progression, k).items;
  const rcs = items.map((it) => tryParseNumeral(it.numeral, k));
  return (
    <article className={s.entry}>
      <div className={s.entryHead}>
        <h4 className={s.entryName}>{e.name}</h4>
        <span className={s.entryNumerals} title={rcs.map((r) => (r ? chordLabel(r) : '')).join('  ')}>
          {rcs.map((r) => r?.display).join('  ')}
        </span>
        <span className={s.entryMeta}>
          <Tag tone="brass">{e.era}</Tag>
          <Tag tone={e.mode === 'minor' ? 'royal' : e.mode === 'major' ? 'verdigris' : 'default'}>{e.mode === 'both' ? 'any mode' : e.mode}</Tag>
        </span>
      </div>
      <p className={s.entryDesc}>{e.description}</p>
      <div className={s.entryActions}>
        <Button size="sm" variant="primary" icon="arrow-right" onClick={onLoad} aria-label={`Load ${e.name}`}>
          Load
        </Button>
        <Button size="sm" icon={previewing ? 'stop' : 'play'} onClick={onPreview} aria-label={`${previewing ? 'Stop preview of' : 'Preview'} ${e.name}`}>
          {previewing ? 'Stop' : 'Preview'}
        </Button>
      </div>
    </article>
  );
}

export function LibraryPanel({
  keyObj,
  previewId,
  onLoad,
  onPreview,
}: {
  keyObj: Key;
  previewId: string | null;
  onLoad: (e: LibraryEntry) => void;
  onPreview: (e: LibraryEntry) => void;
}) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/♭/g, 'b').replace(/♯/g, '#');
    return LIBRARY.filter((e) => (group === 'all' || e.group === group) && (!q || `${e.name} ${e.era} ${e.description} ${e.progression}`.toLowerCase().includes(q)));
  }, [group, query]);
  const groups = LIBRARY_GROUPS.filter((g) => filtered.some((e) => e.group === g));
  return (
    <div>
      <div className={s.libraryControls}>
        <Select
          label="Group"
          value={group}
          onChange={setGroup}
          options={[{ value: 'all', label: `All (${LIBRARY.length})` }, ...LIBRARY_GROUPS.map((g) => ({ value: g, label: `${g} (${LIBRARY.filter((e) => e.group === g).length})` }))]}
        />
        <TextInput label="Search" value={query} onChange={setQuery} placeholder="e.g. Coltrane, blues, ♭VI" />
        <span className="muted" style={{ fontSize: '0.85rem', paddingBottom: '0.45rem' }}>
          Loaded in your current tonic; Load switches to the mode it is written for.
        </span>
      </div>
      <div className={s.libraryList}>
      {groups.map((g) => (
        <section key={g} className={s.libraryGroup} aria-label={g}>
          <h3 className={s.libraryGroupTitle}>{g}</h3>
          <div className={s.libraryGrid}>
            {filtered
              .filter((e) => e.group === g)
              .map((e) => (
                <EntryCard key={e.id} e={e} keyObj={keyObj} onLoad={() => onLoad(e)} onPreview={() => onPreview(e)} previewing={previewId === e.id} />
              ))}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="muted" style={{ padding: '0.75rem 0.9rem' }}>No progressions match.</p>}
      </div>
    </div>
  );
}
