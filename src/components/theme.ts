import { useEffect, useState } from 'react';

/** Resolve a CSS custom property on the document root, e.g. cssVar('--accent'). */
export function cssVar(name: string): string {
  if (typeof document === 'undefined') return '#000';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
}

export const ROLE_COLOR_VARS = {
  root: '--hl-root',
  tone: '--hl-tone',
  alt: '--hl-alt',
  extra: '--hl-extra',
  other: '--hl-other',
  muted: '--ink-faint',
  ink: '--ink',
  accent: '--accent',
  brass: '--brass',
  verdigris: '--verdigris',
  royal: '--royal',
  plum: '--plum',
} as const;

export type ColorRole = keyof typeof ROLE_COLOR_VARS;

/** Resolve a role name ('root', 'tone', 'accent' ...) or pass through a literal CSS color. */
export function resolveColor(c: string | undefined): string | undefined {
  if (!c) return undefined;
  if (c in ROLE_COLOR_VARS) {
    const v = ROLE_COLOR_VARS[c as ColorRole];
    const resolved = cssVar(v);
    // --hl-* are themselves var() references; resolve one more level.
    const m = /^var\((--[\w-]+)\)$/.exec(resolved);
    return m ? cssVar(m[1]) : resolved;
  }
  return c;
}

/**
 * Returns a number that changes whenever the color theme changes
 * (data-theme attribute or system preference), so canvas/SVG renderers can redraw.
 */
export function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((x) => x + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', bump);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', bump);
    };
  }, []);
  return v;
}
