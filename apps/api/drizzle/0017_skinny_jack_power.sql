CREATE TABLE "publisher_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publisher_followers" ADD CONSTRAINT "publisher_followers_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_followers" ADD CONSTRAINT "publisher_followers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publisher_followers_pub_user_unique" ON "publisher_followers" USING btree ("publisher_id","user_id");--> statement-breakpoint
CREATE INDEX "publisher_followers_user_idx" ON "publisher_followers" USING btree ("user_id");