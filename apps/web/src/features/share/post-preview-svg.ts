import type { ExplorePostItemDto } from "@starter/shared/types";
import { ANZA_ARCH_LOGO_PATHS, ANZA_BRAND_COLORS } from "../../lib/brand-mark";
import {
  resolveQuoteCardViewModel,
  resolveSessionCardViewModel,
} from "./card-helpers";

function stripIllegalXmlChars(value: string): string {
  let cleaned = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const isIllegal =
      (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      code === 0x7f;
    if (!isIllegal) {
      cleaned += value[i];
    }
  }
  return cleaned;
}

function escapeXml(value: string): string {
  return stripIllegalXmlChars(value).replace(
    /[<>&"']/g,
    (char) => `&#${char.charCodeAt(0)};`,
  );
}

function truncateText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function wrapSvgLines(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
  lineHeightEm = "1.24em",
): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last && last.length + 1 + word.length <= maxCharsPerLine) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(
        word.length > maxCharsPerLine
          ? `${word.slice(0, maxCharsPerLine - 1)}…`
          : word,
      );
    }
  }
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = truncateText(
      visible[visible.length - 1] ?? "",
      Math.max(4, maxCharsPerLine - 1),
    );
    if (!visible[visible.length - 1]?.endsWith("…")) {
      visible[visible.length - 1] += "…";
    }
  }
  return visible
    .map(
      (line, index) =>
        `<tspan x="0" dy="${index ? lineHeightEm : "0"}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

function renderMiniBookSvg(book: ExplorePostItemDto["book"]): string {
  const paper = ANZA_BRAND_COLORS.paper;
  const ink = ANZA_BRAND_COLORS.ink;
  const rule = ANZA_BRAND_COLORS.paperRule;
  const accent = ANZA_BRAND_COLORS.accent;
  const cover =
    book.coverColor && /^#[0-9a-f]{6}$/i.test(book.coverColor)
      ? book.coverColor
      : "#3D3229";
  const author = escapeXml(truncateText(book.author, 24));

  return `<g transform="translate(822 108)">
    <rect x="10" y="14" width="276" height="404" rx="10" fill="${ink}" opacity=".2"/>
    <rect x="4" y="4" width="272" height="398" rx="8" fill="${ink}"/>
    <rect x="4" y="387" width="268" height="11" rx="4" fill="${rule}"/>
    <rect width="270" height="390" rx="7" fill="${cover}"/>
    <rect width="270" height="390" rx="7" fill="url(#bookCoverShade)"/>
    <path d="M18 2v386 M34 56h204 M34 336h204" stroke="${paper}" stroke-opacity=".3" fill="none"/>
    <g transform="translate(76 24)">
      <rect width="18" height="18" rx="4" fill="${paper}"/>
      <g transform="translate(2.25 2.25) scale(0.28125)">
        <path d="${ANZA_ARCH_LOGO_PATHS.leftSweep}" fill="${ink}"/>
        <path d="${ANZA_ARCH_LOGO_PATHS.innerFold}" fill="${accent}"/>
        <path d="${ANZA_ARCH_LOGO_PATHS.rightWing}" fill="${ink}"/>
      </g>
    </g>
    <g fill="${paper}" font-family="Literata" font-weight="600" text-anchor="middle">
      <text x="144" y="39" font-size="16">AnzaBook</text>
      <text transform="translate(136 168)" font-size="26">${wrapSvgLines(book.title, 15, 4, "1.18em")}</text>
      <text x="136" y="368" font-size="15">${author}</text>
    </g>
  </g>`;
}

export function buildPostPreviewSvg(post: ExplorePostItemDto): string {
  const paper = ANZA_BRAND_COLORS.paper;
  const ink = ANZA_BRAND_COLORS.ink;
  const accent = ANZA_BRAND_COLORS.accent;
  const readerLabel = post.author.username
    ? `${post.author.name} (@${post.author.username})`
    : post.author.name;

  if (post.type === "quote") {
    const vm = resolveQuoteCardViewModel(post);
    const isDark =
      vm.template === "night_stabilo" ||
      vm.template === "book_cover" ||
      (vm.template === "cover_tint" && vm.palette.isDarkBackground);

    const bg =
      vm.template === "night_stabilo"
        ? "#161411"
        : vm.template === "furrow_paper"
          ? paper
          : vm.template === "cover_tint"
            ? vm.palette.background
            : vm.palette.isDarkBackground
              ? vm.palette.background
              : "#1D1915";
    const fg = isDark ? paper : ink;
    const muted = isDark ? "#CFC7BA" : "#5D564E";
    const rule = isDark ? "#332D27" : ANZA_BRAND_COLORS.paperRule;
    const brandAccent =
      vm.template === "cover_tint" ? vm.palette.accent : accent;

    const quoteBody = `"${truncateText(post.content, 240)}"`;
    const subline = vm.note
      ? `Catatan: ${truncateText(vm.note, 86)}`
      : vm.caption
        ? truncateText(vm.caption, 86)
        : "";
    const metaLabel = vm.locationLabel
      ? `Kutipan Buku · ${vm.locationLabel}`
      : "Kutipan Buku";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bookCoverShade"><stop stop-color="${ink}" stop-opacity=".55"/><stop offset=".16" stop-color="${ink}" stop-opacity=".3"/><stop offset="1" stop-color="${ink}" stop-opacity=".5"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${bg}"/>
  <path d="M68 104H1132 M68 532H1132" fill="none" stroke="${rule}" stroke-width="2"/>
  <rect x="68" y="156" width="5" height="270" rx="2.5" fill="${brandAccent}"/>
  <g transform="translate(68 42) scale(0.75)">
    <path d="${ANZA_ARCH_LOGO_PATHS.leftSweep}" fill="${fg}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.innerFold}" fill="${brandAccent}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.rightWing}" fill="${fg}"/>
  </g>
  <g font-family="Literata" font-weight="600">
    <text x="114" y="70" font-size="25" fill="${fg}">AnzaBook</text>
    <text x="772" y="70" font-size="18" fill="${muted}" text-anchor="end">${escapeXml(metaLabel)}</text>
    <text transform="translate(96 204)" font-size="34" fill="${fg}">${wrapSvgLines(quoteBody, 34, 5, "1.34em")}</text>
    ${subline ? `<text x="96" y="476" font-size="20" fill="${muted}">${escapeXml(subline)}</text>` : ""}
    <text x="68" y="578" font-size="22" fill="${fg}">${escapeXml(truncateText(readerLabel, 46))}</text>
    <text x="1132" y="578" font-size="19" fill="${muted}" text-anchor="end">Baca cuplikannya di AnzaBook</text>
  </g>
  ${renderMiniBookSvg(post.book)}
</svg>`;
  }

  // Session OG preview (resolves photo_overlay safely to cover_trail via resolveSessionCardViewModel)
  const vm = resolveSessionCardViewModel(post);
  const isDark =
    (vm.template === "cover_trail" && vm.palette.isDarkBackground) ||
    (vm.template === "transparent_sticker" && vm.stickerInk === "light");
  const bg =
    vm.template === "cover_trail"
      ? vm.palette.background
      : vm.template === "transparent_sticker" && vm.stickerInk === "light"
        ? "#161411"
        : paper;
  const fg = isDark ? paper : ink;
  const muted = isDark ? "#CFC7BA" : "#5D564E";
  const rule = isDark ? "#332D27" : ANZA_BRAND_COLORS.paperRule;
  const brandAccent =
    vm.template === "cover_trail" ? vm.palette.accent : accent;
  const trackBg = isDark ? "#3A342E" : "#DDD5C8";
  const barWidth = 680;
  const startWidth = Math.round((vm.trail.startPercent / 100) * barWidth);
  const deltaWidth = Math.max(
    vm.trail.endPercent > 0 ? 14 : 0,
    Math.round((vm.trail.deltaPercent / 100) * barWidth),
  );

  const visibleMetrics = vm.metrics.slice(0, 3);
  const metricsSvg = visibleMetrics
    .map((metric, idx) => {
      const x = 68 + idx * 232;
      const valueY = metric.hint ? 66 : 76;
      const hintSvg = metric.hint
        ? `<text x="18" y="92" font-size="16" fill="${muted}">${escapeXml(truncateText(metric.hint, 18))}</text>`
        : "";
      return `<g transform="translate(${x} 388)">
        <rect width="214" height="106" rx="10" fill="${isDark ? "#231F1B" : "#EFE9DC"}" stroke="${rule}" stroke-width="1.5"/>
        <text x="18" y="34" font-size="15" fill="${muted}">${escapeXml(metric.label)}</text>
        <text x="18" y="${valueY}" font-size="24" fill="${fg}">${escapeXml(truncateText(metric.value, 16))}</text>
        ${hintSvg}
      </g>`;
    })
    .join("");

  const latinChapterLabel = vm.trail.chapterLabel
    ? vm.trail.chapterLabel.replace(/\s*→\s*/g, " ke ")
    : null;
  const trailSummary = latinChapterLabel
    ? `Jejak Baca · ${latinChapterLabel} (${vm.trail.startPercent}% - ${vm.trail.endPercent}%)`
    : `Jejak Baca · ${vm.trail.startPercent}% - ${vm.trail.endPercent}%`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bookCoverShade"><stop stop-color="${ink}" stop-opacity=".55"/><stop offset=".16" stop-color="${ink}" stop-opacity=".3"/><stop offset="1" stop-color="${ink}" stop-opacity=".5"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${bg}"/>
  <path d="M68 104H1132 M68 532H1132" fill="none" stroke="${rule}" stroke-width="2"/>
  <g transform="translate(68 42) scale(0.75)">
    <path d="${ANZA_ARCH_LOGO_PATHS.leftSweep}" fill="${fg}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.innerFold}" fill="${brandAccent}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.rightWing}" fill="${fg}"/>
  </g>
  <g font-family="Literata" font-weight="600">
    <text x="114" y="70" font-size="25" fill="${fg}">AnzaBook</text>
    <text x="772" y="70" font-size="18" fill="${muted}" text-anchor="end">Sesi Membaca</text>
    <text transform="translate(68 176)" font-size="40" fill="${fg}">${wrapSvgLines(vm.title, 26, 2, "1.18em")}</text>
    <text x="68" y="294" font-size="20" fill="${muted}">${escapeXml(truncateText(trailSummary, 58))}</text>
    <rect x="68" y="316" width="${barWidth}" height="16" rx="8" fill="${trackBg}"/>
    ${startWidth > 0 ? `<rect x="68" y="316" width="${startWidth}" height="16" rx="8" fill="${muted}" opacity=".55"/>` : ""}
    ${deltaWidth > 0 ? `<rect x="${68 + startWidth}" y="316" width="${Math.min(deltaWidth, barWidth - startWidth)}" height="16" rx="8" fill="${brandAccent}"/>` : ""}
    ${
      metricsSvg ||
      `<text x="68" y="434" font-size="24" fill="${muted}">Menyelesaikan sesi membaca</text>`
    }
    <text x="68" y="578" font-size="22" fill="${fg}">${escapeXml(truncateText(readerLabel, 46))}</text>
    <text x="1132" y="578" font-size="19" fill="${muted}" text-anchor="end">Baca cuplikannya di AnzaBook</text>
  </g>
  ${renderMiniBookSvg(post.book)}
</svg>`;
}
