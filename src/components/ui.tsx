/**
 * Shared UI primitives in the concert-hall design language.
 * Feature pages should compose these rather than restyling basic controls.
 */
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { noteName, pc, type Note } from '../theory/notes';
import { note as parseNote } from '../theory/notes';
import s from './ui.module.css';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

// ---------- Button ----------
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: IconName;
  iconRight?: IconName;
}

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, className, children, type = 'button', ...rest }: ButtonProps) {
  const iconOnly = !children && !!icon;
  return (
    <button
      type={type}
      className={cx(s.button, variant === 'primary' && s.primary, variant === 'ghost' && s.ghost, size === 'sm' && s.sm, iconOnly && s.iconOnly, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

// ---------- Play / stop ----------
export function PlayButton({
  playing,
  onPlay,
  onStop,
  label = 'Play',
  stopLabel = 'Stop',
  size = 'md',
  variant = 'primary',
  disabled,
}: {
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  label?: string;
  stopLabel?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <Button variant={variant} size={size} icon={playing ? 'stop' : 'play'} onClick={playing ? onStop : onPlay} disabled={disabled} aria-pressed={playing}>
      {playing ? stopLabel : label}
    </Button>
  );
}

// ---------- Segmented control ----------
export interface SegOption<T extends string | number> {
  value: T;
  label: ReactNode;
  title?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  options: Array<SegOption<T>>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cx(s.segmented, size === 'sm' && s.segmentedSm)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={cx(s.segment, o.value === value && s.segmentActive)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Field wrapper ----------
export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className={s.fieldHint}>{hint}</span>}
    </div>
  );
}

// ---------- Select ----------
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export function Select({
  label,
  value,
  onChange,
  options,
  groups,
  hint,
  ariaLabel,
  style,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  hint?: ReactNode;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const id = useId();
  const select = (
    <select id={id} className={s.select} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label ? undefined : ariaLabel} style={style}>
      {options?.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
      {groups?.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {select}
    </Field>
  );
}

// ---------- Text input ----------
export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  onEnter,
  style,
  ariaLabel,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  onEnter?: () => void;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const id = useId();
  const input = (
    <input
      id={id}
      className={s.input}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEnter?.();
      }}
      style={style}
      aria-label={label ? undefined : ariaLabel}
      spellCheck={false}
      autoComplete="off"
    />
  );
  if (!label) return input;
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {input}
    </Field>
  );
}

// ---------- Slider ----------
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  width,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => ReactNode;
  width?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className={s.slider}>
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={width ? { width } : undefined} />
        <span className={s.sliderValue}>{format ? format(value) : value}</span>
      </div>
    </Field>
  );
}

// ---------- Toggle ----------
export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={s.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// ---------- Panel ----------
export function Panel({
  title,
  eyebrow,
  actions,
  children,
  sunk,
  className,
  style,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  sunk?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={cx(s.panel, sunk && s.panelSunk, className)} style={style}>
      {(title || actions) && (
        <header className={s.panelHeader}>
          <div>
            {eyebrow && <div className={cx('eyebrow', s.panelEyebrow)}>{eyebrow}</div>}
            {title && <h2 className={s.panelTitle}>{title}</h2>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

// ---------- Page header ----------
export function PageHeader({ eyebrow, title, lede, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className={s.pageHeader}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {lede && <p className={s.lede}>{lede}</p>}
      {children}
      <div className={s.ornament} aria-hidden="true">
        <svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M1 7c4-5 8-5 13 0s9 5 13 0" />
          <circle cx="14" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </div>
    </header>
  );
}

// ---------- Tag ----------
export type Tone = 'default' | 'accent' | 'brass' | 'verdigris' | 'royal' | 'plum';
export function Tag({ children, tone = 'default', title }: { children: ReactNode; tone?: Tone; title?: string }) {
  return (
    <span className={cx(s.tag, tone !== 'default' && s[`tag-${tone}`])} title={title}>
      {children}
    </span>
  );
}

// ---------- Callout ----------
export function Callout({ title, children, tone = 'brass' }: { title?: ReactNode; children: ReactNode; tone?: 'brass' | 'accent' | 'verdigris' }) {
  return (
    <aside className={cx(s.callout, tone !== 'brass' && s[`callout-${tone}`])}>
      {title && <div className={s.calloutTitle}>{title}</div>}
      {children}
    </aside>
  );
}

// ---------- Tabs ----------
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel }: { tabs: Array<{ id: T; label: ReactNode }>; value: T; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div className={s.tabs} role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} className={cx(s.tab, t.id === value && s.tabActive)} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Root picker ----------
const ALL_SPELLINGS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const COMMON_SPELLINGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

/** Choose a root note. `spellings="all"` offers enharmonic spellings (C♯ and D♭ ...). */
export function RootPicker({
  value,
  onChange,
  spellings = 'all',
  label = 'Root',
}: {
  value: Note;
  onChange: (n: Note) => void;
  spellings?: 'all' | 'common';
  label?: ReactNode;
}) {
  const list = (spellings === 'all' ? ALL_SPELLINGS : COMMON_SPELLINGS).map(parseNote);
  return (
    <Field label={label}>
      <div className={s.rootPicker} role="radiogroup" aria-label={typeof label === 'string' ? label : 'Root'}>
        {list.map((n) => {
          const active = n.letter === value.letter && n.acc === value.acc;
          return (
            <button
              key={noteName(n, false)}
              type="button"
              role="radio"
              aria-checked={active}
              className={cx(s.rootButton, BLACK_PCS.has(pc(n)) && s.rootButtonBlack, active && s.rootButtonActive)}
              onClick={() => onChange(n)}
            >
              {noteName(n)}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// ---------- Stat ----------
export function Stat({ label, value, title }: { label: ReactNode; value: ReactNode; title?: string }) {
  return (
    <div className={s.stat} title={title}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}
