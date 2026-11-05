CREATE TABLE "membership_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"buyer_id" text,
	"beneficiary_id" text,
	"recipient_username" text,
	"book_slug" text,
	"plan_id" text NOT NULL,
	"months" integer NOT NULL,
	"price_idr" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_url" text,
	"checkout_created_at" timestamp with time zone,
	"paid_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "membership_orders_paid_transaction_id_unique" UNIQUE("paid_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "membership_payment_events" (
	"order_id" uuid NOT NULL,
	"transaction_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_payment_events_order_id_transaction_id_status_pk" PRIMARY KEY("order_id","transaction_id","status")
);
--> statement-breakpoint
CREATE TABLE "membership_reminders" (
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "membership_reminders_user_id_expires_at_kind_pk" PRIMARY KEY("user_id","expires_at","kind")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "reading_progress_user_book_unique";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "membership_reminder_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD COLUMN "last_paragraph_index" integer;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD COLUMN "layout" varchar(16);--> statement-breakpoint
ALTER TABLE "reading_progress" ADD COLUMN "scope" varchar(16) DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD COLUMN "captured_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_beneficiary_id_user_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_payment_events" ADD CONSTRAINT "membership_payment_events_order_id_membership_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."membership_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_reminders" ADD CONSTRAINT "membership_reminders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_orders_buyer_request_unique" ON "membership_orders" USING btree ("buyer_id","request_id");--> statement-breakpoint
CREATE INDEX "membership_orders_buyer_created_idx" ON "membership_orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "membership_orders_beneficiary_paid_idx" ON "membership_orders" USING btree ("beneficiary_id","paid_at");--> statement-breakpoint
CREATE INDEX "membership_reminders_due_idx" ON "membership_reminders" USING btree ("due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_book_scope_unique" ON "reading_progress" USING btree ("user_id","book_id","scope");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
--> statement-breakpoint
UPDATE "reading_progress" AS progress
SET "captured_at" = progress."updated_at",
    "scope" = CASE
      WHEN progress."last_chapter_number" = 1 AND books."digital_policy" <> 'free_open'
        AND NOT EXISTS (
          SELECT 1 FROM "book_claim_codes" AS claim
          WHERE claim."book_id" = progress."book_id" AND claim."claimed_by_user_id" = progress."user_id"
        )
      THEN 'preview'
      ELSE 'full'
    END
FROM "books" AS books
WHERE books."id" = progress."book_id";
--> statement-breakpoint
INSERT INTO "reading_progress" (
  "user_id", "book_id", "last_chapter_id", "last_chapter_number", "scope", "captured_at", "updated_at"
)
SELECT shelf."user_id", shelf."book_id", chapter."id", chapter."chapter_number",
  CASE WHEN books."digital_policy" = 'free_open' OR EXISTS (
    SELECT 1 FROM "book_claim_codes" AS claim
    WHERE claim."book_id" = shelf."book_id" AND claim."claimed_by_user_id" = shelf."user_id"
  ) THEN 'full' ELSE 'preview' END,
  shelf."updated_at", shelf."updated_at"
FROM "user_shelves" AS shelf
JOIN "books" AS books ON books."id" = shelf."book_id"
JOIN "book_chapters" AS chapter ON chapter."book_id" = shelf."book_id"
  AND chapter."chapter_number" = shelf."last_chapter"
WHERE shelf."shelf_status" = 'reading'
  AND (shelf."last_chapter" = 1 OR books."digital_policy" = 'free_open' OR EXISTS (
    SELECT 1 FROM "book_claim_codes" AS claim
    WHERE claim."book_id" = shelf."book_id" AND claim."claimed_by_user_id" = shelf."user_id"
  ))
  AND NOT EXISTS (
    SELECT 1 FROM "reading_progress" AS progress
    WHERE progress."book_id" = shelf."book_id" AND progress."user_id" = shelf."user_id"
  );
--> statement-breakpoint
INSERT INTO "user_shelves" ("user_id", "book_id", "shelf_status", "updated_at")
SELECT activity."user_id", activity."book_id", 'reading', max(activity."read_at")
FROM (
  SELECT "user_id", "book_id", "captured_at" AS "read_at" FROM "reading_progress"
  UNION ALL
  SELECT "user_id", "book_id", "created_at" AS "read_at" FROM "reading_sessions"
) AS activity
GROUP BY activity."user_id", activity."book_id"
ON CONFLICT ("user_id", "book_id") DO UPDATE
SET "shelf_status" = 'reading'
WHERE "user_shelves"."shelf_status" = 'want_to_read';
