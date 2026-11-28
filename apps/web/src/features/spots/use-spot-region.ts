import { useCallback, useSyncExternalStore } from "react";
import {
  SPOT_REGION_STORAGE_KEY,
  parseSavedSpotRegion,
  serializeSavedSpotRegion,
} from "./spots-helpers";
import { INDONESIA_DEFAULT_VIEW, type SavedSpotRegion } from "./types";

const REGION_CHANGE_EVENT = "anzabook:spot-region-change";

const DEFAULT_REGION: SavedSpotRegion = {
  city: INDONESIA_DEFAULT_VIEW.city,
  lat: INDONESIA_DEFAULT_VIEW.lat,
  lng: INDONESIA_DEFAULT_VIEW.lng,
  zoom: INDONESIA_DEFAULT_VIEW.zoom,
  source: "preset",
};

function subscribeRegion(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(REGION_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REGION_CHANGE_EVENT, callback);
  };
}

let cachedRaw: string | null = null;
let cachedParsed: SavedSpotRegion = DEFAULT_REGION;

function getClientSnapshot(): SavedSpotRegion {
  const raw = localStorage.getItem(SPOT_REGION_STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedParsed;
  }
  cachedRaw = raw;
  cachedParsed = parseSavedSpotRegion(raw) ?? DEFAULT_REGION;
  return cachedParsed;
}

function getServerSnapshot(): SavedSpotRegion {
  return DEFAULT_REGION;
}

/**
 * Syncs the preferred Indonesia reading spot region across SSR hydration and tabs
 * without calling navigator.geolocation on mount.
 */
export function useSpotRegion(): [
  SavedSpotRegion,
  (next: SavedSpotRegion) => void,
] {
  const region = useSyncExternalStore(
    subscribeRegion,
    getClientSnapshot,
    getServerSnapshot,
  );

  const setRegion = useCallback((next: SavedSpotRegion) => {
    const serialized = serializeSavedSpotRegion(next);
    cachedRaw = serialized;
    cachedParsed = next;
    localStorage.setItem(SPOT_REGION_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(REGION_CHANGE_EVENT));
  }, []);

  return [region, setRegion];
}
