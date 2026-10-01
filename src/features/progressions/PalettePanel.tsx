import { useMemo } from 'react';
import { Callout, Segmented } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { Key } from '../../theory/keys';
import { noteName } from '../../theory/notes';
import { buildPalette, type PaletteGroup } from './palette';
import { ChordChip } from './parts';
import s from './Progressions.module.css';

export function PalettePanel({
  keyObj,
  tab,
  onTab,
  onPick,
}: {
  keyObj: Key;
  tab: PaletteGroup['id'];
  onTab: (t: PaletteGroup['id']) => void;
  onPick: (numeral: string) => void;
}) {
  const groups = useMemo(() => buildPalette(keyObj), [keyObj]);
  const group = groups.find((g) => g.id === tab) ?? groups[0];
  const parallel = keyObj.mode === 'major' ? 'minor' : 'major';
  return (
    <div>
      <Segmented<PaletteGroup['id']> size="sm" ariaLabel="Chord palette groups" options={groups.map((g) => ({ value: g.id, label: g.title, title: g.tooltip }))} value={group.id} onChange={onTab} />
      <p className={s.groupIntro}>
        <Icon name="info" size={16} />
        <span>{group.tooltip}</span>
      </p>
      {group.sections.map((sec) => (
        <div key={sec.title} className={s.section}>
          <h3 className={s.sectionTitle}>{sec.title}</h3>
          <div className={s.chips}>
            {sec.chords.map((c) => (
              <ChordChip key={c.numeral + (c.note ?? '')} numeral={c.numeral} keyObj={keyObj} note={c.note} onClick={() => onPick(c.numeral)} label="Insert" />
            ))}
          </div>
        </div>
      ))}
      {group.id === 'borrowed' && (
        <div style={{ marginTop: '1rem' }}>
          <Callout title="Modal interchange">
            {noteName(keyObj.tonic)} {keyObj.mode} and {noteName(keyObj.tonic)} {parallel} share a tonic, so their chords can be mixed freely. A borrowed chord keeps the
            sense of home while changing the light: ♭VI and iv darken a major key; IV and the Picardy I brighten a minor one.
          </Callout>
        </div>
      )}
    </div>
  );
}
