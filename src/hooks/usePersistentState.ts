import { useEffect, useState } from 'react';

/** useState that remembers its value in localStorage (per browser). Falls back silently when storage is unavailable. */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const storageKey = `mte:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, value]);
  return [value, setValue];
}
