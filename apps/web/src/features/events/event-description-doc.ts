import type { JSONContent } from "@tiptap/core";
import type { EventCoHostDto } from "@starter/shared/types";
import type { EventTheme } from "@starter/shared/validators/community";
import { isUsableAssetUrl } from "../../lib/media-url";
import { safeExternalHref } from "../../lib/safe-url";

export type DescriptionInlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  linkHref?: string;
};

export type EventDescriptionBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      runs: DescriptionInlineRun[];
    }
  | {
      type: "paragraph";
      runs: DescriptionInlineRun[];
    }
  | {
      type: "blockquote";
      runs: DescriptionInlineRun[];
    }
  | {
      type: "bulletList";
      items: DescriptionInlineRun[][];
    }
  | {
      type: "orderedList";
      items: DescriptionInlineRun[][];
    }
  | {
      type: "divider";
    }
  | {
      type: "image";
      src: string;
      alt: string;
    };

export const PRESET_EVENT_BANNERS = [
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80",
] as const;

export type EventThemePreset = EventTheme;

export type EventTypeOption =
  | "book_club"
  | "film_discussion"
  | "silent_reading"
  | "book_launch"
  | "writing_session"
  | "community_meetup";

export type DefaultEventFormState = {
  title: string;
  coverUrl: string;
  themePreset: EventThemePreset;
  visibility: "public" | "private_link";
  eventType: EventTypeOption;
  categoryTag: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationState: {
    format: "offline" | "online" | "hybrid";
    hideAddressUntilApproved: boolean;
  };
  onlineMeetingUrl: string;
  description: string;
  logisticsNotes: string;
  selectedBookId: string;
  isLinkingWork: boolean;
  workMediaType: "book" | "film" | "article" | "other";
  workTitle: string;
  workCreator: string;
  workUrl: string;
  coHosts: EventCoHostDto[];
  requiresApproval: boolean;
  isUnlimitedCapacity: boolean;
  capacity: number;
};

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatLocalDateInput(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(Date.now() + 86_400_000);
    return `${fallback.getFullYear()}-${padTwo(fallback.getMonth() + 1)}-${padTwo(fallback.getDate())}`;
  }
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
}

export function formatLocalTimeInput(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return "19:00";
  }
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

export function createDefaultEventFormState(
  now = new Date(),
): DefaultEventFormState {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const dateStr = formatLocalDateInput(tomorrow);
  return {
    title: "",
    coverUrl: PRESET_EVENT_BANNERS[0],
    themePreset: "minimal",
    visibility: "public",
    eventType: "book_club",
    categoryTag: "Literasi",
    startDate: dateStr,
    startTime: "19:00",
    endDate: dateStr,
    endTime: "21:00",
    locationState: {
      format: "offline",
      hideAddressUntilApproved: false,
    },
    onlineMeetingUrl: "",
    description: "",
    logisticsNotes: "",
    selectedBookId: "",
    isLinkingWork: false,
    workMediaType: "book",
    workTitle: "",
    workCreator: "",
    workUrl: "",
    coHosts: [],
    requiresApproval: false,
    isUnlimitedCapacity: true,
    capacity: 30,
  };
}

function parseInlineRuns(line: string): DescriptionInlineRun[] {
  const runs: DescriptionInlineRun[] = [];
  const tokenRegex =
    /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/g;

  let lastIndex = 0;
  for (const match of line.matchAll(tokenRegex)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      runs.push({ text: line.slice(lastIndex, matchIndex) });
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      runs.push({ text: token.slice(2, -2), bold: true });
    } else if (
      token.startsWith("*") &&
      token.endsWith("*") &&
      token.length > 2
    ) {
      runs.push({ text: token.slice(1, -1), italic: true });
    } else if (
      token.startsWith("`") &&
      token.endsWith("`") &&
      token.length > 2
    ) {
      runs.push({ text: token.slice(1, -1), code: true });
    } else if (token.startsWith("[")) {
      const splitIdx = token.indexOf("](");
      if (splitIdx > 1) {
        const label = token.slice(1, splitIdx);
        const rawHref = token.slice(splitIdx + 2, -1);
        const safeHref = safeExternalHref(rawHref);
        if (safeHref) {
          runs.push({ text: label, linkHref: safeHref });
        } else {
          runs.push({ text: label });
        }
      } else {
        runs.push({ text: token });
      }
    }

    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < line.length) {
    runs.push({ text: line.slice(lastIndex) });
  }

  if (runs.length === 0) {
    return [{ text: "" }];
  }
  return runs;
}

function sanitizeImageSource(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !isUsableAssetUrl(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return safeExternalHref(trimmed);
}

const IMAGE_LINE_REGEX = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const ORDERED_ITEM_REGEX = /^\d+\.\s+(.*)$/;
const BULLET_ITEM_REGEX = /^[-*]\s+(.*)$/;

export function parseEventDescriptionBlocks(
  markdown: string,
): EventDescriptionBlock[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: EventDescriptionBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    const imageMatch = IMAGE_LINE_REGEX.exec(trimmed);
    if (imageMatch) {
      const safeSrc = sanitizeImageSource(imageMatch[2] ?? "");
      if (safeSrc) {
        blocks.push({
          type: "image",
          alt: (imageMatch[1] ?? "").trim() || "Gambar acara",
          src: safeSrc,
        });
      }
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({
        type: "heading",
        level: 3,
        runs: parseInlineRuns(trimmed.slice(4).trim()),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({
        type: "heading",
        level: 2,
        runs: parseInlineRuns(trimmed.slice(3).trim()),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({
        type: "heading",
        level: 1,
        runs: parseInlineRuns(trimmed.slice(2).trim()),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const current = (lines[index] ?? "").trim();
        if (!current.startsWith(">")) break;
        quoteLines.push(current.replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({
        type: "blockquote",
        runs: parseInlineRuns(quoteLines.join(" ").trim()),
      });
      continue;
    }

    if (BULLET_ITEM_REGEX.test(trimmed)) {
      const items: DescriptionInlineRun[][] = [];
      while (index < lines.length) {
        const match = BULLET_ITEM_REGEX.exec((lines[index] ?? "").trim());
        if (!match) break;
        items.push(parseInlineRuns((match[1] ?? "").trim()));
        index += 1;
      }
      blocks.push({ type: "bulletList", items });
      continue;
    }

    if (ORDERED_ITEM_REGEX.test(trimmed)) {
      const items: DescriptionInlineRun[][] = [];
      while (index < lines.length) {
        const match = ORDERED_ITEM_REGEX.exec((lines[index] ?? "").trim());
        if (!match) break;
        items.push(parseInlineRuns((match[1] ?? "").trim()));
        index += 1;
      }
      blocks.push({ type: "orderedList", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const currentRaw = lines[index] ?? "";
      const current = currentRaw.trim();
      if (
        !current ||
        /^---+$/.test(current) ||
        IMAGE_LINE_REGEX.test(current) ||
        current.startsWith("# ") ||
        current.startsWith("## ") ||
        current.startsWith("### ") ||
        current.startsWith(">") ||
        BULLET_ITEM_REGEX.test(current) ||
        ORDERED_ITEM_REGEX.test(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      runs: parseInlineRuns(paragraphLines.join(" ")),
    });
  }

  return blocks;
}

function runsToTiptapContent(runs: DescriptionInlineRun[]): JSONContent[] {
  const nodes: JSONContent[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
    if (run.bold) marks.push({ type: "bold" });
    if (run.italic) marks.push({ type: "italic" });
    if (run.code) marks.push({ type: "code" });
    if (run.linkHref) {
      marks.push({
        type: "link",
        attrs: {
          href: run.linkHref,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      });
    }
    nodes.push({
      type: "text",
      text: run.text,
      ...(marks.length > 0 ? { marks } : {}),
    });
  }
  return nodes;
}

export function markdownToTiptapDoc(markdown: string): JSONContent {
  const blocks = parseEventDescriptionBlocks(markdown);
  if (blocks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const content: JSONContent[] = blocks.map((block) => {
    switch (block.type) {
      case "heading": {
        const inline = runsToTiptapContent(block.runs);
        return {
          type: "heading",
          attrs: { level: block.level },
          ...(inline.length > 0 ? { content: inline } : {}),
        };
      }
      case "blockquote": {
        const inline = runsToTiptapContent(block.runs);
        return {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              ...(inline.length > 0 ? { content: inline } : {}),
            },
          ],
        };
      }
      case "bulletList":
        return {
          type: "bulletList",
          content: block.items.map((itemRuns) => {
            const inline = runsToTiptapContent(itemRuns);
            return {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  ...(inline.length > 0 ? { content: inline } : {}),
                },
              ],
            };
          }),
        };
      case "orderedList":
        return {
          type: "orderedList",
          content: block.items.map((itemRuns) => {
            const inline = runsToTiptapContent(itemRuns);
            return {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  ...(inline.length > 0 ? { content: inline } : {}),
                },
              ],
            };
          }),
        };
      case "divider":
        return { type: "horizontalRule" };
      case "image":
        return {
          type: "image",
          attrs: { src: block.src, alt: block.alt },
        };
      case "paragraph":
      default: {
        const inline = runsToTiptapContent(block.runs);
        return {
          type: "paragraph",
          ...(inline.length > 0 ? { content: inline } : {}),
        };
      }
    }
  });

  return { type: "doc", content };
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type !== "text" || typeof node.text !== "string") {
    if (Array.isArray(node.content)) {
      return node.content.map(serializeInlineNode).join("");
    }
    return "";
  }

  let output = node.text;
  const marks = node.marks ?? [];
  for (const mark of marks) {
    if (mark.type === "code") {
      output = `\`${output}\``;
    } else if (mark.type === "italic") {
      output = `*${output}*`;
    } else if (mark.type === "bold") {
      output = `**${output}**`;
    } else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      const safeHref = safeExternalHref(mark.attrs.href);
      if (safeHref) {
        output = `[${output}](${safeHref})`;
      }
    }
  }
  return output;
}

function serializeNodeContent(node: JSONContent): string {
  if (!Array.isArray(node.content)) return "";
  return node.content.map(serializeInlineNode).join("").trim();
}

export function tiptapDocToMarkdown(doc: JSONContent): string {
  const nodes = doc.content ?? [];
  const sections: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "heading": {
        const rawLevel = Number(node.attrs?.level);
        const level =
          rawLevel === 1 || rawLevel === 2 || rawLevel === 3 ? rawLevel : 2;
        const text = serializeNodeContent(node);
        if (text) {
          sections.push(`${"#".repeat(level)} ${text}`);
        }
        break;
      }
      case "blockquote": {
        const inner = (node.content ?? [])
          .map(serializeNodeContent)
          .filter(Boolean)
          .join("\n");
        if (inner) {
          sections.push(
            inner
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n"),
          );
        }
        break;
      }
      case "bulletList": {
        const lines = (node.content ?? [])
          .map((item) => {
            const inner = (item.content ?? [])
              .map(serializeNodeContent)
              .filter(Boolean)
              .join(" ");
            return inner ? `- ${inner}` : "";
          })
          .filter(Boolean);
        if (lines.length > 0) {
          sections.push(lines.join("\n"));
        }
        break;
      }
      case "orderedList": {
        const lines = (node.content ?? [])
          .map((item, idx) => {
            const inner = (item.content ?? [])
              .map(serializeNodeContent)
              .filter(Boolean)
              .join(" ");
            return inner ? `${idx + 1}. ${inner}` : "";
          })
          .filter(Boolean);
        if (lines.length > 0) {
          sections.push(lines.join("\n"));
        }
        break;
      }
      case "horizontalRule": {
        sections.push("---");
        break;
      }
      case "image": {
        const src =
          typeof node.attrs?.src === "string"
            ? sanitizeImageSource(node.attrs.src)
            : null;
        if (src) {
          const alt =
            typeof node.attrs?.alt === "string" && node.attrs.alt.trim()
              ? node.attrs.alt.trim().replace(/[[\]]/g, "")
              : "Gambar acara";
          sections.push(`![${alt}](${src})`);
        }
        break;
      }
      case "paragraph":
      default: {
        const text = serializeNodeContent(node);
        if (text) {
          sections.push(text);
        }
        break;
      }
    }
  }

  return sections.join("\n\n").trim();
}

export function eventDescriptionToPlainExcerpt(markdown: string): string {
  const blocks = parseEventDescriptionBlocks(markdown);
  const parts: string[] = [];

  for (const block of blocks) {
    if (
      block.type === "heading" ||
      block.type === "paragraph" ||
      block.type === "blockquote"
    ) {
      const line = block.runs
        .map((r) => r.text)
        .join("")
        .trim();
      if (line) parts.push(line);
    } else if (block.type === "bulletList" || block.type === "orderedList") {
      for (const item of block.items) {
        const line = item
          .map((r) => r.text)
          .join("")
          .trim();
        if (line) parts.push(line);
      }
    }
  }

  return parts.join(" · ");
}

/**
 * Normalizes a user-supplied URL (allowing bare domains such as meet.google.com/...)
 * and rejects unsafe schemes or malformed hostnames.
 */
export function normalizeOptionalHttpUrl(
  raw?: string | null,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (
    /^(javascript|data|vbscript|file):/i.test(trimmed) ||
    trimmed.startsWith("/")
  ) {
    return undefined;
  }
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    const host = parsed.hostname;
    if (!host || (!host.includes(".") && host !== "localhost")) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Surfaces field-level Indonesian Zod validation details instead of generic
 * English validation messages from the API error envelope.
 */
export function formatEventApiError(err: unknown, fallback: string): string {
  const apiErr = err as {
    message?: string;
    details?: Array<{ field?: string; message?: string }>;
  } | null;

  const details = Array.isArray(apiErr?.details)
    ? Array.from(
        new Set(
          apiErr.details
            .map((item) => item?.message?.trim())
            .filter((msg): msg is string => Boolean(msg)),
        ),
      )
    : [];

  if (details.length > 0) {
    return details.slice(0, 2).join(" ");
  }

  const rawMsg = apiErr?.message?.trim();
  if (!rawMsg) return fallback;
  if (rawMsg === "Check the supplied fields.") {
    return "Periksa kembali kolom wajib (judul, jadwal, lokasi, dan deskripsi) sebelum menyimpan.";
  }
  return rawMsg;
}
