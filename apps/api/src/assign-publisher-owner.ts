// Assigns a publisher member role to an existing account:
// pnpm publisher:assign-owner <publisher-slug> <email> [owner|editor|finance]
import "./load-env";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PublisherMemberRole } from "@starter/shared/types";
import { databaseError, databaseUrl } from "./db/connection";
import * as schema from "./db/schema";

const VALID_PUBLISHER_MEMBER_ROLES: readonly PublisherMemberRole[] = [
  "owner",
  "editor",
  "finance",
];

const USAGE_MESSAGE =
  "Usage: pnpm publisher:assign-owner <publisher-slug> <email> [owner|editor|finance]";

class AssignmentInputError extends Error {}

export interface AssignPublisherOwnerResult {
  publisherId: string;
  publisherSlug: string;
  userId: string;
  email: string;
  role: PublisherMemberRole;
}

/**
 * Idempotently assigns or updates a user's membership role on a publisher
 * identified by slug and email (both matched case-insensitively).
 */
export async function assignPublisherOwner(
  db: NodePgDatabase<typeof schema>,
  publisherSlug: string,
  email: string,
  role: PublisherMemberRole = "owner",
): Promise<AssignPublisherOwnerResult> {
  const normalizedSlug = publisherSlug.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = (
    typeof role === "string" ? role.trim().toLowerCase() : role
  ) as PublisherMemberRole;

  if (!normalizedSlug) {
    throw new AssignmentInputError("Publisher slug is required.");
  }
  if (!normalizedEmail) {
    throw new AssignmentInputError("User email is required.");
  }
  if (!VALID_PUBLISHER_MEMBER_ROLES.includes(normalizedRole)) {
    throw new AssignmentInputError(
      `Invalid publisher member role "${String(role)}". Expected one of: ${VALID_PUBLISHER_MEMBER_ROLES.join(", ")}.`,
    );
  }

  const [publisher] = await db
    .select({
      id: schema.publishers.id,
      slug: schema.publishers.slug,
    })
    .from(schema.publishers)
    .where(eq(sql`lower(${schema.publishers.slug})`, normalizedSlug))
    .limit(1);

  if (!publisher) {
    throw new AssignmentInputError(
      `Publisher "${normalizedSlug}" was not found.`,
    );
  }

  const [targetUser] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
    })
    .from(schema.user)
    .where(eq(sql`lower(${schema.user.email})`, normalizedEmail))
    .limit(1);

  if (!targetUser) {
    throw new AssignmentInputError(
      `No account found for ${normalizedEmail}. Sign up first, then retry.`,
    );
  }

  await db
    .insert(schema.publisherMembers)
    .values({
      publisherId: publisher.id,
      userId: targetUser.id,
      role: normalizedRole,
    })
    .onConflictDoUpdate({
      target: [
        schema.publisherMembers.publisherId,
        schema.publisherMembers.userId,
      ],
      set: { role: normalizedRole },
    });

  return {
    publisherId: publisher.id,
    publisherSlug: publisher.slug,
    userId: targetUser.id,
    email: targetUser.email,
    role: normalizedRole,
  };
}

async function runCli(): Promise<void> {
  // pnpm forwards a literal "--" when called as `pnpm publisher:assign-owner -- ...`.
  const [publisherSlug, email, roleArg, ...extra] = process.argv
    .slice(2)
    .filter((arg) => arg !== "--");

  if (!publisherSlug || !email || extra.length > 0) {
    console.error(USAGE_MESSAGE);
    process.exitCode = 1;
    return;
  }

  const role = (roleArg ?? "owner").trim().toLowerCase() as PublisherMemberRole;
  if (!VALID_PUBLISHER_MEMBER_ROLES.includes(role)) {
    console.error(`Invalid role "${roleArg}".\n${USAGE_MESSAGE}`);
    process.exitCode = 1;
    return;
  }

  let pool: Pool | undefined;
  try {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    pool.on("error", () => {});
    const db = drizzle(pool, { schema });
    const result = await assignPublisherOwner(db, publisherSlug, email, role);
    console.log(
      `${result.email} now has publisher role "${result.role}" for ${result.publisherSlug} (${result.publisherId}).`,
    );
  } catch (error) {
    console.error(
      error instanceof AssignmentInputError
        ? error.message
        : databaseError(error),
    );
    process.exitCode = 1;
  } finally {
    await pool?.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runCli();
}
