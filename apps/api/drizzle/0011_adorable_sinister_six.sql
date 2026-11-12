ALTER TABLE "book_highlights" ADD COLUMN "is_posted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "book_highlights" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "is_posted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "posted_at" timestamp with time zone;