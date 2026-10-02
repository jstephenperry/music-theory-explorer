import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import s from './Composition.module.css';

export interface QuizQuestion {
  /** The answer choices; `answer` is the index of the correct one. */
  choices: string[];
  answer: number;
  /** Shown once the question is answered. */
  explain: ReactNode;
}

/**
 * A multiple-choice drill. `make` creates a fresh question; `render` draws its prompt (scores,
 * play buttons). The running score is remembered per drill.
 */
export function Quiz<Q extends QuizQuestion>({ id, make, render, prompt }: { id: string; make: () => Q; render: (q: Q) => ReactNode; prompt: string }) {
  const [q, setQ] = useState<Q>(make);
  const [picked, setPicked] = useState<number | null>(null);
  const [stats, setStats] = usePersistentState<{ right: number; total: number }>(`quiz.${id}`, { right: 0, total: 0 });

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setStats((st) => ({ right: st.right + (i === q.answer ? 1 : 0), total: st.total + 1 }));
  };
  const next = () => {
    setQ(make());
    setPicked(null);
  };

  return (
    <div className={s.quiz}>
      <div className={s.quizHead}>
        <span className={s.quizPrompt}>{prompt}</span>
        <span className={s.quizScore} aria-live="polite">
          {stats.total ? `${stats.right} of ${stats.total} correct` : 'No answers yet'}
          {stats.total > 0 && (
            <button className={s.linkish} onClick={() => setStats({ right: 0, total: 0 })}>
              reset
            </button>
          )}
        </span>
      </div>
      {render(q)}
      <div className={s.choices} role="group" aria-label="Answers">
        {q.choices.map((c, i) => {
          const state = picked === null ? '' : i === q.answer ? s.choiceRight : i === picked ? s.choiceWrong : s.choiceDim;
          return (
            <button key={c} className={`${s.choice} ${state}`} onClick={() => choose(i)} aria-pressed={picked === i} disabled={picked !== null && i !== picked && i !== q.answer}>
              {c}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={s.feedback} role="status">
          <strong>{picked === q.answer ? 'Correct.' : `Not quite: it is ${q.choices[q.answer].toLowerCase()}.`}</strong> {q.explain}
          <div>
            <Button icon="arrow-right" onClick={next}>
              Next question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
