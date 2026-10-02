import { useMemo } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton } from '../../components/ui';
import { MELODY_TECHNIQUES, THEME_CHOICE, buildVariation, type VariationChoice } from './variations';
import { Quiz, type QuizQuestion } from './Quiz';
import { pick } from './random';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

/** One change from the theme per question. */
const CHANGES: Array<{ name: string; choice: Partial<VariationChoice>; explain: string }> = [
  ...MELODY_TECHNIQUES.filter((m) => m.id !== 'plain').map((m) => ({ name: m.name, choice: { melody: m.id }, explain: m.description })),
  { name: 'Minor mode', choice: { mode: 'minor' as const }, explain: 'The melody and rhythm are unchanged, but E and A are lowered: the theme in C minor.' },
  { name: 'Alberti accompaniment', choice: { bass: 'alberti' as const }, explain: 'The melody is unchanged; the left hand breaks the chords into an Alberti pattern.' },
];

interface VarQ extends QuizQuestion {
  change: number;
}

function makeQuestion(): VarQ {
  const c = pick(CHANGES);
  return { change: CHANGES.indexOf(c), choices: CHANGES.map((x) => x.name), answer: CHANGES.indexOf(c), explain: c.explain };
}

function Prompt({ q, answered, player }: { q: VarQ; answered: boolean; player: ReturnType<typeof useScorePlayer> }) {
  const { score } = useMemo(() => buildVariation({ ...THEME_CHOICE, ...CHANGES[q.change].choice }), [q]);
  const theme = useMemo(() => buildVariation(THEME_CHOICE).score, []);
  return (
    <div className="stack">
      <div className={s.row}>
        <PlayButton playing={player.tag === 'var-quiz'} onPlay={() => player.play(score, { bpm: 84, tag: 'var-quiz' })} onStop={player.stop} label="Play the variation" />
        <PlayButton playing={player.tag === 'var-quiz-theme'} onPlay={() => player.play(theme, { bpm: 84, tag: 'var-quiz-theme' })} onStop={player.stop} label="Play the theme" variant="secondary" />
      </div>
      {answered ? <ScoreView score={score} barsPerLine={4} active={player.tag === 'var-quiz' ? player.active : undefined} ariaLabel="The variation you heard" /> : <p className={s.hint}>The notation appears once you answer.</p>}
    </div>
  );
}

export function VariationQuiz({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  return <Quiz<VarQ> id="variation" make={makeQuestion} prompt="One thing has changed from the theme. Which?" render={(q, answered) => <Prompt q={q} answered={answered} player={player} />} />;
}
