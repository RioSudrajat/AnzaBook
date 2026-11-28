export type NativeShareResult = "shared" | "cancelled" | "unsupported";

type ShareableNavigator = {
  share?: (data: { files?: File[] }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
  clipboard?: {
    write?: (items: unknown[]) => Promise<void>;
    writeText?: (text: string) => Promise<void>;
  };
};

type ClipboardItemConstructor = new (data: Record<string, Blob>) => unknown;

function getShareRuntime(): {
  navigator?: ShareableNavigator;
  ClipboardItem?: ClipboardItemConstructor;
} {
  return globalThis as unknown as {
    navigator?: ShareableNavigator;
    ClipboardItem?: ClipboardItemConstructor;
  };
}

export async function sharePngFileNative(
  file: File,
): Promise<NativeShareResult> {
  const { navigator: nav } = getShareRuntime();
  if (!nav || typeof nav.share !== "function") {
    return "unsupported";
  }

  if (typeof nav.canShare !== "function" || !nav.canShare({ files: [file] })) {
    return "unsupported";
  }

  try {
    // Share an image-only payload so mobile OS share sheets (Android Chrome / iOS Safari)
    // expose image-first targets like Instagram Stories instead of link/text-only targets.
    await nav.share({
      files: [file],
    });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return "cancelled";
    }
    throw err;
  }
}

export function canCopyPngToClipboard(): boolean {
  const { navigator: nav, ClipboardItem: ClipboardItemCtor } =
    getShareRuntime();
  return (
    Boolean(nav) &&
    typeof nav?.clipboard?.write === "function" &&
    typeof ClipboardItemCtor === "function"
  );
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!canCopyPngToClipboard()) {
    return false;
  }
  const { navigator: nav, ClipboardItem: ClipboardItemCtor } =
    getShareRuntime();
  if (!nav?.clipboard?.write || !ClipboardItemCtor) {
    return false;
  }
  try {
    await nav.clipboard.write([
      new ClipboardItemCtor({
        "image/png": blob,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function copyTextSilently(text: string): void {
  const { navigator: nav } = getShareRuntime();
  if (typeof nav?.clipboard?.writeText === "function") {
    void nav.clipboard.writeText(text).catch(() => {});
  }
}
