import { PageHeader, Panel } from '../../components/ui';
import { ExcerptView } from './ExcerptView';
import { excerpt } from '../../repertoire';
import { VariationQuiz } from './VariationQuiz';
import { VariationWorkshop } from './VariationWorkshop';
import { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

export default function VariationsPage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Form"
        title="Theme & Variations"
        lede="A theme and variations keeps a melody’s phrase and harmony and changes everything else. Follow Mozart’s K. 265 variations on the song Ah vous dirai-je, Maman, then vary the theme yourself: figuration, rhythm, meter, mode and accompaniment."
      />
      <Panel title="In the repertoire">
        <div className="stack">
          <ExcerptView excerpt={excerpt('k265theme')} player={player} />
          <ExcerptView excerpt={excerpt('k265var1')} player={player} />
        </div>
      </Panel>
      <Panel title="Variation workshop" eyebrow="Change one thing at a time">
        <VariationWorkshop player={player} />
      </Panel>
      <Panel title="Name the change" eyebrow="Drill">
        <VariationQuiz player={player} />
      </Panel>
    </div>
  );
}
