CREATE TABLE "reading_spot_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_spot_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"review_id" uuid,
	"reporter_user_id" text NOT NULL,
	"reason_type" varchar(32) NOT NULL,
	"details" text NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_spot_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(180) NOT NULL,
	"category" varchar(32) NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"district" varchar(120),
	"city" varchar(100) NOT NULL,
	"province" varchar(100) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"google_maps_url" text,
	"google_place_id" varchar(128),
	"instagram_handle" varchar(80),
	"website_url" text,
	"opening_hours_text" varchar(160),
	"price_range" varchar(24) DEFAULT 'budget' NOT NULL,
	"noise_level" varchar(24) DEFAULT 'moderate' NOT NULL,
	"facilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cover_url" text,
	"source" varchar(32) DEFAULT 'curated' NOT NULL,
	"external_source_id" varchar(160),
	"linked_branch_id" uuid,
	"linked_calendar_id" uuid,
	"submitted_by_user_id" text,
	"status" varchar(24) DEFAULT 'published' NOT NULL,
	"verified_badge" varchar(24) DEFAULT 'none' NOT NULL,
	"rejection_reason" text,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_spots_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "reading_spot_bookmarks" ADD CONSTRAINT "reading_spot_bookmarks_spot_id_reading_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."reading_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_bookmarks" ADD CONSTRAINT "reading_spot_bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_reports" ADD CONSTRAINT "reading_spot_reports_spot_id_reading_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."reading_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_reports" ADD CONSTRAINT "reading_spot_reports_review_id_reading_spot_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reading_spot_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_reports" ADD CONSTRAINT "reading_spot_reports_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_reviews" ADD CONSTRAINT "reading_spot_reviews_spot_id_reading_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."reading_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spot_reviews" ADD CONSTRAINT "reading_spot_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spots" ADD CONSTRAINT "reading_spots_linked_branch_id_store_branches_id_fk" FOREIGN KEY ("linked_branch_id") REFERENCES "public"."store_branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spots" ADD CONSTRAINT "reading_spots_linked_calendar_id_community_calendars_id_fk" FOREIGN KEY ("linked_calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_spots" ADD CONSTRAINT "reading_spots_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reading_spot_bookmarks_spot_user_unique" ON "reading_spot_bookmarks" USING btree ("spot_id","user_id");--> statement-breakpoint
CREATE INDEX "reading_spot_bookmarks_user_idx" ON "reading_spot_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_spot_reports_spot_status_idx" ON "reading_spot_reports" USING btree ("spot_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_spot_reviews_spot_user_unique" ON "reading_spot_reviews" USING btree ("spot_id","user_id");--> statement-breakpoint
CREATE INDEX "reading_spot_reviews_spot_created_idx" ON "reading_spot_reviews" USING btree ("spot_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reading_spots_status_lat_lng_idx" ON "reading_spots" USING btree ("status","latitude","longitude");--> statement-breakpoint
CREATE INDEX "reading_spots_status_city_idx" ON "reading_spots" USING btree ("status","city");--> statement-breakpoint
CREATE INDEX "reading_spots_status_category_idx" ON "reading_spots" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "reading_spots_branch_idx" ON "reading_spots" USING btree ("linked_branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_spots_source_ext_unique" ON "reading_spots" USING btree ("source","external_source_id");