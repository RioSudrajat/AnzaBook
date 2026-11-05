ALTER TABLE "membership_orders" ADD COLUMN "access_revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "canceled_at" timestamp with time zone;