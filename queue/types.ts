import type { ExecutionTrigger } from "@lib/db/schema";

export enum QueueNames {
  RUN_AGENT = "run_agent",
  SUMMARY_ACTIVITY = "summary_activity",
  SNAPSHOT_BALANCE = "snapshot_balance",
  SNAPSHOT_PORTFOLIO_LIST = "snapshot_portfolio_list",
}

export interface RunAgentJobData {
  agentId: number;
  userPrompt?: string;
  event: ExecutionTrigger;
  isFromDelay?: boolean;
}

export interface SummaryActivityJobData {
  agentId: number;
}

export type SnapshotBalanceJobData = {};

export type SnapshotPortfolioListJobData = {};
