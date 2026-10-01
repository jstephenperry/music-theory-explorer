import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * State stored in the URL query string so explorations can be bookmarked and shared.
 * Values are strings; parse them at the call site.
 */
export function useUrlState(key: string, initial: string): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? initial;
  const set = useCallback(
    (v: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === initial) next.delete(key);
          else next.set(key, v);
          return next;
        },
        { replace: true },
      );
    },
    [key, initial, setParams],
  );
  return [value, set];
}
