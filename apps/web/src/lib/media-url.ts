const ROOT_RELATIVE_PATH_REGEX = /^\/(?!\/)[^\s]*$/;
const SAFE_RASTER_DATA_URI_PREFIX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,/i;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an asset URL points to an actual uploaded media file, external
 * HTTP(S) image, or safe raster inline image payload (excluding legacy `/covers/` stubs,
 * `"template"` sentinel values, and active `data:image/svg+xml` payloads).
 */
export function isUsableAssetUrl(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "template" || hasControlChar(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("/covers/")) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return true;
  }
  if (SAFE_RASTER_DATA_URI_PREFIX.test(trimmed)) {
    return true;
  }
  return ROOT_RELATIVE_PATH_REGEX.test(trimmed);
}
