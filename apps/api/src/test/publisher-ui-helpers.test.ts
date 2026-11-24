import { describe, expect, it } from "vitest";
import type { PublisherDto } from "@starter/shared/types";
import {
  MANUSCRIPT_STATUS_META,
  MAX_PUBLISHER_TOPICS,
  OFFICIAL_PUBLISHER_SLUG,
  canAccessPublisherStudio,
  canEditPublishedBooks,
  canManagePublisherProfile,
  canManagePublisherTeam,
  canReviewManuscripts,
  getManuscriptStatusBadgeClass,
  getManuscriptStatusMeta,
  isOfficialAnzaBookPublisher,
  normalizePublisherTopics,
  normalizeSocialLinks,
  rankSubmissionTargets,
} from "../../../web/src/features/publisher/publisher-helpers";

function makePublisher(overrides: Partial<PublisherDto> = {}): PublisherDto {
  return {
    id: overrides.id ?? "pub-1",
    slug: overrides.slug ?? "pustaka-merdeka",
    name: overrides.name ?? "Pustaka Merdeka",
    ikapiNumber: overrides.ikapiNumber ?? "123/DKI/2024",
    description: overrides.description ?? "Penerbit buku sastra dan sejarah.",
    logoUrl: overrides.logoUrl ?? null,
    headerImageUrl: overrides.headerImageUrl ?? null,
    city: overrides.city ?? "Jakarta",
    address: overrides.address ?? null,
    contactEmail: overrides.contactEmail ?? "redaksi@pustaka.id",
    topics: overrides.topics ?? ["Sastra & Fiksi", "Sejarah"],
    isAcceptingSubmissions: overrides.isAcceptingSubmissions ?? true,
    submissionGuidelines: overrides.submissionGuidelines ?? null,
    topicMatchScore: overrides.topicMatchScore,
    matchedTopics: overrides.matchedTopics,
    verificationStatus: overrides.verificationStatus ?? "verified",
    rejectionReason: overrides.rejectionReason ?? null,
    verificationDocuments: overrides.verificationDocuments ?? null,
    socialLinks: overrides.socialLinks ?? null,
    verifiedAt: overrides.verifiedAt ?? "2026-01-01T00:00:00.000Z",
    freeClaimCodeQuotaPerBook: overrides.freeClaimCodeQuotaPerBook ?? 500,
    claimCodeFeeIdr: overrides.claimCodeFeeIdr ?? 2500,
    totalBooks: overrides.totalBooks ?? 3,
    currentUserRole: overrides.currentUserRole ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("Publisher Studio & Dual Submission Helpers (Issue #10)", () => {
  it("normalizes topics cleanly, deduplicates case-insensitively, and caps at 15", () => {
    expect(MAX_PUBLISHER_TOPICS).toBe(15);

    const input = [
      "  Sastra & Fiksi ",
      "sastra & fiksi",
      "",
      "   ",
      "Filsafat   Kritis",
      ...Array.from({ length: 20 }, (_, i) => `Topik ${i + 1}`),
    ];

    const normalized = normalizePublisherTopics(input);
    expect(normalized).toHaveLength(15);
    expect(normalized[0]).toBe("Sastra & Fiksi");
    expect(normalized[1]).toBe("Filsafat Kritis");
    expect(normalized.includes("")).toBe(false);
  });

  it("normalizes social links and strips empty values", () => {
    expect(
      normalizeSocialLinks({
        website: "anzabook.id",
        instagram: "@anza.official",
        twitter: "  @anzabook  ",
        whatsapp: "   ",
      }),
    ).toEqual({
      website: "https://anzabook.id",
      instagram: "https://instagram.com/anza.official",
      twitter: "https://x.com/anzabook",
    });

    expect(
      normalizeSocialLinks({
        website: "https://penerbit.co.id",
        instagram: "https://instagram.com/penerbit",
        twitter: "https://twitter.com/penerbit",
        whatsapp: "https://wa.me/628123456",
      }),
    ).toEqual({
      website: "https://penerbit.co.id",
      instagram: "https://instagram.com/penerbit",
      twitter: "https://twitter.com/penerbit",
      whatsapp: "https://wa.me/628123456",
    });

    expect(normalizeSocialLinks({})).toBeUndefined();
  });

  it("identifies the official AnzaBook publisher slug case-insensitively", () => {
    expect(OFFICIAL_PUBLISHER_SLUG).toBe("anzabook");
    expect(isOfficialAnzaBookPublisher({ slug: "anzabook" })).toBe(true);
    expect(isOfficialAnzaBookPublisher({ slug: "AnzaBook" })).toBe(true);
    expect(isOfficialAnzaBookPublisher({ slug: "bentang-pustaka" })).toBe(
      false,
    );
    expect(isOfficialAnzaBookPublisher(null)).toBe(false);
  });

  it("pins AnzaBook first and ranks other verified accepting publishers by topic match + search", () => {
    const anza = makePublisher({
      id: "pub-anza",
      slug: "anzabook",
      name: "AnzaBook",
      topics: ["Filsafat", "Literasi Kritis"],
    });
    const highMatch = makePublisher({
      id: "pub-sastra",
      slug: "sastra-nusantara",
      name: "Sastra Nusantara",
      city: "Yogyakarta",
      topics: ["Sastra & Fiksi", "Puisi & Prosa", "Fiksi Sastra"],
    });
    const anotherVerified = makePublisher({
      id: "pub-alpha",
      slug: "alpha-press",
      name: "Alpha Press",
      city: "Bandung",
      topics: ["Sains Populer"],
    });
    const closedPub = makePublisher({
      id: "pub-closed",
      slug: "closed-press",
      name: "Closed Press",
      isAcceptingSubmissions: false,
      topics: ["Sastra & Fiksi"],
    });
    const pendingPub = makePublisher({
      id: "pub-pending",
      slug: "pending-press",
      name: "Pending Press",
      verificationStatus: "pending",
      topics: ["Sastra & Fiksi"],
    });

    const ranked = rankSubmissionTargets(
      [highMatch, closedPub, anotherVerified, pendingPub, anza],
      { topic: "Sastra" },
    );

    expect(ranked.map((p) => p.slug)).toEqual([
      "anzabook",
      "sastra-nusantara",
      "alpha-press",
    ]);
    expect(ranked[1].matchedTopics).toEqual(["Sastra & Fiksi", "Fiksi Sastra"]);
    expect((ranked[1].topicMatchScore ?? 0) > 0).toBe(true);

    const searched = rankSubmissionTargets([highMatch, anza, anotherVerified], {
      q: "yogyakarta",
    });
    expect(searched.map((p) => p.slug)).toEqual(["sastra-nusantara"]);
  });

  it("maps all 6 canonical manuscript statuses to metadata and Furrow token badges", () => {
    const expectedStatuses = [
      "draft",
      "pending_review",
      "in_editing",
      "revision_requested",
      "published",
      "rejected",
    ] as const;

    for (const status of expectedStatuses) {
      const meta = getManuscriptStatusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badgeClass).toContain("--color-");
      expect(MANUSCRIPT_STATUS_META[status]).toBeDefined();
    }

    expect(getManuscriptStatusMeta("pending_review").label).toBe(
      "Menunggu Kurasi",
    );
    expect(getManuscriptStatusMeta("in_editing").label).toBe(
      "Sedang Disunting",
    );
    expect(getManuscriptStatusBadgeClass("unknown_legacy")).toContain(
      "var(--color-muted)",
    );
  });

  it("enforces Studio role permissions cleanly for owner, editor, finance, and outsiders", () => {
    expect(canAccessPublisherStudio("owner")).toBe(true);
    expect(canAccessPublisherStudio("editor")).toBe(true);
    expect(canAccessPublisherStudio("finance")).toBe(true);
    expect(canAccessPublisherStudio(null)).toBe(false);
    expect(canAccessPublisherStudio(undefined)).toBe(false);

    expect(canManagePublisherTeam("owner")).toBe(true);
    expect(canManagePublisherTeam("editor")).toBe(false);
    expect(canManagePublisherTeam("finance")).toBe(false);

    expect(canManagePublisherProfile("owner")).toBe(true);
    expect(canManagePublisherProfile("editor")).toBe(false);

    expect(canReviewManuscripts("owner")).toBe(true);
    expect(canReviewManuscripts("editor")).toBe(true);
    expect(canReviewManuscripts("finance")).toBe(false);

    expect(canEditPublishedBooks("owner")).toBe(true);
    expect(canEditPublishedBooks("editor")).toBe(true);
    expect(canEditPublishedBooks("finance")).toBe(false);
  });
});
