import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { allBooksData } from "./seeds/books-data";
import type { SeedAuthorUsername } from "./seeds/types";

const ANZABOOK_PUBLISHER_SEED = {
  slug: "anzabook",
  name: "AnzaBook",
  logoUrl: "/icon.svg",
  city: "Jakarta",
  contactEmail: "redaksi@anzabook.id",
  description:
    "Lini penerbitan resmi AnzaBook untuk literasi berdaulat, edisi cetak rakyat, dan kurasi karya penulis independen Indonesia.",
  topics: [
    "Ekonomi",
    "Sejarah",
    "Politik",
    "Sains & Filsafat",
    "Sastra & Fiksi",
    "Non-Fiksi Populer",
  ],
  verificationStatus: "verified" as const,
  isAcceptingSubmissions: true,
};

const ANZABOOK_EDITORIAL_USER = {
  email: "redaksi@anzabook.id",
  username: "anzabook",
  name: "AnzaBook",
  authorPenName: "Redaksi AnzaBook",
  role: "user",
  emailVerified: true,
  authorStatus: "verified" as const,
};

async function upsertAnzaBookPublisherRecord(
  db: NodePgDatabase<typeof schema>,
): Promise<typeof schema.publishers.$inferSelect> {
  const [existing] = await db
    .select()
    .from(schema.publishers)
    .where(eq(schema.publishers.slug, ANZABOOK_PUBLISHER_SEED.slug))
    .limit(1);

  if (existing) {
    const topics =
      Array.isArray(existing.topics) && existing.topics.length > 0
        ? existing.topics
        : ANZABOOK_PUBLISHER_SEED.topics;
    const [updated] = await db
      .update(schema.publishers)
      .set({
        name: ANZABOOK_PUBLISHER_SEED.name,
        logoUrl: ANZABOOK_PUBLISHER_SEED.logoUrl,
        city: ANZABOOK_PUBLISHER_SEED.city,
        contactEmail: ANZABOOK_PUBLISHER_SEED.contactEmail,
        description: ANZABOOK_PUBLISHER_SEED.description,
        topics,
        verificationStatus: ANZABOOK_PUBLISHER_SEED.verificationStatus,
        verifiedAt: existing.verifiedAt ?? new Date(),
        isAcceptingSubmissions: existing.isAcceptingSubmissions,
      })
      .where(eq(schema.publishers.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(schema.publishers)
    .values({
      ...ANZABOOK_PUBLISHER_SEED,
      verifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: schema.publishers.slug })
    .returning();

  if (inserted) return inserted;

  const [concurrent] = await db
    .select()
    .from(schema.publishers)
    .where(eq(schema.publishers.slug, ANZABOOK_PUBLISHER_SEED.slug))
    .limit(1);
  return concurrent;
}

async function upsertAnzaBookEditorialUser(
  db: NodePgDatabase<typeof schema>,
): Promise<typeof schema.user.$inferSelect> {
  const [existingByEmail] = await db
    .select()
    .from(schema.user)
    .where(eq(sql`lower(${schema.user.email})`, ANZABOOK_EDITORIAL_USER.email))
    .limit(1);

  const [usernameHolder] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      eq(sql`lower(${schema.user.username})`, ANZABOOK_EDITORIAL_USER.username),
    )
    .limit(1);

  let editorialUser: typeof schema.user.$inferSelect;

  if (existingByEmail) {
    const canClaimUsername =
      !usernameHolder || usernameHolder.id === existingByEmail.id;
    const [updated] = await db
      .update(schema.user)
      .set({
        name: ANZABOOK_EDITORIAL_USER.name,
        ...(canClaimUsername
          ? { username: ANZABOOK_EDITORIAL_USER.username }
          : {}),
        authorPenName: ANZABOOK_EDITORIAL_USER.authorPenName,
        // Never set role = "admin": nonAdminUserCondition() excludes admins from Explore.
        role: ANZABOOK_EDITORIAL_USER.role,
        emailVerified: ANZABOOK_EDITORIAL_USER.emailVerified,
        authorStatus: ANZABOOK_EDITORIAL_USER.authorStatus,
      })
      .where(eq(schema.user.id, existingByEmail.id))
      .returning();
    editorialUser = updated;
  } else {
    const userId = randomUUID();
    const [inserted] = await db
      .insert(schema.user)
      .values({
        id: userId,
        email: ANZABOOK_EDITORIAL_USER.email,
        username: usernameHolder ? null : ANZABOOK_EDITORIAL_USER.username,
        name: ANZABOOK_EDITORIAL_USER.name,
        authorPenName: ANZABOOK_EDITORIAL_USER.authorPenName,
        role: ANZABOOK_EDITORIAL_USER.role,
        emailVerified: ANZABOOK_EDITORIAL_USER.emailVerified,
        authorStatus: ANZABOOK_EDITORIAL_USER.authorStatus,
      })
      .returning();
    editorialUser = inserted;
  }

  // Never insert hardcoded credential passwords in production environments.
  if (process.env.NODE_ENV !== "production") {
    const [existingCredential] = await db
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, editorialUser.id),
          eq(schema.account.providerId, "credential"),
        ),
      )
      .limit(1);

    if (!existingCredential) {
      const devPassword =
        process.env.ANZABOOK_DEV_EDITORIAL_PASSWORD || "RedaksiAnza123!";
      const passwordHash = await hashPassword(devPassword);
      await db.insert(schema.account).values({
        id: randomUUID(),
        accountId: editorialUser.id,
        providerId: "credential",
        userId: editorialUser.id,
        password: passwordHash,
      });
    }
  }

  return editorialUser;
}

async function findAnzaBookOwnerCandidate(
  db: NodePgDatabase<typeof schema>,
  publisherId: string,
): Promise<{ id: string } | undefined> {
  const ownerEmail = process.env.ANZABOOK_OWNER_EMAIL?.trim();
  if (ownerEmail) {
    const [candidate] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(sql`lower(${schema.user.email})`, ownerEmail.toLowerCase()))
      .limit(1);
    return candidate;
  }

  // Never bind a publisher owner by mutable display name/username in production.
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  const [existingOwner] = await db
    .select({ id: schema.publisherMembers.id })
    .from(schema.publisherMembers)
    .where(
      and(
        eq(schema.publisherMembers.publisherId, publisherId),
        eq(schema.publisherMembers.role, "owner"),
      ),
    )
    .limit(1);
  if (existingOwner) {
    return undefined;
  }

  const [candidate] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      or(
        eq(sql`lower(${schema.user.username})`, "selembarawan"),
        eq(sql`lower(${schema.user.name})`, "selembar awan"),
      ),
    )
    .orderBy(asc(schema.user.createdAt), asc(schema.user.id))
    .limit(1);
  return candidate;
}

/**
 * Idempotently ensures the official AnzaBook publisher, its @anzabook editorial
 * account, and any configured owner account link exist.
 */
export async function ensureAnzaBookPublisher(
  db: NodePgDatabase<typeof schema>,
): Promise<typeof schema.publishers.$inferSelect> {
  const anzabookPublisher = await upsertAnzaBookPublisherRecord(db);
  const editorialUser = await upsertAnzaBookEditorialUser(db);

  // Preserve manual promotion of @anzabook (e.g. to "owner") across reruns.
  await db
    .insert(schema.publisherMembers)
    .values({
      publisherId: anzabookPublisher.id,
      userId: editorialUser.id,
      role: "editor",
    })
    .onConflictDoNothing({
      target: [
        schema.publisherMembers.publisherId,
        schema.publisherMembers.userId,
      ],
    });

  const ownerCandidate = await findAnzaBookOwnerCandidate(
    db,
    anzabookPublisher.id,
  );
  if (ownerCandidate) {
    await db
      .insert(schema.publisherMembers)
      .values({
        publisherId: anzabookPublisher.id,
        userId: ownerCandidate.id,
        role: "owner",
      })
      .onConflictDoUpdate({
        target: [
          schema.publisherMembers.publisherId,
          schema.publisherMembers.userId,
        ],
        set: { role: "owner" },
      });
  }

  return anzabookPublisher;
}

type SeedAuthorsMap = Record<
  SeedAuthorUsername,
  typeof schema.user.$inferSelect
>;

async function ensureCredentialPasswordForNonProd(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  fallbackPassword: string,
): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const [existingCredential] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "credential"),
      ),
    )
    .limit(1);

  if (!existingCredential) {
    const passwordHash = await hashPassword(fallbackPassword);
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  }
}

async function upsertSeedAuthorAccount(
  db: NodePgDatabase<typeof schema>,
  config: {
    email: string;
    username: SeedAuthorUsername;
    name: string;
    authorPenName: string;
    bio: string;
    locationCity: string;
    preserveExistingIdentity?: boolean;
  },
): Promise<typeof schema.user.$inferSelect> {
  const [existingByEmail] = await db
    .select()
    .from(schema.user)
    .where(eq(sql`lower(${schema.user.email})`, config.email.toLowerCase()))
    .limit(1);

  const [existingByUsername] =
    !existingByEmail && process.env.NODE_ENV !== "production"
      ? await db
          .select()
          .from(schema.user)
          .where(eq(sql`lower(${schema.user.username})`, config.username))
          .orderBy(asc(schema.user.createdAt), asc(schema.user.id))
          .limit(1)
      : [undefined];

  const existing = existingByEmail ?? existingByUsername;
  const [usernameHolder] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(sql`lower(${schema.user.username})`, config.username))
    .limit(1);

  let authorUser: typeof schema.user.$inferSelect;

  if (existing) {
    const canClaimUsername =
      !usernameHolder || usernameHolder.id === existing.id;
    const [updated] = await db
      .update(schema.user)
      .set({
        ...(config.preserveExistingIdentity
          ? {
              authorPenName: existing.authorPenName || config.authorPenName,
              bio: existing.bio || config.bio,
              locationCity: existing.locationCity || config.locationCity,
            }
          : {
              name: config.name,
              authorPenName: config.authorPenName,
              bio: existing.bio || config.bio,
              locationCity: existing.locationCity || config.locationCity,
            }),
        ...(canClaimUsername && !existing.username
          ? { username: config.username }
          : {}),
        role: existing.role || "user",
        emailVerified: true,
        authorStatus: "verified",
      })
      .where(eq(schema.user.id, existing.id))
      .returning();
    authorUser = updated;
  } else {
    const userId = randomUUID();
    const [inserted] = await db
      .insert(schema.user)
      .values({
        id: userId,
        email: config.email,
        username: usernameHolder ? null : config.username,
        name: config.name,
        authorPenName: config.authorPenName,
        bio: config.bio,
        locationCity: config.locationCity,
        role: "user",
        emailVerified: true,
        authorStatus: "verified",
      })
      .returning();
    authorUser = inserted;
  }

  const devPassword =
    process.env.ANZABOOK_DEV_AUTHOR_PASSWORD || "PenulisAnza123!";
  await ensureCredentialPasswordForNonProd(db, authorUser.id, devPassword);
  return authorUser;
}

async function upsertSeedAuthors(
  db: NodePgDatabase<typeof schema>,
): Promise<SeedAuthorsMap> {
  const anzabookUser = await upsertAnzaBookEditorialUser(db);
  const selembarEmail =
    process.env.ANZABOOK_SELEMBARAWAN_EMAIL?.trim().toLowerCase() ||
    "selembarawan@anzabook.id";

  const selembarawanUser = await upsertSeedAuthorAccount(db, {
    email: selembarEmail,
    username: "selembarawan",
    name: "Selembar Awan",
    authorPenName: "Selembar Awan",
    bio: "Penulis esai filsafat, budaya literasi, dan penerbitan independen.",
    locationCity: "Jakarta",
    preserveExistingIdentity: true,
  });

  const okesudrajatUser = await upsertSeedAuthorAccount(db, {
    email: "okesudrajat@anzabook.id",
    username: "okesudrajat",
    name: "Oke Sudrajat",
    authorPenName: "Oke Sudrajat",
    bio: "Penulis fiksi horor psikologis, misteri kampus, dan esai antropologi di AnzaBook.",
    locationCity: "Bandung",
  });

  return {
    anzabook: anzabookUser,
    selembarawan: selembarawanUser,
    okesudrajat: okesudrajatUser,
  };
}

const COMMUNITY_SEEDS: ReadonlyArray<{
  slug: string;
  name: string;
  type: "community";
  city: string;
  contactEmail: string;
  description: string;
  ownerUsername: SeedAuthorUsername;
}> = [
  {
    slug: "klub-baca-anzabook",
    name: "Klub Baca & Diskusi AnzaBook",
    type: "community",
    city: "Jakarta",
    contactEmail: "komunitas@anzabook.id",
    description:
      "Ruang diskusi buku bulanan, bedah karya klasik Nusantara, dan temu pembaca resmi AnzaBook di Jakarta & daring.",
    ownerUsername: "anzabook",
  },
  {
    slug: "lingkar-aksara-bandung",
    name: "Lingkar Aksara & Fiksi Spekulatif",
    type: "community",
    city: "Bandung",
    contactEmail: "bandung@anzabook.id",
    description:
      "Komunitas penulis dan pembaca fiksi misteri, horor psikologis, serta lokakarya penulisan kreatif di Bandung.",
    ownerUsername: "okesudrajat",
  },
  {
    slug: "kolektif-literasi-merdeka",
    name: "Kolektif Literasi & Filsafat Populer",
    type: "community",
    city: "Yogyakarta",
    contactEmail: "kolektif@anzabook.id",
    description:
      "Lingkar baca buku filsafat, sejarah pemikiran, dan esai kebudayaan untuk pembaca independen.",
    ownerUsername: "selembarawan",
  },
];

async function ensureSeededCommunities(
  db: NodePgDatabase<typeof schema>,
  authorsByUsername: SeedAuthorsMap,
): Promise<void> {
  for (const item of COMMUNITY_SEEDS) {
    const ownerUser = authorsByUsername[item.ownerUsername];
    const [existing] = await db
      .select()
      .from(schema.communityCalendars)
      .where(eq(schema.communityCalendars.slug, item.slug))
      .limit(1);

    let calendarId: string;
    if (existing) {
      calendarId = existing.id;
      const nextStatus =
        existing.verificationStatus === "trusted" ? "trusted" : "verified";
      await db
        .update(schema.communityCalendars)
        .set({
          name: item.name,
          type: item.type,
          city: item.city,
          contactEmail: item.contactEmail,
          description: existing.description || item.description,
          verificationStatus: nextStatus,
          createdByUserId: existing.createdByUserId ?? ownerUser.id,
        })
        .where(eq(schema.communityCalendars.id, existing.id));
    } else {
      const [inserted] = await db
        .insert(schema.communityCalendars)
        .values({
          slug: item.slug,
          name: item.name,
          type: item.type,
          city: item.city,
          contactEmail: item.contactEmail,
          description: item.description,
          verificationStatus: "verified",
          createdByUserId: ownerUser.id,
        })
        .onConflictDoNothing({ target: schema.communityCalendars.slug })
        .returning();

      if (inserted) {
        calendarId = inserted.id;
      } else {
        const [concurrent] = await db
          .select({ id: schema.communityCalendars.id })
          .from(schema.communityCalendars)
          .where(eq(schema.communityCalendars.slug, item.slug))
          .limit(1);
        calendarId = concurrent.id;
      }
    }

    await db
      .insert(schema.communityCalendarMembers)
      .values({
        calendarId,
        userId: ownerUser.id,
        role: "owner",
      })
      .onConflictDoNothing({
        target: [
          schema.communityCalendarMembers.calendarId,
          schema.communityCalendarMembers.userId,
        ],
      });
  }
}

export async function seedCatalog(
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  console.log(
    "Menyelaraskan data katalog AnzaBook, toko rekanan, penulis resmi, komunitas, dan bab buku...",
  );

  const anzabookPublisher = await ensureAnzaBookPublisher(db);
  const authorsByUsername = await upsertSeedAuthors(db);
  await ensureSeededCommunities(db, authorsByUsername);

  // 1. Cabang Toko Mitra & Titik GPS Peta
  const branchSeeds = [
    {
      chainName: "gramedia",
      branchName: "Gramedia Matraman",
      city: "Jakarta Timur",
      address:
        "Jl. Matraman Raya No.46-48, Kb. Manggis, Matraman, Jakarta Timur",
      latitude: -6.2013,
      longitude: 106.8576,
      distanceKm: 3.2,
      phone: "(021) 8581763",
      mapUrl: "https://maps.google.com/?q=Gramedia+Matraman",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Grand Indonesia",
      city: "Jakarta Pusat",
      address:
        "Grand Indonesia West Mall Lt. 3, Jl. M.H. Thamrin No.1, Jakarta Pusat",
      latitude: -6.1952,
      longitude: 106.8208,
      distanceKm: 5.8,
      phone: "(021) 23580512",
      mapUrl: "https://maps.google.com/?q=Gramedia+Grand+Indonesia",
    },
    {
      chainName: "komunitas",
      branchName: "Post Santa & Kolektif Buku Pasar",
      city: "Jakarta Selatan",
      address:
        "Pasar Santa Lt. 1 Blok B, Jl. Cipaku I No.1, Petogogan, Kebayoran Baru",
      latitude: -6.2395,
      longitude: 106.816,
      distanceKm: 7.1,
      phone: "0812-8899-7711",
      mapUrl: "https://maps.google.com/?q=Post+Santa+Jakarta",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Merdeka Bandung",
      city: "Bandung",
      address: "Jl. Merdeka No.43, Babakan Ciamis, Sumur Bandung, Kota Bandung",
      latitude: -6.9122,
      longitude: 107.6105,
      distanceKm: 142.0,
      phone: "(022) 4235878",
      mapUrl: "https://maps.google.com/?q=Gramedia+Merdeka+Bandung",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Sudirman Yogyakarta",
      city: "Yogyakarta",
      address:
        "Jl. Jend. Sudirman No.54-56, Kotabaru, Gondokusuman, Kota Yogyakarta",
      latitude: -7.7828,
      longitude: 110.3732,
      distanceKm: 520.0,
      phone: "(0274) 512621",
      mapUrl: "https://maps.google.com/?q=Gramedia+Sudirman+Yogyakarta",
    },
    {
      chainName: "komunitas",
      branchName: "Kineruku & Kolektif Buku Hegarmanah",
      city: "Bandung",
      address: "Jl. Hegarmanah No.52, Hegarmanah, Cidadap, Kota Bandung",
      latitude: -6.8775,
      longitude: 107.5991,
      distanceKm: 148.0,
      phone: "(022) 2039601",
      mapUrl: "https://maps.google.com/?q=Kineruku+Bandung",
    },
  ];

  const allBranches: (typeof schema.storeBranches.$inferSelect)[] = [];
  for (const b of branchSeeds) {
    const [existing] = await db
      .select()
      .from(schema.storeBranches)
      .where(eq(schema.storeBranches.branchName, b.branchName))
      .limit(1);

    if (existing) {
      await db
        .update(schema.storeBranches)
        .set({
          address: b.address,
          latitude: b.latitude,
          longitude: b.longitude,
          phone: b.phone,
          distanceKm: b.distanceKm,
        })
        .where(eq(schema.storeBranches.id, existing.id));
      allBranches.push(existing);
    } else {
      const [inserted] = await db
        .insert(schema.storeBranches)
        .values(b)
        .returning();
      allBranches.push(inserted);
    }
  }

  // 2. Masukkan atau Perbarui 13 Buku ke Database
  for (const bookItem of allBooksData) {
    const {
      chapters,
      editions,
      claimCodes,
      authorUsername,
      preserveDisplayAuthor,
      ...bookRow
    } = bookItem;
    const linkedAuthor = authorsByUsername[authorUsername];
    const resolvedAuthorName = preserveDisplayAuthor
      ? bookRow.author
      : linkedAuthor.name;
    const resolvedAuthorAvatar =
      linkedAuthor.image ?? bookRow.authorAvatar ?? null;

    const [existingBook] = await db
      .select({
        id: schema.books.id,
        publisherId: schema.books.publisherId,
      })
      .from(schema.books)
      .where(eq(schema.books.slug, bookRow.slug))
      .limit(1);

    let bookId: string;

    if (existingBook) {
      bookId = existingBook.id;
      await db
        .update(schema.books)
        .set({
          publisherId: existingBook.publisherId ?? anzabookPublisher.id,
          authorUserId: linkedAuthor.id,
          title: bookRow.title,
          author: resolvedAuthorName,
          authorAvatar: resolvedAuthorAvatar,
          editor: bookRow.editor,
          editorAvatar: bookRow.editorAvatar,
          coverUrl: bookRow.coverUrl,
          coverColor: bookRow.coverColor,
          synopsis: bookRow.synopsis,
          bulletinExcerpt: bookRow.bulletinExcerpt,
          publishedYear: bookRow.publishedYear,
          pageCount: bookRow.pageCount,
          totalChapters: bookRow.totalChapters,
          readingMinutes: bookRow.readingMinutes,
          audioDurationMinutes: bookRow.audioDurationMinutes,
          digitalPolicy: bookRow.digitalPolicy,
          accessTier: bookRow.accessTier,
          hasPhysical: bookRow.hasPhysical,
          securityLevel: bookRow.securityLevel,
          isWeeklyBulletin: bookRow.isWeeklyBulletin,
          rakyatPriceIdr: bookRow.rakyatPriceIdr,
          standardPriceIdr: bookRow.standardPriceIdr,
          ratingAvg: bookRow.ratingAvg,
          ratingCount: bookRow.ratingCount,
          availableLanguages: bookRow.availableLanguages,
          categories: bookRow.categories,
          collectionName: bookRow.collectionName,
          genres: bookRow.genres,
        })
        .where(eq(schema.books.id, bookId));
    } else {
      const [insertedBook] = await db
        .insert(schema.books)
        .values({
          ...bookRow,
          author: resolvedAuthorName,
          authorAvatar: resolvedAuthorAvatar,
          authorUserId: linkedAuthor.id,
          publisherId: anzabookPublisher.id,
        })
        .returning();
      bookId = insertedBook.id;
    }

    // Masukkan atau perbarui bab-bab buku
    for (const chap of chapters) {
      const [existingChapter] = await db
        .select({ id: schema.bookChapters.id })
        .from(schema.bookChapters)
        .where(
          and(
            eq(schema.bookChapters.bookId, bookId),
            eq(schema.bookChapters.chapterNumber, chap.chapterNumber),
          ),
        )
        .limit(1);

      if (existingChapter) {
        await db
          .update(schema.bookChapters)
          .set({
            titleId: chap.titleId,
            titleEn: chap.titleEn,
            contentId: chap.contentId,
            contentEn: chap.contentEn,
            audioUrl: chap.audioUrl,
            audioDurationSec: chap.audioDurationSec,
          })
          .where(eq(schema.bookChapters.id, existingChapter.id));
      } else {
        await db.insert(schema.bookChapters).values({
          bookId,
          chapterNumber: chap.chapterNumber,
          isBlueprintSummary: false,
          titleId: chap.titleId,
          titleEn: chap.titleEn,
          contentId: chap.contentId,
          contentEn: chap.contentEn,
          blueprintContent: "",
          paragraphsJson: [],
          audioUrl: chap.audioUrl,
          audioDurationSec: chap.audioDurationSec,
        });
      }
    }

    // Masukkan atau perbarui edisi cetak
    for (const ed of editions) {
      const [existingEd] = await db
        .select({ id: schema.bookPrintEditions.id })
        .from(schema.bookPrintEditions)
        .where(
          and(
            eq(schema.bookPrintEditions.bookId, bookId),
            eq(schema.bookPrintEditions.tier, ed.tier),
          ),
        )
        .limit(1);

      if (existingEd) {
        await db
          .update(schema.bookPrintEditions)
          .set({
            tierName: ed.tierName,
            paperType: ed.paperType,
            paperGsm: ed.paperGsm,
            coverType: ed.coverType,
            bindingType: ed.bindingType,
            priceIdr: ed.priceIdr,
            traditionalPriceIdr: ed.traditionalPriceIdr,
            savingsPercent: ed.savingsPercent,
            weightGrams: ed.weightGrams,
            inStock: ed.inStock,
            isbn: ed.isbn,
          })
          .where(eq(schema.bookPrintEditions.id, existingEd.id));
      } else {
        await db.insert(schema.bookPrintEditions).values({
          bookId,
          tier: ed.tier,
          tierName: ed.tierName,
          paperType: ed.paperType,
          paperGsm: ed.paperGsm,
          coverType: ed.coverType,
          bindingType: ed.bindingType,
          priceIdr: ed.priceIdr,
          traditionalPriceIdr: ed.traditionalPriceIdr,
          savingsPercent: ed.savingsPercent,
          weightGrams: ed.weightGrams,
          inStock: ed.inStock,
          isbn: ed.isbn,
        });
      }
    }

    // Masukkan kode klaim buku demo
    if (
      process.env.NODE_ENV !== "production" &&
      claimCodes &&
      claimCodes.length > 0
    ) {
      for (const code of claimCodes) {
        const [existingCode] = await db
          .select({ id: schema.bookClaimCodes.id })
          .from(schema.bookClaimCodes)
          .where(
            and(
              eq(schema.bookClaimCodes.bookId, bookId),
              eq(schema.bookClaimCodes.code, code),
            ),
          )
          .limit(1);

        if (!existingCode) {
          await db.insert(schema.bookClaimCodes).values({
            bookId,
            code,
            isDemo: true,
          });
        }
      }
    }

    // Masukkan stok toko fisik
    for (const branch of allBranches) {
      const isWarehouse = branch.chainName === "komunitas";
      const [existingInv] = await db
        .select({ id: schema.storeInventories.id })
        .from(schema.storeInventories)
        .where(
          and(
            eq(schema.storeInventories.branchId, branch.id),
            eq(schema.storeInventories.bookId, bookId),
          ),
        )
        .limit(1);

      if (!existingInv) {
        await db.insert(schema.storeInventories).values({
          branchId: branch.id,
          bookId,
          rakyatStock: isWarehouse ? 450 : Math.floor(Math.random() * 25) + 8,
          standardStock: isWarehouse ? 200 : Math.floor(Math.random() * 15) + 3,
          stockStatus: "available",
        });
      }
    }
  }

  // 4. Pastikan akun Admin default tersedia
  const defaultAdminEmail = "admin@anzabook.id";
  const [existingAdmin] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, defaultAdminEmail))
    .limit(1);

  if (!existingAdmin) {
    const adminId = randomUUID();
    const passwordHash = await hashPassword("AdminAnza123!");
    await db.insert(schema.user).values({
      id: adminId,
      name: "Admin AnzaBook",
      email: defaultAdminEmail,
      emailVerified: true,
      role: "admin",
    });
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: passwordHash,
    });
  } else if (existingAdmin.role !== "admin") {
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.id, existingAdmin.id));
  }

  console.log("Penyelarasan katalog AnzaBook selesai.");
}
