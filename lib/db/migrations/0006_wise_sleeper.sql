ALTER TABLE "balance_snapshot" RENAME COLUMN "balance" TO "availableBalance";--> statement-breakpoint
ALTER TABLE "balance_snapshot" ADD COLUMN "totalBalance" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_snapshot" ADD COLUMN "totalPnl" numeric NOT NULL;