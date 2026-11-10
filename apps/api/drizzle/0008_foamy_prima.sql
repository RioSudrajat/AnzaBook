CREATE TABLE "book_claim_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"publisher_id" uuid NOT NULL,
	"batch_name" varchar(160) NOT NULL,
	"total_codes" integer NOT NULL,
	"unit_fee_idr" integer DEFAULT 0 NOT NULL,
	"billing_status" varchar(20) DEFAULT 'free_tier' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"price_idr" integer NOT NULL,
	"publisher_share_idr" integer NOT NULL,
	"affiliate_calendar_id" uuid,
	"affiliate_commission_idr" integer DEFAULT 0 NOT NULL,
	"anzabook_net_idr" integer NOT NULL,
	"status" varchar(20) DEFAULT 'paid' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'manual_or_midtrans' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_wallet_ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"entry_type" varchar(40) NOT NULL,
	"amount_idr" integer NOT NULL,
	"source_order_id" text,
	"source_event_id" text,
	"source_book_purchase_id" text,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscript_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"title_id" varchar(255) NOT NULL,
	"content_id" text NOT NULL,
	"content_en" text,
	"blueprint_content" text,
	"estimated_minutes" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscript_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_user_id" text NOT NULL,
	"publisher_id" uuid,
	"title" varchar(255) NOT NULL,
	"synopsis" text NOT NULL,
	"proposed_digital_policy" varchar(32) NOT NULL,
	"proposed_alacarte_price_idr" integer,
	"print_sim_json" jsonb,
	"status" varchar(20) DEFAULT 'pending_review' NOT NULL,
	"rejection_reason" text,
	"published_book_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(255) NOT NULL,
	"ikapi_number" varchar(80),
	"description" text,
	"logo_url" text,
	"city" varchar(80),
	"address" text,
	"contact_email" varchar(255),
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"free_claim_code_quota_per_book" integer DEFAULT 500 NOT NULL,
	"claim_code_fee_idr" integer DEFAULT 2000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "author_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"pen_name" varchar(160) NOT NULL,
	"bio" text NOT NULL,
	"portfolio_url" text,
	"claimed_book_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" text,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_user_id" text NOT NULL,
	"following_user_id" text NOT NULL,
	"is_subscribed_updates" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "location_city" varchar(80);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "author_status" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "author_pen_name" varchar(160);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publisher_id" uuid;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "author_user_id" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "alacarte_price_idr" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "is_valid_for_royalty" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD COLUMN "affiliate_calendar_id" uuid;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD COLUMN "affiliate_event_id" uuid;--> statement-breakpoint
ALTER TABLE "book_claim_batches" ADD CONSTRAINT "book_claim_batches_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_claim_batches" ADD CONSTRAINT "book_claim_batches_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_affiliate_calendar_id_community_calendars_id_fk" FOREIGN KEY ("affiliate_calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_wallet_ledgers" ADD CONSTRAINT "community_wallet_ledgers_calendar_id_community_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_chapters" ADD CONSTRAINT "manuscript_chapters_manuscript_id_manuscript_submissions_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscript_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD CONSTRAINT "manuscript_submissions_published_book_id_books_id_fk" FOREIGN KEY ("published_book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_members" ADD CONSTRAINT "publisher_members_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_members" ADD CONSTRAINT "publisher_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_applications" ADD CONSTRAINT "author_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_applications" ADD CONSTRAINT "author_applications_claimed_book_id_books_id_fk" FOREIGN KEY ("claimed_book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_applications" ADD CONSTRAINT "author_applications_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_user_id_user_id_fk" FOREIGN KEY ("following_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_claim_batches_book_idx" ON "book_claim_batches" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_claim_batches_publisher_idx" ON "book_claim_batches" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "book_purchases_user_idx" ON "book_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "book_purchases_book_idx" ON "book_purchases" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_purchases_affiliate_cal_idx" ON "book_purchases" USING btree ("affiliate_calendar_id");--> statement-breakpoint
CREATE INDEX "community_wallet_ledgers_cal_idx" ON "community_wallet_ledgers" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "community_wallet_ledgers_created_idx" ON "community_wallet_ledgers" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "manuscript_chapters_manuscript_num_unique" ON "manuscript_chapters" USING btree ("manuscript_id","chapter_number");--> statement-breakpoint
CREATE INDEX "manuscript_chapters_manuscript_idx" ON "manuscript_chapters" USING btree ("manuscript_id");--> statement-breakpoint
CREATE INDEX "manuscript_submissions_author_idx" ON "manuscript_submissions" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "manuscript_submissions_publisher_idx" ON "manuscript_submissions" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "manuscript_submissions_status_idx" ON "manuscript_submissions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "publisher_members_pub_user_unique" ON "publisher_members" USING btree ("publisher_id","user_id");--> statement-breakpoint
CREATE INDEX "publisher_members_user_idx" ON "publisher_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "publishers_slug_idx" ON "publishers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "publishers_status_idx" ON "publishers" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "author_applications_user_idx" ON "author_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "author_applications_status_idx" ON "author_applications" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_follower_following_unique" ON "user_follows" USING btree ("follower_user_id","following_user_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_idx" ON "user_follows" USING btree ("follower_user_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_user_id");--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_affiliate_calendar_id_community_calendars_id_fk" FOREIGN KEY ("affiliate_calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_affiliate_event_id_community_events_id_fk" FOREIGN KEY ("affiliate_event_id") REFERENCES "public"."community_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "books_publisher_idx" ON "books" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "books_author_user_idx" ON "books" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "membership_orders_affiliate_cal_idx" ON "membership_orders" USING btree ("affiliate_calendar_id");--> statement-breakpoint
CREATE INDEX "membership_orders_affiliate_event_idx" ON "membership_orders" USING btree ("affiliate_event_id");