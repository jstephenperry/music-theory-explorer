/**
 * Pieces of the Scales & Modes room that do not hold page state: the hero's formula row, step bar,
 * forms and equivalents, and the keyboard legend.
 */
import { useState } from 'react';
import { Button, Legend as UiLegend, Chip } from '../../components/ui';
import {
  
  TRADITION_BY_ID,
  
  
  
  
  scaleCents,
  
  stepNames,
  stepPattern,
  type ScaleDef,
  type ScaleForm,
} from '../../theory/scales';
import { noteName, type Note } from '../../theory/notes';
import { formTones, type ScaleTone } from './scaleLogic';
import { shortName, type View } from './shared';
import s from './ScalesPage.module.css';





const EQUIVALENT_LIMIT = 8;

export function Equivalents({ list, root, onLoad }: { list: ScaleDef[]; root: Note; onLoad: (id: string) => void }) {
  const [all, setAll] = useState(false);
  // Prefer one name per tradition first, so the list shows the breadth of names for these notes.
  const firstPerTradition = list.filter((x, i) => list.findIndex((y) => y.tradition === x.tradition) === i);
  const ordered = [...firstPerTradition, ...list.filter((x) => !firstPerTradition.includes(x))];
  const shown = all ? ordered : ordered.slice(0, EQUIVALENT_LIMIT);
  return (
    <div className={s.equivalents}>
      <span className={s.factLabel}>Same notes on {noteName(root)}</span>
      <div className={s.equivalentList}>
        {shown.map((x) => (
          <Chip key={x.id} className={s.equivalent} onClick={() => onLoad(x.id)} title={`${TRADITION_BY_ID[x.tradition].name}: ${x.family}`}>
            {shortName(x.name)}
            <span className={s.equivalentTrad}>{TRADITION_BY_ID[x.tradition].short}</span>
          </Chip>
        ))}
        {list.length > EQUIVALENT_LIMIT && (
          <button className={s.linkButton} onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `${list.length - EQUIVALENT_LIMIT} more`}
          </button>
        )}
      </div>
    </div>
  );
}

export function FormulaRow({ tones, showCents }: { tones: ScaleTone[]; showCents: boolean }) {
  return (
    <div className={s.formula} aria-label="Scale formula">
      {tones.slice(0, -1).map((t) => (
        <div key={t.index} className={`${s.degree} ${t.characteristic ? s.degreeChar : ''} ${t.index === 0 ? s.degreeRoot : ''}`}>
          <span className={s.degreeNum}>{t.degree}</span>
          <span className={s.degreeNote}>{t.name}</span>
          {showCents && <span className={s.degreeCents}>{Math.round(t.rel)}¢</span>}
        </div>
      ))}
    </div>
  );
}

export function StepBar({ scale, tones, micro }: { scale: ScaleDef; tones: ScaleTone[]; micro: boolean }) {
  // Step sizes in cents, so microtonal steps are drawn to scale too.
  const cents = scaleCents(scale);
  const steps = cents.map((c, i) => (i + 1 < cents.length ? cents[i + 1] : 1200) - c);
  const names = stepNames(scale.id);
  const semis = stepPattern(scale.id);
  const label = (i: number) => (micro ? String(Math.round(steps[i])) : names[i]);
  const kind = (i: number) => {
    const st = micro ? steps[i] / 100 : semis[i];
    return st < 1.5 ? s.stepH : st < 2.5 ? s.stepW : s.stepWide;
  };
  return (
    <div>
      <div className={s.stepBar} role="img" aria-label={`Step pattern: ${steps.map((_, i) => label(i)).join(' ')}${micro ? ' cents' : ''}`}>
        {steps.map((st, i) => (
          <div
            key={i}
            className={`${s.stepSeg} ${kind(i)}`}
            style={{ flexGrow: st }}
            title={`${tones[i].name} to ${tones[i + 1].name}: ${micro ? `${Math.round(st)} cents` : `${semis[i]} semitone${semis[i] === 1 ? '' : 's'}`}`}
          >
            {label(i)}
          </div>
        ))}
      </div>
      <div className={s.stepScale} aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i} style={{ left: `${(i / 12) * 100}%` }} />
        ))}
      </div>
      <div className={s.stepCaption}>
        {micro
          ? 'Steps between neighboring notes in cents (100 cents = one equal-tempered half step), drawn to scale against the twelve half steps of the octave.'
          : 'Steps between neighboring notes, drawn to scale: H = half step, W = whole step, W+H = augmented second.'}
      </div>
    </div>
  );
}

export function FormList({
  forms,
  root,
  scale,
  onPlay,
  onStop,
  playing,
}: {
  forms: ScaleForm[];
  root: Note;
  scale: ScaleDef;
  onPlay: (form: ScaleForm, i: number) => void;
  onStop: () => void;
  playing: { form: number; note: number } | null;
}) {
  return (
    <div className={s.forms}>
      {forms.map((f, i) => {
        const ts = formTones(root, scale.id, f);
        const active = playing?.form === i;
        return (
          <div key={f.label} className={s.formRow}>
            <Button
              size="sm"
              variant="ghost"
              icon={active ? 'stop' : 'play'}
              aria-label={`${active ? 'Stop' : 'Play'} ${f.label}`}
              onClick={() => (active ? onStop() : onPlay(f, i))}
            />
            <div className={s.formBody}>
              <span className={s.factLabel}>{f.label}</span>
              <span className={s.formNotes}>
                {ts.map((t, j) => (
                  <span key={j} className={`${s.formNote} ${active && playing?.note === j ? s.formNoteActive : ''}`} title={t.spoken}>
                    {/* A dot below marks the lower octave and a dot above the upper octave, as in sargam notation. */}
                    <span className={`${s.formDegree} ${t.rel < -1 ? s.octLow : t.rel > 1199 ? s.octHigh : ''}`}>{t.degree}</span>
                    <span className={s.formName}>{t.name}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ view, micro }: { view: View; micro: boolean }) {
  const items: Array<[string, string]> =
    view === 'compare'
      ? [
          ['root', 'Root'],
          ['tone', 'In both scales'],
          ['alt', 'Only in this scale'],
          ['extra', 'Only in the comparison'],
        ]
      : view === 'finder'
        ? [
            ['other', 'Selected notes'],
            ['muted', 'Loaded scale'],
          ]
        : view === 'harmony'
          ? [
              ['root', 'Root'],
              ['tone', 'Scale note'],
              ['alt', 'Characteristic note'],
              ['extra', 'Selected chord'],
            ]
          : [
              ['root', 'Root'],
              ['tone', 'Scale note'],
              ['alt', 'Characteristic note'],
            ];
  const legend = items.map(([role, label]) => (role === 'muted' ? { color: 'var(--ink-faint)', label, ring: true } : { color: `var(--hl-${role})`, label, dot: true }));
  if (micro && view !== 'finder') legend.push({ color: 'var(--hl-tone)', label: 'Ringed: the pitch lies between keys', ring: true });
  return <UiLegend items={legend} note={view === 'finder' ? 'Click keys to select notes.' : undefined} />;
}

