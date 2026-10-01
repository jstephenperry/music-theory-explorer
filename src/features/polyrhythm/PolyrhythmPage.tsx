import { PageHeader, Tabs } from '../../components/ui';
import { useUrlState } from '../../hooks/useUrlState';
import { PolyView } from './PolyView';
import { PolymeterView } from './PolymeterView';
import { HemiolaView } from './HemiolaView';
import { PitchView } from './PitchView';

type View = 'poly' | 'meter' | 'hemiola' | 'pitch';

const TABS: Array<{ id: View; label: string }> = [
  { id: 'poly', label: 'Polyrhythm' },
  { id: 'meter', label: 'Polymeter' },
  { id: 'hemiola', label: 'Hemiola' },
  { id: 'pitch', label: 'Rhythm to pitch' },
];

export default function PolyrhythmPage() {
  const [viewParam, setView] = useUrlState('view', 'poly');
  const view = (TABS.some((t) => t.id === viewParam) ? viewParam : 'poly') as View;
  return (
    <>
      <PageHeader
        eyebrow="Rhythm & Time"
        title="Polyrhythm"
        lede="Several pulses at once: 3 against 2, 4 against 3, cycles of different lengths drifting apart, and the point where rhythm turns into pitch."
      />
      <Tabs ariaLabel="Polyrhythm topics" tabs={TABS} value={view} onChange={setView} />
      {view === 'poly' && <PolyView />}
      {view === 'meter' && <PolymeterView />}
      {view === 'hemiola' && <HemiolaView />}
      {view === 'pitch' && <PitchView />}
    </>
  );
}
