import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Read several query parameters and update any number of them in one navigation.
 * (Calling the shared `useUrlState` setters twice in one event keeps only the last change,
 * because each functional update starts from the same location.)
 */
export function useUrlParams<K extends string>(defaults: Record<K, string>): [Record<K, string>, (patch: Partial<Record<K, string>>) => void] {
  const [params, setParams] = useSearchParams();
  const values = {} as Record<K, string>;
  for (const k of Object.keys(defaults) as K[]) values[k] = params.get(k) ?? defaults[k];
  const key = JSON.stringify(defaults);
  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      const defs = JSON.parse(key) as Record<K, string>;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch) as Array<[K, string | undefined]>) {
            if (v === undefined) continue;
            if (v === defs[k]) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [key, setParams],
  );
  return [values, set];
}
