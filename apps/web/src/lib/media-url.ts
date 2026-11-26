const ROOT_RELATIVE_PATH_REGEX = /^\/(?!\/)[^\s]*$/;

/**
 * Checks whether an asset URL points to an actual uploaded media file, external
 * HTTP(S) image, or inline image payload (excluding legacy `/covers/` stubs
 * and `"template"` sentinel values).
 */
export function isUsableAssetUrl(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "template") return false;
  if (trimmed.startsWith("/covers/")) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return true;
  }
  if (trimmed.startsWith("data:image/")) {
    return true;
  }
  return ROOT_RELATIVE_PATH_REGEX.test(trimmed);
}
