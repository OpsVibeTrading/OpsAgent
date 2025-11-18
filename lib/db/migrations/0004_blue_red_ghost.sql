CREATE TABLE "order_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolioId" integer NOT NULL,
	"orderId" text NOT NULL,
	"symbol" text NOT NULL,
	"status" text NOT NULL,
	"clientOrderId" text NOT NULL,
	"avgPrice" numeric NOT NULL,
	"origQty" numeric NOT NULL,
	"executedQty" numeric NOT NULL,
	"cumQuote" numeric NOT NULL,
	"timeInForce" text NOT NULL,
	"type" text NOT NULL,
	"reduceOnly" boolean NOT NULL,
	"closePosition" boolean NOT NULL,
	"stopPrice" numeric NOT NULL,
	"workingType" text NOT NULL,
	"priceProtect" boolean NOT NULL,
	"origType" text NOT NULL,
	"time" timestamp NOT NULL,
	"updateTime" timestamp NOT NULL,
	"newChainData" json
);
--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE no action ON UPDATE no action;