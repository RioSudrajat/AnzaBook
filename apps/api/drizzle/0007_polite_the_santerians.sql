CREATE TABLE "community_calendar_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_calendar_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(32) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" varchar(32) DEFAULT 'community' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"cover_url" text,
	"city" varchar(80),
	"contact_email" varchar(160),
	"social_links" jsonb,
	"verification_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_calendars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"calendar_id" uuid NOT NULL,
	"book_id" uuid,
	"featured_work" jsonb,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"logistics_notes" text,
	"cover_url" text NOT NULL,
	"theme_preset" varchar(32) DEFAULT 'minimal' NOT NULL,
	"visibility" varchar(32) DEFAULT 'public' NOT NULL,
	"event_type" varchar(40) DEFAULT 'book_club' NOT NULL,
	"category_tag" varchar(64) DEFAULT 'Literasi' NOT NULL,
	"co_hosts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" varchar(32) DEFAULT 'offline' NOT NULL,
	"district" varchar(120),
	"city" varchar(80),
	"venue_name" varchar(200),
	"venue_address" text,
	"hide_address_until_approved" boolean DEFAULT false NOT NULL,
	"latitude" real,
	"longitude" real,
	"place_source_lat" real,
	"place_source_lng" real,
	"online_meeting_url" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Jakarta' NOT NULL,
	"capacity" integer,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"allow_waitlist" boolean DEFAULT true NOT NULL,
	"status" varchar(32) DEFAULT 'published' NOT NULL,
	"parent_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(32) DEFAULT 'going' NOT NULL,
	"note" text,
	"checkin_code" varchar(32) NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_calendar_followers" ADD CONSTRAINT "community_calendar_followers_calendar_id_community_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_calendar_followers" ADD CONSTRAINT "community_calendar_followers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_calendar_members" ADD CONSTRAINT "community_calendar_members_calendar_id_community_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_calendar_members" ADD CONSTRAINT "community_calendar_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_calendars" ADD CONSTRAINT "community_calendars_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_calendar_id_community_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."community_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."community_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_checked_in_by_user_id_user_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_calendar_followers_cal_user_unique" ON "community_calendar_followers" USING btree ("calendar_id","user_id");--> statement-breakpoint
CREATE INDEX "community_calendar_followers_user_idx" ON "community_calendar_followers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_calendar_members_cal_user_unique" ON "community_calendar_members" USING btree ("calendar_id","user_id");--> statement-breakpoint
CREATE INDEX "community_calendar_members_user_idx" ON "community_calendar_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_calendars_slug_idx" ON "community_calendars" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "community_calendars_status_idx" ON "community_calendars" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "community_calendars_creator_idx" ON "community_calendars" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "community_events_cal_idx" ON "community_events" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "community_events_book_idx" ON "community_events" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "community_events_starts_idx" ON "community_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "community_events_status_idx" ON "community_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_reports_event_idx" ON "event_reports" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_rsvps_event_user_unique" ON "event_rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_rsvps_event_checkin_idx" ON "event_rsvps" USING btree ("event_id","checkin_code");--> statement-breakpoint
CREATE INDEX "event_rsvps_user_created_idx" ON "event_rsvps" USING btree ("user_id","created_at" DESC NULLS LAST);