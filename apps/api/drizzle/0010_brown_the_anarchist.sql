ALTER TABLE "manuscript_submissions" ALTER COLUMN "status" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ALTER COLUMN "status" SET DEFAULT 'pending_review';--> statement-breakpoint
ALTER TABLE "community_calendars" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "community_calendars" ADD COLUMN "verification_documents" jsonb;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "category" varchar(80);--> statement-breakpoint
ALTER TABLE "manuscript_submissions" ADD COLUMN "editorial_notes" text;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "header_image_url" text;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "verification_documents" jsonb;--> statement-breakpoint
ALTER TABLE "author_applications" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "author_applications" ADD COLUMN "verification_documents" jsonb;