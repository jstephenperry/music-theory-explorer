import { useEffect } from 'react';
import { PageHeader, Segmented, Tabs } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useUrlState } from '../../hooks/useUrlState';
import { SeriesSection } from './SeriesSection';
import { SynthSection } from './SynthSection';
import { JustSection } from './JustSection';
import { TuningSection } from './TuningSection';
import { synth } from './synth';
import s from './Harmonics.module.css';

type TabId = 'series' | 'synth' | 'just' | 'tuning';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'series', label: 'Harmonic series' },
  { id: 'synth', label: 'Additive synthesis' },
  { id: 'just', label: 'Just versus equal' },
  { id: 'tuning', label: 'Tuning systems' },
];

const A4_OPTIONS = [
  { value: 415, label: '415', title: 'Baroque pitch (about a semitone below 440)' },
  { value: 430, label: '430', title: 'Classical era pitch' },
  { value: 432, label: '432', title: 'A popular alternative reference' },
  { value: 440, label: '440', title: 'Modern standard pitch (ISO 16)' },
  { value: 442, label: '442', title: 'Common in European orchestras' },
  { value: 466, label: '466', title: 'Venetian "cornett pitch" (about a semitone above 440)' },
];

export default function HarmonicsPage() {
  const [tab, setTab] = useUrlState('tab', 'series');
  const [a4, setA4] = usePersistentState<number>('harmonics:a4', 440);
  const current = (TABS.some((t) => t.id === tab) ? tab : 'series') as TabId;

  // Silence anything this room started when leaving it or switching sections.
  useEffect(() => () => synth.stopAll(), []);
  useEffect(() => {
    synth.stopAll();
  }, [current]);

  const hint = A4_OPTIONS.find((o) => o.value === a4)?.title;

  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Sound & Tuning"
        title="Harmonics & Tuning"
        lede="Every musical tone is a stack of partials. Hear the harmonic series, build timbres from sine waves, and compare the tuning systems musicians have used to tame the octave."
      >
        <div className={s.refBar}>
          <span className={s.refLabel} id="a4-label">
            Reference A4 (Hz)
          </span>
          <Segmented ariaLabel="Reference pitch for A4 in hertz" options={A4_OPTIONS} value={a4} onChange={setA4} size="sm" />
          {hint && <span className={s.refNote}>{hint}. Used throughout this room only.</span>}
        </div>
      </PageHeader>
      <Tabs tabs={TABS} value={current} onChange={(v) => setTab(v)} ariaLabel="Harmonics and tuning sections" />
      {current === 'series' && <SeriesSection a4={a4} />}
      {current === 'synth' && <SynthSection a4={a4} />}
      {current === 'just' && <JustSection a4={a4} />}
      {current === 'tuning' && <TuningSection a4={a4} />}
    </div>
  );
}
