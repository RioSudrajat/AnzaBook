import { db } from "../db";
import { seedCatalog } from "../db/seed-catalog";

export async function ensureSeededCatalog(): Promise<void> {
  await seedCatalog(db);
}
