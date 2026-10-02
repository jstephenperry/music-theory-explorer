import { PageHeader, Panel } from '../../components/ui';
import { CounterpointExercise, CounterpointRules } from './CounterpointExercise';
import { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

export default function CounterpointPage() {
  const player = useScorePlayer();
  return (
    <div className={s.page}>
      <PageHeader
        eyebrow="Composition"
        title="Species Counterpoint"
        lede="For three centuries composers learned to write independent lines from Johann Joseph Fux’s Gradus ad Parnassum (1725): Haydn worked through it, Mozart taught from it and Beethoven studied it. Write a line against a given melody, the cantus firmus, and the rules are checked as you go."
      />
      <Panel title="Write a counterpoint" eyebrow="Fux’s exercise">
        <div className="stack">
          <div className={s.commentary}>
            <p>
              Select a note, then click a piano key (or use the arrow keys) to write it. In first species each note of your line sounds against one note of the cantus firmus. In second species you write two half notes against each whole note; the first of each pair must be consonant, the second may be a dissonant passing tone.
            </p>
          </div>
          <CounterpointExercise player={player} />
        </div>
      </Panel>
      <Panel title="The rules" eyebrow="What the checker listens for">
        <CounterpointRules />
      </Panel>
    </div>
  );
}
