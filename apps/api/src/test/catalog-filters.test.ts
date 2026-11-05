import { describe, expect, it } from "vitest";
import { agent } from "./helpers";

describe("catalog filters", () => {
  it("filters by actual catalog metadata before paginating", async () => {
    const client = agent();
    const filtered = await client.get("/api/books").query({
      category: "Berpikir Kritis",
      language: "en",
      accessTier: "premium",
      limit: 1,
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toMatchObject([
      { slug: "sains-logika-seni-hidup-bermutu", accessTier: "premium" },
    ]);
    expect(filtered.body.meta.hasMore).toBe(false);

    const unavailable = await client.get("/api/books").query({ language: "fr" });
    expect(unavailable.status).toBe(200);
    expect(unavailable.body.data).toEqual([]);
  });
});
