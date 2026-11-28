import type {
  CardAspect,
  HighlightColor,
  QuotePostConfig,
  SessionPostConfig,
} from "@starter/shared/types";
import {
  ANZA_ARCH_LOGO_PATHS,
  ANZA_ARCH_VIEWBOX,
  ANZA_BRAND_COLORS,
} from "@/lib/brand-mark";
import {
  computeSevenDayConsistency,
  deriveAdaptiveCoverPalette,
  formatShareDuration,
  shareTempoLabel,
} from "./card-helpers";

export const CARD_DIMENSIONS: Record<
  CardAspect,
  { width: number; height: number }
> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  "4:3": { width: 1440, height: 1080 },
};

const FONT_SERIF = '"Literata", Georgia, serif';
const FONT_SANS = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
const FONT_MONO = '"Red Hat Mono", ui-monospace, monospace';

const FURROW = {
  paper: "#F6F2E9",
  paper2: "#FEFDFB",
  paper3: "#EAE3D5",
  ink: "#13110F",
  inkSoft: "#4F4A42",
  inkMuted: "#766F63",
  rule: "#DDD6C7",
  accent: "#F06A24",
  darkInkBg: "#13110F",
  darkPaperBg: "#161412",
} as const;

const STABILO_STYLES: Record<
  HighlightColor,
  { bar: string; wash: string; badgeText: string }
> = {
  yellow: {
    bar: "#FACC15",
    wash: "rgba(250, 204, 21, 0.14)",
    badgeText: "#FEF08A",
  },
  green: {
    bar: "#4ADE80",
    wash: "rgba(74, 222, 128, 0.14)",
    badgeText: "#BBF7D0",
  },
  coral: {
    bar: "#FB7185",
    wash: "rgba(251, 113, 133, 0.14)",
    badgeText: "#FECDD3",
  },
  blue: {
    bar: "#60A5FA",
    wash: "rgba(96, 165, 250, 0.14)",
    badgeText: "#BFDBFE",
  },
};

export type QuoteCardRenderInput = {
  quote: string;
  bookTitle: string;
  bookAuthor?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  chapterNumber?: number | null;
  pageNumber?: number | null;
  highlightColor?: HighlightColor;
  note?: string | null;
  surroundingContext?: string | null;
  readerName: string;
  config: QuotePostConfig;
};

export type SessionCardRenderInput = {
  title: string;
  bookTitle: string;
  bookAuthor?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  durationSec: number;
  pagesRead: number;
  avgWpm?: number | null;
  startChapterNumber?: number | null;
  endChapterNumber?: number | null;
  startProgressPercent?: number | null;
  endProgressPercent?: number | null;
  streakDays?: number | null;
  note?: string | null;
  photoUrl?: string | null;
  recentSessions?: ReadonlyArray<{
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
  readerName: string;
  config: SessionPostConfig;
};

export type CardRenderOptions = {
  isCancelled?: () => boolean;
};

export async function ensureCanvasFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch {
    // Continue with system fallback fonts if font loading fails.
  }
}

export async function loadCanvasImage(
  src?: string | null,
): Promise<HTMLImageElement | null> {
  if (!src?.trim() || typeof Image === "undefined") return null;
  const trimmed = src.trim();
  const isSafeRasterDataUri =
    /^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,/i.test(trimmed);
  const isLocalBlobOrData = trimmed.startsWith("blob:") || isSafeRasterDataUri;
  const isRemoteUrl =
    trimmed.startsWith("https://") || trimmed.startsWith("http://");
  const isUploadedRootRelative =
    /^\/(?!\/)[^\s]*$/.test(trimmed) && !trimmed.startsWith("/covers/");
  if (!isLocalBlobOrData && !isRemoteUrl && !isUploadedRootRelative) {
    // Legacy relative paths like /covers/*.svg are procedural fallback covers, not static files.
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!isLocalBlobOrData) {
      img.crossOrigin = "anonymous";
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, 4500);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(img.naturalWidth > 0 ? img : null);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    };

    img.src = trimmed;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
) {
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const dstRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (srcRatio > dstRatio) {
    sw = img.naturalHeight * dstRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / dstRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.save();
  if (radius > 0) {
    drawRoundedRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawAnzaBrandMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  foregroundColor: string,
  accentColor: string = ANZA_BRAND_COLORS.accent,
) {
  const viewBoxSize = Number(ANZA_ARCH_VIEWBOX.split(" ")[2] ?? "48") || 48;
  const scale = size / viewBoxSize;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (typeof Path2D !== "undefined") {
    ctx.fillStyle = foregroundColor;
    ctx.fill(new Path2D(ANZA_ARCH_LOGO_PATHS.leftSweep));
    ctx.fillStyle = accentColor;
    ctx.fill(new Path2D(ANZA_ARCH_LOGO_PATHS.innerFold));
    ctx.fillStyle = foregroundColor;
    ctx.fill(new Path2D(ANZA_ARCH_LOGO_PATHS.rightWing));
  } else {
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, viewBoxSize, viewBoxSize);
  }
  ctx.restore();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;
    const words = trimmedPara.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        if (ctx.measureText(word).width <= maxWidth) {
          currentLine = word;
        } else {
          let chunk = "";
          for (const char of word) {
            if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk += char;
            }
          }
          currentLine = chunk;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
): number {
  ctx.save();
  ctx.textAlign = align;
  let cursorY = startY;
  for (const line of lines) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  ctx.restore();
  return cursorY;
}

function drawBookCoverOrFallback(
  ctx: CanvasRenderingContext2D,
  coverImg: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  author: string | null | undefined,
  coverColor: string | null | undefined,
  radius = 12,
) {
  if (coverImg) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    drawRoundedRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = "#13110F";
    ctx.fill();
    ctx.restore();

    drawImageCover(ctx, coverImg, x, y, w, h, radius);
    ctx.save();
    drawRoundedRectPath(ctx, x, y, w, h, radius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const palette = deriveAdaptiveCoverPalette(coverColor);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = palette.background;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  // Tactile spine crease on the left edge
  ctx.fillStyle = palette.rule;
  ctx.fillRect(x + Math.max(8, w * 0.08), y, 2, h);

  const innerX = x + Math.max(18, w * 0.14);
  const innerW = w - Math.max(28, w * 0.22);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(innerX, y + h * 0.12, Math.min(36, innerW * 0.35), 3);

  const titleSize = Math.max(13, Math.round(w * 0.105));
  ctx.font = `700 ${titleSize}px ${FONT_SERIF}`;
  ctx.fillStyle = palette.foreground;
  const titleLines = wrapTextLines(ctx, title, innerW).slice(0, 3);
  drawLines(ctx, titleLines, innerX, y + h * 0.28, titleSize * 1.28);

  if (author?.trim()) {
    const authorSize = Math.max(10, Math.round(w * 0.075));
    ctx.font = `500 ${authorSize}px ${FONT_SANS}`;
    ctx.fillStyle = palette.mutedForeground;
    const authorLines = wrapTextLines(ctx, author.trim(), innerW).slice(0, 2);
    drawLines(ctx, authorLines, innerX, y + h * 0.78, authorSize * 1.25);
  }

  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = palette.rule;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawBlurredCoverBackdrop(
  ctx: CanvasRenderingContext2D,
  coverImg: HTMLImageElement | null,
  width: number,
  height: number,
  coverColor?: string | null,
) {
  ctx.fillStyle = FURROW.darkPaperBg;
  ctx.fillRect(0, 0, width, height);

  if (coverImg) {
    ctx.save();
    try {
      ctx.filter = "blur(46px) saturate(1.15) brightness(0.72)";
    } catch {
      ctx.globalAlpha = 0.55;
    }
    drawImageCover(ctx, coverImg, -80, -80, width + 160, height + 160);
    ctx.restore();
  } else {
    const palette = deriveAdaptiveCoverPalette(coverColor);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(19, 17, 15, 0.52)";
    ctx.fillRect(0, 0, width, height);
  }

  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, "rgba(19, 17, 15, 0.58)");
  scrim.addColorStop(0.5, "rgba(19, 17, 15, 0.72)");
  scrim.addColorStop(1, "rgba(19, 17, 15, 0.90)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);
}

function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    width: number;
    foreground: string;
    muted: string;
    accent: string;
    readerName: string;
    tag?: string;
    shadowColor?: string;
  },
) {
  const { x, y, width, foreground, muted, accent, readerName, tag } = params;
  ctx.save();
  if (params.shadowColor) {
    ctx.shadowColor = params.shadowColor;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
  }

  drawAnzaBrandMark(ctx, x, y - 24, 34, foreground, accent);

  ctx.font = `700 24px ${FONT_SANS}`;
  ctx.fillStyle = foreground;
  ctx.fillText("AnzaBook", x + 46, y);

  if (tag) {
    ctx.font = `600 18px ${FONT_MONO}`;
    ctx.fillStyle = muted;
    ctx.fillText(tag, x + 46, y + 26);
  }

  const safeReader = readerName.trim() || "Pembaca AnzaBook";
  ctx.font = `600 22px ${FONT_SANS}`;
  ctx.fillStyle = muted;
  ctx.textAlign = "right";
  ctx.fillText(safeReader, x + width, y - 4);
  ctx.restore();
}

function fitQuoteTypography(
  ctx: CanvasRenderingContext2D,
  quote: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  minFontSize = 28,
): { fontSize: number; lineHeight: number; lines: string[] } {
  const cleanQuote = quote.trim();
  for (let size = maxFontSize; size >= minFontSize; size -= 2) {
    ctx.font = `500 ${size}px ${FONT_SERIF}`;
    const lineHeight = Math.round(size * 1.44);
    const lines = wrapTextLines(ctx, `"${cleanQuote}"`, maxWidth);
    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize: size, lineHeight, lines };
    }
  }

  ctx.font = `500 ${minFontSize}px ${FONT_SERIF}`;
  const lineHeight = Math.round(minFontSize * 1.42);
  const maxLines = Math.max(3, Math.floor(maxHeight / lineHeight));
  const lines = wrapTextLines(ctx, `"${cleanQuote}"`, maxWidth).slice(
    0,
    maxLines,
  );
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 4))}..."`;
  }
  return { fontSize: minFontSize, lineHeight, lines };
}

function buildQuoteLocationLabel(
  chapterNumber?: number | null,
  pageNumber?: number | null,
): string {
  const parts: string[] = [];
  if (chapterNumber && chapterNumber > 0)
    parts.push(`Chapter ${chapterNumber}`);
  if (pageNumber && pageNumber > 0) parts.push(`Hal ${pageNumber}`);
  return parts.join(" · ");
}

export async function renderQuoteCardToCanvas(
  canvas: HTMLCanvasElement,
  input: QuoteCardRenderInput,
  options?: CardRenderOptions,
): Promise<void> {
  await ensureCanvasFontsReady();
  if (options?.isCancelled?.()) return;

  const coverImg = await loadCanvasImage(input.bookCoverUrl);
  if (options?.isCancelled?.()) return;

  const { width, height } = CARD_DIMENSIONS[input.config.aspect];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isStory = input.config.aspect === "story";
  const isLandscape43 = input.config.aspect === "4:3";
  const align = input.config.alignment;
  const padX = isStory ? 96 : isLandscape43 ? 124 : 92;
  const contentW = width - padX * 2;
  const locationLabel = buildQuoteLocationLabel(
    input.chapterNumber,
    input.pageNumber,
  );
  const noteText =
    input.config.includeNote && input.note?.trim() ? input.note.trim() : null;

  ctx.clearRect(0, 0, width, height);

  if (input.config.template === "book_cover") {
    drawBlurredCoverBackdrop(
      ctx,
      coverImg,
      width,
      height,
      input.bookCoverColor,
    );

    const cardTop = isStory ? 180 : 88;
    const cardBottom = isStory ? height - 180 : height - 88;
    const cardH = cardBottom - cardTop;

    ctx.save();
    drawRoundedRectPath(ctx, 68, cardTop, width - 136, cardH, 28);
    ctx.fillStyle = "rgba(254, 253, 251, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(246, 242, 233, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const innerX = 122;
    const innerW = width - 244;
    const thumbW = isStory ? 116 : 96;
    const thumbH = isStory ? 172 : 142;

    drawBookCoverOrFallback(
      ctx,
      coverImg,
      innerX,
      cardTop + 56,
      thumbW,
      thumbH,
      input.bookTitle,
      input.bookAuthor,
      input.bookCoverColor,
      10,
    );

    const metaX = innerX + thumbW + 30;
    const metaW = innerW - thumbW - 30;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.accent;
    ctx.fillText(
      (locationLabel || "KUTIPAN BUKU").toUpperCase(),
      metaX,
      cardTop + 92,
    );

    ctx.font = `700 32px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.paper;
    const titleLines = wrapTextLines(ctx, input.bookTitle, metaW).slice(0, 2);
    const afterTitleY = drawLines(ctx, titleLines, metaX, cardTop + 138, 40);

    if (input.bookAuthor?.trim()) {
      ctx.font = `500 22px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(246, 242, 233, 0.72)";
      ctx.fillText(input.bookAuthor.trim(), metaX, afterTitleY + 6);
    }

    const dividerY = cardTop + 56 + thumbH + 44;
    ctx.fillStyle = "rgba(246, 242, 233, 0.14)";
    ctx.fillRect(innerX, dividerY, innerW, 2);

    const noteReserve = noteText ? 160 : 0;
    const footerReserve = 126;
    const quoteAreaTop = dividerY + 54;
    const quoteAreaHeight =
      cardBottom - footerReserve - noteReserve - quoteAreaTop;

    const fitted = fitQuoteTypography(
      ctx,
      input.quote,
      innerW,
      Math.max(240, quoteAreaHeight),
      isStory ? 52 : 42,
    );

    const textBlockH = fitted.lines.length * fitted.lineHeight;
    const quoteStartY =
      quoteAreaTop + Math.max(0, (quoteAreaHeight - textBlockH) / 2);
    const textX = align === "center" ? innerX + innerW / 2 : innerX;

    ctx.font = `500 ${fitted.fontSize}px ${FONT_SERIF}`;
    ctx.fillStyle = "#FAF7F0";
    const afterQuoteY = drawLines(
      ctx,
      fitted.lines,
      textX,
      quoteStartY,
      fitted.lineHeight,
      align,
    );

    if (noteText) {
      ctx.fillStyle = FURROW.accent;
      ctx.fillRect(
        innerX,
        Math.max(afterQuoteY + 12, quoteAreaTop + quoteAreaHeight + 16),
        4,
        58,
      );
      ctx.font = `500 22px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(246, 242, 233, 0.84)";
      const noteLines = wrapTextLines(ctx, noteText, innerW - 24).slice(0, 2);
      drawLines(
        ctx,
        noteLines,
        innerX + 20,
        Math.max(afterQuoteY + 34, quoteAreaTop + quoteAreaHeight + 38),
        30,
      );
    }

    drawBrandFooter(ctx, {
      x: innerX,
      y: cardBottom - 54,
      width: innerW,
      foreground: FURROW.paper,
      muted: "rgba(246, 242, 233, 0.72)",
      accent: FURROW.accent,
      readerName: input.readerName,
      tag: "SOROTAN BUKU",
    });
    return;
  }

  if (input.config.template === "furrow_paper") {
    ctx.fillStyle = FURROW.paper;
    ctx.fillRect(0, 0, width, height);

    // Subtle inset editorial frame
    ctx.strokeStyle = FURROW.rule;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    // Tangerine ribbon bar
    ctx.fillStyle = FURROW.accent;
    ctx.fillRect(48, 48, width - 96, 12);

    const headerY = isStory ? 168 : 132;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.accent;
    ctx.fillText("ANZABOOK FOLIO", padX, headerY);

    ctx.font = `600 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.inkMuted;
    ctx.textAlign = "right";
    ctx.fillText(
      (locationLabel || "KUTIPAN").toUpperCase(),
      width - padX,
      headerY,
    );
    ctx.textAlign = "left";

    ctx.fillStyle = FURROW.rule;
    ctx.fillRect(padX, headerY + 26, contentW, 2);

    const attributionH = isStory ? 290 : 240;
    const noteReserve = noteText ? 150 : 0;
    const quoteTop = headerY + 86;
    const quoteHeight = height - quoteTop - attributionH - noteReserve;

    const fitted = fitQuoteTypography(
      ctx,
      input.quote,
      contentW,
      Math.max(240, quoteHeight),
      isStory ? 54 : 44,
    );
    const quoteY =
      quoteTop +
      Math.max(0, (quoteHeight - fitted.lines.length * fitted.lineHeight) / 2);
    const textX = align === "center" ? width / 2 : padX;

    ctx.font = `500 ${fitted.fontSize}px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.ink;
    drawLines(ctx, fitted.lines, textX, quoteY, fitted.lineHeight, align);

    if (noteText) {
      const noteY = height - attributionH - 110;
      ctx.fillStyle = FURROW.paper3;
      drawRoundedRectPath(ctx, padX, noteY - 24, contentW, 92, 12);
      ctx.fill();
      ctx.fillStyle = FURROW.accent;
      ctx.fillRect(padX, noteY - 24, 6, 92);
      ctx.font = `500 22px ${FONT_SANS}`;
      ctx.fillStyle = FURROW.inkSoft;
      const noteLines = wrapTextLines(ctx, noteText, contentW - 44).slice(0, 2);
      drawLines(ctx, noteLines, padX + 24, noteY + 8, 30);
    }

    const attrY = height - attributionH + 16;
    ctx.fillStyle = FURROW.rule;
    ctx.fillRect(padX, attrY, contentW, 2);

    drawBookCoverOrFallback(
      ctx,
      coverImg,
      padX,
      attrY + 30,
      78,
      114,
      input.bookTitle,
      input.bookAuthor,
      input.bookCoverColor,
      8,
    );

    ctx.font = `700 28px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.ink;
    const bookLines = wrapTextLines(ctx, input.bookTitle, contentW - 110).slice(
      0,
      2,
    );
    const afterBookY = drawLines(ctx, bookLines, padX + 104, attrY + 68, 34);

    if (input.bookAuthor?.trim()) {
      ctx.font = `500 22px ${FONT_SANS}`;
      ctx.fillStyle = FURROW.inkSoft;
      ctx.fillText(input.bookAuthor.trim(), padX + 104, afterBookY + 4);
    }

    drawBrandFooter(ctx, {
      x: padX,
      y: height - 86,
      width: contentW,
      foreground: FURROW.ink,
      muted: FURROW.inkMuted,
      accent: FURROW.accent,
      readerName: input.readerName,
    });
    return;
  }

  if (input.config.template === "night_stabilo") {
    ctx.fillStyle = FURROW.darkInkBg;
    ctx.fillRect(0, 0, width, height);

    const stabilo = STABILO_STYLES[input.highlightColor ?? "yellow"];

    // Real blurred surrounding passage context when supplied (zero fake lorem ipsum)
    if (input.surroundingContext?.trim()) {
      ctx.save();
      try {
        ctx.filter = "blur(2.5px)";
      } catch {
        // Skip blur on environments without CanvasRenderingContext2D.filter
      }
      ctx.font = `400 32px ${FONT_SERIF}`;
      ctx.fillStyle = "rgba(246, 242, 233, 0.14)";
      const contextLines = wrapTextLines(
        ctx,
        input.surroundingContext.trim(),
        width - 140,
      ).slice(0, isStory ? 22 : 12);
      drawLines(ctx, contextLines, 70, 120, 56);
      ctx.restore();
    } else {
      ctx.strokeStyle = "rgba(246, 242, 233, 0.06)";
      ctx.lineWidth = 2;
      for (let y = 120; y < height - 100; y += 72) {
        ctx.beginPath();
        ctx.moveTo(72, y);
        ctx.lineTo(width - 72, y);
        ctx.stroke();
      }
    }

    const panelPadX = 76;
    const panelTop = isStory ? 340 : 140;
    const panelBottom = isStory ? height - 290 : height - 120;
    const panelH = panelBottom - panelTop;

    ctx.save();
    drawRoundedRectPath(
      ctx,
      panelPadX,
      panelTop,
      width - panelPadX * 2,
      panelH,
      24,
    );
    ctx.fillStyle = "rgba(22, 20, 18, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(246, 242, 233, 0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const innerX = panelPadX + 52;
    const innerW = width - innerX * 2;

    ctx.fillStyle = stabilo.bar;
    ctx.fillRect(innerX, panelTop + 56, 86, 8);

    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = stabilo.badgeText;
    ctx.fillText(
      (locationLabel || "STABILO MALAM").toUpperCase(),
      innerX + 108,
      panelTop + 67,
    );

    const noteReserve = noteText ? 130 : 0;
    const footerReserve = 160;
    const quoteTop = panelTop + 128;
    const quoteHeight = panelBottom - footerReserve - noteReserve - quoteTop;

    const fitted = fitQuoteTypography(
      ctx,
      input.quote,
      innerW - 24,
      Math.max(220, quoteHeight),
      isStory ? 48 : 40,
    );
    const quoteStartY =
      quoteTop +
      Math.max(0, (quoteHeight - fitted.lines.length * fitted.lineHeight) / 2);

    ctx.fillStyle = stabilo.wash;
    drawRoundedRectPath(
      ctx,
      innerX - 16,
      quoteStartY - fitted.fontSize - 10,
      innerW + 32,
      fitted.lines.length * fitted.lineHeight + 34,
      14,
    );
    ctx.fill();

    ctx.fillStyle = stabilo.bar;
    ctx.fillRect(
      innerX - 16,
      quoteStartY - fitted.fontSize - 10,
      8,
      fitted.lines.length * fitted.lineHeight + 34,
    );

    const textX = align === "center" ? width / 2 : innerX + 12;
    ctx.font = `500 ${fitted.fontSize}px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.paper;
    drawLines(ctx, fitted.lines, textX, quoteStartY, fitted.lineHeight, align);

    if (noteText) {
      ctx.font = `500 22px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(246, 242, 233, 0.78)";
      const noteLines = wrapTextLines(
        ctx,
        `Catatan: ${noteText}`,
        innerW,
      ).slice(0, 2);
      drawLines(ctx, noteLines, innerX, panelBottom - 230, 30);
    }

    ctx.font = `700 26px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.paper;
    ctx.fillText(input.bookTitle, innerX, panelBottom - 148);

    if (input.bookAuthor?.trim()) {
      ctx.font = `500 20px ${FONT_SANS}`;
      ctx.fillStyle = "rgba(246, 242, 233, 0.65)";
      ctx.fillText(input.bookAuthor.trim(), innerX, panelBottom - 114);
    }

    drawBrandFooter(ctx, {
      x: innerX,
      y: panelBottom - 44,
      width: innerW,
      foreground: FURROW.paper,
      muted: "rgba(246, 242, 233, 0.68)",
      accent: stabilo.bar,
      readerName: input.readerName,
    });
    return;
  }

  // Template 4: cover_tint (Curated adaptive solid background from coverColor)
  const palette = deriveAdaptiveCoverPalette(input.bookCoverColor);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.surface;
  drawRoundedRectPath(ctx, 56, 56, width - 112, height - 112, 28);
  ctx.fill();
  ctx.strokeStyle = palette.rule;
  ctx.lineWidth = 2;
  ctx.stroke();

  const headerY = isStory ? 176 : 136;
  const headerX = align === "center" ? width / 2 : padX;
  ctx.font = `700 20px ${FONT_MONO}`;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = align;
  ctx.fillText(
    (locationLabel || input.bookTitle).toUpperCase(),
    headerX,
    headerY,
  );
  ctx.textAlign = "left";

  const noteReserve = noteText ? 140 : 0;
  const footerReserve = 240;
  const quoteTop = headerY + 72;
  const quoteH = height - quoteTop - footerReserve - noteReserve;

  const fitted = fitQuoteTypography(
    ctx,
    input.quote,
    contentW,
    Math.max(240, quoteH),
    isStory ? 54 : 44,
  );
  const quoteStartY =
    quoteTop +
    Math.max(0, (quoteH - fitted.lines.length * fitted.lineHeight) / 2);
  const textX = align === "center" ? width / 2 : padX;

  ctx.font = `500 ${fitted.fontSize}px ${FONT_SERIF}`;
  ctx.fillStyle = palette.foreground;
  drawLines(ctx, fitted.lines, textX, quoteStartY, fitted.lineHeight, align);

  if (noteText) {
    ctx.font = `500 22px ${FONT_SANS}`;
    ctx.fillStyle = palette.mutedForeground;
    ctx.textAlign = align;
    const noteLines = wrapTextLines(ctx, noteText, contentW).slice(0, 2);
    drawLines(ctx, noteLines, textX, height - footerReserve - 86, 30, align);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = palette.rule;
  ctx.fillRect(padX, height - 216, contentW, 2);

  ctx.font = `700 28px ${FONT_SERIF}`;
  ctx.fillStyle = palette.foreground;
  ctx.textAlign = align;
  ctx.fillText(input.bookTitle, textX, height - 166);
  if (input.bookAuthor?.trim()) {
    ctx.font = `500 21px ${FONT_SANS}`;
    ctx.fillStyle = palette.mutedForeground;
    ctx.fillText(input.bookAuthor.trim(), textX, height - 134);
  }
  ctx.textAlign = "left";

  drawBrandFooter(ctx, {
    x: padX,
    y: height - 86,
    width: contentW,
    foreground: palette.foreground,
    muted: palette.mutedForeground,
    accent: palette.accent,
    readerName: input.readerName,
  });
}

function drawReadingTrail(
  ctx: CanvasRenderingContext2D,
  params: {
    x: number;
    y: number;
    width: number;
    startChapter?: number | null;
    endChapter?: number | null;
    startPct?: number | null;
    endPct?: number | null;
    trackColor: string;
    priorFillColor: string;
    accentColor: string;
    textColor: string;
    mutedColor: string;
    shadowColor?: string;
  },
) {
  const { x, y, width } = params;
  const start = Math.max(0, Math.min(100, Math.round(params.startPct ?? 0)));
  const end = Math.max(
    start,
    Math.min(100, Math.round(params.endPct ?? start)),
  );

  ctx.save();
  if (params.shadowColor) {
    ctx.shadowColor = params.shadowColor;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
  }

  const chapterStart = params.startChapter ?? params.endChapter;
  const chapterEnd = params.endChapter ?? params.startChapter;
  const chapterText =
    chapterStart && chapterEnd && chapterStart !== chapterEnd
      ? `Chapter ${chapterStart} -> ${chapterEnd}`
      : chapterEnd
        ? `Chapter ${chapterEnd}`
        : "Jejak Baca";

  ctx.font = `700 21px ${FONT_MONO}`;
  ctx.fillStyle = params.textColor;
  ctx.fillText(chapterText.toUpperCase(), x, y);

  ctx.textAlign = "right";
  ctx.fillStyle = params.accentColor;
  ctx.fillText(`${start}% -> ${end}%`, x + width, y);
  ctx.textAlign = "left";

  const barY = y + 20;
  const barH = 14;
  drawRoundedRectPath(ctx, x, barY, width, barH, 7);
  ctx.fillStyle = params.trackColor;
  ctx.fill();

  const priorW = Math.round((start / 100) * width);
  if (priorW > 0) {
    drawRoundedRectPath(ctx, x, barY, Math.max(12, priorW), barH, 7);
    ctx.fillStyle = params.priorFillColor;
    ctx.fill();
  }

  const segmentX = x + priorW;
  const segmentW = Math.max(
    end > start ? 18 : 10,
    Math.round(((end - start) / 100) * width),
  );
  drawRoundedRectPath(
    ctx,
    Math.min(x + width - segmentW, segmentX),
    barY,
    segmentW,
    barH,
    7,
  );
  ctx.fillStyle = params.accentColor;
  ctx.fill();

  // Endpoint marker ring
  const pinX = Math.min(
    x + width - 7,
    Math.max(x + 7, (end / 100) * width + x),
  );
  ctx.beginPath();
  ctx.arc(pinX, barY + barH / 2, 11, 0, Math.PI * 2);
  ctx.fillStyle = params.accentColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = params.mutedColor;
  ctx.stroke();
  ctx.restore();
}

type SessionMetricEntry = {
  label: string;
  value: string;
  subValue?: string;
};

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontWeight: number,
  initialSize: number,
  minSize: number,
  fontFamily: string,
) {
  let size = initialSize;
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  }
  let output = text;
  if (ctx.measureText(output).width > maxWidth) {
    while (
      output.length > 1 &&
      ctx.measureText(`${output}…`).width > maxWidth
    ) {
      output = output.slice(0, -1).trimEnd();
    }
    output = `${output}…`;
  }
  ctx.fillText(output, x, y, maxWidth);
}

function collectVisibleSessionMetrics(
  input: SessionCardRenderInput,
): SessionMetricEntry[] {
  const items: SessionMetricEntry[] = [];
  if (input.config.showDuration) {
    items.push({
      label: "DURASI AKTIF",
      value: formatShareDuration(input.durationSec),
    });
  }
  if (input.config.showPages) {
    items.push({
      label: "HALAMAN STANDAR",
      value: `${Math.max(0, Math.round(input.pagesRead))} hlm`,
    });
  }
  if (input.config.showWpm) {
    const label = shareTempoLabel(input.avgWpm);
    const wpmValue =
      input.avgWpm && input.avgWpm > 0 ? `${Math.round(input.avgWpm)} wpm` : "";
    items.push({
      label: "RITME BACA",
      value: wpmValue || label || "-",
      subValue: wpmValue && label ? label : undefined,
    });
  }
  return items;
}

export async function renderSessionCardToCanvas(
  canvas: HTMLCanvasElement,
  input: SessionCardRenderInput,
  options?: CardRenderOptions,
): Promise<void> {
  await ensureCanvasFontsReady();
  if (options?.isCancelled?.()) return;

  const [coverImg, photoImg] = await Promise.all([
    loadCanvasImage(input.bookCoverUrl),
    input.config.template === "photo_overlay"
      ? loadCanvasImage(input.photoUrl)
      : Promise.resolve(null),
  ]);
  if (options?.isCancelled?.()) return;

  const { width, height } = CARD_DIMENSIONS[input.config.aspect];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isStory = input.config.aspect === "story";
  const isLandscape43 = input.config.aspect === "4:3";
  const padX = isLandscape43 ? 116 : 88;
  const contentW = width - padX * 2;
  const visibleMetrics = collectVisibleSessionMetrics(input);
  const streakTag =
    input.streakDays && input.streakDays > 0
      ? `${input.streakDays} hari beruntun`
      : undefined;

  ctx.clearRect(0, 0, width, height);

  if (input.config.template === "transparent_sticker") {
    const isLightInk = input.config.stickerInk !== "dark";
    const fg = isLightInk ? "#FFFFFF" : FURROW.ink;
    const muted = isLightInk
      ? "rgba(255, 255, 255, 0.82)"
      : "rgba(19, 17, 15, 0.78)";
    const track = isLightInk
      ? "rgba(255, 255, 255, 0.24)"
      : "rgba(19, 17, 15, 0.16)";
    const priorTrack = isLightInk
      ? "rgba(255, 255, 255, 0.48)"
      : "rgba(19, 17, 15, 0.36)";
    const shadowColor = isLightInk
      ? "rgba(0, 0, 0, 0.45)"
      : "rgba(246, 242, 233, 0.45)";

    const blockStartY = isStory ? 540 : 210;

    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;

    drawBookCoverOrFallback(
      ctx,
      coverImg,
      padX,
      blockStartY,
      118,
      174,
      input.bookTitle,
      input.bookAuthor,
      input.bookCoverColor,
      12,
    );

    const headerX = padX + 148;
    const headerW = contentW - 148;
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.accent;
    ctx.fillText("CATATAN SESI", headerX, blockStartY + 34);

    ctx.font = `700 38px ${FONT_SERIF}`;
    ctx.fillStyle = fg;
    const titleLines = wrapTextLines(ctx, input.title, headerW).slice(0, 2);
    const afterTitleY = drawLines(
      ctx,
      titleLines,
      headerX,
      blockStartY + 84,
      46,
    );

    ctx.font = `600 24px ${FONT_SANS}`;
    ctx.fillStyle = muted;
    ctx.fillText(input.bookTitle, headerX, afterTitleY + 8);
    ctx.restore();

    const trailY = blockStartY + 236;
    drawReadingTrail(ctx, {
      x: padX,
      y: trailY,
      width: contentW,
      startChapter: input.startChapterNumber,
      endChapter: input.endChapterNumber,
      startPct: input.startProgressPercent,
      endPct: input.endProgressPercent,
      trackColor: track,
      priorFillColor: priorTrack,
      accentColor: FURROW.accent,
      textColor: fg,
      mutedColor: isLightInk ? "#FFFFFF" : FURROW.paper,
      shadowColor,
    });

    if (visibleMetrics.length > 0) {
      const metricY = trailY + 124;
      const colGap = 24;
      const colW =
        (contentW - (visibleMetrics.length - 1) * colGap) /
        visibleMetrics.length;
      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;
      visibleMetrics.forEach((item, idx) => {
        const mx = padX + idx * (colW + colGap);
        ctx.fillStyle = muted;
        drawFittedText(
          ctx,
          item.label,
          mx,
          metricY,
          colW,
          700,
          20,
          14,
          FONT_MONO,
        );

        ctx.fillStyle = fg;
        drawFittedText(
          ctx,
          item.value,
          mx,
          metricY + 50,
          colW,
          700,
          42,
          24,
          FONT_MONO,
        );

        if (item.subValue) {
          ctx.fillStyle = muted;
          drawFittedText(
            ctx,
            item.subValue,
            mx,
            metricY + 80,
            colW,
            600,
            20,
            14,
            FONT_MONO,
          );
        }
      });
      ctx.restore();
    }

    drawBrandFooter(ctx, {
      x: padX,
      y: blockStartY + 560,
      width: contentW,
      foreground: fg,
      muted,
      accent: FURROW.accent,
      readerName: input.readerName,
      tag: streakTag,
      shadowColor,
    });
    return;
  }

  if (input.config.template === "photo_overlay") {
    if (photoImg) {
      drawImageCover(ctx, photoImg, 0, 0, width, height);
    } else {
      drawBlurredCoverBackdrop(
        ctx,
        coverImg,
        width,
        height,
        input.bookCoverColor,
      );
    }

    // Contrast-safe bottom-up editorial scrim
    const scrim = ctx.createLinearGradient(0, height * 0.22, 0, height);
    scrim.addColorStop(0, "rgba(19, 17, 15, 0.08)");
    scrim.addColorStop(0.45, "rgba(19, 17, 15, 0.56)");
    scrim.addColorStop(1, "rgba(19, 17, 15, 0.94)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);

    const anchorTop = isStory ? height - 670 : height - 560;
    drawBookCoverOrFallback(
      ctx,
      coverImg,
      padX,
      anchorTop,
      106,
      156,
      input.bookTitle,
      input.bookAuthor,
      input.bookCoverColor,
      10,
    );

    const headX = padX + 132;
    const headW = contentW - 132;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.accent;
    ctx.fillText("SELESAI MEMBACA", headX, anchorTop + 28);

    ctx.font = `700 36px ${FONT_SERIF}`;
    ctx.fillStyle = "#FFFFFF";
    const titleLines = wrapTextLines(ctx, input.title, headW).slice(0, 2);
    const afterTitleY = drawLines(ctx, titleLines, headX, anchorTop + 74, 44);

    ctx.font = `500 22px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.fillText(input.bookTitle, headX, afterTitleY + 6);

    const trailY = anchorTop + 216;
    drawReadingTrail(ctx, {
      x: padX,
      y: trailY,
      width: contentW,
      startChapter: input.startChapterNumber,
      endChapter: input.endChapterNumber,
      startPct: input.startProgressPercent,
      endPct: input.endProgressPercent,
      trackColor: "rgba(255, 255, 255, 0.22)",
      priorFillColor: "rgba(255, 255, 255, 0.50)",
      accentColor: FURROW.accent,
      textColor: "#FFFFFF",
      mutedColor: "#FFFFFF",
    });

    if (visibleMetrics.length > 0) {
      const metricY = trailY + 116;
      const colGap = 24;
      const colW =
        (contentW - (visibleMetrics.length - 1) * colGap) /
        visibleMetrics.length;
      visibleMetrics.forEach((item, idx) => {
        const mx = padX + idx * (colW + colGap);
        ctx.fillStyle = "rgba(255, 255, 255, 0.70)";
        drawFittedText(
          ctx,
          item.label,
          mx,
          metricY,
          colW,
          700,
          18,
          13,
          FONT_MONO,
        );

        ctx.fillStyle = "#FFFFFF";
        drawFittedText(
          ctx,
          item.value,
          mx,
          metricY + 44,
          colW,
          700,
          36,
          22,
          FONT_MONO,
        );

        if (item.subValue) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
          drawFittedText(
            ctx,
            item.subValue,
            mx,
            metricY + 72,
            colW,
            600,
            19,
            13,
            FONT_MONO,
          );
        }
      });
    }

    drawBrandFooter(ctx, {
      x: padX,
      y: height - 80,
      width: contentW,
      foreground: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.76)",
      accent: FURROW.accent,
      readerName: input.readerName,
      tag: streakTag,
    });
    return;
  }

  if (input.config.template === "literary_index") {
    ctx.fillStyle = FURROW.paper;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = FURROW.rule;
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.fillStyle = FURROW.accent;
    ctx.fillRect(48, 48, width - 96, 12);

    const topY = isStory ? 168 : 126;
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.accent;
    ctx.fillText("INDEKS BACA LITERASI", padX, topY);

    ctx.font = `600 20px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.inkMuted;
    ctx.textAlign = "right";
    ctx.fillText(
      streakTag ? streakTag.toUpperCase() : "CATATAN HARIAN",
      width - padX,
      topY,
    );
    ctx.textAlign = "left";

    ctx.fillStyle = FURROW.rule;
    ctx.fillRect(padX, topY + 26, contentW, 2);

    const bookY = topY + 72;
    drawBookCoverOrFallback(
      ctx,
      coverImg,
      padX,
      bookY,
      138,
      204,
      input.bookTitle,
      input.bookAuthor,
      input.bookCoverColor,
      10,
    );

    const infoX = padX + 168;
    const infoW = contentW - 168;
    ctx.font = `700 40px ${FONT_SERIF}`;
    ctx.fillStyle = FURROW.ink;
    const titleLines = wrapTextLines(ctx, input.title, infoW).slice(0, 3);
    const afterTitleY = drawLines(ctx, titleLines, infoX, bookY + 42, 48);

    ctx.font = `600 24px ${FONT_SANS}`;
    ctx.fillStyle = FURROW.inkSoft;
    ctx.fillText(input.bookTitle, infoX, afterTitleY + 12);
    if (input.bookAuthor?.trim()) {
      ctx.font = `400 21px ${FONT_SANS}`;
      ctx.fillStyle = FURROW.inkMuted;
      ctx.fillText(input.bookAuthor.trim(), infoX, afterTitleY + 46);
    }

    const trailY = bookY + 268;
    drawReadingTrail(ctx, {
      x: padX,
      y: trailY,
      width: contentW,
      startChapter: input.startChapterNumber,
      endChapter: input.endChapterNumber,
      startPct: input.startProgressPercent,
      endPct: input.endProgressPercent,
      trackColor: FURROW.paper3,
      priorFillColor: "#B7AE9F",
      accentColor: FURROW.accent,
      textColor: FURROW.ink,
      mutedColor: FURROW.paper,
    });

    if (visibleMetrics.length > 0) {
      const boxY = trailY + 96;
      const colW =
        (contentW - (visibleMetrics.length - 1) * 18) / visibleMetrics.length;
      const innerPad = 22;
      const maxTextW = Math.max(80, colW - innerPad * 2);
      visibleMetrics.forEach((item, idx) => {
        const bx = padX + idx * (colW + 18);
        drawRoundedRectPath(ctx, bx, boxY, colW, 138, 14);
        ctx.fillStyle = FURROW.paper2;
        ctx.fill();
        ctx.strokeStyle = FURROW.rule;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = FURROW.inkMuted;
        drawFittedText(
          ctx,
          item.label,
          bx + innerPad,
          boxY + 40,
          maxTextW,
          700,
          17,
          12,
          FONT_MONO,
        );

        ctx.fillStyle = FURROW.ink;
        drawFittedText(
          ctx,
          item.value,
          bx + innerPad,
          boxY + (item.subValue ? 82 : 94),
          maxTextW,
          700,
          32,
          20,
          FONT_MONO,
        );

        if (item.subValue) {
          ctx.fillStyle = FURROW.inkMuted;
          drawFittedText(
            ctx,
            item.subValue,
            bx + innerPad,
            boxY + 114,
            maxTextW,
            600,
            19,
            13,
            FONT_MONO,
          );
        }
      });
    }

    // Real 7-day consistency dots
    const dotsBoxY = isStory ? trailY + 290 : trailY + 264;
    const dots = computeSevenDayConsistency(input.recentSessions ?? []);
    drawRoundedRectPath(ctx, padX, dotsBoxY, contentW, 152, 16);
    ctx.fillStyle = FURROW.paper3;
    ctx.fill();

    ctx.font = `700 18px ${FONT_MONO}`;
    ctx.fillStyle = FURROW.inkSoft;
    ctx.fillText("KONSISTENSI 7 HARI TERAKHIR", padX + 28, dotsBoxY + 42);

    const activeCount = dots.filter((d) => d.active).length;
    ctx.textAlign = "right";
    ctx.fillStyle = FURROW.accent;
    ctx.fillText(
      `${activeCount}/7 hari aktif`,
      padX + contentW - 28,
      dotsBoxY + 42,
    );
    ctx.textAlign = "left";

    const dotStep = (contentW - 112) / 6;
    dots.forEach((dot, idx) => {
      const cx = padX + 56 + idx * dotStep;
      const cy = dotsBoxY + 92;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = dot.active ? FURROW.accent : FURROW.paper2;
      ctx.fill();
      ctx.strokeStyle = dot.active ? FURROW.accent : FURROW.rule;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = `600 16px ${FONT_MONO}`;
      ctx.fillStyle = dot.active ? FURROW.ink : FURROW.inkMuted;
      ctx.textAlign = "center";
      ctx.fillText(dot.dayLabel, cx, cy + 38);
      ctx.textAlign = "left";
    });

    if (input.note?.trim() && isStory) {
      const noteY = dotsBoxY + 206;
      ctx.fillStyle = FURROW.accent;
      ctx.fillRect(padX, noteY, 5, 110);
      ctx.font = `500 24px ${FONT_SERIF}`;
      ctx.fillStyle = FURROW.inkSoft;
      const noteLines = wrapTextLines(
        ctx,
        input.note.trim(),
        contentW - 32,
      ).slice(0, 3);
      drawLines(ctx, noteLines, padX + 24, noteY + 28, 34);
    }

    drawBrandFooter(ctx, {
      x: padX,
      y: height - 86,
      width: contentW,
      foreground: FURROW.ink,
      muted: FURROW.inkMuted,
      accent: FURROW.accent,
      readerName: input.readerName,
    });
    return;
  }

  // Default template: cover_trail
  drawBlurredCoverBackdrop(ctx, coverImg, width, height, input.bookCoverColor);

  const cardTop = isStory ? 220 : 88;
  const cardBottom = isStory ? height - 210 : height - 88;
  const cardH = cardBottom - cardTop;

  ctx.save();
  drawRoundedRectPath(ctx, 64, cardTop, width - 128, cardH, 28);
  ctx.fillStyle = "rgba(22, 20, 18, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(246, 242, 233, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const innerX = 114;
  const innerW = width - 228;
  const coverW = isStory ? 196 : 164;
  const coverH = isStory ? 288 : 242;

  drawBookCoverOrFallback(
    ctx,
    coverImg,
    innerX,
    cardTop + 62,
    coverW,
    coverH,
    input.bookTitle,
    input.bookAuthor,
    input.bookCoverColor,
    14,
  );

  const headX = innerX + coverW + 34;
  const headW = innerW - coverW - 34;
  ctx.font = `700 20px ${FONT_MONO}`;
  ctx.fillStyle = FURROW.accent;
  ctx.fillText("SESI MEMBACA", headX, cardTop + 98);

  ctx.font = `700 ${isStory ? 42 : 36}px ${FONT_SERIF}`;
  ctx.fillStyle = FURROW.paper;
  const titleLines = wrapTextLines(ctx, input.title, headW).slice(0, 3);
  const afterTitleY = drawLines(
    ctx,
    titleLines,
    headX,
    cardTop + 150,
    isStory ? 50 : 44,
  );

  ctx.font = `600 23px ${FONT_SANS}`;
  ctx.fillStyle = "rgba(246, 242, 233, 0.82)";
  ctx.fillText(input.bookTitle, headX, afterTitleY + 12);

  if (input.bookAuthor?.trim()) {
    ctx.font = `400 20px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(246, 242, 233, 0.62)";
    ctx.fillText(input.bookAuthor.trim(), headX, afterTitleY + 44);
  }

  const trailY = cardTop + coverH + (isStory ? 136 : 112);
  drawReadingTrail(ctx, {
    x: innerX,
    y: trailY,
    width: innerW,
    startChapter: input.startChapterNumber,
    endChapter: input.endChapterNumber,
    startPct: input.startProgressPercent,
    endPct: input.endProgressPercent,
    trackColor: "rgba(246, 242, 233, 0.16)",
    priorFillColor: "rgba(246, 242, 233, 0.44)",
    accentColor: FURROW.accent,
    textColor: FURROW.paper,
    mutedColor: FURROW.darkInkBg,
  });

  if (visibleMetrics.length > 0) {
    const metricTop = trailY + 108;
    const colW =
      (innerW - (visibleMetrics.length - 1) * 18) / visibleMetrics.length;
    const innerPad = 20;
    const maxTextW = Math.max(80, colW - innerPad * 2);
    visibleMetrics.forEach((item, idx) => {
      const mx = innerX + idx * (colW + 18);
      drawRoundedRectPath(ctx, mx, metricTop, colW, 138, 16);
      ctx.fillStyle = "rgba(254, 253, 251, 0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 242, 233, 0.14)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(246, 242, 233, 0.64)";
      drawFittedText(
        ctx,
        item.label,
        mx + innerPad,
        metricTop + 40,
        maxTextW,
        700,
        17,
        12,
        FONT_MONO,
      );

      ctx.fillStyle = FURROW.paper;
      drawFittedText(
        ctx,
        item.value,
        mx + innerPad,
        metricTop + (item.subValue ? 82 : 94),
        maxTextW,
        700,
        32,
        20,
        FONT_MONO,
      );

      if (item.subValue) {
        ctx.fillStyle = "rgba(246, 242, 233, 0.72)";
        drawFittedText(
          ctx,
          item.subValue,
          mx + innerPad,
          metricTop + 114,
          maxTextW,
          600,
          19,
          13,
          FONT_MONO,
        );
      }
    });
  }

  if (input.note?.trim()) {
    const noteY = cardBottom - 230;
    ctx.fillStyle = FURROW.accent;
    ctx.fillRect(innerX, noteY, 5, 86);
    ctx.font = `500 23px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(246, 242, 233, 0.84)";
    const noteLines = wrapTextLines(ctx, input.note.trim(), innerW - 26).slice(
      0,
      2,
    );
    drawLines(ctx, noteLines, innerX + 22, noteY + 28, 32);
  }

  drawBrandFooter(ctx, {
    x: innerX,
    y: cardBottom - 54,
    width: innerW,
    foreground: FURROW.paper,
    muted: "rgba(246, 242, 233, 0.72)",
    accent: FURROW.accent,
    readerName: input.readerName,
    tag: streakTag,
  });
}
