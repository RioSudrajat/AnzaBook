const ZW_ALPHABET = ["\u200B", "\u200C", "\u200D", "\u2060"] as const;
const ZW_SENTINEL = "\u2063";
const ZW_STRIP_REGEX = /(?:\u200B|\u200C|\u200D|\u2060|\u2063|\uFEFF)/g;

const ZW_TO_DIGIT = new Map<string, number>(
  ZW_ALPHABET.map((char, idx) => [char, idx]),
);

const FRAME_PATTERN = new RegExp(
  `${ZW_SENTINEL}((?:${ZW_ALPHABET.join("|")})+)${ZW_SENTINEL}`,
  "g",
);

/** Encodes a DRM session code into an invisible zero-width Unicode payload framed by U+2063 sentinels. */
export function encodeZeroWidthFingerprint(watermarkCode: string): string {
  const normalized = watermarkCode.trim().toUpperCase();
  if (!normalized || normalized.length > 64) return "";

  let encoded = ZW_SENTINEL;
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    if (code < 32 || code > 126) continue;
    encoded += ZW_ALPHABET[(code >> 6) & 3];
    encoded += ZW_ALPHABET[(code >> 4) & 3];
    encoded += ZW_ALPHABET[(code >> 2) & 3];
    encoded += ZW_ALPHABET[code & 3];
  }
  encoded += ZW_SENTINEL;
  return encoded;
}

/** Extracts an embedded zero-width DRM watermark session ID from copied or scraped prose. */
export function decodeZeroWidthFingerprint(text: string): string | null {
  if (!text) return null;

  for (const match of text.matchAll(FRAME_PATTERN)) {
    const body = match[1];
    if (!body || body.length < 16 || body.length % 4 !== 0) continue;

    let decoded = "";
    let valid = true;
    for (let i = 0; i < body.length; i += 4) {
      const d3 = ZW_TO_DIGIT.get(body[i]);
      const d2 = ZW_TO_DIGIT.get(body[i + 1]);
      const d1 = ZW_TO_DIGIT.get(body[i + 2]);
      const d0 = ZW_TO_DIGIT.get(body[i + 3]);
      if (
        d3 === undefined ||
        d2 === undefined ||
        d1 === undefined ||
        d0 === undefined
      ) {
        valid = false;
        break;
      }
      const charCode = (d3 << 6) | (d2 << 4) | (d1 << 2) | d0;
      if (charCode < 32 || charCode > 126) {
        valid = false;
        break;
      }
      decoded += String.fromCharCode(charCode);
    }

    if (valid && /^[A-Z0-9 _:-]{4,64}$/.test(decoded)) {
      return decoded;
    }
  }

  return null;
}

/** Removes invisible zero-width fingerprint characters before text highlight matching. */
export function stripZeroWidthCharacters(text: string): string {
  return text.replace(ZW_STRIP_REGEX, "");
}
