CREATE TABLE "book_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"chapter_id" uuid,
	"chapter_number" integer DEFAULT 1 NOT NULL,
	"page_number" integer DEFAULT 1 NOT NULL,
	"selected_text" text NOT NULL,
	"color" varchar(32) DEFAULT 'yellow' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"last_chapter_id" uuid,
	"last_chapter_number" integer DEFAULT 1 NOT NULL,
	"last_page_number" integer DEFAULT 1 NOT NULL,
	"last_scroll_percent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "author_avatar" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "editor" varchar(255);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "editor_avatar" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "total_chapters" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "access_tier" varchar(32) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "has_physical" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "available_languages" jsonb DEFAULT '["id"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "collection_name" varchar(120);--> statement-breakpoint
ALTER TABLE "store_branches" ADD COLUMN "phone" varchar(64);--> statement-breakpoint
ALTER TABLE "book_highlights" ADD CONSTRAINT "book_highlights_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_highlights" ADD CONSTRAINT "book_highlights_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_highlights" ADD CONSTRAINT "book_highlights_chapter_id_book_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."book_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_last_chapter_id_book_chapters_id_fk" FOREIGN KEY ("last_chapter_id") REFERENCES "public"."book_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_highlights_user_book_idx" ON "book_highlights" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "book_highlights_chapter_idx" ON "book_highlights" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_book_unique" ON "reading_progress" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "reading_progress_user_idx" ON "reading_progress" USING btree ("user_id");