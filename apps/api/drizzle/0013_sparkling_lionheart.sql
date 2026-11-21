CREATE TABLE "drm_reader_suspensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(24) DEFAULT 'suspended' NOT NULL,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"trigger_count" integer DEFAULT 7 NOT NULL,
	"last_event_type" varchar(48) NOT NULL,
	"last_book_slug" varchar(120),
	"suspended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"appeal_message" text,
	"appealed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"reinstated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "drm_reader_suspensions" ADD CONSTRAINT "drm_reader_suspensions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_reader_suspensions" ADD CONSTRAINT "drm_reader_suspensions_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drm_reader_suspensions_user_suspended_idx" ON "drm_reader_suspensions" USING btree ("user_id","suspended_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drm_reader_suspensions_status_suspended_idx" ON "drm_reader_suspensions" USING btree ("status","suspended_at" DESC NULLS LAST);