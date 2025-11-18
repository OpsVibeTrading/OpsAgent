CREATE TABLE "trade_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolioId" integer NOT NULL,
	"asterTradeId" integer NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"price" numeric NOT NULL,
	"qty" numeric NOT NULL,
	"realizedPnl" numeric NOT NULL,
	"marginAsset" text NOT NULL,
	"quoteQty" numeric NOT NULL,
	"commission" numeric NOT NULL,
	"commissionAsset" text NOT NULL,
	"time" timestamp NOT NULL,
	"positionSide" text NOT NULL,
	"buyer" boolean NOT NULL,
	"maker" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_history" ADD CONSTRAINT "trade_history_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE no action ON UPDATE no action;