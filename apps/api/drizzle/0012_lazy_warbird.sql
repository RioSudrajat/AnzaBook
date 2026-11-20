CREATE TABLE "drm_security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"watermark_session_id" uuid,
	"watermark_code" varchar(64) NOT NULL,
	"book_id" uuid,
	"book_slug" varchar(120) NOT NULL,
	"chapter_number" integer,
	"event_type" varchar(48) NOT NULL,
	"risk_level" varchar(16) NOT NULL,
	"trigger_detail" varchar(255) NOT NULL,
	"client_os" varchar(32) DEFAULT 'unknown' NOT NULL,
	"user_agent" varchar(512),
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drm_watermark_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watermark_code" varchar(32) NOT NULL,
	"user_id" text NOT NULL,
	"auth_session_id" text,
	"book_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drm_watermark_sessions_watermark_code_unique" UNIQUE("watermark_code")
);
--> statement-breakpoint
ALTER TABLE "drm_security_events" ADD CONSTRAINT "drm_security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_security_events" ADD CONSTRAINT "drm_security_events_watermark_session_id_drm_watermark_sessions_id_fk" FOREIGN KEY ("watermark_session_id") REFERENCES "public"."drm_watermark_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_security_events" ADD CONSTRAINT "drm_security_events_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_watermark_sessions" ADD CONSTRAINT "drm_watermark_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_watermark_sessions" ADD CONSTRAINT "drm_watermark_sessions_auth_session_id_session_id_fk" FOREIGN KEY ("auth_session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drm_watermark_sessions" ADD CONSTRAINT "drm_watermark_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drm_security_events_created_idx" ON "drm_security_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drm_security_events_risk_created_idx" ON "drm_security_events" USING btree ("risk_level","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drm_security_events_user_created_idx" ON "drm_security_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drm_security_events_watermark_idx" ON "drm_security_events" USING btree ("watermark_code");--> statement-breakpoint
CREATE UNIQUE INDEX "drm_watermark_sessions_session_book_unique" ON "drm_watermark_sessions" USING btree ("auth_session_id","book_id");--> statement-breakpoint
CREATE INDEX "drm_watermark_sessions_user_idx" ON "drm_watermark_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drm_watermark_sessions_book_idx" ON "drm_watermark_sessions" USING btree ("book_id");