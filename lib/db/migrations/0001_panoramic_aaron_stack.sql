CREATE TABLE "symbol" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"logo" text NOT NULL,
	"canTrade" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN "pnl" text DEFAULT '0' NOT NULL;