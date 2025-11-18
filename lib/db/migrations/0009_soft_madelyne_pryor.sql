ALTER TABLE "balance_snapshot" ALTER COLUMN "createdAt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN "balanceFloor" integer;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN "maxLeverage" integer;