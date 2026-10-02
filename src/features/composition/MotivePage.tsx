import { PageHeader, Panel } from '../../components/ui';
import { ExcerptView } from './ExcerptView';
import { INVENTION_1 } from './excerpts/bach';
import { FIFTH_SYMPHONY } from './excerpts/beethoven';
import { useScorePlayer } from './useScorePlayer';
import { MotiveWorkshop } from './MotiveWorkshop';
import { MotiveQuiz } from './MotiveQuiz';
import s from './Composition.module.css';

export default function MotivePage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Composition"
        title="Motive & Development"
        lede="A motive is the smallest idea that keeps its identity when it changes. See how Bach and Beethoven repeat, transpose, invert and sequence a few notes into a whole piece, then develop a motive of your own."
      />
      <Panel title="In the repertoire">
        <div className="stack">
          <ExcerptView excerpt={INVENTION_1} player={player} />
          <ExcerptView excerpt={FIFTH_SYMPHONY} player={player} />
        </div>
      </Panel>
      <Panel title="Motive workshop" eyebrow="Develop a motive">
        <MotiveWorkshop player={player} />
      </Panel>
      <Panel title="Name the technique" eyebrow="Drill">
        <MotiveQuiz player={player} />
      </Panel>
    </div>
  );
}
