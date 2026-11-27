import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const INDONESIA_BBOX = {
  minLat: -11.5,
  maxLat: 6.5,
  minLng: 94.5,
  maxLng: 141.5,
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "AnzaBook/1.0 (+https://anzabook.id)";

const GENERIC_PLACE_TOKENS = new Set([
  "perpustakaan",
  "perpus",
  "library",
  "taman",
  "baca",
  "bacaan",
  "masyarakat",
  "tbm",
  "kafe",
  "cafe",
  "coffee",
  "kopi",
  "kedai",
  "toko",
  "buku",
  "book",
  "books",
  "bookshop",
  "bookstore",
  "ruang",
  "rumah",
  "lounge",
  "corner",
  "spot",
  "space",
  "studio",
  "hub",
  "club",
  "klub",
  "area",
  "zona",
  "zone",
  "sudut",
  "pojok",
  "teras",
  "pondok",
  "balai",
  "sanggar",
  "saung",
  "warung",
  "literasi",
  "komunitas",
  "kolektif",
  "collective",
  "indie",
  "independent",
  "publik",
  "public",
  "umum",
  "rakyat",
  "daerah",
  "kota",
  "kabupaten",
  "provinsi",
  "nasional",
  "negeri",
  "wilayah",
  "indonesia",
  "dki",
  "jakarta",
  "bandung",
  "yogyakarta",
  "jogja",
  "surabaya",
  "bali",
  "denpasar",
  "ubud",
  "canggu",
  "sanur",
  "kuta",
  "medan",
  "makassar",
  "malang",
  "semarang",
  "solo",
  "surakarta",
  "bogor",
  "depok",
  "tangerang",
  "bekasi",
  "palembang",
  "balikpapan",
  "tebet",
  "kemang",
  "menteng",
  "senopati",
  "kebayoran",
  "blok",
  "cikini",
  "dago",
  "cihampelas",
  "pusat",
  "selatan",
  "timur",
  "barat",
  "utara",
  "tengah",
  "baru",
  "lama",
  "raya",
  "jalan",
  "jl",
  "di",
  "ke",
  "dan",
  "of",
  "the",
  "and",
]);

const CITY_PRESET_NORMALIZATION = new Map([
  ["jakarta pusat", { city: "Jakarta", district: "Jakarta Pusat" }],
  ["jakarta selatan", { city: "Jakarta", district: "Jakarta Selatan" }],
  ["jakarta timur", { city: "Jakarta", district: "Jakarta Timur" }],
  ["jakarta barat", { city: "Jakarta", district: "Jakarta Barat" }],
  ["jakarta utara", { city: "Jakarta", district: "Jakarta Utara" }],
  ["dki jakarta", { city: "Jakarta", district: "" }],
  ["kota jakarta pusat", { city: "Jakarta", district: "Jakarta Pusat" }],
  ["kota jakarta selatan", { city: "Jakarta", district: "Jakarta Selatan" }],
  ["kota jakarta timur", { city: "Jakarta", district: "Jakarta Timur" }],
  ["kota jakarta barat", { city: "Jakarta", district: "Jakarta Barat" }],
  ["kota jakarta utara", { city: "Jakarta", district: "Jakarta Utara" }],
  ["denpasar", { city: "Bali", district: "Denpasar" }],
  ["kota denpasar", { city: "Bali", district: "Denpasar" }],
  ["ubud", { city: "Bali", district: "Ubud" }],
  ["canggu", { city: "Bali", district: "Canggu" }],
  ["sanur", { city: "Bali", district: "Sanur" }],
  ["kuta", { city: "Bali", district: "Kuta" }],
  ["kota bandung", { city: "Bandung", district: "" }],
  ["kota yogyakarta", { city: "Yogyakarta", district: "" }],
  ["kota surabaya", { city: "Surabaya", district: "" }],
  ["kota medan", { city: "Medan", district: "" }],
  ["kota makassar", { city: "Makassar", district: "" }],
  ["kota malang", { city: "Malang", district: "" }],
  ["kota semarang", { city: "Semarang", district: "" }],
  ["kota surakarta", { city: "Solo", district: "" }],
  ["surakarta", { city: "Solo", district: "" }],
  ["kota bogor", { city: "Bogor", district: "" }],
  ["kota depok", { city: "Depok", district: "" }],
  ["kota tangerang", { city: "Tangerang", district: "" }],
  ["kota palembang", { city: "Palembang", district: "" }],
  ["kota balikpapan", { city: "Balikpapan", district: "" }],
]);

/**
 * @typedef {{
 *   wifi?: boolean;
 *   powerOutlets?: boolean;
 *   airConditioned?: boolean;
 *   quietZone?: boolean;
 *   hasBookCollection?: boolean;
 *   outdoorSeating?: boolean;
 *   prayerRoom?: boolean;
 *   parking?: boolean;
 * }} NormalizedSpotFacilities
 *
 * @typedef {{
 *   slug: string;
 *   name: string;
 *   category: "book_cafe" | "library" | "tbm" | "indie_bookstore" | "reading_lounge";
 *   description: string | null;
 *   address: string;
 *   district: string | null;
 *   city: string;
 *   province: string;
 *   latitude: number;
 *   longitude: number;
 *   googleMapsUrl: string | null;
 *   googlePlaceId: string | null;
 *   instagramHandle: string | null;
 *   websiteUrl: string | null;
 *   openingHoursText: string | null;
 *   priceRange: "free" | "budget" | "moderate" | "premium";
 *   noiseLevel: "quiet" | "moderate" | "lively";
 *   facilities: NormalizedSpotFacilities;
 *   coverUrl: string | null;
 *   source: "curated" | "osm" | "perpusnas" | "community_submission" | "store_branch";
 *   externalSourceId: string;
 *   verifiedBadge: "none" | "curated" | "partner";
 * }} NormalizedSpot
 *
 * @typedef {{
 *   type?: string;
 *   id?: number | string;
 *   lat?: number;
 *   lon?: number;
 *   center?: { lat?: number; lon?: number };
 *   tags?: Record<string, string>;
 * }} OverpassElement
 *
 * @typedef {{
 *   slug?: string;
 *   name: string;
 *   latitude: number;
 *   longitude: number;
 *   city?: string;
 * }} DedupCandidate
 */

/**
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c);
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isWithinIndonesiaBbox(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= INDONESIA_BBOX.minLat &&
    lat <= INDONESIA_BBOX.maxLat &&
    lng >= INDONESIA_BBOX.minLng &&
    lng <= INDONESIA_BBOX.maxLng
  );
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function tokenizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

/**
 * @param {string} value
 * @returns {Set<string>}
 */
function buildBigrams(value) {
  const compact = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  const set = new Set();
  for (let i = 0; i < compact.length - 1; i++) {
    set.add(compact.slice(i, i + 2));
  }
  return set;
}

/**
 * Computes fuzzy name similarity in [0, 1] combining token Jaccard,
 * character bigram Dice, and distinctive non-generic token overlap.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function calculateNameSimilarity(a, b) {
  const tokensA = new Set(tokenizeName(a));
  const tokensB = new Set(tokenizeName(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let tokenIntersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) tokenIntersection++;
  }
  const tokenUnion = new Set([...tokensA, ...tokensB]).size;
  const jaccard = tokenUnion > 0 ? tokenIntersection / tokenUnion : 0;

  const distinctiveA = new Set(
    [...tokensA].filter((token) => !GENERIC_PLACE_TOKENS.has(token)),
  );
  const distinctiveB = new Set(
    [...tokensB].filter((token) => !GENERIC_PLACE_TOKENS.has(token)),
  );
  let distinctiveJaccard = 0;
  if (distinctiveA.size > 0 && distinctiveB.size > 0) {
    let sharedDistinctive = 0;
    for (const token of distinctiveA) {
      if (distinctiveB.has(token)) sharedDistinctive++;
    }
    const unionDistinctive = new Set([...distinctiveA, ...distinctiveB]).size;
    distinctiveJaccard =
      unionDistinctive > 0 ? sharedDistinctive / unionDistinctive : 0;
  }

  const bigramsA = buildBigrams(a);
  const bigramsB = buildBigrams(b);
  let bigramOverlap = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) bigramOverlap++;
  }
  const dice =
    bigramsA.size + bigramsB.size > 0
      ? (2 * bigramOverlap) / (bigramsA.size + bigramsB.size)
      : 0;

  const surfaceSimilarity = Math.max(jaccard, dice);
  const blendedDistinctive =
    distinctiveJaccard > 0
      ? 0.35 * distinctiveJaccard + 0.35 * jaccard + 0.3 * dice
      : 0;

  return Math.min(1, Math.max(surfaceSimilarity, blendedDistinctive));
}

/**
 * @param {Record<string, string>} tags
 * @returns {NormalizedSpot["category"]}
 */
function inferCategory(tags) {
  const lowerName = (tags.name || "").toLowerCase();
  if (lowerName.includes("tbm") || lowerName.includes("taman baca")) {
    return "tbm";
  }
  if (
    (tags.shop === "books" &&
      (tags.cafe === "yes" || tags.amenity === "cafe")) ||
    (tags.amenity === "cafe" &&
      (tags.books === "yes" ||
        tags.reading_room === "yes" ||
        lowerName.includes("buku") ||
        lowerName.includes("book")))
  ) {
    return "book_cafe";
  }
  if (tags.amenity === "library") {
    return "library";
  }
  if (tags.shop === "books") {
    return "indie_bookstore";
  }
  return "reading_lounge";
}

/**
 * @param {string} rawCity
 * @param {string} rawDistrict
 * @returns {{ city: string; district: string | null }}
 */
function normalizeCityAndDistrict(rawCity, rawDistrict) {
  const cleanedCity = rawCity.trim();
  const cleanedDistrict = rawDistrict.trim();
  const mapped = CITY_PRESET_NORMALIZATION.get(cleanedCity.toLowerCase());
  if (!mapped) {
    return {
      city: cleanedCity || "Indonesia",
      district: cleanedDistrict || null,
    };
  }
  return {
    city: mapped.city,
    district: cleanedDistrict || mapped.district || null,
  };
}

/**
 * Normalizes a single OpenStreetMap Overpass element into AnzaBook's reading spot shape.
 * Returns null if outside Indonesia bounds or lacking a name/coordinates.
 * @param {OverpassElement} element
 * @param {string} [fallbackCity]
 * @returns {NormalizedSpot | null}
 */
export function normalizeOverpassElement(element, fallbackCity = "") {
  const tags = element?.tags ?? {};
  const name = typeof tags.name === "string" ? tags.name.trim() : "";
  const lat =
    typeof element?.lat === "number" ? element.lat : element?.center?.lat;
  const lng =
    typeof element?.lon === "number" ? element.lon : element?.center?.lon;

  if (
    !name ||
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !isWithinIndonesiaBbox(lat, lng)
  ) {
    return null;
  }

  const rawCity =
    tags["addr:city"] ||
    tags["addr:town"] ||
    tags["addr:county"] ||
    fallbackCity ||
    "Indonesia";
  const rawDistrict =
    tags["addr:suburb"] ||
    tags["addr:district"] ||
    tags["addr:neighbourhood"] ||
    "";
  const { city, district } = normalizeCityAndDistrict(rawCity, rawDistrict);
  const province =
    tags["addr:state"]?.trim() ||
    tags["addr:province"]?.trim() ||
    (city === "Jakarta"
      ? "DKI Jakarta"
      : city === "Bali"
        ? "Bali"
        : "Indonesia");

  const street = tags["addr:street"]?.trim();
  const houseNumber = tags["addr:housenumber"]?.trim();
  const fullAddress =
    tags["addr:full"]?.trim() ||
    (street
      ? houseNumber
        ? `${street} No. ${houseNumber}`
        : street
      : [district, city, province].filter(Boolean).join(", "));

  const category = inferCategory(tags);
  const websiteRaw = (tags.website || tags["contact:website"] || "").trim();
  const websiteUrl = /^https?:\/\//i.test(websiteRaw) ? websiteRaw : null;
  const igRaw = (tags["contact:instagram"] || tags.instagram || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "");

  const hasWifi =
    tags.internet_access === "wlan" ||
    tags.internet_access === "yes" ||
    tags.wifi === "yes";

  const facilities = {
    wifi: hasWifi,
    powerOutlets: tags.power_supply === "yes" ? true : undefined,
    airConditioned: tags.air_conditioning === "yes" ? true : undefined,
    quietZone: category === "library" ? true : undefined,
    hasBookCollection: true,
    outdoorSeating: tags.outdoor_seating === "yes" ? true : undefined,
    parking: tags.parking && tags.parking !== "no" ? true : undefined,
  };

  const elemType = element.type || "node";
  const elemId = element.id ?? `${lat.toFixed(5)}-${lng.toFixed(5)}`;
  const baseSlug = slugify(`${name}-${city}`) || `spot-${elemId}`;

  return {
    slug: baseSlug,
    name,
    category,
    description: tags.description?.trim() || null,
    address: fullAddress,
    district,
    city,
    province,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    googleMapsUrl: null,
    googlePlaceId: null,
    instagramHandle: igRaw || null,
    websiteUrl,
    openingHoursText: tags.opening_hours?.trim()?.slice(0, 160) || null,
    priceRange:
      category === "library" || category === "tbm" ? "free" : "budget",
    noiseLevel: category === "library" ? "quiet" : "moderate",
    facilities,
    coverUrl: null,
    source: "osm",
    externalSourceId: `osm:${elemType}/${elemId}`,
    verifiedBadge: "curated",
  };
}

/**
 * Deduplicates incoming spots against existing spots and earlier incoming spots.
 * Skips entries within `radiusMeters` (default 50m) OR within `fuzzyRadiusMeters`
 * (default 150m) when name similarity reaches `similarityThreshold` (default 0.6).
 * @template {DedupCandidate} T
 * @param {readonly T[]} incoming
 * @param {readonly DedupCandidate[]} existing
 * @param {{ radiusMeters?: number; fuzzyRadiusMeters?: number; similarityThreshold?: number }} [options]
 * @returns {{ accepted: T[]; skipped: Array<{ spot: T; reason: string; matchedName: string; distanceMeters: number }> }}
 */
export function deduplicateSpots(incoming, existing, options = {}) {
  const radiusMeters = options.radiusMeters ?? 50;
  const fuzzyRadiusMeters = options.fuzzyRadiusMeters ?? 150;
  const similarityThreshold = options.similarityThreshold ?? 0.6;

  /** @type {DedupCandidate[]} */
  const pool = [...existing];
  /** @type {T[]} */
  const accepted = [];
  /** @type {Array<{ spot: T; reason: string; matchedName: string; distanceMeters: number }>} */
  const skipped = [];

  for (const spot of incoming) {
    let matched = null;
    for (const candidate of pool) {
      const distanceMeters = haversineDistanceMeters(
        spot.latitude,
        spot.longitude,
        candidate.latitude,
        candidate.longitude,
      );
      if (distanceMeters <= radiusMeters) {
        matched = {
          reason: `within_${radiusMeters}m`,
          matchedName: candidate.name,
          distanceMeters,
        };
        break;
      }
      if (distanceMeters <= fuzzyRadiusMeters) {
        const similarity = calculateNameSimilarity(spot.name, candidate.name);
        if (similarity >= similarityThreshold) {
          matched = {
            reason: `fuzzy_name_${similarity.toFixed(2)}_within_${fuzzyRadiusMeters}m`,
            matchedName: candidate.name,
            distanceMeters,
          };
          break;
        }
      }
    }

    if (matched) {
      skipped.push({ spot, ...matched });
    } else {
      accepted.push(spot);
      pool.push(spot);
    }
  }

  return { accepted, skipped };
}

/**
 * Builds an Overpass QL query for Indonesian reading spots.
 * @param {string} [cityFilter]
 * @returns {string}
 */
export function buildOverpassQuery(cityFilter) {
  const bbox = `${INDONESIA_BBOX.minLat},${INDONESIA_BBOX.minLng},${INDONESIA_BBOX.maxLat},${INDONESIA_BBOX.maxLng}`;
  if (cityFilter) {
    const escaped = cityFilter.replace(/"/g, '\\"');
    return `[out:json][timeout:45];
area["name"="${escaped}"]["boundary"="administrative"]->.searchArea;
(
  nwr["amenity"="library"](area.searchArea);
  nwr["shop"="books"]["cafe"="yes"](area.searchArea);
  nwr["amenity"="cafe"]["books"="yes"](area.searchArea);
  nwr["amenity"="cafe"]["reading_room"="yes"](area.searchArea);
);
out center tags;`;
  }

  return `[out:json][timeout:60];
(
  node["amenity"="library"](${bbox});
  way["amenity"="library"](${bbox});
  node["shop"="books"]["cafe"="yes"](${bbox});
  way["shop"="books"]["cafe"="yes"](${bbox});
  node["amenity"="cafe"]["books"="yes"](${bbox});
  node["amenity"="cafe"]["reading_room"="yes"](${bbox});
);
out center tags;`;
}

function parseCliArgs(argv) {
  const args = {
    city: "",
    out: "apps/api/src/db/seeds/reading-spots.osm.json",
    mergeExisting: "apps/api/src/db/seeds/reading-spots.json",
    limit: 200,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--city" && argv[i + 1]) args.city = argv[++i];
    else if (token === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (token === "--merge-existing" && argv[i + 1])
      args.mergeExisting = argv[++i];
    else if (token === "--limit" && argv[i + 1])
      args.limit = Math.max(1, Number(argv[++i]) || 200);
  }
  return args;
}

function printHelp() {
  console.log(`AnzaBook Legal Reading Spots Importer (OpenStreetMap Overpass ODbL)

Usage:
  node scripts/import-reading-spots.mjs [options]

Options:
  --city <name>            Filter administrative area name in Indonesia (e.g. "Bandung")
  --out <path>             Output JSON path (default: apps/api/src/db/seeds/reading-spots.osm.json)
  --merge-existing <path>  Existing curated JSON to deduplicate against (default: apps/api/src/db/seeds/reading-spots.json)
  --limit <n>              Maximum normalized records to keep (default: 200)
  --dry-run                Print summary without writing output file
  -h, --help               Show this help message
`);
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const query = buildOverpassQuery(options.city);
  console.log(
    `Fetching legal ODbL OpenStreetMap data from Overpass API${options.city ? ` (city: ${options.city})` : ""}...`,
  );

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": USER_AGENT,
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(65_000),
  });

  if (!response.ok) {
    throw new Error(
      `Overpass API returned HTTP ${response.status} (${response.statusText})`,
    );
  }

  const payload = /** @type {{ elements?: OverpassElement[] }} */ (
    await response.json()
  );
  const elements = Array.isArray(payload.elements) ? payload.elements : [];

  const normalized = [];
  for (const el of elements) {
    const spot = normalizeOverpassElement(el, options.city);
    if (spot) normalized.push(spot);
  }

  const existingPath = resolve(process.cwd(), options.mergeExisting);
  const existing = existsSync(existingPath)
    ? /** @type {DedupCandidate[]} */ (
        JSON.parse(readFileSync(existingPath, "utf8"))
      )
    : [];

  const { accepted, skipped } = deduplicateSpots(normalized, existing);
  const sorted = accepted
    .sort(
      (a, b) => a.city.localeCompare(b.city) || a.slug.localeCompare(b.slug),
    )
    .slice(0, options.limit);

  console.log(
    `Overpass elements: ${elements.length}, valid in Indonesia: ${normalized.length}, accepted after dedup: ${sorted.length}, skipped duplicates: ${skipped.length}.`,
  );

  if (!options.dryRun) {
    const outPath = resolve(process.cwd(), options.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
    console.log(
      `Wrote ${sorted.length} normalized reading spots to ${outPath}`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli().catch((err) => {
    console.error("Failed to import reading spots:", err);
    process.exitCode = 1;
  });
}
