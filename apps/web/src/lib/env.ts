import { z } from "zod";

// Safe for the browser bundle. VITE_API_URL is inlined at build time, so a
// production image must be built with the API's public origin.
const apiUrl = z
  .url("Set VITE_API_URL to the API's origin, e.g. http://localhost:4000.")
  .parse(import.meta.env.VITE_API_URL ?? "http://localhost:4000");

// The API origin the browser calls (Better Auth + application routes).
export const API_URL = new URL(apiUrl).origin;

// Public build-time toggle for DRM testing in local dev and main (Staging).
// Production builds omit this flag so the DRM disable toggle is removed and DRM defaults ON.
export const IS_DRM_TOGGLE_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DRM_TOGGLE === "true";
