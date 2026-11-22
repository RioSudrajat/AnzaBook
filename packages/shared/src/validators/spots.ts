import { z } from "zod";

const GOOGLE_MAPS_HOSTS = new Set([
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

/**
 * Validates external Google Maps links supplied by community contributors.
 * Strictly prevents SSRF, open redirects, and protocol hijacking (e.g. javascript:, data:).
 * Zero server-side outbound HTTP requests must ever be performed against this URL.
 */
export const googleMapsUrlSchema = z
  .string()
  .trim()
  .url("Tautan harus berupa URL yang valid.")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        // Strictly require HTTPS scheme
        if (parsed.protocol !== "https:") {
          return false;
        }

        const hostname = parsed.hostname.toLowerCase();

        // Must match approved Google Maps hosts
        if (
          !GOOGLE_MAPS_HOSTS.has(hostname) &&
          !hostname.endsWith(".google.com")
        ) {
          return false;
        }

        // If generic google.com or www.google.com, ensure path is /maps
        if (
          (hostname === "google.com" || hostname === "www.google.com") &&
          !parsed.pathname.startsWith("/maps")
        ) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Tautan harus berupa URL Google Maps resmi (misal: https://maps.google.com/... atau https://maps.app.goo.gl/...).",
    },
  );
