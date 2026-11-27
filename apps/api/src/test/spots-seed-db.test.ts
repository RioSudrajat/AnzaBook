import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import "./helpers";
import { db } from "../db";
import {
  communityCalendars,
  readingSpotBookmarks,
  readingSpotReviews,
  readingSpots,
  storeBranches,
  user,
} from "../db/schema";
import { seedCatalog } from "../db/seed-catalog";
import { seedSpots } from "../db/seed-spots";

describe("Reading Spots Idempotent Seed & PostgreSQL Constraints (Issue #19)", () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.delete(user).where(inArray(user.id, createdUserIds));
    }
    await seedCatalog(db);
  });

  it("idempotently seeds 100+ spots, links store_branches and community_calendars, and preserves live metrics/closed status", async () => {
    const rawDataset = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../db/seeds/reading-spots.json"),
        "utf8",
      ),
    ) as Array<{ slug: string }>;

    await seedCatalog(db);
    await seedCatalog(db);

    const allSeeded = await db.select().from(readingSpots);
    expect(allSeeded.length).toBeGreaterThanOrEqual(rawDataset.length);

    // Kineruku and Post Santa should link to their store_branches with partner badge
    const [kineruku] = await db
      .select()
      .from(readingSpots)
      .where(eq(readingSpots.slug, "kineruku-bandung"))
      .limit(1);
    expect(kineruku).toBeDefined();
    expect(kineruku?.verifiedBadge).toBe("partner");
    expect(kineruku?.linkedBranchId).toBeTruthy();

    const [kinerukuBranch] = await db
      .select()
      .from(storeBranches)
      .where(eq(storeBranches.id, kineruku!.linkedBranchId!))
      .limit(1);
    expect(kinerukuBranch?.branchName).toContain("Kineruku");

    const [postSanta] = await db
      .select()
      .from(readingSpots)
      .where(eq(readingSpots.slug, "post-santa-jakarta"))
      .limit(1);
    expect(postSanta).toBeDefined();
    expect(postSanta?.city).toBe("Jakarta");
    expect(postSanta?.verifiedBadge).toBe("partner");
    expect(postSanta?.linkedBranchId).toBeTruthy();

    // Flagship community spot should link to seeded community calendar
    const [klubCalendar] = await db
      .select({ id: communityCalendars.id })
      .from(communityCalendars)
      .where(eq(communityCalendars.slug, "klub-baca-anzabook"))
      .limit(1);
    expect(klubCalendar).toBeDefined();
    expect(postSanta?.linkedCalendarId).toBe(klubCalendar?.id);

    // Simulate live ratings, bookmarks, and an admin-closed venue before re-running seedSpots
    await db
      .update(readingSpots)
      .set({
        ratingAvg: 4.75,
        ratingCount: 8,
        bookmarkCount: 19,
        status: "closed",
      })
      .where(eq(readingSpots.id, kineruku!.id));

    await seedSpots(db);

    const [rechecked] = await db
      .select()
      .from(readingSpots)
      .where(eq(readingSpots.id, kineruku!.id))
      .limit(1);
    expect(rechecked?.ratingAvg).toBe(4.75);
    expect(rechecked?.ratingCount).toBe(8);
    expect(rechecked?.bookmarkCount).toBe(19);
    expect(rechecked?.status).toBe("closed");

    // Restore published state cleanly
    await db
      .update(readingSpots)
      .set({
        status: "published",
        ratingAvg: 0,
        ratingCount: 0,
        bookmarkCount: 0,
      })
      .where(eq(readingSpots.id, kineruku!.id));
  });

  it("enforces unique (spot_id, user_id) constraints on reviews and bookmarks", async () => {
    const [spot] = await db
      .select({ id: readingSpots.id })
      .from(readingSpots)
      .limit(1);
    expect(spot).toBeDefined();

    const userId = randomUUID();
    createdUserIds.push(userId);
    await db.insert(user).values({
      id: userId,
      name: "Spot Reviewer",
      email: `spot-reviewer-${userId.slice(0, 8)}@example.com`,
      emailVerified: true,
    });

    await db.insert(readingSpotReviews).values({
      spotId: spot!.id,
      userId,
      rating: 5,
      content: "Sangat tenang dan banyak colokan listrik.",
      tags: ["tenang_fokus", "colokan_banyak"],
    });

    await expect(
      db.insert(readingSpotReviews).values({
        spotId: spot!.id,
        userId,
        rating: 4,
        content: "Mencoba duplikasi ulasan.",
        tags: [],
      }),
    ).rejects.toThrow();

    await db.insert(readingSpotBookmarks).values({
      spotId: spot!.id,
      userId,
    });

    await expect(
      db.insert(readingSpotBookmarks).values({
        spotId: spot!.id,
        userId,
      }),
    ).rejects.toThrow();
  });
});
