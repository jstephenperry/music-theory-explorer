import { CHORD_BY_ID, VOICING_STYLES, noteName, tryNote, type VoicingStyle } from '../../theory';
import { PageHeader, Tabs } from '../../components/ui';
import { BuildTab } from './BuildTab';
import type { BuildState } from './chordLogic';
import { IdentifyTab } from './IdentifyTab';
import { useQuery } from './useQuery';

type Tab = 'build' | 'identify';

const DEFAULTS = { tab: 'build', root: 'C', chord: 'maj7', inv: '0', voicing: 'close', oct: '4', notes: '' };

function parseNotes(s: string): number[] {
  return [...new Set(s.split('.').map(Number).filter((n) => Number.isInteger(n) && n >= 21 && n <= 108))].sort((a, b) => a - b);
}

export default function ChordsPage() {
  const [q, update] = useQuery(DEFAULTS);
  const tab: Tab = q.tab === 'identify' ? 'identify' : 'build';
  const state: BuildState = {
    root: tryNote(q.root) ?? { letter: 'C', acc: 0 },
    chordId: CHORD_BY_ID[q.chord] ? q.chord : 'maj7',
    inv: Math.max(0, Math.min(6, parseInt(q.inv, 10) || 0)),
    voicing: (VOICING_STYLES.some((v) => v.id === q.voicing) ? q.voicing : 'close') as VoicingStyle,
    oct: Math.max(1, Math.min(5, parseInt(q.oct, 10) || 4)),
  };

  const setBuild = (patch: Partial<BuildState>) => {
    const out: Partial<typeof DEFAULTS> = {};
    if (patch.root) out.root = noteName(patch.root, false);
    if (patch.chordId) out.chord = patch.chordId;
    if (patch.inv !== undefined) out.inv = String(patch.inv);
    if (patch.voicing) out.voicing = patch.voicing;
    if (patch.oct !== undefined) out.oct = String(patch.oct);
    update(out);
  };

  return (
    <>
      <PageHeader
        eyebrow="Harmony"
        title="Chords"
        lede="Build any chord from triads to altered dominants, turn it over, revoice it and hear it. Or play some notes and the chord is named."
      />
      <Tabs<Tab>
        ariaLabel="Chord tools"
        tabs={[
          { id: 'build', label: 'Build' },
          { id: 'identify', label: 'Identify' },
        ]}
        value={tab}
        onChange={(t) => update({ tab: t })}
      />
      {tab === 'build' ? (
        <BuildTab state={state} onChange={setBuild} />
      ) : (
        <IdentifyTab
          notes={parseNotes(q.notes)}
          setNotes={(n) => update({ notes: n.join('.') })}
          onOpen={(c) => {
            update({ tab: 'build', root: noteName(c.root, false), chord: c.chordId, inv: String(c.inversion), voicing: 'close' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
