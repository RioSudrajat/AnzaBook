/**
 * Canonical "Open-Page Arch" brand mark geometry and palette constants.
 * Kept free of React/Router imports so both client components and server OG
 * renderers share identical vector coordinates.
 */
export const ANZA_ARCH_VIEWBOX = "0 0 48 48";

export const ANZA_BRAND_COLORS = {
  ink: "#13110F",
  paper: "#F6F2E9",
  paperRule: "#DDD6C7",
  accent: "#F06A24",
  nightInk: "#F6F2E9",
  nightAccent: "#F27835",
} as const;

export const ANZA_ARCH_LOGO_PATHS = {
  /** Left concave Arch sweep rising cleanly into the central book spine. */
  leftSweep:
    "M24 3C19.2 15.8 11.8 31.2 3.5 44C9.4 40 13.8 37.9 18.6 37C18.8 29.2 20.6 24 24 24V3Z",
  /** Folded open right page in Furrow Tangerine meeting the sharp apex. */
  innerFold:
    "M24 3V24C27.4 24 29.2 29.2 29.4 37C31.1 34 33 32.1 35 30.9C31.2 21.7 27.5 12.2 24 3Z",
  /** Outer right cover rim with the Arch-inspired notch and sweeping wing. */
  rightWing:
    "M24 3C28.9 14.6 34.8 24.4 40.8 33.1L35 30.9C38.5 34.2 41.8 38.7 44.5 44C38.6 40 34.2 37.9 29.4 37C31.1 34 33 32.1 35 30.9C31.2 21.7 27.5 12.2 24 3Z",
} as const;
