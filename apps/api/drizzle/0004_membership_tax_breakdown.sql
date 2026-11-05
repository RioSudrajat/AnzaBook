ALTER TABLE "membership_orders" ADD COLUMN "subtotal_idr" integer;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD COLUMN "tax_idr" integer;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD COLUMN "tax_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_tax_breakdown_check" CHECK (
      ("membership_orders"."subtotal_idr" IS NULL AND "membership_orders"."tax_idr" IS NULL AND "membership_orders"."tax_rate_bps" IS NULL)
      OR ("membership_orders"."subtotal_idr" IS NOT NULL AND "membership_orders"."tax_idr" IS NOT NULL AND "membership_orders"."tax_rate_bps" IS NOT NULL
        AND "membership_orders"."subtotal_idr" >= 0 AND "membership_orders"."tax_idr" >= 0 AND "membership_orders"."tax_rate_bps" BETWEEN 0 AND 10000
        AND "membership_orders"."subtotal_idr" + "membership_orders"."tax_idr" = "membership_orders"."price_idr")
    );