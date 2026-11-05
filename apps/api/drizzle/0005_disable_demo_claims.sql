ALTER TABLE "book_claim_codes" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "book_claim_codes" SET "is_demo" = true
WHERE "code" IN (
  'SAINS-MALAKA-01', 'ZENIUS-SMART-26', 'SOSIAL-HOMO-26',
  'ANZA-SAPIENS-01', 'SABDA-DOGMA-26', 'CANIA-CINTA-26',
  'ANZA-RAKYAT-2026', 'ANZA-MERDEKA-01', 'MADILOG-RAKYAT-01'
);
