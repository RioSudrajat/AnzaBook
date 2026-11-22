ALTER TABLE "book_highlights" ADD COLUMN "post_caption" text;--> statement-breakpoint
ALTER TABLE "book_highlights" ADD COLUMN "post_config" jsonb;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "title" varchar(140);--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "words_read" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "start_progress_percent" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "end_progress_percent" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "start_chapter_number" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "end_chapter_number" integer;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "highlights_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "post_config" jsonb;