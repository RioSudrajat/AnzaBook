import { useCallback, useSyncExternalStore } from "react";

const LOCAL_STORAGE_CHANGE_EVENT = "anzabook:local-storage-flag";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, callback);
  };
}

/**
 * Reads a boolean flag from localStorage safely across SSR and hydration
 * without triggering hydration mismatches or effect-based setState cascades.
 */
export function useLocalStorageFlag(
  key: string,
  truthyValue = "true",
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) === truthyValue,
    () => false,
  );

  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const current = localStorage.getItem(key) === truthyValue;
      const resolved = typeof next === "function" ? next(current) : next;
      const stored =
        truthyValue === "true"
          ? String(resolved)
          : resolved
            ? truthyValue
            : "light";
      localStorage.setItem(key, stored);
      window.dispatchEvent(new Event(LOCAL_STORAGE_CHANGE_EVENT));
    },
    [key, truthyValue],
  );

  return [value, setValue];
}
