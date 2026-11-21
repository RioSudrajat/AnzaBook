import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import "./helpers";
import { assignPublisherOwner } from "../assign-publisher-owner";
import { db } from "../db";
import {
  account,
  books,
  publisherMembers,
  publishers,
  user,
} from "../db/schema";
import { ensureAnzaBookPublisher, seedCatalog } from "../db/seed-catalog";
import { allBooksData } from "../db/seeds/books-data";

const ANZABOOK_EXPECTED_TOPICS = [
  "Ekonomi",
  "Sejarah",
  "Politik",
  "Sains & Filsafat",
  "Sastra & Fiksi",
  "Non-Fiksi Populer",
];

describe("AnzaBook Official Publisher Seed & Owner Assignment CLI", () => {
  const createdUserIds: string[] = [];
  const createdPublisherIds: string[] = [];

  afterAll(async () => {
    if (createdPublisherIds.length > 0) {
      await db
        .delete(publishers)
        .where(inArray(publishers.id, createdPublisherIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(user).where(inArray(user.id, createdUserIds));
    }
    await seedCatalog(db);
  });

  it("idempotently seeds AnzaBook publisher, preserves verifiedAt & custom book publisherId, and backfills all 13 seeded books", async () => {
    await seedCatalog(db);
    await seedCatalog(db);

    const matchingPublishers = await db
      .select()
      .from(publishers)
      .where(eq(publishers.slug, "anzabook"));

    expect(matchingPublishers).toHaveLength(1);
    const anzabookPub = matchingPublishers[0];
    expect(anzabookPub.name).toBe("AnzaBook");
    expect(anzabookPub.logoUrl).toBe("/icon.svg");
    expect(anzabookPub.city).toBe("Jakarta");
    expect(anzabookPub.contactEmail).toBe("redaksi@anzabook.id");
    expect(anzabookPub.description).toBe(
      "Lini penerbitan resmi AnzaBook untuk literasi berdaulat, edisi cetak rakyat, dan kurasi karya penulis independen Indonesia.",
    );
    expect(anzabookPub.topics).toEqual(ANZABOOK_EXPECTED_TOPICS);
    expect(anzabookPub.verificationStatus).toBe("verified");
    expect(anzabookPub.verifiedAt).toBeInstanceOf(Date);
    expect(anzabookPub.isAcceptingSubmissions).toBe(true);

    const firstVerifiedAt = anzabookPub.verifiedAt?.getTime();

    const seededSlugs = allBooksData.map((b) => b.slug);
    expect(seededSlugs).toHaveLength(13);

    const seededBooks = await db
      .select({
        id: books.id,
        slug: books.slug,
        publisherId: books.publisherId,
      })
      .from(books)
      .where(inArray(books.slug, seededSlugs));

    expect(seededBooks).toHaveLength(13);
    for (const book of seededBooks) {
      expect(book.publisherId).toBe(anzabookPub.id);
    }

    // Verify null backfill does not overwrite custom non-null publisherId and verifiedAt is preserved
    const [customPub] = await db
      .insert(publishers)
      .values({
        slug: `custom-pub-${randomUUID().slice(0, 8)}`,
        name: "Penerbit Kustom Uji",
        verificationStatus: "verified",
      })
      .returning();
    createdPublisherIds.push(customPub.id);

    const bookForNullBackfill = seededBooks[0];
    const bookWithCustomPublisher = seededBooks[1];

    try {
      await db
        .update(books)
        .set({ publisherId: null })
        .where(eq(books.id, bookForNullBackfill.id));
      await db
        .update(books)
        .set({ publisherId: customPub.id })
        .where(eq(books.id, bookWithCustomPublisher.id));
      await db
        .update(publishers)
        .set({ topics: [] })
        .where(eq(publishers.id, anzabookPub.id));

      await seedCatalog(db);

      const [updatedPub] = await db
        .select()
        .from(publishers)
        .where(eq(publishers.id, anzabookPub.id));
      expect(updatedPub.verifiedAt?.getTime()).toBe(firstVerifiedAt);
      expect(updatedPub.topics).toEqual(ANZABOOK_EXPECTED_TOPICS);

      const [backfilledBook] = await db
        .select({ publisherId: books.publisherId })
        .from(books)
        .where(eq(books.id, bookForNullBackfill.id));
      expect(backfilledBook.publisherId).toBe(anzabookPub.id);

      const [preservedBook] = await db
        .select({ publisherId: books.publisherId })
        .from(books)
        .where(eq(books.id, bookWithCustomPublisher.id));
      expect(preservedBook.publisherId).toBe(customPub.id);
    } finally {
      await db
        .update(books)
        .set({ publisherId: anzabookPub.id })
        .where(
          inArray(books.id, [
            bookForNullBackfill.id,
            bookWithCustomPublisher.id,
          ]),
        );
    }
  });

  it("seeds @anzabook editorial account as verified non-admin author, preserves member promotions, handles username collisions, and omits passwords in production", async () => {
    await seedCatalog(db);

    const [anzabookPub] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.slug, "anzabook"));
    expect(anzabookPub).toBeDefined();

    const [editorialUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, "redaksi@anzabook.id"));
    expect(editorialUser).toBeDefined();
    expect(editorialUser.username).toBe("anzabook");
    expect(editorialUser.name).toBe("AnzaBook");
    expect(editorialUser.authorPenName).toBe("Redaksi AnzaBook");
    expect(editorialUser.role).toBe("user");
    expect(editorialUser.emailVerified).toBe(true);
    expect(editorialUser.authorStatus).toBe("verified");

    const [membership] = await db
      .select()
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, anzabookPub.id),
          eq(publisherMembers.userId, editorialUser.id),
        ),
      );
    expect(membership).toBeDefined();
    expect(membership.role).toBe("editor");

    const devCredentials = await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.userId, editorialUser.id),
          eq(account.providerId, "credential"),
        ),
      );
    expect(devCredentials).toHaveLength(1);

    // Manual promotion of @anzabook to owner must not be overwritten on subsequent runs
    try {
      await db
        .update(publisherMembers)
        .set({ role: "owner" })
        .where(eq(publisherMembers.id, membership.id));

      await ensureAnzaBookPublisher(db);

      const [promotedMembership] = await db
        .select()
        .from(publisherMembers)
        .where(eq(publisherMembers.id, membership.id));
      expect(promotedMembership.role).toBe("owner");
    } finally {
      await db
        .update(publisherMembers)
        .set({ role: "editor" })
        .where(eq(publisherMembers.id, membership.id));
    }

    // NODE_ENV=production must insert ZERO password credential rows
    const prevNodeEnv = process.env.NODE_ENV;
    const prevEditorialPassword = process.env.ANZABOOK_DEV_EDITORIAL_PASSWORD;
    try {
      await db.delete(user).where(eq(user.id, editorialUser.id));

      process.env.NODE_ENV = "production";
      process.env.ANZABOOK_DEV_EDITORIAL_PASSWORD = "ShouldNeverBeInserted123!";
      await ensureAnzaBookPublisher(db);

      const [prodEditorialUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, "redaksi@anzabook.id"));
      expect(prodEditorialUser).toBeDefined();
      expect(prodEditorialUser.role).toBe("user");
      expect(prodEditorialUser.authorStatus).toBe("verified");

      const prodCredentials = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.userId, prodEditorialUser.id),
            eq(account.providerId, "credential"),
          ),
        );
      expect(prodCredentials).toHaveLength(0);
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;

      if (prevEditorialPassword === undefined) {
        delete process.env.ANZABOOK_DEV_EDITORIAL_PASSWORD;
      } else {
        process.env.ANZABOOK_DEV_EDITORIAL_PASSWORD = prevEditorialPassword;
      }

      await ensureAnzaBookPublisher(db);
    }

    // Username "anzabook" already held by another user ID should not crash seeding
    const holderId = `holder-${randomUUID()}`;
    try {
      await db.delete(user).where(eq(user.email, "redaksi@anzabook.id"));
      await db.insert(user).values({
        id: holderId,
        name: "Holder User",
        username: "anzabook",
        email: `holder-${randomUUID()}@example.com`,
        role: "user",
      });

      await ensureAnzaBookPublisher(db);

      const [createdEditorial] = await db
        .select()
        .from(user)
        .where(eq(user.email, "redaksi@anzabook.id"));
      expect(createdEditorial).toBeDefined();
      expect(createdEditorial.id).not.toBe(holderId);
      expect(createdEditorial.role).toBe("user");
      expect(createdEditorial.authorStatus).toBe("verified");
    } finally {
      await db.delete(user).where(eq(user.email, "redaksi@anzabook.id"));
      await db.delete(user).where(eq(user.id, holderId));
      await ensureAnzaBookPublisher(db);
    }
  });

  it("links Selembar Awan / ANZABOOK_OWNER_EMAIL as owner without granting admin role, and supports assignPublisherOwner helper & CLI", async () => {
    const [anzabookPub] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.slug, "anzabook"));
    expect(anzabookPub).toBeDefined();

    // 1. Existing "Selembar Awan" user auto-linked as owner (earliest created wins)
    const earlierId = `selembar-earlier-${randomUUID()}`;
    const laterId = `selembar-later-${randomUUID()}`;
    const earlierEmail = `selembar-1-${randomUUID()}@example.com`;
    const laterEmail = `selembar-2-${randomUUID()}@example.com`;
    const prevOwnerEmail = process.env.ANZABOOK_OWNER_EMAIL;

    try {
      delete process.env.ANZABOOK_OWNER_EMAIL;
      await db.insert(user).values({
        id: earlierId,
        name: "Selembar Awan",
        username: "selembarawan",
        email: earlierEmail,
        role: "user",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      });
      await db.insert(user).values({
        id: laterId,
        name: "Selembar Awan",
        email: laterEmail,
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await seedCatalog(db);

      const [earlierMembership] = await db
        .select()
        .from(publisherMembers)
        .where(
          and(
            eq(publisherMembers.publisherId, anzabookPub.id),
            eq(publisherMembers.userId, earlierId),
          ),
        );
      expect(earlierMembership).toBeDefined();
      expect(earlierMembership.role).toBe("owner");

      const [laterMembership] = await db
        .select()
        .from(publisherMembers)
        .where(
          and(
            eq(publisherMembers.publisherId, anzabookPub.id),
            eq(publisherMembers.userId, laterId),
          ),
        );
      expect(laterMembership).toBeUndefined();

      const [refetchedOwnerUser] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, earlierId));
      expect(refetchedOwnerUser.role).toBe("user");
    } finally {
      if (prevOwnerEmail === undefined) delete process.env.ANZABOOK_OWNER_EMAIL;
      else process.env.ANZABOOK_OWNER_EMAIL = prevOwnerEmail;
      await db.delete(user).where(inArray(user.id, [earlierId, laterId]));
    }

    // 2. ANZABOOK_OWNER_EMAIL override (case-insensitive)
    const overrideUserId = `owner-override-${randomUUID()}`;
    const overrideEmail = `owner-override-${randomUUID()}@example.com`;
    try {
      await db.insert(user).values({
        id: overrideUserId,
        name: "Pemilik Khusus",
        email: overrideEmail,
        role: "user",
      });

      process.env.ANZABOOK_OWNER_EMAIL = `  ${overrideEmail.toUpperCase()}  `;
      await ensureAnzaBookPublisher(db);

      const [overrideMembership] = await db
        .select()
        .from(publisherMembers)
        .where(
          and(
            eq(publisherMembers.publisherId, anzabookPub.id),
            eq(publisherMembers.userId, overrideUserId),
          ),
        );
      expect(overrideMembership?.role).toBe("owner");

      const [overrideUserRow] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, overrideUserId));
      expect(overrideUserRow.role).toBe("user");
    } finally {
      if (prevOwnerEmail === undefined) delete process.env.ANZABOOK_OWNER_EMAIL;
      else process.env.ANZABOOK_OWNER_EMAIL = prevOwnerEmail;
      await db.delete(user).where(eq(user.id, overrideUserId));
    }

    // 3. assignPublisherOwner helper, error handling, and standalone CLI
    const cliUserId = `cli-user-${randomUUID()}`;
    const cliEmail = `cli-owner-${randomUUID()}@example.com`;
    await db.insert(user).values({
      id: cliUserId,
      name: "Calon Pemilik CLI",
      email: cliEmail,
      role: "user",
    });
    createdUserIds.push(cliUserId);

    const assigned = await assignPublisherOwner(
      db,
      "AnzaBook",
      cliEmail.toUpperCase(),
      "owner",
    );
    expect(assigned).toEqual({
      publisherId: anzabookPub.id,
      publisherSlug: "anzabook",
      userId: cliUserId,
      email: cliEmail,
      role: "owner",
    });

    const [cliMember] = await db
      .select()
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, anzabookPub.id),
          eq(publisherMembers.userId, cliUserId),
        ),
      );
    expect(cliMember?.role).toBe("owner");

    const [cliUserAfter] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, cliUserId));
    expect(cliUserAfter.role).toBe("user");

    // Error handling
    await expect(
      assignPublisherOwner(db, "missing-publisher-slug", cliEmail, "owner"),
    ).rejects.toThrow(/missing-publisher-slug/i);
    await expect(
      assignPublisherOwner(db, "anzabook", "missing@example.com", "owner"),
    ).rejects.toThrow(/missing@example\.com/i);
    await expect(
      assignPublisherOwner(
        db,
        "anzabook",
        cliEmail,
        "admin" as unknown as "owner",
      ),
    ).rejects.toThrow(/owner.*editor.*finance/i);

    // Standalone CLI run with ONLY DATABASE_URL (no BETTER_AUTH_SECRET or WEB_URL)
    const cliSuccess = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/assign-publisher-owner.ts",
        "--",
        "anzabook",
        cliEmail,
        "finance",
      ],
      {
        cwd: new URL("../..", import.meta.url),
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: "test",
          DATABASE_URL: process.env.DATABASE_URL,
        },
        encoding: "utf8",
      },
    );
    expect(cliSuccess.status).toBe(0);
    expect(cliSuccess.stdout).toContain("finance");

    const [updatedByCli] = await db
      .select()
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, anzabookPub.id),
          eq(publisherMembers.userId, cliUserId),
        ),
      );
    expect(updatedByCli?.role).toBe("finance");

    const cliMissingArgs = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/assign-publisher-owner.ts"],
      {
        cwd: new URL("../..", import.meta.url),
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        encoding: "utf8",
      },
    );
    expect(cliMissingArgs.status).toBe(1);
    expect(cliMissingArgs.stderr).toContain(
      "Usage: pnpm publisher:assign-owner <publisher-slug> <email> [owner|editor|finance]",
    );

    const cliMissingUser = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/assign-publisher-owner.ts",
        "anzabook",
        "nobody@example.com",
      ],
      {
        cwd: new URL("../..", import.meta.url),
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        encoding: "utf8",
      },
    );
    expect(cliMissingUser.status).toBe(1);
    expect(cliMissingUser.stderr).toContain("nobody@example.com");
  });
});
