CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentId" integer,
	"type" text NOT NULL,
	"content" json,
	"metadata" json,
	"status" text NOT NULL,
	"agentName" text,
	"executionId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentId" integer,
	"toActivityId" integer,
	"summary" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent" (
	"id" serial PRIMARY KEY NOT NULL,
	"configuration" json,
	"instruction" text NOT NULL,
	"portfolioId" integer NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentId" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolioId" integer NOT NULL,
	"balance" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" json,
	"status" text NOT NULL,
	"agentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar" text,
	"credentials" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_executionId_execution_id_fk" FOREIGN KEY ("executionId") REFERENCES "public"."execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_summary" ADD CONSTRAINT "activity_summary_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_summary" ADD CONSTRAINT "activity_summary_toActivityId_activity_id_fk" FOREIGN KEY ("toActivityId") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshot" ADD CONSTRAINT "balance_snapshot_portfolioId_portfolio_id_fk" FOREIGN KEY ("portfolioId") REFERENCES "public"."portfolio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE no action ON UPDATE no action;