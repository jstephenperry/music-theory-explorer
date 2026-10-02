import { useMemo } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { PlayButton } from '../../components/ui';
import { TEXTURES, TEXTURE_PROGRESSIONS, TEXTURE_TONICS, buildTexture, type TextureId } from './textures';
import { Quiz, type QuizQuestion } from './Quiz';
import { pick } from './random';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';

interface TextureQ extends QuizQuestion {
  texture: TextureId;
  progression: string;
  tonic: string;
}

function makeQuestion(): TextureQ {
  const t = pick(TEXTURES);
  return {
    texture: t.id,
    progression: pick(TEXTURE_PROGRESSIONS).id,
    tonic: pick(TEXTURE_TONICS),
    choices: TEXTURES.map((x) => x.short),
    answer: TEXTURES.indexOf(t),
    explain: t.description,
  };
}

function Prompt({ q, answered, player }: { q: TextureQ; answered: boolean; player: ReturnType<typeof useScorePlayer> }) {
  const prog = TEXTURE_PROGRESSIONS.find((p) => p.id === q.progression)!;
  const { score } = useMemo(() => buildTexture(q.texture, prog.chords, q.tonic), [q, prog]);
  return (
    <div className="stack">
      <div className={s.row}>
        <PlayButton playing={player.tag === 'texture-quiz'} onPlay={() => player.play(score, { bpm: 84, tag: 'texture-quiz' })} onStop={player.stop} label="Play" />
        <span className={s.hint}>{answered ? 'Here is what you heard.' : 'The notation appears once you answer.'}</span>
      </div>
      {answered && <ScoreView score={score} barsPerLine={4} active={player.tag === 'texture-quiz' ? player.active : undefined} ariaLabel="The texture you heard" />}
    </div>
  );
}

export function TextureQuiz({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  return <Quiz<TextureQ> id="texture" make={makeQuestion} prompt="Listen: which texture is this?" render={(q, answered) => <Prompt q={q} answered={answered} player={player} />} />;
}
