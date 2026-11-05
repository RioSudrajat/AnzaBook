import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { readingSessions } from "../db/schema";
import { agent, originHeader, signUp } from "./helpers";

const freeSlug = "kecerdasan-sosial-homo-sapiens";
const secondFreeSlug = "madilog-tan-malaka";
const premiumSlug = "merobek-langit-dogma";

async function bookId(client: ReturnType<typeof agent>, slug: string) {
  const result = await client.get(`/api/books/${slug}`);
  expect(result.status).toBe(200);
  return result.body.data.id as string;
}

describe("reading checkpoints and history", () => {
  it("allows a progress PUT preflight from the web app", async () => {
    const result = await agent()
      .options(`/api/reading/progress/${randomUUID()}`)
      .set(originHeader)
      .set("Access-Control-Request-Method", "PUT");
    expect(result.status).toBe(204);
    expect(result.headers["access-control-allow-methods"].split(",")).toContain("PUT");
  });

  it("saves latest positions and orders the shared reading shelf without exposing another account's activity", async () => {
    const reader = agent();
    const otherReader = agent();
    await signUp(reader, "Pemilik Posisi Baca");
    await signUp(otherReader, "Pembaca Lain");
    const firstId = await bookId(reader, freeSlug);
    const secondId = await bookId(reader, secondFreeSlug);
    const time = Date.now();
    const checkpoint = (id: string, capturedAt: number, lastScrollPercent: number) =>
      reader.put(`/api/reading/progress/${id}`).set(originHeader).send({
        capturedAt,
        lastChapterNumber: 1,
        lastPageNumber: 1,
        lastScrollPercent,
        layout: "scroll",
      });

    expect((await checkpoint(firstId, time - 3, 80)).status).toBe(200);
    expect((await checkpoint(firstId, time - 2, 0)).status).toBe(200);
    expect((await checkpoint(secondId, time - 1, 25)).status).toBe(200);
    expect((await checkpoint(firstId, time - 3, 80)).status).toBe(200);
    const latest = await reader.get(`/api/reading/progress/${firstId}`);
    expect(latest.body.data).toMatchObject({ lastScrollPercent: 0, layout: "scroll" });

    const shelves = await reader.get("/api/shelves");
    expect(shelves.body.data).toMatchObject([
      { bookId: secondId, shelfStatus: "reading" },
      { bookId: firstId, shelfStatus: "reading" },
    ]);
    expect(shelves.body.data[1].progressPercent).toBeGreaterThan(0);
    expect((await otherReader.get("/api/shelves")).body.data).toEqual([]);
    expect((await otherReader.get(`/api/reading/progress/${firstId}`)).body.data).toBeNull();
  });

  it("keeps preview checkpoints separate from full reading positions", async () => {
    const reader = agent();
    await signUp(reader, "Pembaca Cuplikan");
    const id = await bookId(reader, premiumSlug);
    const endpoint = `/api/reading/progress/${id}`;

    const forbidden = await reader.put(endpoint).set(originHeader).send({ lastChapterNumber: 1 });
    expect(forbidden.status).toBe(403);
    const preview = await reader.put(`${endpoint}?scope=preview`).set(originHeader).send({
      lastChapterNumber: 1,
      lastParagraphIndex: 0,
      lastScrollPercent: 30,
      layout: "scroll",
    });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toMatchObject({ lastParagraphIndex: 0, lastScrollPercent: 30 });
    expect((await reader.get(endpoint)).body.data).toBeNull();
    expect((await reader.get(`${endpoint}?scope=preview`)).body.data.lastScrollPercent).toBe(30);
    expect((await reader.get("/api/shelves")).body.data[0]).toMatchObject({
      bookId: id, shelfStatus: "reading", progressPercent: 0, previewProgressPercent: 30,
    });
    const inaccessibleChapter = await reader.put(`${endpoint}?scope=preview`).set(originHeader).send({
      lastChapterNumber: 2,
    });
    expect(inaccessibleChapter.status).toBe(403);
  });

  it("records each session once and returns only the selected book's sessions", async () => {
    const reader = agent();
    const otherReader = agent();
    await signUp(reader, "Pemilik Riwayat Baca");
    await signUp(otherReader, "Pembaca Berbeda");
    const firstId = await bookId(reader, freeSlug);
    const secondId = await bookId(reader, secondFreeSlug);
    const sessionId = randomUUID();
    const session = {
      sessionId, bookId: firstId, pagesRead: 1, durationSeconds: 12, avgWpm: 120,
    };
    const record = (client: ReturnType<typeof agent>, input: typeof session) =>
      client.post("/api/reading").set(originHeader).send(input);

    expect((await record(reader, session)).status).toBe(201);
    expect((await record(reader, session)).status).toBe(201);
    expect((await record(reader, { ...session, bookId: secondId, sessionId: randomUUID() })).status).toBe(201);
    expect((await record(otherReader, session)).status).toBe(409);
    const history = await reader.get(`/api/reading/sessions/${firstId}`);
    expect(history.body.data).toMatchObject([{ id: sessionId, bookId: firstId }]);
    expect((await otherReader.get(`/api/reading/sessions/${firstId}`)).body.data).toEqual([]);
  });

  it("counts consecutive Jakarta reading days instead of all historical days", async () => {
    const reader = agent();
    await signUp(reader, "Pembaca Harian");
    const id = await bookId(reader, freeSlug);
    for (const daysAgo of [0, 1, 4]) {
      const sessionId = randomUUID();
      const created = await reader.post("/api/reading").set(originHeader).send({
        sessionId, bookId: id, pagesRead: 1, durationSeconds: 60, avgWpm: 150,
      });
      expect(created.status).toBe(201);
      await db.update(readingSessions)
        .set({ createdAt: new Date(Date.now() - daysAgo * 86_400_000) })
        .where(eq(readingSessions.id, sessionId));
    }
    const history = await reader.get("/api/reading");
    expect(history.body.summary.currentStreakDays).toBe(2);
  });
});
