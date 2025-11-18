import { createWorker } from "@lib/bullmq";
import { db } from "@lib/db/client";
import { getLastActivityFromId } from "@lib/db/query/activity";
import { getActivitySummary } from "@lib/db/query/activity-summary";
import {
  getAgentById,
  setAgentStatus,
  trySetAgentRunningFromIdle,
  setAgentStatus as updateAgentStatus,
} from "@lib/db/query/agent";
import { createExecution } from "@lib/db/query/execution";
import { getPortfolioById } from "@lib/db/query/portfolio";
import { type Credentials, execution as executionDB } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { NotFoundException } from "@lib/response/exception";
import { runMainAgentStream } from "@services/agent/core-agent";
import {
  getActivePositionsWithOrders,
  getPortfolioBalance,
  getTradingSymbolsWithTicker,
} from "@services/trading";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { runAgentQueue } from "../job/runAgent";
import { summaryActivityQueue } from "../job/summaryActivity";
import { QueueNames, type RunAgentJobData, type SummaryActivityJobData } from "../types";
import { getTradingSymbols } from "@lib/db/query/symbol";

async function runAgentProcessor(job: Job<RunAgentJobData>) {
  const { agentId } = job.data;

  const portfolio = await getPortfolioById(agentId);
  if (!portfolio) {
    setAgentStatus(agentId, "paused");
    await job.remove();
    return;
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    await job.remove();
    return;
  }

  if (!(await trySetAgentRunningFromIdle(agentId))) {
    throw new Error("Agent can only be continued from idle status");
  }

  const activitySummary = await getActivitySummary(agentId);
  await getLastActivityFromId(agentId, activitySummary?.toActivityId ?? 0);

  const execution = await createExecution({
    agentId,
    trigger: job.data.event,
  });
  if (!execution) {
    throw new NotFoundException("Init execution failed");
  }
  try {
    // Load full context before running the agent
    if (!portfolio.credentials) {
      throw new NotFoundException("Portfolio has no trading credentials");
    }
    const creds = portfolio.credentials as Credentials;
    const [balance, positionsWithOrders, tradableSymbols] = await Promise.all([
      getPortfolioBalance(creds),
      getActivePositionsWithOrders(creds),
      getTradingSymbols(),
    ]);

    if (!balance) {
      throw new NotFoundException("Portfolio credentials missing to fetch balance");
    }

    await runMainAgentStream(
      portfolio,
      agent,
      activitySummary?.summary || null,
      execution,
      balance,
      positionsWithOrders,
      tradableSymbols,
    );
  } catch (e) {
    logger.error({ error: (e as Error).message }, "Error in runAgentProcessor");
  } finally {
    await updateAgentStatus(agentId, "idle");
    await db
      .update(executionDB)
      .set({ status: "completed" })
      .where(eq(executionDB.id, execution?.id));
    await summaryActivityQueue.add(
      QueueNames.SUMMARY_ACTIVITY,
      { agentId } as SummaryActivityJobData,
      { jobId: `summary-activity-${agentId}`, removeOnComplete: true, removeOnFail: true },
    );
  }
}

export async function createRunAgentWorker() {
  const runAgentWorker = createWorker(QueueNames.RUN_AGENT, runAgentProcessor, {
    concurrency: 1000,
  });

  runAgentWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Run agent job completed");
  });

  runAgentWorker.on("failed", async (job: Job<RunAgentJobData> | undefined, err) => {
    if (job) {
      logger.error(`Job ${job.id} has failed with ${err.message}`);
      await setAgentStatus(job.data.agentId, "idle");
      return;
    }
    logger.error({ error: err.message }, "Run agent job failed");
  });

  runAgentWorker.on("stalled", async (jobId: string) => {
    const job = await runAgentQueue.getJob(jobId);
    if (!job) {
      return;
    }
    await setAgentStatus(job.data.agentId, "idle");
    return;
  });
}
