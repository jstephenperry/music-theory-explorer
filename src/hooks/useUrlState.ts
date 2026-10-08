import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** Current query parameters read from the live hash URL (HashRouter keeps them after '#/path?'). */
function liveParams(): URLSearchParams {
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  return new URLSearchParams(q >= 0 ? hash.slice(q + 1) : '');
}

/**
 * State stored in the URL query string so a page's settings can be bookmarked and shared.
 * Values are strings; parse them at the call site. Several setters may be called in the same event.
 */
export function useUrlState(key: string, initial: string): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? initial;
  const set = useCallback(
    (v: string) => {
      const next = liveParams();
      if (v === initial) next.delete(key);
      else next.set(key, v);
      setParams(next, { replace: true });
    },
    [key, initial, setParams],
  );
  return [value, set];
}

/**
 * Several URL parameters at once. `set(patch)` applies all keys in one navigation; a value equal to
 * its default (or undefined) removes the key from the URL. Updates start from the live URL, so
 * several updates in the same event do not overwrite each other.
 */
export function useUrlParams<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, params.get(k) ?? d])) as T;
  const set = useCallback(
    (patch: Partial<T>) => {
      const next = liveParams();
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === defaults[k]) next.delete(k);
        else next.set(k, v as string);
      }
      setParams(next, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams, JSON.stringify(defaults)],
  );
  return [values, set];
}
