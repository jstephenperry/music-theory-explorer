import { useMemo } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton } from '../../components/ui';
import { DEV_OPS, applyOp, type DevOp } from '../../theory/composition/motive';
import { MOTIVE_PRESETS } from './motivePresets';
import { Quiz, type QuizQuestion } from './Quiz';
import { choicesWith, pick } from './random';
import { motiveNotes, segmentsToScore } from './scoreUtils';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

const QUIZ_OPS: DevOp[] = ['seq-up', 'seq-down', 'transpose-5', 'invert', 'retrograde', 'augment', 'diminish', 'head'];

interface MotiveQ extends QuizQuestion {
  presetId: string;
  op: DevOp;
}

function makeQuestion(): MotiveQ {
  const preset = pick(MOTIVE_PRESETS);
  const op = pick(QUIZ_OPS);
  const names = QUIZ_OPS.map((o) => DEV_OPS.find((d) => d.id === o)!.name);
  const answerName = DEV_OPS.find((d) => d.id === op)!.name;
  const choices = choicesWith(names, answerName, 4);
  return {
    presetId: preset.id,
    op,
    choices,
    answer: choices.indexOf(answerName),
    explain: DEV_OPS.find((d) => d.id === op)!.description,
  };
}

function Prompt({ q, player }: { q: MotiveQ; player: ReturnType<typeof useScorePlayer> }) {
  const preset = MOTIVE_PRESETS.find((p) => p.id === q.presetId)!;
  const { score, brackets, colors } = useMemo(() => {
    const transformed = applyOp(q.op, preset.motive, preset.motive, preset.key);
    return segmentsToScore(
      [
        { label: 'Motive', notes: motiveNotes(preset.motive), color: 'root' },
        { label: '?', notes: [{ pitches: [], dur: 1 }, ...motiveNotes(transformed)], color: 'extra' },
      ],
      preset.key,
      preset.time,
    );
  }, [q, preset]);
  return (
    <div className="stack">
      <div className={s.row}>
        <PlayButton playing={player.tag === 'quiz'} onPlay={() => player.play(score, { bpm: 92, tag: 'quiz' })} onStop={player.stop} label="Play both" />
      </div>
      <ScoreView score={score} colors={colors} brackets={brackets} active={player.tag === 'quiz' ? player.active : undefined} ariaLabel="A motive followed by a transformation of it" />
      <p className={s.hint}>
        {preset.name}: {preset.source}.
      </p>
    </div>
  );
}

export function MotiveQuiz({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  return <Quiz<MotiveQ> id="motive" make={makeQuestion} prompt="Which technique turns the motive into the passage marked with a question mark?" render={(q) => <Prompt q={q} player={player} />} />;
}
