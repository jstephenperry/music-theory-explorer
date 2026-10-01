/**
 * URL state for the lab. Same semantics as the shared `useUrlState` (defaults are omitted from the URL,
 * replace navigation), but several keys can be updated in one navigation. Calling two `useUrlState`
 * setters in the same event loses the first update, because react-router's functional
 * `setSearchParams` reads the params of the last render.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export const DEFAULT_PROGRESSION = 'Imaj7 V7/vi vi7 V7/ii ii7 bII7 Imaj7:8';

export const URL_DEFAULTS = {
  key: 'C',
  mode: 'major',
  p: DEFAULT_PROGRESSION,
  bpm: '92',
  style: 'block',
  loop: '1',
};

export type LabParams = typeof URL_DEFAULTS;

export function useLabUrl(): [LabParams, (patch: Partial<LabParams>) => void] {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => {
    const out = { ...URL_DEFAULTS };
    (Object.keys(URL_DEFAULTS) as Array<keyof LabParams>).forEach((k) => {
      const v = params.get(k);
      if (v !== null) out[k] = v;
    });
    return out;
  }, [params]);
  const update = useCallback(
    (patch: Partial<LabParams>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          (Object.keys(patch) as Array<keyof LabParams>).forEach((k) => {
            const v = patch[k];
            if (v === undefined) return;
            if (v === URL_DEFAULTS[k]) next.delete(k);
            else next.set(k, v);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [values, update];
}
