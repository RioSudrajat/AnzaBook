import type { CardAspect } from "@starter/shared/types";
import {
  CARD_DIMENSIONS,
  ensureCanvasFontsReady,
  loadCanvasImage,
  type CardRenderOptions,
} from "@/features/share/card-renderer";
import {
  ANZA_ARCH_LOGO_PATHS,
  ANZA_ARCH_VIEWBOX,
  ANZA_BRAND_COLORS,
} from "@/lib/brand-mark";
import { eventDescriptionToPlainExcerpt } from "./event-description-doc";
import {
  formatEventShareSchedule,
  getEventShareHostLine,
  getEventShareWorkLine,
  getEventTypeLabel,
  getSafeEventShareLocation,
  resolveEventSharePalette,
  type EventShareMode,
  type EventSharePalette,
  type EventShareSource,
  type EventShareTemplate,
} from "./event-share";

const FONT_SERIF = '"Literata", Georgia, serif';
const FONT_CLASSIC = 'Georgia, Cambria, "Times New Roman", serif';
const FONT_SANS = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
const FONT_MONO = '"Red Hat Mono", ui-monospace, monospace';

export type EventShareCanvasInput = {
  event: EventShareSource;
  template: EventShareTemplate;
  aspect: CardAspect;
  mode: EventShareMode;
  readerName?: string | null;
  shareHostLabel?: string;
};

function resolveDisplayFont(palette: EventSharePalette): string {
  switch (palette.fontCode) {
    case "jk":
      return FONT_SANS;
    case "mn":
      return FONT_MONO;
    case "cl":
      return FONT_CLASSIC;
    case "li":
    default:
      return FONT_SERIF;
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
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

function drawClampedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): { nextY: number; lineCount: number } {
  const rawLines = wrapTextLines(ctx, text, maxWidth);
  const visible = rawLines.slice(0, maxLines);
  if (rawLines.length > maxLines && visible.length > 0) {
    let last = visible[visible.length - 1] ?? "";
    while (last.length > 3 && ctx.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    visible[visible.length - 1] = `${last}...`;
  }

  let cursorY = startY;
  for (const line of visible) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return { nextY: cursorY, lineCount: visible.length };
}

function truncateSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let candidate = text.trim();
  while (
    candidate.length > 1 &&
    ctx.measureText(`${candidate}...`).width > maxWidth
  ) {
    candidate = candidate.slice(0, -1).trimEnd();
  }
  return `${candidate}...`;
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  options: {
    bg: string;
    fg: string;
    border?: string;
    font: string;
    padX?: number;
    height?: number;
    radius?: number;
    maxWidth?: number;
  },
): number {
  const padX = options.padX ?? 20;
  const height = options.height ?? 42;
  const radius = options.radius ?? 12;

  ctx.save();
  ctx.font = options.font;
  const label =
    options.maxWidth && options.maxWidth > padX * 2
      ? truncateSingleLine(ctx, text, options.maxWidth - padX * 2)
      : text;
  const textW = ctx.measureText(label).width;
  const width = Math.min(
    textW + padX * 2,
    options.maxWidth ?? textW + padX * 2,
  );

  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = options.bg;
  ctx.fill();
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = options.fg;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + height / 2 + 1);
  ctx.restore();
  return width;
}

function drawThemeAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: EventSharePalette,
) {
  ctx.fillStyle = palette.pageBg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  const topGlow = ctx.createRadialGradient(
    width * 0.8,
    height * 0.14,
    20,
    width * 0.8,
    height * 0.14,
    Math.max(width, height) * 0.65,
  );
  topGlow.addColorStop(0, palette.accentSoft);
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  if (palette.styleCode === "gr" || palette.styleCode === "ln") {
    ctx.strokeStyle = palette.border;
    ctx.globalAlpha = palette.isDark ? 0.28 : 0.45;
    ctx.lineWidth = 1;
    const step = palette.styleCode === "ln" ? 72 : 56;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (palette.styleCode === "ms") {
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width * 0.92, height * 0.12, width * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width * 0.92, height * 0.12, width * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEventArtworkFrame(
  ctx: CanvasRenderingContext2D,
  coverImg: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  palette: EventSharePalette,
  schedule: ReturnType<typeof formatEventShareSchedule>,
) {
  if (coverImg) {
    drawImageCover(ctx, coverImg, x, y, w, h, radius);
    ctx.save();
    drawRoundedRectPath(ctx, x, y, w, h, radius);
    ctx.strokeStyle = palette.isDark
      ? "rgba(255,255,255,0.14)"
      : "rgba(19,17,15,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Fallback artwork when a remote cover lacks CORS headers so canvas export stays untainted.
  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  ctx.fillStyle = palette.cardBg;
  ctx.fillRect(x, y, w, h);

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, palette.accentSoft);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  for (let row = y + 36; row < y + h; row += 36) {
    ctx.beginPath();
    ctx.moveTo(x + 28, row);
    ctx.lineTo(x + w - 28, row);
    ctx.stroke();
  }

  drawAnzaBrandMark(
    ctx,
    x + w - Math.min(w, h) * 0.24 - 28,
    y + 28,
    Math.min(w, h) * 0.24,
    palette.ink,
    palette.accent,
  );

  ctx.fillStyle = palette.accent;
  ctx.font = `700 ${Math.max(18, Math.round(w * 0.04))}px ${FONT_MONO}`;
  ctx.fillText(
    `${schedule.shortMonth} ${schedule.year}`.trim(),
    x + 32,
    y + h - 98,
  );

  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${Math.max(44, Math.round(w * 0.13))}px ${FONT_SERIF}`;
  ctx.fillText(schedule.dayNumber, x + 32, y + h - 32);
  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawDateBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: EventSharePalette,
  schedule: ReturnType<typeof formatEventShareSchedule>,
) {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, 18);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRectPath(ctx, x, y, w, 14, 6);
  ctx.fillStyle = palette.accent;
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = palette.accent;
  ctx.font = `700 ${Math.round(w * 0.18)}px ${FONT_MONO}`;
  ctx.fillText(schedule.shortMonth, x + w / 2, y + h * 0.42);

  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${Math.round(w * 0.4)}px ${FONT_SERIF}`;
  ctx.fillText(schedule.dayNumber, x + w / 2, y + h * 0.82);
  ctx.restore();
}

function drawCardFooter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  palette: EventSharePalette,
  hostLabel: string,
  hintText: string,
) {
  ctx.save();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x + w, y - 24);
  ctx.stroke();

  drawAnzaBrandMark(ctx, x, y - 2, 34, palette.ink, palette.accent);

  ctx.fillStyle = palette.ink;
  ctx.font = `700 22px ${FONT_SERIF}`;
  ctx.fillText("AnzaBook", x + 46, y + 18);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `500 18px ${FONT_MONO}`;
  const maxHostW = Math.max(120, Math.floor(w * 0.46) - 46);
  ctx.fillText(truncateSingleLine(ctx, hostLabel, maxHostW), x + 46, y + 44);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.accent;
  ctx.font = `600 19px ${FONT_SANS}`;
  const maxHintW = Math.max(140, Math.floor(w * 0.48));
  ctx.fillText(truncateSingleLine(ctx, hintText, maxHintW), x + w, y + 24);
  ctx.restore();
}

function renderInvitationPoster(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: EventShareCanvasInput,
  coverImg: HTMLImageElement | null,
  palette: EventSharePalette,
) {
  const { event, aspect, mode } = input;
  const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
  const location = getSafeEventShareLocation(event);
  const hostLine = getEventShareHostLine(event);
  const workLine = getEventShareWorkLine(event);
  const typeLabel = getEventTypeLabel(event.eventType);
  const displayFont = resolveDisplayFont(palette);

  drawThemeAtmosphere(ctx, width, height, palette);

  const outerPad = aspect === "story" ? 64 : 52;
  const bottomSafe = aspect === "story" ? 136 : 48;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = width - outerPad * 2;
  const cardH = height - outerPad - bottomSafe;

  ctx.save();
  ctx.shadowColor = palette.isDark ? "rgba(0,0,0,0.45)" : "rgba(19,17,15,0.14)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = palette.sheetBg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const innerPad = aspect === "story" ? 54 : 44;
  const contentX = cardX + innerPad;
  const contentW = cardW - innerPad * 2;
  const hostLabel = input.shareHostLabel || "anzabook.id";

  if (aspect === "4:3") {
    const artW = Math.round(contentW * 0.42);
    const artH = cardH - innerPad * 2 - 76;
    drawEventArtworkFrame(
      ctx,
      coverImg,
      contentX + contentW - artW,
      cardY + innerPad,
      artW,
      artH,
      24,
      palette,
      schedule,
    );
    drawDateBadge(
      ctx,
      contentX + contentW - artW + 20,
      cardY + innerPad + 20,
      96,
      106,
      palette,
      schedule,
    );

    const leftW = contentW - artW - 42;
    let cursorY = cardY + innerPad;
    const badgeText = mode === "attending" ? "SAYA AKAN HADIR" : typeLabel;
    const w1 = drawPill(ctx, contentX, cursorY, badgeText, {
      bg: palette.accent,
      fg: palette.accentInk,
      font: `700 20px ${FONT_SANS}`,
      height: 42,
      padX: 20,
    });
    drawPill(ctx, contentX + w1 + 12, cursorY, location.modeLabel, {
      bg: palette.cardBg,
      fg: palette.ink,
      border: palette.border,
      font: `600 20px ${FONT_SANS}`,
      height: 42,
      padX: 18,
    });

    cursorY += 98;
    ctx.fillStyle = palette.ink;
    ctx.font = `700 48px ${displayFont}`;
    const titleRes = drawClampedLines(
      ctx,
      event.title,
      contentX,
      cursorY,
      leftW,
      58,
      3,
    );
    cursorY = titleRes.nextY + 12;

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 24px ${FONT_SANS}`;
    drawClampedLines(ctx, `Oleh ${hostLine}`, contentX, cursorY, leftW, 32, 1);
    cursorY += 56;

    const infoY = Math.max(cursorY, cardY + cardH - innerPad - 270);
    drawRoundedRectPath(ctx, contentX, infoY, leftW, 180, 20);
    ctx.fillStyle = palette.cardBg;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText("JADWAL & LOKASI", contentX + 24, infoY + 34);

    ctx.fillStyle = palette.ink;
    ctx.font = `700 24px ${FONT_SANS}`;
    ctx.fillText(schedule.dateLine, contentX + 24, infoY + 72);

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 21px ${FONT_MONO}`;
    ctx.fillText(schedule.timeRange, contentX + 24, infoY + 104);

    ctx.fillStyle = palette.ink;
    ctx.font = `600 22px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      location.primaryLine,
      contentX + 24,
      infoY + 144,
      leftW - 48,
      28,
      1,
    );

    drawCardFooter(
      ctx,
      contentX,
      cardY + cardH - innerPad - 32,
      contentW,
      palette,
      hostLabel,
      "Ketuk stiker tautan untuk daftar",
    );
    return;
  }

  const heroH = aspect === "story" ? 640 : 340;
  const heroY = cardY + innerPad;
  drawEventArtworkFrame(
    ctx,
    coverImg,
    contentX,
    heroY,
    contentW,
    heroH,
    24,
    palette,
    schedule,
  );

  // Scrim inside artwork bottom edge for crisp contrast overlay pills.
  const scrim = ctx.createLinearGradient(
    0,
    heroY + heroH - 170,
    0,
    heroY + heroH,
  );
  scrim.addColorStop(0, "rgba(15,13,11,0)");
  scrim.addColorStop(1, "rgba(15,13,11,0.72)");
  ctx.save();
  drawRoundedRectPath(ctx, contentX, heroY, contentW, heroH, 24);
  ctx.clip();
  ctx.fillStyle = scrim;
  ctx.fillRect(contentX, heroY + heroH - 170, contentW, 170);
  ctx.restore();

  drawDateBadge(
    ctx,
    contentX + contentW - 122,
    heroY + 24,
    98,
    108,
    palette,
    schedule,
  );

  const heroBadge = mode === "attending" ? "SAYA AKAN HADIR" : typeLabel;
  const badgeW = drawPill(ctx, contentX + 24, heroY + 24, heroBadge, {
    bg: palette.accent,
    fg: palette.accentInk,
    font: `700 21px ${FONT_SANS}`,
    height: 44,
    padX: 22,
  });
  drawPill(ctx, contentX + 24 + badgeW + 12, heroY + 24, location.modeLabel, {
    bg: "rgba(19, 17, 15, 0.82)",
    fg: "#FAF7F0",
    font: `600 21px ${FONT_SANS}`,
    height: 44,
    padX: 20,
  });

  if (mode === "attending" && input.readerName?.trim()) {
    drawPill(
      ctx,
      contentX + 24,
      heroY + heroH - 68,
      `Peserta: ${input.readerName.trim()}`,
      {
        bg: "rgba(252, 249, 243, 0.94)",
        fg: "#13110F",
        font: `700 21px ${FONT_SANS}`,
        height: 44,
        padX: 20,
        maxWidth: contentW - 48,
      },
    );
  }

  let cursorY = heroY + heroH + (aspect === "story" ? 68 : 48);
  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${aspect === "story" ? 56 : 44}px ${displayFont}`;
  const titleRes = drawClampedLines(
    ctx,
    event.title,
    contentX,
    cursorY,
    contentW,
    aspect === "story" ? 68 : 54,
    aspect === "story" ? 3 : 2,
  );
  cursorY = titleRes.nextY + (aspect === "story" ? 16 : 8);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `600 ${aspect === "story" ? 26 : 22}px ${FONT_SANS}`;
  drawClampedLines(
    ctx,
    `Diselenggarakan oleh ${hostLine}`,
    contentX,
    cursorY,
    contentW,
    34,
    1,
  );
  cursorY += aspect === "story" ? 52 : 38;

  if (workLine && aspect === "story") {
    ctx.fillStyle = palette.accent;
    ctx.font = `600 23px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      `Karya bahasan: ${workLine}`,
      contentX,
      cursorY,
      contentW,
      32,
      1,
    );
  }

  const footerY = cardY + cardH - innerPad - 32;
  const infoBoxH = aspect === "story" ? 236 : 162;
  const infoBoxY = footerY - infoBoxH - 42;

  drawRoundedRectPath(ctx, contentX, infoBoxY, contentW, infoBoxH, 22);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (aspect === "story") {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 18px ${FONT_MONO}`;
    ctx.fillText("WAKTU PELAKSANAAN", contentX + 30, infoBoxY + 40);

    ctx.fillStyle = palette.ink;
    ctx.font = `700 28px ${FONT_SANS}`;
    ctx.fillText(schedule.dateLine, contentX + 30, infoBoxY + 80);

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 24px ${FONT_MONO}`;
    ctx.fillText(schedule.timeRange, contentX + 30, infoBoxY + 114);

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(contentX + 30, infoBoxY + 136);
    ctx.lineTo(contentX + contentW - 30, infoBoxY + 136);
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.font = `700 18px ${FONT_MONO}`;
    ctx.fillText(
      location.isMaskedAddress ? "AREA ACARA" : "LOKASI",
      contentX + 30,
      infoBoxY + 168,
    );

    ctx.fillStyle = palette.ink;
    ctx.font = `700 26px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      location.primaryLine,
      contentX + 30,
      infoBoxY + 206,
      contentW - 60,
      32,
      1,
    );
  } else {
    const colW = (contentW - 60) / 2;
    ctx.fillStyle = palette.accent;
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText("JADWAL", contentX + 26, infoBoxY + 38);
    ctx.fillText(
      location.isMaskedAddress ? "AREA ACARA" : "LOKASI",
      contentX + colW + 44,
      infoBoxY + 38,
    );

    ctx.fillStyle = palette.ink;
    ctx.font = `700 24px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      schedule.dateLine,
      contentX + 26,
      infoBoxY + 76,
      colW - 12,
      30,
      1,
    );
    drawClampedLines(
      ctx,
      location.primaryLine,
      contentX + colW + 44,
      infoBoxY + 76,
      colW - 16,
      30,
      2,
    );

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 21px ${FONT_MONO}`;
    ctx.fillText(schedule.timeRange, contentX + 26, infoBoxY + 118);
  }

  drawCardFooter(
    ctx,
    contentX,
    footerY,
    contentW,
    palette,
    hostLabel,
    "Buka tautan acara untuk daftar",
  );
}

function renderEditorialFolio(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: EventShareCanvasInput,
  coverImg: HTMLImageElement | null,
  palette: EventSharePalette,
) {
  const { event, aspect, mode } = input;
  const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
  const location = getSafeEventShareLocation(event);
  const hostLine = getEventShareHostLine(event);
  const workLine = getEventShareWorkLine(event);
  const typeLabel = getEventTypeLabel(event.eventType);
  const excerpt = eventDescriptionToPlainExcerpt(event.description);
  const displayFont = resolveDisplayFont(palette);
  const hostLabel = input.shareHostLabel || "anzabook.id";

  drawThemeAtmosphere(ctx, width, height, palette);

  const margin = aspect === "story" ? 68 : 54;
  const bottomSafe = aspect === "story" ? 136 : 54;
  const sheetX = margin;
  const sheetY = margin;
  const sheetW = width - margin * 2;
  const sheetH = height - margin - bottomSafe;

  ctx.save();
  drawRoundedRectPath(ctx, sheetX, sheetY, sheetW, sheetH, 20);
  ctx.fillStyle = palette.sheetBg;
  ctx.fill();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner editorial hairline frame
  drawRoundedRectPath(
    ctx,
    sheetX + 12,
    sheetY + 12,
    sheetW - 24,
    sheetH - 24,
    14,
  );
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const innerX = sheetX + 44;
  const innerW = sheetW - 88;
  let y = sheetY + 54;

  // Masthead row
  drawAnzaBrandMark(ctx, innerX, y - 6, 30, palette.ink, palette.accent);
  ctx.fillStyle = palette.ink;
  ctx.font = `700 22px ${FONT_SERIF}`;
  ctx.fillText("ANZABOOK · FOLIO AGENDA", innerX + 42, y + 16);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.accent;
  ctx.font = `700 20px ${FONT_MONO}`;
  ctx.fillText(
    `${typeLabel.toUpperCase()} · ${location.modeLabel.toUpperCase()}`,
    innerX + innerW,
    y + 16,
  );
  ctx.textAlign = "left";

  y += 38;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(innerX, y);
  ctx.lineTo(innerX + innerW, y);
  ctx.stroke();

  y += 34;

  if (aspect === "4:3") {
    const thumbW = 390;
    const thumbH = 390;
    drawEventArtworkFrame(
      ctx,
      coverImg,
      innerX,
      y,
      thumbW,
      thumbH,
      16,
      palette,
      schedule,
    );

    const textX = innerX + thumbW + 40;
    const textW = innerW - thumbW - 40;
    if (mode === "attending") {
      drawPill(
        ctx,
        textX,
        y,
        input.readerName?.trim()
          ? `HADIR · ${input.readerName.trim().toUpperCase()}`
          : "SAYA AKAN HADIR",
        {
          bg: palette.accentSoft,
          fg: palette.accent,
          border: palette.accent,
          font: `700 18px ${FONT_MONO}`,
          height: 38,
          padX: 16,
          maxWidth: textW,
        },
      );
      y += 66;
    }

    ctx.fillStyle = palette.ink;
    ctx.font = `700 46px ${displayFont}`;
    const tRes = drawClampedLines(
      ctx,
      event.title,
      textX,
      y + 34,
      textW,
      56,
      3,
    );
    let ty = tRes.nextY + 10;

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 23px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      `Penyelenggara: ${hostLine}`,
      textX,
      ty,
      textW,
      30,
      1,
    );
    ty += 42;

    if (excerpt) {
      ctx.fillStyle = palette.inkMuted;
      ctx.font = `400 22px ${FONT_SERIF}`;
      drawClampedLines(ctx, excerpt, textX, ty, textW, 32, 3);
    }

    const metaY = sheetY + sheetH - 250;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(innerX, metaY);
    ctx.lineTo(innerX + innerW, metaY);
    ctx.stroke();

    const colW = (innerW - 40) / 2;
    ctx.fillStyle = palette.accent;
    ctx.font = `700 17px ${FONT_MONO}`;
    ctx.fillText("JADWAL AGENDA", innerX, metaY + 34);
    ctx.fillText("RUANG / LOKASI", innerX + colW + 40, metaY + 34);

    ctx.fillStyle = palette.ink;
    ctx.font = `700 25px ${FONT_SANS}`;
    ctx.fillText(schedule.dateLine, innerX, metaY + 70);
    drawClampedLines(
      ctx,
      location.primaryLine,
      innerX + colW + 40,
      metaY + 70,
      colW,
      32,
      2,
    );

    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 21px ${FONT_MONO}`;
    ctx.fillText(schedule.timeRange, innerX, metaY + 104);

    drawCardFooter(
      ctx,
      innerX,
      sheetY + sheetH - 72,
      innerW,
      palette,
      hostLabel,
      "Undangan Komunitas Pembaca",
    );
    return;
  }

  const titleStartY = y + (aspect === "story" ? 36 : 20);
  if (mode === "attending") {
    drawPill(
      ctx,
      innerX,
      y,
      input.readerName?.trim()
        ? `KONFIRMASI HADIR · ${input.readerName.trim().toUpperCase()}`
        : "SAYA AKAN HADIR DI AGENDA INI",
      {
        bg: palette.accent,
        fg: palette.accentInk,
        font: `700 18px ${FONT_MONO}`,
        height: 38,
        padX: 16,
        maxWidth: innerW,
      },
    );
    y += 72;
  } else {
    y = titleStartY;
  }

  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${aspect === "story" ? 56 : 44}px ${displayFont}`;
  const tRes = drawClampedLines(
    ctx,
    event.title,
    innerX,
    y + 24,
    innerW,
    aspect === "story" ? 68 : 54,
    aspect === "story" ? 3 : 2,
  );
  y = tRes.nextY + 12;

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `600 24px ${FONT_SANS}`;
  drawClampedLines(
    ctx,
    `Diselenggarakan oleh ${hostLine}`,
    innerX,
    y,
    innerW,
    32,
    1,
  );
  y += 38;

  const artH = aspect === "story" ? 490 : 250;
  drawEventArtworkFrame(
    ctx,
    coverImg,
    innerX,
    y,
    innerW,
    artH,
    18,
    palette,
    schedule,
  );
  y += artH + (aspect === "story" ? 42 : 24);

  if (excerpt && aspect === "story") {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(innerX, y - 16, 4, 128);
    ctx.fillStyle = palette.ink;
    ctx.font = `400 27px ${FONT_SERIF}`;
    const qRes = drawClampedLines(
      ctx,
      excerpt,
      innerX + 24,
      y + 16,
      innerW - 24,
      39,
      3,
    );
    y = Math.max(y + 132, qRes.nextY + 16);
  }

  if (workLine && aspect === "story") {
    ctx.fillStyle = palette.accent;
    ctx.font = `600 22px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      `Karya bahasan: ${workLine}`,
      innerX,
      y + 10,
      innerW,
      30,
      1,
    );
  }

  const footerY = sheetY + sheetH - 72;
  const gridY = footerY - (aspect === "story" ? 210 : 156);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(innerX, gridY);
  ctx.lineTo(innerX + innerW, gridY);
  ctx.stroke();

  const halfW = (innerW - 36) / 2;
  ctx.fillStyle = palette.accent;
  ctx.font = `700 17px ${FONT_MONO}`;
  ctx.fillText("JADWAL AGENDA", innerX, gridY + 34);
  ctx.fillText(
    location.isMaskedAddress ? "WILAYAH ACARA" : "LOKASI / RUANG",
    innerX + halfW + 36,
    gridY + 34,
  );

  ctx.fillStyle = palette.ink;
  ctx.font = `700 25px ${FONT_SANS}`;
  const dateRes = drawClampedLines(
    ctx,
    schedule.dateLine,
    innerX,
    gridY + 72,
    halfW,
    30,
    2,
  );
  const locRes = drawClampedLines(
    ctx,
    location.primaryLine,
    innerX + halfW + 36,
    gridY + 72,
    halfW,
    30,
    2,
  );

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `600 21px ${FONT_MONO}`;
  ctx.fillText(schedule.timeRange, innerX, dateRes.nextY + 8);
  if (location.secondaryLine) {
    ctx.font = `500 20px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      location.secondaryLine,
      innerX + halfW + 36,
      locRes.nextY + 8,
      halfW,
      26,
      1,
    );
  }

  drawCardFooter(
    ctx,
    innerX,
    footerY,
    innerW,
    palette,
    hostLabel,
    "Agenda Terbuka AnzaBook",
  );
}

function renderAttendingPass(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: EventShareCanvasInput,
  coverImg: HTMLImageElement | null,
  palette: EventSharePalette,
) {
  const { event, aspect, mode } = input;
  const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
  const location = getSafeEventShareLocation(event);
  const hostLine = getEventShareHostLine(event);
  const typeLabel = getEventTypeLabel(event.eventType);
  const displayFont = resolveDisplayFont(palette);
  const hostLabel = input.shareHostLabel || "anzabook.id";

  drawThemeAtmosphere(ctx, width, height, palette);

  const sidePad = aspect === "story" ? 78 : aspect === "4:3" ? 96 : 68;
  const topPad = aspect === "story" ? 132 : 56;
  const bottomSafe = aspect === "story" ? 168 : 56;
  const passX = sidePad;
  const passY = topPad;
  const passW = width - sidePad * 2;
  const passH = height - topPad - bottomSafe;

  ctx.save();
  ctx.shadowColor = palette.isDark ? "rgba(0,0,0,0.48)" : "rgba(19,17,15,0.16)";
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 16;
  drawRoundedRectPath(ctx, passX, passY, passW, passH, 30);
  ctx.fillStyle = palette.sheetBg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRectPath(ctx, passX, passY, passW, passH, 30);
  ctx.clip();

  // Accent ticket top band
  const bandH = aspect === "story" ? 124 : 96;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(passX, passY, passW, bandH);

  ctx.fillStyle = palette.accentInk;
  ctx.font = `700 ${aspect === "story" ? 26 : 22}px ${FONT_MONO}`;
  ctx.textBaseline = "middle";
  ctx.fillText(
    mode === "attending"
      ? "PAS PARTISIPAN · SAYA AKAN HADIR"
      : "UNDANGAN AGENDA KOMUNITAS",
    passX + 42,
    passY + bandH / 2,
  );

  ctx.textAlign = "right";
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.fillText(
    `${schedule.dayNumber} ${schedule.shortMonth}`,
    passX + passW - 42,
    passY + bandH / 2,
  );
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const contentX = passX + 44;
  const contentW = passW - 88;
  const perfY =
    aspect === "story"
      ? passY + Math.round(passH * 0.64)
      : passY + Math.round(passH * 0.61);

  if (aspect === "4:3") {
    const thumbW = 280;
    const thumbH = perfY - (passY + bandH) - 72;
    drawEventArtworkFrame(
      ctx,
      coverImg,
      contentX + contentW - thumbW,
      passY + bandH + 36,
      thumbW,
      Math.max(220, thumbH),
      20,
      palette,
      schedule,
    );

    const leftW = contentW - thumbW - 36;
    let cy = passY + bandH + 44;
    drawPill(ctx, contentX, cy, `${typeLabel} · ${location.modeLabel}`, {
      bg: palette.accentSoft,
      fg: palette.accent,
      font: `700 19px ${FONT_SANS}`,
      height: 38,
      padX: 16,
    });
    cy += 84;
    ctx.fillStyle = palette.ink;
    ctx.font = `700 44px ${displayFont}`;
    const res = drawClampedLines(ctx, event.title, contentX, cy, leftW, 54, 3);
    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 23px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      `Oleh ${hostLine}`,
      contentX,
      res.nextY + 12,
      leftW,
      30,
      1,
    );
  } else {
    let cy = passY + bandH + (aspect === "story" ? 42 : 28);
    const thumbH = aspect === "story" ? 460 : 210;
    drawEventArtworkFrame(
      ctx,
      coverImg,
      contentX,
      cy,
      contentW,
      thumbH,
      20,
      palette,
      schedule,
    );
    cy += thumbH + (aspect === "story" ? 44 : 26);

    drawPill(ctx, contentX, cy, `${typeLabel} · ${location.modeLabel}`, {
      bg: palette.accentSoft,
      fg: palette.accent,
      font: `700 20px ${FONT_SANS}`,
      height: 40,
      padX: 18,
    });
    cy += aspect === "story" ? 96 : 76;

    ctx.fillStyle = palette.ink;
    ctx.font = `700 ${aspect === "story" ? 48 : 38}px ${displayFont}`;
    const res = drawClampedLines(
      ctx,
      event.title,
      contentX,
      cy,
      contentW,
      aspect === "story" ? 58 : 46,
      aspect === "story" ? 3 : 2,
    );
    ctx.fillStyle = palette.inkMuted;
    ctx.font = `600 23px ${FONT_SANS}`;
    drawClampedLines(
      ctx,
      `Penyelenggara: ${hostLine}`,
      contentX,
      res.nextY + 10,
      contentW,
      30,
      1,
    );
  }

  // Perforated tear line across ticket stub
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(passX + 24, perfY);
  ctx.lineTo(passX + passW - 24, perfY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Lower ticket stub (NO checkinCode or private meeting URL!)
  const stubX = contentX;
  let sy = perfY + (aspect === "story" ? 52 : 40);
  const colW = (contentW - 36) / 2;

  ctx.fillStyle = palette.accent;
  ctx.font = `700 17px ${FONT_MONO}`;
  ctx.fillText(
    mode === "attending" ? "PESERTA TERKONFIRMASI" : "STATUS PENDAFTARAN",
    stubX,
    sy,
  );
  ctx.fillText("JADWAL AGENDA", stubX + colW + 36, sy);

  sy += 38;
  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${aspect === "story" ? 30 : 25}px ${FONT_SANS}`;
  const attendeeDisplay =
    mode === "attending"
      ? input.readerName?.trim() || "Pembaca AnzaBook"
      : "Terbuka untuk Komunitas";
  drawClampedLines(ctx, attendeeDisplay, stubX, sy, colW, 34, 1);
  drawClampedLines(ctx, schedule.dateLine, stubX + colW + 36, sy, colW, 32, 1);

  sy += aspect === "story" ? 42 : 34;
  ctx.fillStyle = palette.inkMuted;
  ctx.font = `600 21px ${FONT_MONO}`;
  ctx.fillText(
    event.attendeeCount > 0
      ? `${event.attendeeCount} peserta bergabung`
      : "Gratis · Tiket Terbuka",
    stubX,
    sy,
  );
  ctx.fillText(schedule.timeRange, stubX + colW + 36, sy);

  sy += aspect === "story" ? 56 : 36;
  ctx.fillStyle = palette.accent;
  ctx.font = `700 17px ${FONT_MONO}`;
  ctx.fillText(
    location.isMaskedAddress ? "WILAYAH ACARA" : "LOKASI / PLATFORM",
    stubX,
    sy,
  );

  sy += 34;
  ctx.fillStyle = palette.ink;
  ctx.font = `600 24px ${FONT_SANS}`;
  drawClampedLines(ctx, location.primaryLine, stubX, sy, contentW, 30, 1);

  drawCardFooter(
    ctx,
    stubX,
    passY + passH - 64,
    contentW,
    palette,
    hostLabel,
    "Ajak teman baca bergabung",
  );
  ctx.restore();

  // Outer pass stroke + side perforation notches
  ctx.save();
  drawRoundedRectPath(ctx, passX, passY, passW, passH, 30);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const notchRadius = 20;
  ctx.fillStyle = palette.pageBg;
  ctx.beginPath();
  ctx.arc(passX, perfY, notchRadius, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(passX + passW, perfY, notchRadius, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export async function renderEventShareCard(
  canvas: HTMLCanvasElement,
  input: EventShareCanvasInput,
  options?: CardRenderOptions,
): Promise<boolean> {
  await ensureCanvasFontsReady();
  const coverImg = await loadCanvasImage(input.event.coverUrl);

  if (options?.isCancelled?.()) {
    return false;
  }

  const dims = CARD_DIMENSIONS[input.aspect];
  canvas.width = dims.width;
  canvas.height = dims.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const palette = resolveEventSharePalette(input.event.themePreset);

  if (input.template === "editorial_folio") {
    renderEditorialFolio(
      ctx,
      dims.width,
      dims.height,
      input,
      coverImg,
      palette,
    );
  } else if (input.template === "attending_pass") {
    renderAttendingPass(ctx, dims.width, dims.height, input, coverImg, palette);
  } else {
    renderInvitationPoster(
      ctx,
      dims.width,
      dims.height,
      input,
      coverImg,
      palette,
    );
  }

  return true;
}
