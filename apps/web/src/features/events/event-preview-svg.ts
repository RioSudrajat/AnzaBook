import { ANZA_ARCH_LOGO_PATHS } from "../../lib/brand-mark";
import {
  formatEventShareSchedule,
  getEventShareHostLine,
  getEventShareWorkLine,
  getEventTypeLabel,
  getSafeEventShareLocation,
  resolveEventSharePalette,
  type EventShareSource,
} from "./event-share";

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
  return `${clean.slice(0, Math.max(1, max - 1)).trimEnd()}...`;
}

function wrapSvgLines(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
  lineHeightEm = "1.22em",
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
          ? `${word.slice(0, maxCharsPerLine - 1)}...`
          : word,
      );
    }
  }
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = truncateText(
      visible[visible.length - 1] ?? "",
      Math.max(4, maxCharsPerLine - 3),
    );
  }
  return visible
    .map(
      (line, index) =>
        `<tspan x="0" dy="${index ? lineHeightEm : "0"}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

export function buildEventPreviewSvg(event: EventShareSource): string {
  const palette = resolveEventSharePalette(event.themePreset);
  const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
  const location = getSafeEventShareLocation(event);
  const hostLine = truncateText(getEventShareHostLine(event), 44);
  const workLine = getEventShareWorkLine(event);
  const typeLabel = getEventTypeLabel(event.eventType);

  const seatSummary = event.capacity
    ? `${event.attendeeCount}/${event.capacity} kursi terisi`
    : event.attendeeCount > 0
      ? `${event.attendeeCount} peserta terdaftar`
      : "Pendaftaran Terbuka";

  const accentBarFill = palette.accent;
  const mutedLine = escapeXml(
    `${typeLabel} · ${location.modeLabel}${event.categoryTag ? ` · #${truncateText(event.categoryTag, 18)}` : ""}`,
  );
  const primaryLoc = escapeXml(truncateText(location.primaryLine, 46));
  const secondaryLoc = location.secondaryLine
    ? escapeXml(truncateText(location.secondaryLine, 62))
    : "";

  const workBlock = workLine
    ? `<text transform="translate(840 430)" font-family="Literata" font-size="16" font-weight="600" fill="${palette.inkMuted}">${wrapSvgLines(`Karya: ${workLine}`, 26, 2, "1.25em")}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${palette.pageBg}"/>
  <rect x="34" y="34" width="1132" height="562" rx="22" fill="${palette.sheetBg}" stroke="${palette.border}" stroke-width="2"/>
  <path d="M68 112H774 M68 494H774" fill="none" stroke="${palette.border}" stroke-width="1.5"/>

  <g transform="translate(68 56) scale(0.72)">
    <path d="${ANZA_ARCH_LOGO_PATHS.leftSweep}" fill="${palette.ink}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.innerFold}" fill="${accentBarFill}"/>
    <path d="${ANZA_ARCH_LOGO_PATHS.rightWing}" fill="${palette.ink}"/>
  </g>
  <text x="114" y="81" font-family="Literata" font-size="22" font-weight="600" fill="${palette.ink}">AnzaBook · Agenda Komunitas</text>

  <text x="68" y="152" font-family="Literata" font-size="20" font-weight="600" fill="${accentBarFill}">${mutedLine}</text>

  <text transform="translate(68 214)" font-family="Literata" font-size="48" font-weight="600" fill="${palette.ink}">${wrapSvgLines(event.title, 26, 3, "1.18em")}</text>

  <text x="68" y="454" font-family="Literata" font-size="21" font-weight="600" fill="${palette.inkMuted}">Penyelenggara: ${escapeXml(hostLine)}</text>

  <text x="68" y="534" font-family="Literata" font-size="21" font-weight="600" fill="${palette.ink}">${primaryLoc}</text>
  ${secondaryLoc ? `<text x="68" y="564" font-family="Literata" font-size="16" font-weight="600" fill="${palette.inkMuted}">${secondaryLoc}</text>` : ""}

  <g transform="translate(0 0)">
    <rect x="812" y="76" width="320" height="478" rx="18" fill="${palette.cardBg}" stroke="${palette.border}" stroke-width="2"/>
    <rect x="812" y="76" width="320" height="12" rx="6" fill="${accentBarFill}"/>
    <text x="840" y="128" font-family="Literata" font-size="20" font-weight="600" fill="${accentBarFill}">${escapeXml(schedule.shortMonth)} ${escapeXml(schedule.year)}</text>
    <text x="840" y="218" font-family="Literata" font-size="88" font-weight="600" fill="${palette.ink}">${escapeXml(schedule.dayNumber)}</text>
    <text x="840" y="264" font-family="Literata" font-size="24" font-weight="600" fill="${palette.ink}">${escapeXml(schedule.weekday)}</text>
    <text x="840" y="298" font-family="Literata" font-size="19" font-weight="600" fill="${palette.inkMuted}">${escapeXml(schedule.timeRange)}</text>
    <path d="M840 328H1104" fill="none" stroke="${palette.border}" stroke-width="1.5"/>
    <rect x="840" y="352" width="112" height="36" rx="10" fill="${accentBarFill}"/>
    <text x="896" y="376" font-family="Literata" font-size="17" font-weight="600" text-anchor="middle" fill="${palette.accentInk}">Gratis</text>
    ${workBlock}
    <text x="840" y="520" font-family="Literata" font-size="17" font-weight="600" fill="${palette.ink}">${escapeXml(truncateText(seatSummary, 30))}</text>
  </g>
</svg>`;
}
