// Applies committed SQL in apps/api/drizzle. Runs standalone (no API env
// needed beyond a connection string): `pnpm db:migrate` in development, and
// `node dist/migrate.js` in the Docker migrator image once per release.
import "./load-env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseError, databaseUrl } from "./db/connection";
import * as schema from "./db/schema";
import { seedCatalog } from "./db/seed-catalog";

// src/migrate.ts and dist/migrate.js both sit one level below apps/api.
const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

let pool: Pool | undefined;
try {
  pool = new Pool({
    connectionString: databaseUrl(
      process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
    ),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () =>
    console.error("The PostgreSQL migration connection was interrupted."),
  );
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder });
  console.log("PostgreSQL migrations applied.");
  await seedCatalog(db);
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  await pool?.end();
}
