import {
  canCopyPngToClipboard,
  copyPngBlobToClipboard,
  copyTextSilently,
  sharePngFileNative,
  type NativeShareResult,
} from "./native-share-helpers";

export { sanitizeShareFilename } from "./card-helpers";
export {
  canCopyPngToClipboard,
  copyPngBlobToClipboard,
  copyTextSilently,
  sharePngFileNative,
};
export type { NativeShareResult };

export async function canvasToPngBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Gagal mengonversi kanvas ke gambar PNG."));
      },
      "image/png",
      1,
    );
  });
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  const blob = await canvasToPngBlob(canvas);
  downloadPngBlob(blob, filename);
}

export function canShareFilesNatively(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }
  if (typeof navigator.canShare !== "function" || typeof File === "undefined") {
    return false;
  }
  try {
    const probe = new File([new Uint8Array([0])], "probe.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareCanvasNative(params: {
  canvas: HTMLCanvasElement;
  filename: string;
  title: string;
  text: string;
  url?: string;
}): Promise<NativeShareResult> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return "unsupported";
  }

  const blob = await canvasToPngBlob(params.canvas);
  const file = new File([blob], params.filename, { type: "image/png" });
  return sharePngFileNative(file);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below.
    }
  }

  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
