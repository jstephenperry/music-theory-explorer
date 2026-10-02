import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Piano, type KeyMark } from '../../components/Piano';
import { Button, Callout, PageHeader, Panel, RootPicker, Segmented, Select, Stat, Tabs, Tag } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { keyName, keyNotes, keySignatureFifths, makeKey, type Key, type KeyMode } from '../../theory/keys';
import { accidentalString, noteName, pc } from '../../theory/notes';
import { CircleDiagram } from './CircleDiagram';
import { ExampleView } from './ExampleView';
import {
  allStatuses,
  buildExample,
  compareKeys,
  findBorrowedPivots,
  findPivots,
  isTheoreticalKey,
  keyParam,
  keyRelations,
  parseKeyParam,
  practicalSpelling,
  TECHNIQUE_BY_ID,
  TECHNIQUES,
  type TechniqueId,
} from './logic';
import { ModulationMap, type MapMode } from './ModulationMap';
import { PivotTable } from './PivotTable';
import s from './Modulation.module.css';

const DEFAULTS = { from: 'C', to: 'G', t: 'pivot', opt: '' };

/** Several URL query values updated together (useUrlState writes one key per navigation). */
function useQuery() {
  const [params, setParams] = useSearchParams();
  const get = (k: keyof typeof DEFAULTS) => params.get(k) ?? DEFAULTS[k];
  const set = useCallback(
    (patch: Partial<Record<keyof typeof DEFAULTS, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === DEFAULTS[k as keyof typeof DEFAULTS]) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return { get, set };
}

function signatureText(k: Key): string {
  const f = keySignatureFifths(k);
  if (f === 0) return 'no sharps or flats';
  return `${Math.abs(f)} ${f > 0 ? 'sharp' : 'flat'}${Math.abs(f) === 1 ? '' : 's'}`;
}

function KeyPicker({ label, value, onChange, tone }: { label: string; value: Key; onChange: (k: Key) => void; tone: 'from' | 'to' }) {
  const theoretical = isTheoreticalKey(value);
  return (
    <div className={s.keyCard}>
      <div className={s.keyTitle}>
        <span className={`${s.keyRole} ${tone === 'from' ? s.fromColor : s.toColor}`}>{label}</span>
        <span className={s.keyName}>{keyName(value)}</span>
        <span className="muted" style={{ fontSize: '0.88rem' }}>
          {signatureText(value)}
        </span>
      </div>
      <RootPicker label="Tonic" value={value.tonic} onChange={(n) => onChange({ tonic: n, mode: value.mode })} />
      <Segmented<KeyMode>
        ariaLabel={`${label} mode`}
        value={value.mode}
        onChange={(m) => onChange({ tonic: value.tonic, mode: m })}
        options={[
          { value: 'major', label: 'Major' },
          { value: 'minor', label: 'Minor' },
        ]}
      />
      {theoretical && (
        <div className="row" style={{ gap: '0.5rem' }}>
          <Tag tone="plum">Theoretical key</Tag>
          <Button size="sm" variant="ghost" onClick={() => onChange(practicalSpelling(value))}>
            Use {keyName(practicalSpelling(value))}
          </Button>
        </div>
      )}
    </div>
  );
}

function RelationPanel({ from, to, onPick }: { from: Key; to: Key; onPick: (k: Key) => void }) {
  const rel = keyRelations(from, to);
  const cmp = compareKeys(from, to);
  const pivots = findPivots(from, to).length;
  const fromPcs = new Set(keyNotes(from).map(pc));
  const toNotes = keyNotes(to);
  const toPcs = new Set(toNotes.map(pc));
  const pcMarks: Record<number, KeyMark> = {};
  keyNotes(from).forEach((n) => (pcMarks[pc(n)] = { role: toPcs.has(pc(n)) ? 'tone' : 'muted', label: noteName(n) }));
  toNotes.forEach((n) => {
    if (!fromPcs.has(pc(n))) pcMarks[pc(n)] = { role: 'alt', label: noteName(n) };
  });
  const changes = cmp.changedLetters.map((c) => `${c.letter}${accidentalString(c.from)} → ${c.letter}${accidentalString(c.to) || '♮'}`);
  const base = 48 + pc(from.tonic);

  return (
    <div className={s.relation}>
      <div>
        <div className={s.stats}>
          <Stat label="Circle of fifths" value={`${cmp.distance} step${cmp.distance === 1 ? '' : 's'}`} />
          <Stat label="Signature" value={`${keySignatureFifths(from) === 0 ? '0' : Math.abs(keySignatureFifths(from)) + (keySignatureFifths(from) > 0 ? '♯' : '♭')} → ${keySignatureFifths(to) === 0 ? '0' : Math.abs(keySignatureFifths(to)) + (keySignatureFifths(to) > 0 ? '♯' : '♭')}`} />
          <Stat label="Shared scale tones" value={`${cmp.commonScaleTones.length} of 7`} />
          <Stat label="Pivot chords" value={pivots} />
        </div>
        <div className={s.tags}>
          {rel.length ? rel.map((r) => (
            <Tag key={r.id} tone={r.id === 'close' || r.id === 'relative' || r.id === 'dominant' || r.id === 'subdominant' ? 'verdigris' : r.id.includes('mediant') ? 'plum' : r.id === 'same' || r.id === 'enharmonic' ? 'accent' : 'royal'} title={r.detail}>
              {r.label}
            </Tag>
          )) : <Tag>Remote relation</Tag>}
        </div>
        <ul className={s.factList}>
          {rel.slice(0, 2).map((r) => (
            <li key={r.id}>
              <b>{r.label}</b>
              {r.detail}
            </li>
          ))}
          <li>
            <b>Key signature</b>
            {changes.length ? `${changes.length} note${changes.length === 1 ? '' : 's'} change: ${changes.join(', ')}` : 'unchanged'}
          </li>
          <li>
            <b>Tonic triads</b>
            {cmp.commonTriadTones.length ? (
              <>
                share {cmp.commonTriadTones.map((n) => (
                  <span key={noteName(n)} className={s.noteChip}>
                    {noteName(n)}
                  </span>
                ))}
              </>
            ) : (
              'share no notes'
            )}
          </li>
          <li>
            <b>Scales</b>
            share{' '}
            {cmp.commonScaleTones.map((n) => (
              <span key={noteName(n)} className={s.noteChip}>
                {noteName(n)}
              </span>
            ))}
            {cmp.respelledScaleTones.length > 0 && <span className="muted"> (spelled {cmp.respelledScaleTones.map((x) => `${noteName(x.to)}`).join(', ')} in the new key)</span>}
          </li>
        </ul>
        <Piano from={base} to={base + 11} pcMarks={pcMarks} labels="none" height={110} ariaLabel="Scale comparison on one octave" />
        <div className={s.legend}>
          <span className={s.legendItem}>
            <span className={s.swatch} style={{ background: 'var(--brass)' }} /> In both scales
          </span>
          <span className={s.legendItem}>
            <span className={s.swatch} style={{ background: 'var(--ink-faint)' }} /> Only in {keyName(from)}
          </span>
          <span className={s.legendItem}>
            <span className={s.swatch} style={{ background: 'var(--verdigris)' }} /> Only in {keyName(to)}
          </span>
        </div>
      </div>
      <CircleDiagram from={from} to={to} onPick={onPick} />
    </div>
  );
}

export default function ModulationPage() {
  const q = useQuery();
  const from = parseKeyParam(q.get('from')) ?? makeKey('C');
  const to = parseKeyParam(q.get('to')) ?? makeKey('G');
  const techId = (TECHNIQUE_BY_ID[q.get('t') as TechniqueId] ? q.get('t') : 'pivot') as TechniqueId;
  const optParam = q.get('opt');
  const [mapMode, setMapMode] = usePersistentState<MapMode>('modulation:mapMode', 'pivots');
  const [tableTab, setTableTab] = usePersistentState<'common' | 'borrowed'>('modulation:tableTab', 'common');

  const fromKey = keyParam(from);
  const toKey = keyParam(to);
  const statuses = useMemo(() => allStatuses(from, to), [fromKey, toKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const status = statuses.find((st) => st.id === techId)!;
  const info = TECHNIQUE_BY_ID[techId];
  const optId = status.options.find((o) => o.id === optParam)?.id ?? status.options[0]?.id;
  const example = useMemo(() => buildExample(techId, from, to, optId), [techId, fromKey, toKey, optId]); // eslint-disable-line react-hooks/exhaustive-deps
  const pivots = useMemo(() => findPivots(from, to), [fromKey, toKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const borrowed = useMemo(() => findBorrowedPivots(from, to), [fromKey, toKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFrom = (k: Key) => q.set({ from: keyParam(k), opt: '' });
  const setTo = (k: Key) => q.set({ to: keyParam(k), opt: '' });
  const swap = () => q.set({ from: toKey, to: fromKey, opt: '' });
  const selectPivot = (kind: 'pivot' | 'mixture', id: string) => q.set({ t: kind, opt: id });

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Harmony"
        title="Modulation"
        lede="Choose two keys and compare nine ways between them: pivot chords, common tones, enharmonic reinterpretation, sequences and direct shifts. Hear each technique, see it on the staff and follow it on the keyboard."
      />

      <Panel title="Two keys" eyebrow="From and to">
        <div className={s.keys}>
          <KeyPicker label="From" value={from} onChange={setFrom} tone="from" />
          <Button className={s.swap} icon="shuffle" onClick={swap} aria-label="Swap keys">
            Swap
          </Button>
          <KeyPicker label="To" value={to} onChange={setTo} tone="to" />
        </div>
      </Panel>

      <Panel title={`${keyName(from)} to ${keyName(to)}`} eyebrow="Relationship">
        <RelationPanel from={from} to={to} onPick={setTo} />
      </Panel>

      <Panel title="Modulation map" eyebrow={`Every key, seen from ${keyName(from)}`}>
        <ModulationMap from={from} to={to} onPick={setTo} mode={mapMode} onMode={setMapMode} />
      </Panel>

      <Panel title="Techniques" eyebrow={`${statuses.filter((st) => st.available).length} of 9 available`}>
        <div className={s.techGrid} role="radiogroup" aria-label="Modulation technique">
          {TECHNIQUES.map((t, i) => {
            const st = statuses[i];
            const active = t.id === techId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${s.techCard} ${active ? s.techCardActive : ''} ${st.available ? '' : s.techCardOff}`}
                title={t.short}
                onClick={() => q.set({ t: t.id, opt: '' })}
              >
                <span className={s.techTop}>
                  <span className={s.techNum}>{i + 1}</span>
                  <span className={`${s.status} ${st.available ? s.statusOn : s.statusOff}`}>{st.available ? 'Available' : 'Not here'}</span>
                </span>
                <span className={s.techName}>{t.name}</span>
                <span className={s.techShort}>{t.short}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={info.name}
        eyebrow={`Technique ${TECHNIQUES.findIndex((t) => t.id === techId) + 1} · ${keyName(from)} to ${keyName(to)}`}
        actions={<Tag tone="brass">Best for: {info.bestFor}</Tag>}
      >
        <p className={s.explain}>{info.explanation}</p>
        {status.available ? (
          <>
            <div className={s.detailHead}>
              <Callout tone="verdigris">{status.reason}</Callout>
              {status.options.length > 1 &&
                (status.options.length <= 2 ? (
                  <Segmented
                    ariaLabel={status.optionsLabel ?? 'Option'}
                    value={optId ?? ''}
                    onChange={(v) => q.set({ opt: v })}
                    options={status.options.map((o) => ({ value: o.id, label: o.label, title: o.detail }))}
                  />
                ) : (
                  <Select
                    label={status.optionsLabel}
                    value={optId ?? ''}
                    onChange={(v) => q.set({ opt: v })}
                    options={status.options.map((o) => ({ value: o.id, label: `${o.label}${o.rating ? ` (${o.rating})` : ''}` }))}
                  />
                ))}
            </div>
            {example && <ExampleView ex={example} />}
          </>
        ) : (
          <div className={s.unavailable}>
            <Callout tone="accent" title="Not available for this pair">
              {status.reason}
            </Callout>
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Try another technique, or pick a target in the map where technique {TECHNIQUES.findIndex((t) => t.id === techId) + 1} is lit.
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Pivot chord tables" eyebrow="Chords that belong to both keys">
        <Tabs
          ariaLabel="Pivot chord table"
          value={tableTab}
          onChange={setTableTab}
          tabs={[
            { id: 'common', label: `Common chords (${pivots.length})` },
            { id: 'borrowed', label: `Borrowed pivots (${borrowed.length})` },
          ]}
        />
        <div style={{ marginTop: '0.75rem' }}>
          {tableTab === 'common' ? (
            <PivotTable pivots={pivots} from={from} to={to} selectedId={techId === 'pivot' ? optId : undefined} onSelect={(id) => selectPivot('pivot', id)} />
          ) : (
            <PivotTable pivots={borrowed} from={from} to={to} borrowed selectedId={techId === 'mixture' ? optId : undefined} onSelect={(id) => selectPivot('mixture', id)} />
          )}
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Ranked by function in the new key: a predominant (ii, IV) is ideal because it leads straight to the new V⁷; a pivot that is already the new tonic or
          dominant arrives too early. Minor keys include harmonic-minor V and vii°.
        </p>
      </Panel>
    </div>
  );
}
