import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasmAsset from "@resvg/resvg-wasm/index_bg.wasm?url&inline";
import fontAsset from "@fontsource/literata/files/literata-latin-600-normal.woff2?inline";
import type { EventShareSource } from "./event-share";
import { buildEventPreviewSvg } from "./event-preview-svg";

const assetBytes = (asset: string) =>
  Buffer.from(asset.split(",", 2)[1], "base64");
const font = assetBytes(fontAsset);

const runtime = globalThis as typeof globalThis & {
  anzaBookPreviewWasm?: Promise<void>;
};

export async function renderEventPreview(
  event: EventShareSource,
): Promise<Uint8Array<ArrayBuffer>> {
  const ready = (runtime.anzaBookPreviewWasm ??= initWasm(
    assetBytes(wasmAsset),
  ));
  try {
    await ready;
  } catch (error) {
    if (
      import.meta.env.DEV &&
      error instanceof Error &&
      error.message.startsWith("Already initialized.")
    ) {
      runtime.anzaBookPreviewWasm = Promise.resolve();
    } else {
      delete runtime.anzaBookPreviewWasm;
      throw error;
    }
  }

  const svg = buildEventPreviewSvg(event);
  const renderer = new Resvg(svg, { font: { fontBuffers: [font] } });
  try {
    const image = renderer.render();
    try {
      return new Uint8Array(image.asPng());
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
