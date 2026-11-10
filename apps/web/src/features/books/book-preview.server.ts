import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasmAsset from "@resvg/resvg-wasm/index_bg.wasm?url&inline";
import fontAsset from "@fontsource/literata/files/literata-latin-600-normal.woff2?inline";
import type { BookSummaryDto } from "@starter/shared/types";

const assetBytes = (asset: string) =>
  Buffer.from(asset.split(",", 2)[1], "base64");
const font = assetBytes(fontAsset);
// Vite can reload this module while the WASM dependency stays initialized.
const runtime = globalThis as typeof globalThis & {
  anzaBookPreviewWasm?: Promise<void>;
};

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function titleLines(title: string, width: number, maxLines: number) {
  const lines: string[] = [];
  for (const word of title.split(/\s+/)) {
    const last = lines.at(-1);
    if (last && last.length + 1 + word.length <= width) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word.length > width ? `${word.slice(0, width - 1)}…` : word);
    }
  }
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[maxLines - 1] += "…";
  return visible
    .map(
      (line, index) =>
        `<tspan x="0" dy="${index ? "1.14em" : "0"}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

export async function renderBookPreview(
  book: Pick<BookSummaryDto, "title" | "author" | "coverColor">,
) {
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
  const paper = "#F6F2E9";
  const ink = "#13110F";
  const rule = "#DDD6C7";
  const accent = "#F06A24";
  const cover = /^#[0-9a-f]{6}$/i.test(book.coverColor)
    ? book.coverColor
    : "#3D3229";
  const author = escapeXml(
    book.author.length > 48 ? `${book.author.slice(0, 47)}…` : book.author,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="cover"><stop stop-color="${ink}" stop-opacity=".62"/><stop offset=".13" stop-color="${ink}" stop-opacity=".36"/><stop offset="1" stop-color="${ink}" stop-opacity=".54"/></linearGradient>
    </defs>
    <rect width="1200" height="630" fill="${paper}"/>
    <path d="M68 111H1132 M68 524H1132 M730 111V524" fill="none" stroke="${rule}" stroke-width="2"/>
    <path d="M68 79h12v-32h-12z" fill="${accent}"/>
    <g fill="${ink}" font-family="Literata" font-weight="600">
      <text x="94" y="75" font-size="25">AnzaBook</text>
      <text x="68" y="171" font-size="23">Katalog Buku</text>
      <text transform="translate(68 257)" font-size="50">${titleLines(book.title, 24, 4)}</text>
      <text x="68" y="574" font-size="27">${author}</text>
    </g>
    <g transform="translate(804 111)">
      <rect x="10" y="14" width="280" height="412" rx="10" fill="${ink}" opacity=".16"/>
      <rect x="4" y="4" width="277" height="407" rx="8" fill="${ink}"/>
      <rect x="4" y="395" width="273" height="12" rx="4" fill="${rule}"/>
      <rect width="275" height="398" rx="7" fill="${cover}"/>
      <rect width="275" height="398" rx="7" fill="url(#cover)"/>
      <path d="M19 2v394 M36 57h209 M36 344h209" stroke="${paper}" stroke-opacity=".33" fill="none"/>
      <g stroke="${paper}" fill="none" opacity=".66">
        <circle cx="140" cy="127" r="43"/><ellipse cx="140" cy="127" rx="63" ry="23" transform="rotate(-28 140 127)"/>
      </g>
      <circle cx="140" cy="127" r="5" fill="${accent}"/>
      <g fill="${paper}" font-family="Literata" font-weight="600" text-anchor="middle">
        <text x="140" y="41" font-size="16">AnzaBook</text>
        <text transform="translate(140 215)" font-size="27">${titleLines(book.title, 15, 4)}</text>
        <text x="140" y="375" font-size="15">${escapeXml(book.author.length > 24 ? `${book.author.slice(0, 23)}…` : book.author)}</text>
      </g>
    </g>
  </svg>`;
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
