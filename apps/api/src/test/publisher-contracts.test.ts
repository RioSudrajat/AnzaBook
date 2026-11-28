import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIGITAL_BOOK_PRICE_IDR,
  addApprovedWriterSchema,
  addPublisherMemberSchema,
  applyPublisherSchema,
  authorUpdateManuscriptSchema,
  deriveAccessTier,
  listSubmissionTargetsQuerySchema,
  publishManuscriptSchema,
  publisherEditManuscriptSchema,
  publisherMemberRoleEnum,
  publisherReviewManuscriptSchema,
  updateBookInventorySchema,
  updatePublisherBookSchema,
  updatePublisherMemberSchema,
  updatePublisherSchema,
  type AddApprovedWriterInput,
  type AddPublisherMemberInput,
  type AddPublisherMemberOutput,
  type AuthorUpdateManuscriptInput,
  type ListSubmissionTargetsInput,
  type ListSubmissionTargetsQuery,
  type PublishManuscriptInput,
  type PublisherEditManuscriptInput,
  type PublisherReviewManuscriptInput,
  type UpdateBookInventoryInput,
  type UpdatePublisherBookInput,
  type UpdatePublisherMemberInput,
} from "@starter/shared/validators/publisher";
import type {
  AdminOverviewDto,
  BookSummaryDto,
  ManagedPublisherSummaryDto,
  PublishManuscriptResultDto,
  PublisherApprovedWriterDto,
  PublisherDto,
  PublisherMemberDto,
  StoreBranchDto,
} from "@starter/shared/types";

describe("Publisher & Manuscript Shared Contracts", () => {
  it("supports topics, isAcceptingSubmissions, and submissionGuidelines on applyPublisherSchema and updatePublisherSchema", () => {
    const parsedApply = applyPublisherSchema.safeParse({
      name: "Pustaka Nusantara",
      slug: "pustaka-nusantara",
      topics: ["  Fiksi Sejarah  ", "Esai Budaya"],
      isAcceptingSubmissions: true,
      submissionGuidelines: "Kirim minimal 3 bab awal disertai sinopsis.",
    });

    expect(parsedApply.success).toBe(true);
    if (parsedApply.success) {
      expect(parsedApply.data.topics).toEqual(["Fiksi Sejarah", "Esai Budaya"]);
      expect(parsedApply.data.isAcceptingSubmissions).toBe(true);
      expect(parsedApply.data.submissionGuidelines).toBe(
        "Kirim minimal 3 bab awal disertai sinopsis.",
      );
    }

    expect(
      applyPublisherSchema.safeParse({
        name: "Pustaka Nusantara",
        slug: "pustaka-nusantara",
        topics: ["   "],
      }).success,
    ).toBe(false);

    expect(
      applyPublisherSchema.safeParse({
        name: "Pustaka Nusantara",
        slug: "pustaka-nusantara",
        topics: Array.from({ length: 16 }, (_, i) => `Topik ${i + 1}`),
      }).success,
    ).toBe(false);

    const parsedUpdate = updatePublisherSchema.safeParse({
      isAcceptingSubmissions: false,
      submissionGuidelines: null,
    });
    expect(parsedUpdate.success).toBe(true);

    expect(
      updatePublisherSchema.safeParse({
        unknownField: "nope",
      }).success,
    ).toBe(false);
  });

  it("validates logoUrl and headerImageUrl with root-relative asset paths, http(s) URLs, or empty string while rejecting protocol-relative or invalid paths", () => {
    for (const validUrl of [
      "/icon.svg",
      "/assets/banners/anzabook.webp",
      "https://example.com/logo.png",
      "http://localhost:3101/banner.png",
      "",
      null,
    ]) {
      expect(
        applyPublisherSchema.safeParse({
          name: "AnzaBook",
          slug: "anzabook",
          logoUrl: validUrl,
          headerImageUrl: validUrl,
        }).success,
      ).toBe(true);
      expect(
        updatePublisherSchema.safeParse({
          logoUrl: validUrl,
          headerImageUrl: validUrl,
        }).success,
      ).toBe(true);
    }

    for (const invalidUrl of [
      "//evil.com/x.png",
      "icon.svg",
      "javascript:alert(1)",
      "/path with spaces.png",
    ]) {
      expect(
        applyPublisherSchema.safeParse({
          name: "AnzaBook",
          slug: "anzabook",
          logoUrl: invalidUrl,
        }).success,
      ).toBe(false);
      expect(
        updatePublisherSchema.safeParse({
          headerImageUrl: invalidUrl,
        }).success,
      ).toBe(false);
    }
  });

  it("rejects status, publishedBookId, editorialNotes, and rejectionReason inside authorUpdateManuscriptSchema", () => {
    const valid: AuthorUpdateManuscriptInput = {
      publisherId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Draf Legal",
      slug: "draf-legal",
      category: "Fiksi",
      synopsis: "Sinopsis awal naskah.",
      proposedDigitalPolicy: "single_purchase",
      proposedDigitalPriceIdr: 49000,
    };
    expect(authorUpdateManuscriptSchema.safeParse(valid).success).toBe(true);
    expect(
      authorUpdateManuscriptSchema.safeParse({ publisherId: null }).success,
    ).toBe(true);

    for (const forbidden of [
      { title: "Draf Legal", status: "published" },
      {
        title: "Draf Legal",
        publishedBookId: "550e8400-e29b-41d4-a716-446655440000",
      },
      { title: "Draf Legal", editorialNotes: "Catatan internal" },
      { title: "Draf Legal", rejectionReason: "Ditolak" },
    ]) {
      expect(authorUpdateManuscriptSchema.safeParse(forbidden).success).toBe(
        false,
      );
    }
  });

  it("allows editorialNotes in publisherEditManuscriptSchema while rejecting status and publishedBookId", () => {
    const valid: PublisherEditManuscriptInput = {
      title: "Judul Suntingan",
      editorialNotes: "Perlu perapian ejaan di bab 2.",
      proposedDigitalPriceIdr: 55000,
    };
    expect(publisherEditManuscriptSchema.safeParse(valid).success).toBe(true);

    expect(
      publisherEditManuscriptSchema.safeParse({
        title: "Judul Suntingan",
        status: "published",
      }).success,
    ).toBe(false);

    expect(
      publisherEditManuscriptSchema.safeParse({
        title: "Judul Suntingan",
        publishedBookId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(false);
  });

  it("rejects approve action and empty notes for revision/rejection inside publisherReviewManuscriptSchema", () => {
    expect(
      publisherReviewManuscriptSchema.safeParse({
        action: "approve",
      }).success,
    ).toBe(false);

    const startEditing: PublisherReviewManuscriptInput = {
      action: "start_editing",
    };
    expect(
      publisherReviewManuscriptSchema.safeParse(startEditing).success,
    ).toBe(true);

    expect(
      publisherReviewManuscriptSchema.safeParse({
        action: "request_revision",
        notes: "   ",
      }).success,
    ).toBe(false);

    expect(
      publisherReviewManuscriptSchema.safeParse({
        action: "reject",
      }).success,
    ).toBe(false);

    expect(
      publisherReviewManuscriptSchema.safeParse({
        action: "request_revision",
        notes: "Mohon lengkapi daftar pustaka.",
      }).success,
    ).toBe(true);

    expect(
      publisherReviewManuscriptSchema.safeParse({
        action: "reject",
        notes: "Belum sesuai fokus katalog kami.",
      }).success,
    ).toBe(true);
  });

  it("validates publishManuscriptSchema with optional body and strict overrides", () => {
    const omitted: PublishManuscriptInput = undefined;
    expect(publishManuscriptSchema.safeParse(omitted).success).toBe(true);
    expect(publishManuscriptSchema.safeParse({}).success).toBe(true);

    const parsed = publishManuscriptSchema.safeParse({
      author: "Pramoedya",
      digitalPolicy: "single_purchase",
      digitalPriceIdr: 65000,
      categories: ["  Sastra  ", "Sejarah"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data?.categories).toEqual(["Sastra", "Sejarah"]);
    }

    expect(
      publishManuscriptSchema.safeParse({
        extraKey: true,
      }).success,
    ).toBe(false);
  });

  it("validates listSubmissionTargetsQuerySchema defaults and bounds", () => {
    const queryInput: ListSubmissionTargetsInput = {
      q: "gramedia",
      topic: "Fiksi",
    };
    expect(listSubmissionTargetsQuerySchema.parse(queryInput)).toEqual({
      q: "gramedia",
      topic: "Fiksi",
      limit: 50,
    });

    const parsed = listSubmissionTargetsQuerySchema.safeParse({
      q: "  gramedia ",
      topic: " Fiksi ",
      limit: "25",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const typed: ListSubmissionTargetsQuery = parsed.data;
      expect(typed).toEqual({
        q: "gramedia",
        topic: "Fiksi",
        limit: 25,
      });
    }

    expect(listSubmissionTargetsQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(listSubmissionTargetsQuerySchema.parse({ limit: "" })).toEqual({
      limit: 50,
    });
    expect(listSubmissionTargetsQuerySchema.parse({ limit: "   " })).toEqual({
      limit: 50,
    });
    expect(
      listSubmissionTargetsQuerySchema.parse({ limit: undefined }),
    ).toEqual({ limit: 50 });
    expect(
      listSubmissionTargetsQuerySchema.safeParse({ limit: 0 }).success,
    ).toBe(false);
    expect(
      listSubmissionTargetsQuerySchema.safeParse({ limit: 101 }).success,
    ).toBe(false);
    expect(
      listSubmissionTargetsQuerySchema.safeParse({ unknown: "x" }).success,
    ).toBe(false);
  });

  it("validates publisher member schemas and updatePublisherBookSchema", () => {
    expect(publisherMemberRoleEnum.options).toEqual([
      "owner",
      "editor",
      "finance",
    ]);

    const addInputWithoutRole: AddPublisherMemberInput = {
      email: "  editor@anzabook.id ",
    };
    const parsedAdd = addPublisherMemberSchema.safeParse(addInputWithoutRole);
    expect(parsedAdd.success).toBe(true);
    if (parsedAdd.success) {
      const typed: AddPublisherMemberOutput = parsedAdd.data;
      expect(typed).toEqual({
        email: "editor@anzabook.id",
        role: "editor",
      });
    }

    expect(
      addPublisherMemberSchema.safeParse({
        email: "not-an-email",
      }).success,
    ).toBe(false);

    const parsedMemberUpdate: UpdatePublisherMemberInput = { role: "finance" };
    expect(
      updatePublisherMemberSchema.safeParse(parsedMemberUpdate).success,
    ).toBe(true);
    expect(
      updatePublisherMemberSchema.safeParse({ role: "admin" }).success,
    ).toBe(false);

    const parsedBookUpdate: UpdatePublisherBookInput = {
      title: "Edisi Revisi",
      synopsis: "Sinopsis buku minimal sepuluh karakter.",
      coverUrl: null,
      categories: ["  Sains  "],
      digitalPolicy: "free_open",
      digitalPriceIdr: null,
    };
    const bookResult = updatePublisherBookSchema.safeParse(parsedBookUpdate);
    expect(bookResult.success).toBe(true);
    if (bookResult.success) {
      expect(bookResult.data.categories).toEqual(["Sains"]);
    }
    expect(
      updatePublisherBookSchema.safeParse({
        title: "A",
      }).success,
    ).toBe(false);
    expect(
      updatePublisherBookSchema.safeParse({
        status: "published",
      }).success,
    ).toBe(false);
  });

  it("validates Phase 1 distribution helper, approved writer, inventory, and DTO shapes", () => {
    expect(DEFAULT_DIGITAL_BOOK_PRICE_IDR).toBe(45_000);
    expect(deriveAccessTier("free_open")).toBe("free");
    expect(deriveAccessTier("single_purchase")).toBe("premium");
    expect(deriveAccessTier("nakama_subscription")).toBe("premium");

    const writerInput: AddApprovedWriterInput = { identifier: "@penulis" };
    expect(addApprovedWriterSchema.parse(writerInput)).toEqual({
      identifier: "@penulis",
      canFastTrack: true,
    });

    const invInput: UpdateBookInventoryInput = {
      items: [
        {
          branchId: "550e8400-e29b-41d4-a716-446655440000",
          rakyatStock: 10,
          standardStock: 5,
        },
      ],
    };
    expect(updateBookInventorySchema.safeParse(invInput).success).toBe(true);

    const publisherDtoCheck: Partial<PublisherDto> = {
      topics: ["Fiksi"],
      isAcceptingSubmissions: true,
      submissionGuidelines: null,
      topicMatchScore: 2,
      matchedTopics: ["Fiksi"],
      approvedWriters: [],
      isCurrentUserApprovedWriter: false,
    };
    const managedSummaryWithoutRole: ManagedPublisherSummaryDto = {
      id: "p1",
      name: "Anza Press",
      slug: "anza-press",
      logoUrl: null,
      headerImageUrl: null,
      city: "Jakarta",
      topics: ["Fiksi"],
      verificationStatus: "verified",
    };
    const managedSummaryWithNullRole: ManagedPublisherSummaryDto = {
      ...managedSummaryWithoutRole,
      role: null,
    };
    const bookSummaryCheck: Partial<BookSummaryDto> = {
      publisherName: "Anza Press",
      publisherLogoUrl: null,
      digitalPriceIdr: 45_000,
    };
    const memberCheck: PublisherMemberDto = {
      id: "m1",
      publisherId: "p1",
      userId: "u1",
      role: "editor",
      name: "Editor Satu",
      username: "editorsatu",
      email: "editor@anzabook.id",
      image: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const approvedWriterCheck: PublisherApprovedWriterDto = {
      id: "w1",
      publisherId: "p1",
      userId: "u2",
      invitedEmail: "rekanan@anzabook.id",
      name: "Penulis Rekanan",
      username: "rekanan",
      image: null,
      status: "active",
      canFastTrack: true,
      acceptedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const branchCheck: StoreBranchDto = {
      id: "b1",
      chainName: "gramedia",
      branchName: "Gramedia Matraman",
      address: "Jl. Matraman Raya",
      city: "Jakarta",
    };
    const publishResultCheck: Pick<
      PublishManuscriptResultDto,
      "publishedBookId" | "claimBatch"
    > = {
      publishedBookId: "b1",
      claimBatch: null,
    };
    const overviewCheck: Pick<AdminOverviewDto, "totalSinglePurchaseSalesIdr"> =
      { totalSinglePurchaseSalesIdr: 50_000 };

    expect(publisherDtoCheck.topics).toEqual(["Fiksi"]);
    expect(managedSummaryWithoutRole.role).toBeUndefined();
    expect(managedSummaryWithNullRole.role).toBeNull();
    expect(bookSummaryCheck.publisherName).toBe("Anza Press");
    expect(memberCheck.role).toBe("editor");
    expect(approvedWriterCheck.canFastTrack).toBe(true);
    expect(branchCheck.city).toBe("Jakarta");
    expect(publishResultCheck.publishedBookId).toBe("b1");
    expect(overviewCheck.totalSinglePurchaseSalesIdr).toBe(50_000);
  });
});
