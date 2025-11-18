import { createWorker } from "@lib/bullmq";
import { getLastActivityFromId } from "@lib/db/query/activity";
import { getActivitySummary, updateActivitySummary } from "@lib/db/query/activity-summary";
import { getPortfolioById } from "@lib/db/query/portfolio";
import { getAgentById, setAgentStatus } from "@lib/db/query/agent";
import { logger } from "@lib/logger/logger";
import { summarizeActivities } from "@services/ai/summary-activitiy";
import type { Job } from "bullmq";
import { summaryActivityQueue } from "../job/summaryActivity";
import { QueueNames, type SummaryActivityJobData } from "../types";

async function summaryActivityProcessor(job: Job<SummaryActivityJobData>) {
  const { agentId } = job.data;

  const portfolio = await getPortfolioById(agentId);
  if (!portfolio) {
    await job.remove();
    return;
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    await job.remove();
    return;
  }

  const activitySummary = await getActivitySummary(agentId);
  const fromActivityId = activitySummary?.toActivityId ?? 0;
  const activities = await getLastActivityFromId(agentId, fromActivityId);
  if (!activities) {
    return;
  }
  if (activities.length === 0) {
    return;
  }

  const lastActivity = activities[activities.length - 1];
  if (!lastActivity) {
    return;
  }

  const activitiesSummary = await summarizeActivities(activities);

  await updateActivitySummary(agentId, lastActivity.id, activitiesSummary);
}

export async function createSummaryActivityWorker() {
  const summaryActivityWorker = createWorker(
    QueueNames.SUMMARY_ACTIVITY,
    summaryActivityProcessor,
    {
      concurrency: 1000,
    },
  );

  summaryActivityWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Summary activity job completed");
  });

  summaryActivityWorker.on("failed", async (job: Job<SummaryActivityJobData> | undefined, err) => {
    if (job) {
      logger.error(`Job ${job.id} has failed with ${err.message}`);
      await setAgentStatus(job.data.agentId, "idle");
      return;
    }
    logger.error({ error: err.message }, "Summary activity job failed");
  });

  summaryActivityWorker.on("stalled", async (jobId: string) => {
    const job = await summaryActivityQueue.getJob(jobId);
    if (!job) {
      return;
    }
    await setAgentStatus(job.data.agentId, "idle");
    return;
  });
}
