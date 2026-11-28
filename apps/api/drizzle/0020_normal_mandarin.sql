ALTER TABLE "books" ALTER COLUMN "has_physical" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "book_purchases" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "subtotal_idr" integer;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "tax_idr" integer;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "tax_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "currency" text DEFAULT 'IDR' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "checkout_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "paid_transaction_id" text;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "is_catalog_revision" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "book_purchases_user_request_unique" ON "book_purchases" USING btree ("user_id","request_id");--> statement-breakpoint
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_paid_transaction_id_unique" UNIQUE("paid_transaction_id");--> statement-breakpoint
UPDATE "book_purchases" SET "paid_at" = "created_at" WHERE "status" = 'paid' AND "paid_at" IS NULL;--> statement-breakpoint
UPDATE "books" SET "digital_policy" = CASE WHEN "digital_price_idr" IS NOT NULL AND "digital_price_idr" > 0 THEN 'single_purchase' ELSE 'nakama_subscription' END WHERE "digital_policy" = 'nakama_or_purchase';--> statement-breakpoint
UPDATE "books" SET "digital_policy" = 'single_purchase', "digital_price_idr" = COALESCE(NULLIF("digital_price_idr", 0), 99000) WHERE "digital_policy" = 'print_code_only';--> statement-breakpoint
UPDATE "books" SET "access_tier" = 'premium' WHERE "access_tier" = 'premium_physical';--> statement-breakpoint
UPDATE "books" SET "has_physical" = false WHERE "has_physical" = true;--> statement-breakpoint
UPDATE "manuscript_submissions" SET "proposed_digital_policy" = 'single_purchase', "proposed_digital_price_idr" = COALESCE(NULLIF("proposed_digital_price_idr", 0), 99000) WHERE "proposed_digital_policy" = 'print_code_only';--> statement-breakpoint
UPDATE "manuscript_submissions" SET "proposed_digital_policy" = CASE WHEN "proposed_digital_price_idr" IS NOT NULL AND "proposed_digital_price_idr" > 0 THEN 'single_purchase' ELSE 'nakama_subscription' END WHERE "proposed_digital_policy" = 'nakama_or_purchase';