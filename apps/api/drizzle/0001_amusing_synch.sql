CREATE TABLE "book_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"is_blueprint_summary" boolean DEFAULT false NOT NULL,
	"title_id" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"content_id" text NOT NULL,
	"content_en" text,
	"blueprint_content" text DEFAULT '' NOT NULL,
	"paragraphs_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio_url" text,
	"audio_duration_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_claim_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_claim_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "book_print_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"isbn" varchar(32),
	"tier" varchar(32) NOT NULL,
	"tier_name" varchar(120) NOT NULL,
	"paper_type" varchar(120) NOT NULL,
	"paper_gsm" real NOT NULL,
	"cover_type" varchar(120) NOT NULL,
	"binding_type" varchar(120) DEFAULT 'Lem Panas' NOT NULL,
	"price_idr" integer NOT NULL,
	"traditional_price_idr" integer NOT NULL,
	"savings_percent" integer NOT NULL,
	"weight_grams" integer DEFAULT 220 NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_print_editions_isbn_unique" UNIQUE("isbn")
);
--> statement-breakpoint
CREATE TABLE "book_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"rating_half_steps" integer NOT NULL,
	"content" text NOT NULL,
	"edition_tier_reviewed" varchar(32) DEFAULT 'rakyat_economy' NOT NULL,
	"is_verified_reader" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(255) NOT NULL,
	"original_title" varchar(255),
	"author" varchar(255) NOT NULL,
	"translator" varchar(255),
	"cover_url" text NOT NULL,
	"cover_color" varchar(32) DEFAULT '#13110F' NOT NULL,
	"synopsis" text NOT NULL,
	"bulletin_excerpt" text,
	"published_year" integer DEFAULT 2026 NOT NULL,
	"page_count" integer NOT NULL,
	"reading_minutes" integer DEFAULT 20 NOT NULL,
	"audio_duration_minutes" integer DEFAULT 0 NOT NULL,
	"digital_policy" varchar(32) DEFAULT 'sample_only' NOT NULL,
	"security_level" varchar(32) DEFAULT 'standard_blur' NOT NULL,
	"is_weekly_bulletin" boolean DEFAULT false NOT NULL,
	"rakyat_price_idr" integer DEFAULT 35000 NOT NULL,
	"standard_price_idr" integer DEFAULT 75000 NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "paragraph_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"paragraph_index" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"pages_read" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"avg_wpm" integer NOT NULL,
	"mode" varchar(32) DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_name" varchar(64) NOT NULL,
	"branch_name" varchar(160) NOT NULL,
	"city" varchar(80) NOT NULL,
	"address" text NOT NULL,
	"map_url" text,
	"latitude" real DEFAULT -6.2088 NOT NULL,
	"longitude" real DEFAULT 106.8456 NOT NULL,
	"distance_km" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_inventories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"rakyat_stock" integer DEFAULT 0 NOT NULL,
	"standard_stock" integer DEFAULT 0 NOT NULL,
	"stock_status" varchar(32) DEFAULT 'available' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_shelves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"shelf_status" varchar(32) DEFAULT 'want_to_read' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"last_chapter" integer DEFAULT 1 NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_claim_codes" ADD CONSTRAINT "book_claim_codes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_claim_codes" ADD CONSTRAINT "book_claim_codes_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_print_editions" ADD CONSTRAINT "book_print_editions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraph_comments" ADD CONSTRAINT "paragraph_comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraph_comments" ADD CONSTRAINT "paragraph_comments_chapter_id_book_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."book_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_branch_id_store_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."store_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shelves" ADD CONSTRAINT "user_shelves_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shelves" ADD CONSTRAINT "user_shelves_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_chapters_book_num_unique" ON "book_chapters" USING btree ("book_id","chapter_number");--> statement-breakpoint
CREATE INDEX "book_chapters_book_idx" ON "book_chapters" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_claim_codes_user_idx" ON "book_claim_codes" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "book_print_editions_book_tier_idx" ON "book_print_editions" USING btree ("book_id","tier");--> statement-breakpoint
CREATE INDEX "book_reviews_book_created_idx" ON "book_reviews" USING btree ("book_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "book_reviews_user_idx" ON "book_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "books_bulletin_idx" ON "books" USING btree ("is_weekly_bulletin");--> statement-breakpoint
CREATE INDEX "paragraph_comments_chapter_para_idx" ON "paragraph_comments" USING btree ("chapter_id","paragraph_index");--> statement-breakpoint
CREATE INDEX "paragraph_comments_user_idx" ON "paragraph_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_created_idx" ON "reading_sessions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reading_sessions_book_idx" ON "reading_sessions" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "store_branches_city_idx" ON "store_branches" USING btree ("city");--> statement-breakpoint
CREATE INDEX "store_branches_chain_idx" ON "store_branches" USING btree ("chain_name");--> statement-breakpoint
CREATE UNIQUE INDEX "store_inventories_branch_book_unique" ON "store_inventories" USING btree ("branch_id","book_id");--> statement-breakpoint
CREATE INDEX "store_inventories_book_idx" ON "store_inventories" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_shelves_user_book_unique" ON "user_shelves" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "user_shelves_user_idx" ON "user_shelves" USING btree ("user_id");