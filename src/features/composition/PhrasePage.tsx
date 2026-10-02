import { PageHeader, Panel } from '../../components/ui';
import { CadenceGallery } from './CadenceGallery';
import { CadenceQuiz } from './CadenceQuiz';
import { ExcerptView } from './ExcerptView';
import { OP2_NO1 } from './excerpts/beethoven';
import { K331_THEME } from './excerpts/mozart';
import { PhraseBuilder } from './PhraseBuilder';
import { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

export default function PhrasePage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Composition"
        title="Phrase & Cadence"
        lede="Classical melodies are built from phrases, and phrases end with cadences, the punctuation of music. See the two great Classical phrase forms, the period and the sentence, in Mozart and Beethoven, learn the cadences by ear, then build eight-bar phrases of your own."
      />
      <Panel title="In the repertoire">
        <div className="stack">
          <ExcerptView excerpt={K331_THEME} player={player} />
          <ExcerptView excerpt={OP2_NO1} player={player} />
        </div>
      </Panel>
      <Panel title="Cadence gallery" eyebrow="Musical punctuation">
        <CadenceGallery player={player} />
      </Panel>
      <Panel title="Phrase builder" eyebrow="Build a period or a sentence">
        <PhraseBuilder player={player} />
      </Panel>
      <Panel title="Name the cadence" eyebrow="Drill">
        <CadenceQuiz player={player} />
      </Panel>
    </div>
  );
}
