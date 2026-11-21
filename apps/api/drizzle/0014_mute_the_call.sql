ALTER TABLE "publishers" ADD COLUMN "topics" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "is_accepting_submissions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "submission_guidelines" text;