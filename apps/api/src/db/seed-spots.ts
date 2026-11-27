import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  SpotCategory,
  SpotFacilitiesDto,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotSource,
  SpotVerifiedBadge,
} from "@starter/shared/types";
import * as schema from "./schema";

type SeedSpotJson = {
  slug: string;
  name: string;
  category: SpotCategory;
  description?: string | null;
  address: string;
  district?: string | null;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  instagramHandle?: string | null;
  websiteUrl?: string | null;
  openingHoursText?: string | null;
  priceRange: SpotPriceRange;
  noiseLevel: SpotNoiseLevel;
  facilities: SpotFacilitiesDto;
  coverUrl?: string | null;
  source: SpotSource;
  externalSourceId?: string | null;
  verifiedBadge: SpotVerifiedBadge;
};

const BRANCH_CITY_NORMALIZATION: Record<
  string,
  { city: string; district: string }
> = {
  "jakarta timur": { city: "Jakarta", district: "Jakarta Timur" },
  "jakarta pusat": { city: "Jakarta", district: "Jakarta Pusat" },
  "jakarta selatan": { city: "Jakarta", district: "Jakarta Selatan" },
  "jakarta barat": { city: "Jakarta", district: "Jakarta Barat" },
  "jakarta utara": { city: "Jakarta", district: "Jakarta Utara" },
};

const CALENDAR_BY_CITY: Record<string, string> = {
  jakarta: "klub-baca-anzabook",
  bandung: "lingkar-aksara-bandung",
  yogyakarta: "kolektif-literasi-merdeka",
};

const SPOT_CALENDAR_LINKS: Record<string, string> = {
  "post-santa-jakarta": "klub-baca-anzabook",
  "baca-di-tebet-jakarta": "klub-baca-anzabook",
  "kineruku-bandung": "lingkar-aksara-bandung",
  "the-room-19-bandung": "lingkar-aksara-bandung",
  "ruang-baca-kolektif-merdeka-jogja": "kolektif-literasi-merdeka",
  "buku-akik-yogyakarta": "kolektif-literasi-merdeka",
};

function resolveBranchIdForSeedSpot(
  spotSlug: string,
  spotName: string,
  branches: ReadonlyArray<typeof schema.storeBranches.$inferSelect>,
): string | null {
  const lowerSlug = spotSlug.toLowerCase();
  const lowerName = spotName.toLowerCase();

  for (const branch of branches) {
    const branchLower = branch.branchName.toLowerCase();
    if (lowerSlug.includes("kineruku") && branchLower.includes("kineruku")) {
      return branch.id;
    }
    if (
      lowerSlug.includes("post-santa") &&
      branchLower.includes("post santa")
    ) {
      return branch.id;
    }
    if (
      lowerSlug.includes("gramedia-matraman") &&
      branchLower.includes("matraman")
    ) {
      return branch.id;
    }
    if (
      lowerSlug.includes("gramedia-grand-indonesia") &&
      branchLower.includes("grand indonesia")
    ) {
      return branch.id;
    }
    if (
      lowerSlug.includes("gramedia-merdeka") &&
      branchLower.includes("merdeka")
    ) {
      return branch.id;
    }
    if (
      lowerSlug.includes("gramedia-sudirman") &&
      branchLower.includes("sudirman")
    ) {
      return branch.id;
    }
    if (lowerName === branchLower) {
      return branch.id;
    }
  }
  return null;
}

function normalizeBranchCity(rawCity: string): {
  city: string;
  district: string | null;
} {
  const mapped = BRANCH_CITY_NORMALIZATION[rawCity.trim().toLowerCase()];
  if (mapped) {
    return mapped;
  }
  return { city: rawCity.trim(), district: null };
}

function loadCuratedSpotSeeds(): SeedSpotJson[] {
  const seedPath = resolve(import.meta.dirname, "./seeds/reading-spots.json");
  return JSON.parse(readFileSync(seedPath, "utf8")) as SeedSpotJson[];
}

/**
 * Idempotently seeds 100+ curated Indonesian reading spots and links partner
 * store_branches & verified community_calendars without overwriting live
 * ratings, bookmark counts, or admin-closed spot status.
 */
export async function seedSpots(
  db: NodePgDatabase<typeof schema>,
  suppliedBranches?: ReadonlyArray<typeof schema.storeBranches.$inferSelect>,
): Promise<void> {
  const curatedSeeds = loadCuratedSpotSeeds();

  const branches =
    suppliedBranches ?? (await db.select().from(schema.storeBranches));
  const calendars = await db
    .select({
      id: schema.communityCalendars.id,
      slug: schema.communityCalendars.slug,
    })
    .from(schema.communityCalendars);

  const calendarIdBySlug = new Map(calendars.map((c) => [c.slug, c.id]));

  const linkedBranchIds = new Set<string>();
  const rows: Array<typeof schema.readingSpots.$inferInsert> = [];

  for (const item of curatedSeeds) {
    const linkedBranchId = resolveBranchIdForSeedSpot(
      item.slug,
      item.name,
      branches,
    );
    if (linkedBranchId) {
      linkedBranchIds.add(linkedBranchId);
    }

    const calendarSlug =
      SPOT_CALENDAR_LINKS[item.slug] ??
      (item.verifiedBadge === "partner"
        ? CALENDAR_BY_CITY[item.city.toLowerCase()]
        : undefined);
    const linkedCalendarId = calendarSlug
      ? (calendarIdBySlug.get(calendarSlug) ?? null)
      : null;

    rows.push({
      slug: item.slug,
      name: item.name,
      category: item.category,
      description: item.description ?? null,
      address: item.address,
      district: item.district ?? null,
      city: item.city,
      province: item.province,
      latitude: item.latitude,
      longitude: item.longitude,
      googleMapsUrl: item.googleMapsUrl ?? null,
      googlePlaceId: item.googlePlaceId ?? null,
      instagramHandle: item.instagramHandle ?? null,
      websiteUrl: item.websiteUrl ?? null,
      openingHoursText: item.openingHoursText ?? null,
      priceRange: item.priceRange,
      noiseLevel: item.noiseLevel,
      facilities: item.facilities ?? {},
      coverUrl: item.coverUrl ?? null,
      source: item.source,
      externalSourceId: item.externalSourceId ?? null,
      linkedBranchId,
      linkedCalendarId,
      status: "published",
      verifiedBadge: linkedBranchId ? "partner" : item.verifiedBadge,
    });
  }

  // Layer 3 fallback: auto-create reading spot rows for any unlinked store_branches
  for (const branch of branches) {
    if (linkedBranchIds.has(branch.id)) {
      continue;
    }
    const { city, district } = normalizeBranchCity(branch.city);
    const slug = `mitra-${branch.branchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`.slice(0, 150);

    rows.push({
      slug,
      name: branch.branchName,
      category:
        branch.chainName === "komunitas" ? "book_cafe" : "indie_bookstore",
      description: `Mitra cabang ${branch.branchName} yang terhubung dengan stok cetak AnzaBook.`,
      address: branch.address,
      district,
      city,
      province: city === "Jakarta" ? "DKI Jakarta" : city,
      latitude: branch.latitude,
      longitude: branch.longitude,
      googleMapsUrl: branch.mapUrl ?? null,
      googlePlaceId: null,
      instagramHandle: null,
      websiteUrl: null,
      openingHoursText: "Sen-Min 09:00-21:00",
      priceRange: "budget",
      noiseLevel: "moderate",
      facilities: {
        hasBookCollection: true,
        airConditioned: branch.chainName !== "komunitas",
        parking: true,
      },
      coverUrl: null,
      source: "store_branch",
      externalSourceId: `branch:${branch.id}`,
      linkedBranchId: branch.id,
      linkedCalendarId:
        calendarIdBySlug.get(CALENDAR_BY_CITY[city.toLowerCase()] ?? "") ??
        null,
      status: "published",
      verifiedBadge: "partner",
    });
  }

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await db
      .insert(schema.readingSpots)
      .values(chunk)
      .onConflictDoUpdate({
        target: schema.readingSpots.slug,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          description: sql`excluded.description`,
          address: sql`excluded.address`,
          district: sql`excluded.district`,
          city: sql`excluded.city`,
          province: sql`excluded.province`,
          latitude: sql`excluded.latitude`,
          longitude: sql`excluded.longitude`,
          googleMapsUrl: sql`excluded.google_maps_url`,
          openingHoursText: sql`excluded.opening_hours_text`,
          priceRange: sql`excluded.price_range`,
          noiseLevel: sql`excluded.noise_level`,
          facilities: sql`excluded.facilities`,
          source: sql`excluded.source`,
          externalSourceId: sql`excluded.external_source_id`,
          linkedBranchId: sql`excluded.linked_branch_id`,
          linkedCalendarId: sql`excluded.linked_calendar_id`,
          verifiedBadge: sql`excluded.verified_badge`,
          status: sql`CASE WHEN ${schema.readingSpots.status} = 'closed' THEN ${schema.readingSpots.status} ELSE excluded.status END`,
        },
      });
  }
}
