import { useMemo, useState } from 'react';
import { ScoreView } from '../../components/ScoreView';
import { Callout, PlayButton, Segmented, Slider } from '../../components/ui';
import { usePersistentState } from '../../hooks/usePersistentState';
import { BASIC_IDEAS, CADENCE_KINDS, PHRASE_TONICS, buildPhrase, type AccompStyleId, type CadenceKind, type PhraseChoice, type PhraseForm, type Repetition } from '../../theory/composition/phrase';
import type { useScorePlayer } from './useScorePlayer';
import s from './Composition.module.css';
import { flat } from '../../lib/format';

const DEFAULT: PhraseChoice = { form: 'period', idea: 'lilting', repetition: 'response', first: 'hc', last: 'pac', tonic: 'C', accomp: 'alberti' };


/** Assemble an eight-bar period or sentence from units, hear it, and see whether it works. */
export function PhraseBuilder({ player }: { player: ReturnType<typeof useScorePlayer> }) {
  const [choice, setChoice] = usePersistentState<PhraseChoice>('phrase.builder', DEFAULT);
  const [bpm, setBpm] = useState(96);
  // Stored choices from an older version may lack newer fields.
  const c = useMemo(() => ({ ...DEFAULT, ...choice }), [choice]);
  const built = useMemo(() => buildPhrase(c), [c]);
  const set = <K extends keyof PhraseChoice>(k: K, v: PhraseChoice[K]) => {
    player.stop();
    setChoice({ ...c, [k]: v });
  };
  const idea = BASIC_IDEAS.find((b) => b.id === c.idea) ?? BASIC_IDEAS[0];
  const cadenceOptions = CADENCE_KINDS.map((k) => ({ value: k.id, label: k.short, title: k.name }));

  return (
    <div className="stack">
      <div className={s.controls}>
        <div className={s.control}>
          <span className={s.label}>Form</span>
          <Segmented<PhraseForm>
            ariaLabel="Form"
            value={c.form}
            onChange={(v) => set('form', v)}
            options={[
              { value: 'period', label: 'Period' },
              { value: 'sentence', label: 'Sentence' },
            ]}
          />
          <span className={s.hint}>{c.form === 'period' ? 'Two four-bar phrases, both starting with the basic idea.' : 'Basic idea, repetition, then a continuation that breaks it up.'}</span>
        </div>
        <div className={s.control}>
          <span className={s.label}>Basic idea</span>
          <Segmented<string> ariaLabel="Basic idea" size="sm" value={c.idea} onChange={(v) => set('idea', v)} options={BASIC_IDEAS.map((b) => ({ value: b.id, label: b.name }))} />
          <span className={s.hint}>After {idea.after}.</span>
        </div>
        {c.form === 'period' ? (
          <div className={s.control}>
            <span className={s.label}>Bar 4: antecedent ends with</span>
            <Segmented<CadenceKind> ariaLabel="Antecedent cadence" size="sm" value={c.first} onChange={(v) => set('first', v)} options={cadenceOptions} />
          </div>
        ) : (
          <div className={s.control}>
            <span className={s.label}>Bars 3 and 4: repetition</span>
            <Segmented<Repetition>
              ariaLabel="Repetition"
              size="sm"
              value={c.repetition}
              onChange={(v) => set('repetition', v)}
              options={[
                { value: 'exact', label: 'Exact' },
                { value: 'response', label: 'On the dominant' },
              ]}
            />
          </div>
        )}
        <div className={s.control}>
          <span className={s.label}>Bar 8: {c.form === 'period' ? 'consequent ends with' : 'phrase ends with'}</span>
          <Segmented<CadenceKind> ariaLabel="Final cadence" size="sm" value={c.last} onChange={(v) => set('last', v)} options={cadenceOptions} />
        </div>
        <div className={s.control}>
          <span className={s.label}>Key (major)</span>
          <Segmented<string> ariaLabel="Key" size="sm" value={c.tonic} onChange={(v) => set('tonic', v)} options={PHRASE_TONICS.map((t) => ({ value: t, label: flat(t) }))} />
        </div>
        <div className={s.control}>
          <span className={s.label}>Accompaniment</span>
          <Segmented<AccompStyleId>
            ariaLabel="Accompaniment"
            size="sm"
            value={c.accomp}
            onChange={(v) => set('accomp', v)}
            options={[
              { value: 'alberti', label: 'Alberti bass' },
              { value: 'block', label: 'Block chords' },
            ]}
          />
        </div>
      </div>

      <div className={s.row}>
        <PlayButton playing={player.tag === 'phrase'} onPlay={() => player.play(built.score, { bpm, tag: 'phrase' })} onStop={player.stop} label="Play the phrase" />
        <Slider
          label="Tempo"
          min={60}
          max={140}
          value={bpm}
          onChange={(v) => {
            setBpm(v);
            if (player.tag === 'phrase') player.setBpm(v);
          }}
          format={(v) => `♩ = ${v}`}
        />
      </div>
      <ScoreView score={built.score} colors={built.colors} brackets={built.brackets} barsPerLine={4} active={player.tag === 'phrase' ? player.active : undefined} ariaLabel={`An eight-bar ${c.form} in ${flat(c.tonic)} major`} />

      <div className={s.analysis} aria-label="Cadences found">
        {built.cadences.map((x) => (
          <span key={x.bar} className={s.cadenceChip}>
            <span className={s.label}>Bar {x.bar}</span> {x.cadence.label}
          </span>
        ))}
      </div>
      <Callout title={built.verdict.title} tone={built.verdict.ok ? 'verdigris' : 'accent'}>
        {built.verdict.text}
      </Callout>
    </div>
  );
}
