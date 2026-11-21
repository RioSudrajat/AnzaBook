import { describe, expect, it } from "vitest";
import {
  addPublisherMemberSchema,
  applyPublisherSchema,
  authorUpdateManuscriptSchema,
  listSubmissionTargetsQuerySchema,
  publishManuscriptSchema,
  publisherEditManuscriptSchema,
  publisherMemberRoleEnum,
  publisherReviewManuscriptSchema,
  reviewManuscriptSchema,
  updateManuscriptSchema,
  updatePublisherBookSchema,
  updatePublisherMemberSchema,
  updatePublisherSchema,
  type AddPublisherMemberInput,
  type AuthorUpdateManuscriptInput,
  type ListSubmissionTargetsQuery,
  type PublishManuscriptInput,
  type PublisherEditManuscriptInput,
  type PublisherReviewManuscriptInput,
  type UpdatePublisherBookInput,
  type UpdatePublisherMemberInput,
} from "@starter/shared/validators/publisher";
import {
  adminEditManuscriptChapterSchema,
  adminEditManuscriptSchema,
  adminPublishManuscriptSchema,
} from "@starter/shared/validators/admin";
import type {
  AdminOverviewDto,
  BookSummaryDto,
  ManagedPublisherSummaryDto,
  PublishManuscriptResultDto,
  PublisherDto,
  PublisherMemberDto,
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

  it("rejects status, publishedBookId, editorialNotes, and rejectionReason inside authorUpdateManuscriptSchema", () => {
    const valid: AuthorUpdateManuscriptInput = {
      publisherId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Draf Legal",
      slug: "draf-legal",
      category: "Fiksi",
      synopsis: "Sinopsis awal naskah.",
      proposedDigitalPolicy: "hybrid_nakama_alacarte",
      proposedAlacartePriceIdr: 49000,
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
      proposedAlacartePriceIdr: 55000,
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
      digitalPolicy: "alacarte_only",
      alacartePriceIdr: 65000,
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

    const parsedAdd = addPublisherMemberSchema.safeParse({
      email: "  editor@anzabook.id ",
    });
    expect(parsedAdd.success).toBe(true);
    if (parsedAdd.success) {
      const typed: AddPublisherMemberInput = parsedAdd.data;
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
      alacartePriceIdr: null,
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

  it("keeps deprecated Slice 1 legacy exports available and exposes updated DTO shapes", () => {
    expect(adminEditManuscriptChapterSchema).toBeDefined();
    expect(adminEditManuscriptSchema).toBeDefined();
    expect(adminPublishManuscriptSchema).toBeDefined();
    expect(updateManuscriptSchema).toBeDefined();
    expect(reviewManuscriptSchema).toBeDefined();

    const publisherDtoCheck: Partial<PublisherDto> = {
      topics: ["Fiksi"],
      isAcceptingSubmissions: true,
      submissionGuidelines: null,
      topicMatchScore: 2,
      matchedTopics: ["Fiksi"],
    };
    const managedSummaryCheck: Partial<ManagedPublisherSummaryDto> = {
      topics: ["Fiksi"],
      role: null,
    };
    const bookSummaryCheck: Partial<BookSummaryDto> = {
      publisherName: "Anza Press",
      publisherLogoUrl: null,
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
    const publishResultCheck: Pick<
      PublishManuscriptResultDto,
      "publishedBookId" | "claimBatch"
    > = {
      publishedBookId: "b1",
      claimBatch: null,
    };
    const overviewCheck: Pick<AdminOverviewDto, "pendingManuscriptsCount"> = {};

    expect(publisherDtoCheck.topics).toEqual(["Fiksi"]);
    expect(managedSummaryCheck.role).toBeNull();
    expect(bookSummaryCheck.publisherName).toBe("Anza Press");
    expect(memberCheck.role).toBe("editor");
    expect(publishResultCheck.publishedBookId).toBe("b1");
    expect(overviewCheck.pendingManuscriptsCount).toBeUndefined();
  });
});
