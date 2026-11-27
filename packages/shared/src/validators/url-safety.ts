import { z } from "zod";

const DANGEROUS_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;
const SAFE_RASTER_DATA_URI_REGEX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/i;
const ROOT_RELATIVE_PATH_REGEX = /^\/(?!\/)[^\s]*$/;
const SOCIAL_HANDLE_REGEX = /^[@+]?[a-zA-Z0-9._/-]{1,120}$/;
const BARE_DOMAIN_REGEX = /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?$/;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function isSafeHttpUrl(raw: string, maxLength = 2048): boolean {
  const val = raw.trim();
  if (!val || val.length > maxLength || hasControlChar(val)) {
    return false;
  }
  try {
    const parsed = new URL(val);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeRasterImageDataUrl(
  raw: string,
  maxLength = 90_000,
): boolean {
  const val = raw.trim();
  return (
    val.length <= maxLength &&
    !hasControlChar(val) &&
    SAFE_RASTER_DATA_URI_REGEX.test(val)
  );
}

export function isSafeImageOrAssetUrl(
  raw: string,
  options?: {
    allowEmpty?: boolean;
    allowRootRelative?: boolean;
    allowRasterDataUri?: boolean;
    maxUrlLength?: number;
    maxDataUriLength?: number;
  },
): boolean {
  const val = raw.trim();
  if (val === "") {
    return Boolean(options?.allowEmpty);
  }
  if (hasControlChar(val)) {
    return false;
  }
  const maxUrlLength = options?.maxUrlLength ?? 2048;
  if (
    options?.allowRootRelative &&
    ROOT_RELATIVE_PATH_REGEX.test(val) &&
    val.length <= maxUrlLength
  ) {
    return true;
  }
  if (
    options?.allowRasterDataUri &&
    isSafeRasterImageDataUrl(val, options.maxDataUriLength ?? 90_000)
  ) {
    return true;
  }
  return isSafeHttpUrl(val, maxUrlLength);
}

export function isSafeSocialLinkValue(
  raw: string,
  options?: {
    allowHandle?: boolean;
    allowBareDomain?: boolean;
    maxLength?: number;
  },
): boolean {
  const val = raw.trim();
  if (val === "") {
    return true;
  }
  const maxLength = options?.maxLength ?? 500;
  if (val.length > maxLength || hasControlChar(val) || /\s/.test(val)) {
    return false;
  }
  if (/^https?:\/\//i.test(val)) {
    return isSafeHttpUrl(val, maxLength);
  }
  if (DANGEROUS_SCHEME_REGEX.test(val)) {
    return false;
  }
  if (options?.allowHandle && SOCIAL_HANDLE_REGEX.test(val)) {
    return true;
  }
  if (options?.allowBareDomain && BARE_DOMAIN_REGEX.test(val)) {
    return true;
  }
  return false;
}

export const safeVerificationDocumentsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1, "Judul berkas wajib diisi").max(200),
      url: z
        .string()
        .trim()
        .min(1, "URL berkas wajib diisi")
        .refine(
          (val) =>
            isSafeImageOrAssetUrl(val, {
              allowRootRelative: true,
              allowRasterDataUri: false,
            }),
          {
            message:
              "URL berkas harus berupa tautan HTTP(S) atau path internal yang valid",
          },
        ),
      fileType: z.string().max(60).optional(),
    }),
  )
  .max(10, "Maksimal 10 berkas verifikasi");
