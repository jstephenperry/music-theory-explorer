/**
 * VexFlow is loaded on demand (it is the largest dependency) and shared by every engraver.
 * `useVexFlow` owns the lifecycle an engraver needs: the loaded module, the host element's width
 * (observed, so notation reflows with its container), the theme version (so colors re-render),
 * and an error state.
 */
import { useEffect, useRef, useState } from 'react';
import { useThemeVersion } from './theme';

export type VexModule = typeof import('vexflow/bravura');
let vfPromise: Promise<VexModule> | null = null;

/** Load VexFlow and its music font once. Exposed for features that need custom notation. */
export function loadVexFlow(): Promise<VexModule> {
  if (!vfPromise) {
    vfPromise = import('vexflow/bravura').then(async (mod) => {
      try {
        await Promise.all([document.fonts.load('30px Bravura'), document.fonts.load('14px Academico')]);
      } catch {
        /* render anyway */
      }
      return mod;
    });
  }
  return vfPromise;
}

export interface VexFlowHost {
  /** Attach to the element VexFlow draws into. */
  host: React.RefObject<HTMLDivElement | null>;
  /** The host's current width in pixels (0 until measured). */
  width: number;
  vf: VexModule | null;
  error: string | null;
  setError: (e: string | null) => void;
  /** Changes when the theme changes, so an engraving effect can depend on it. */
  theme: number;
}

export function useVexFlow(): VexFlowHost {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [vf, setVf] = useState<VexModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeVersion();

  useEffect(() => {
    let alive = true;
    loadVexFlow()
      .then((m) => alive && setVf(m))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { host, width, vf, error, setError, theme };
}
