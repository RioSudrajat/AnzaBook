import type {
  ManuscriptSubmissionStatus,
  PublisherDto,
  PublisherMemberRole,
} from "@starter/shared/types";

export const MAX_PUBLISHER_TOPICS = 15;
export const OFFICIAL_PUBLISHER_SLUG = "anzabook";

export function isOfficialAnzaBookPublisher(
  publisher?: Pick<PublisherDto, "slug"> | null,
): boolean {
  return (
    (publisher?.slug ?? "").trim().toLowerCase() === OFFICIAL_PUBLISHER_SLUG
  );
}

/**
 * Trims, collapses whitespace, deduplicates case-insensitively, and caps topics at 15.
 */
export function normalizePublisherTopics(topics: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of topics) {
    const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_PUBLISHER_TOPICS) break;
  }

  return result;
}

export interface RawSocialLinksInput {
  website?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  whatsapp?: string | null;
}

export type NormalizedSocialLinks = {
  website?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
};

function normalizeHandleUrl(value: string, prefix: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanHandle = trimmed.replace(/^@+/, "");
  return cleanHandle ? `${prefix}${cleanHandle}` : "";
}

/**
 * Normalizes optional publisher social links and strips blank entries.
 */
export function normalizeSocialLinks(
  links?: RawSocialLinksInput | null,
): NormalizedSocialLinks | undefined {
  if (!links) return undefined;

  const out: NormalizedSocialLinks = {};
  const website = links.website?.trim();
  if (website) {
    out.website = /^https?:\/\//i.test(website)
      ? website
      : `https://${website}`;
  }

  const instagram = links.instagram?.trim();
  if (instagram) {
    const normalized = normalizeHandleUrl(instagram, "https://instagram.com/");
    if (normalized) out.instagram = normalized;
  }

  const twitter = links.twitter?.trim();
  if (twitter) {
    const normalized = normalizeHandleUrl(twitter, "https://x.com/");
    if (normalized) out.twitter = normalized;
  }

  const whatsapp = links.whatsapp?.trim();
  if (whatsapp) {
    out.whatsapp = whatsapp;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function tokenizeTopicQuery(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/**
 * Client-side topic-ranked fallback sorting when `/api/publisher/submission-targets`
 * is unavailable or needs local filtering. Always pins the official AnzaBook publisher
 * first among matching verified accepting publishers.
 */
export function rankSubmissionTargets(
  publishers: readonly PublisherDto[],
  params?: { q?: string; topic?: string },
): PublisherDto[] {
  const q = params?.q?.trim().toLowerCase() ?? "";
  const topicQuery = params?.topic?.trim() ?? "";
  const topicQueryLower = topicQuery.toLowerCase();
  const topicTokens = tokenizeTopicQuery(topicQuery);

  const eligible = publishers.filter((pub) => {
    if (pub.verificationStatus !== "verified") return false;
    if (
      pub.isAcceptingSubmissions === false &&
      !pub.isCurrentUserApprovedWriter
    ) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      pub.name,
      pub.slug,
      pub.city ?? "",
      pub.description ?? "",
      ...(pub.topics ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  const scored = eligible.map((pub) => {
    const pubTopics = pub.topics ?? [];
    const matchedTopics = topicQuery
      ? pubTopics.filter((t) => {
          const lower = t.toLowerCase();
          if (
            lower.includes(topicQueryLower) ||
            topicQueryLower.includes(lower)
          ) {
            return true;
          }
          return topicTokens.some((tok) => lower.includes(tok));
        })
      : [];

    const existingMatched = pub.matchedTopics ?? [];
    const mergedMatched =
      matchedTopics.length > 0 ? matchedTopics : existingMatched;
    const computedScore =
      mergedMatched.length > 0
        ? mergedMatched.length * 10
        : (pub.topicMatchScore ?? 0);

    return {
      ...pub,
      matchedTopics: mergedMatched,
      topicMatchScore: computedScore,
    };
  });

  return scored.sort((a, b) => {
    const aOfficial = isOfficialAnzaBookPublisher(a) ? 1 : 0;
    const bOfficial = isOfficialAnzaBookPublisher(b) ? 1 : 0;
    if (aOfficial !== bOfficial) return bOfficial - aOfficial;

    const scoreDiff = (b.topicMatchScore ?? 0) - (a.topicMatchScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    return a.name.localeCompare(b.name, "id");
  });
}

export type ManuscriptStatusMeta = {
  label: string;
  description: string;
  badgeClass: string;
};

export const MANUSCRIPT_STATUS_META: Record<
  ManuscriptSubmissionStatus,
  ManuscriptStatusMeta
> = {
  draft: {
    label: "Draf",
    description: "Sedang ditulis dan belum diajukan ke penerbit.",
    badgeClass:
      "bg-[var(--color-paper-3)] text-[var(--color-ink)] border-[var(--color-rule)]",
  },
  pending_review: {
    label: "Menunggu Kurasi",
    description: "Sudah masuk ke inbox redaksi dan menunggu ditinjau.",
    badgeClass:
      "bg-[var(--color-accent-soft)] text-[var(--color-ink)] border-[var(--color-accent)]/40",
  },
  in_editing: {
    label: "Sedang Disunting",
    description: "Editor penerbit sedang menyunting dan meninjau naskah.",
    badgeClass:
      "bg-[var(--color-water-soft)] text-[var(--color-ink)] border-[var(--color-water)]/40",
  },
  revision_requested: {
    label: "Perlu Revisi",
    description: "Redaksi meminta perbaikan sesuai catatan editorial.",
    badgeClass:
      "bg-[var(--color-accent-soft)] text-[var(--color-ink)] border-[var(--color-accent)]",
  },
  published: {
    label: "Diterbitkan",
    description: "Sudah terbit di katalog resmi AnzaBook.",
    badgeClass:
      "bg-[var(--color-green-soft)] text-[var(--color-ink)] border-[var(--color-green)]/40",
  },
  rejected: {
    label: "Ditolak",
    description: "Naskah belum memenuhi kriteria kurasi saat ini.",
    badgeClass:
      "bg-[var(--color-error-soft)] text-[var(--color-ink)] border-[var(--color-error)]/40",
  },
};

const FALLBACK_STATUS_META: ManuscriptStatusMeta = {
  label: "Status Lainnya",
  description: "Status naskah.",
  badgeClass:
    "bg-[var(--color-paper-3)] text-[var(--color-muted)] border-[var(--color-rule)]",
};

export function getManuscriptStatusMeta(
  status?: string | null,
): ManuscriptStatusMeta {
  if (!status) return MANUSCRIPT_STATUS_META.draft;
  const normalized = status.toLowerCase();
  if (normalized === "submitted") return MANUSCRIPT_STATUS_META.pending_review;
  if (normalized === "under_review") return MANUSCRIPT_STATUS_META.in_editing;
  if (normalized === "accepted") return MANUSCRIPT_STATUS_META.published;
  if (normalized in MANUSCRIPT_STATUS_META) {
    return MANUSCRIPT_STATUS_META[normalized as ManuscriptSubmissionStatus];
  }
  return {
    ...FALLBACK_STATUS_META,
    label: status.replace(/_/g, " "),
  };
}

export function getManuscriptStatusBadgeClass(status?: string | null): string {
  return getManuscriptStatusMeta(status).badgeClass;
}

export function canAccessPublisherStudio(
  role?: PublisherMemberRole | string | null,
): boolean {
  return role === "owner" || role === "editor" || role === "finance";
}

export function canManagePublisherTeam(
  role?: PublisherMemberRole | string | null,
): boolean {
  return role === "owner";
}

export function canManagePublisherProfile(
  role?: PublisherMemberRole | string | null,
): boolean {
  return role === "owner";
}

export function canReviewManuscripts(
  role?: PublisherMemberRole | string | null,
): boolean {
  return role === "owner" || role === "editor";
}

export function canEditPublishedBooks(
  role?: PublisherMemberRole | string | null,
): boolean {
  return role === "owner" || role === "editor";
}
