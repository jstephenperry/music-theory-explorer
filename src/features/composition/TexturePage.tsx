import { PageHeader, Panel } from '../../components/ui';
import { ExcerptView } from './ExcerptView';
import { excerpt } from '../../repertoire';
import { TextureLab } from './TextureLab';
import { TextureQuiz } from './TextureQuiz';
import { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

export default function TexturePage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Texture & Voices"
        title="Texture & Accompaniment"
        lede="The same chords can become a hymn, a prelude or a sonata, depending on how the notes are laid out in time and register. Compare three textures in Bach and Mozart, then write one progression out in six different ways."
      />
      <Panel title="In the repertoire">
        <div className="stack">
          <ExcerptView excerpt={excerpt('bwv269')} player={player} />
          <ExcerptView excerpt={excerpt('k545')} player={player} />
          <ExcerptView excerpt={excerpt('bwv846')} player={player} />
        </div>
      </Panel>
      <Panel title="Texture lab" eyebrow="One progression, six textures">
        <TextureLab player={player} />
      </Panel>
      <Panel title="Name the texture" eyebrow="Drill">
        <TextureQuiz player={player} />
      </Panel>
    </div>
  );
}
