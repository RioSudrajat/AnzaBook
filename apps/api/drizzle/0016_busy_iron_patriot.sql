CREATE TABLE "publisher_approved_writers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" uuid NOT NULL,
	"user_id" text,
	"invited_email" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"can_fast_track" boolean DEFAULT true NOT NULL,
	"invited_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" RENAME COLUMN "alacarte_price_idr" TO "digital_price_idr";--> statement-breakpoint
ALTER TABLE "manuscript_submissions" RENAME COLUMN "proposed_alacarte_price_idr" TO "proposed_digital_price_idr";--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "digital_policy" SET DEFAULT 'nakama_subscription';--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "cover_color" varchar(32) DEFAULT '#13110F' NOT NULL;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "source_language" varchar(10) DEFAULT 'id' NOT NULL;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "target_audience" varchar(40) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "author_notes" text;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "isbn" varchar(32);--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "estimated_pages" integer;--> statement-breakpoint
ALTER TABLE "publisher_approved_writers" ADD CONSTRAINT "publisher_approved_writers_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_approved_writers" ADD CONSTRAINT "publisher_approved_writers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_approved_writers" ADD CONSTRAINT "publisher_approved_writers_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publisher_approved_writers_pub_idx" ON "publisher_approved_writers" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "publisher_approved_writers_user_idx" ON "publisher_approved_writers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "publisher_approved_writers_email_idx" ON "publisher_approved_writers" USING btree ("invited_email");
--> statement-breakpoint
UPDATE "books" SET "digital_policy" = CASE "digital_policy"
  WHEN 'alacarte_only' THEN 'single_purchase'
  WHEN 'hybrid_nakama_alacarte' THEN 'nakama_or_purchase'
  WHEN 'sample_only' THEN 'nakama_subscription'
  WHEN 'print_claim_only' THEN 'print_code_only'
  ELSE "digital_policy"
END WHERE "digital_policy" IN ('alacarte_only', 'hybrid_nakama_alacarte', 'sample_only', 'print_claim_only');--> statement-breakpoint
UPDATE "manuscript_submissions" SET "proposed_digital_policy" = CASE "proposed_digital_policy"
  WHEN 'alacarte_only' THEN 'single_purchase'
  WHEN 'hybrid_nakama_alacarte' THEN 'nakama_or_purchase'
  WHEN 'sample_only' THEN 'nakama_subscription'
  WHEN 'print_claim_only' THEN 'print_code_only'
  ELSE "proposed_digital_policy"
END WHERE "proposed_digital_policy" IN ('alacarte_only', 'hybrid_nakama_alacarte', 'sample_only', 'print_claim_only');
