import { useMemo } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton } from '../../components/ui';
import { keyName, makeKey } from '../../theory/keys';
import { CADENCE_TYPES, cadenceScore, transposeScore, type CadenceId } from '../../theory/composition/cadences';
import { Quiz, type QuizQuestion } from './Quiz';
import { pick } from '../../theory/composition/random';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

const MAJOR_TONICS = ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'];
const MINOR_TONICS = ['A', 'B', 'C', 'D', 'E', 'F#', 'G'];

interface CadenceQ extends QuizQuestion {
  id: CadenceId;
  example: number;
  tonic: string;
}

function makeQuestion(): CadenceQ {
  const type = pick(CADENCE_TYPES);
  const tonic = pick(type.mode === 'major' ? MAJOR_TONICS : MINOR_TONICS);
  const example = Math.floor(Math.random() * type.examples.length);
  return {
    id: type.id,
    example,
    tonic,
    choices: CADENCE_TYPES.map((c) => c.name),
    answer: CADENCE_TYPES.indexOf(type),
    explain: (
      <>
        {type.listenFor} This one was in {keyName(makeKey(tonic, type.mode))}.
      </>
    ),
  };
}

function Prompt({ q, player }: { q: CadenceQ; player: ReturnType<typeof useScorePlayer> }) {
  const type = CADENCE_TYPES.find((c) => c.id === q.id)!;
  const score = useMemo(() => transposeScore(cadenceScore(type, q.example), makeKey(q.tonic, type.mode), { keepLabels: false }), [type, q]);
  return (
    <div className="stack">
      <div className={s.row}>
        <PlayButton playing={player.tag === 'cadence-quiz'} onPlay={() => player.play(score, { bpm: 66, tag: 'cadence-quiz' })} onStop={player.stop} label="Play the cadence" />
        <span className={s.hint}>Listen first; the notation is there to check what you hear.</span>
      </div>
      <ScoreView score={score} active={player.tag === 'cadence-quiz' ? player.active : undefined} ariaLabel="A cadence in four parts, chord symbols hidden" />
    </div>
  );
}

export function CadenceQuiz({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  return <Quiz<CadenceQ> id="cadence" make={makeQuestion} prompt="Which cadence is this?" render={(q) => <Prompt q={q} player={player} />} />;
}
