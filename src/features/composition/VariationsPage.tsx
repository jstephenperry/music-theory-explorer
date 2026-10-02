import { PageHeader, Panel } from '../../components/ui';
import { ExcerptView } from './ExcerptView';
import { K265_THEME, K265_VAR1 } from './excerpts/mozart';
import { VariationQuiz } from './VariationQuiz';
import { VariationWorkshop } from './VariationWorkshop';
import { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

export default function VariationsPage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Composition"
        title="Theme & Variations"
        lede="A theme and variations keeps a melody’s phrase and harmony and changes everything else. Follow Mozart’s variations on a children’s song, then vary the theme yourself: figuration, rhythm, meter, mode and accompaniment."
      />
      <Panel title="In the repertoire">
        <div className="stack">
          <ExcerptView excerpt={K265_THEME} player={player} />
          <ExcerptView excerpt={K265_VAR1} player={player} />
        </div>
      </Panel>
      <Panel title="Variation workshop" eyebrow="Change one thing at a time">
        <VariationWorkshop player={player} />
      </Panel>
      <Panel title="What changed?" eyebrow="Drill">
        <VariationQuiz player={player} />
      </Panel>
    </div>
  );
}
