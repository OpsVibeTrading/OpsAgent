ALTER TABLE "trade_history" ALTER COLUMN "asterTradeId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "trade_history" ADD COLUMN "orderId" text;