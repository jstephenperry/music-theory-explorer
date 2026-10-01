import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Query parameters of the current hash URL (HashRouter keeps the search string inside the hash). */
function liveParams(): URLSearchParams {
  const h = window.location.hash;
  const i = h.indexOf('?');
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
}

/**
 * Read several query parameters and update any number of them in one navigation.
 * Values equal to their default are removed from the URL to keep links short.
 * Updates start from the live URL, so several updates in quick succession (before React
 * re-renders) do not overwrite each other, which can happen with the shared `useUrlState`.
 */
export function useQuery<K extends string>(defaults: Record<K, string>): [Record<K, string>, (patch: Partial<Record<K, string>>) => void] {
  const [params, setParams] = useSearchParams();
  const values = {} as Record<K, string>;
  for (const k of Object.keys(defaults) as K[]) values[k] = params.get(k) ?? defaults[k];
  const frozen = JSON.stringify(defaults);
  const update = useCallback(
    (patch: Partial<Record<K, string>>) => {
      const defs = JSON.parse(frozen) as Record<K, string>;
      const next = liveParams();
      for (const [k, v] of Object.entries(patch) as Array<[K, string | undefined]>) {
        if (v === undefined) continue;
        if (v === defs[k]) next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [frozen, setParams],
  );
  return [values, update];
}
