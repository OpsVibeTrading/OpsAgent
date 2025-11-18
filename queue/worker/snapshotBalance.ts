import { createWorker } from "@lib/bullmq";
import {
  setAgentStatus,
} from "@lib/db/query/agent";
import { logger } from "@lib/logger/logger";
import type { Job } from "bullmq";
import { runAgentQueue } from "../job/runAgent";
import { QueueNames, type RunAgentJobData, type SummaryActivityJobData } from "../types";
import { snapshotPortfolio } from "@services/portfolio";
import { snapshotBalanceQueue } from "../job/snapshotBalance";

async function snapshotBalanceProcessor() {
  await snapshotPortfolio()
}

export async function createSnapshotBalanceWorker() {
  const snapshotBalanceWorker = createWorker(QueueNames.SNAPSHOT_BALANCE, snapshotBalanceProcessor, {
    concurrency: 1000,
  });

  snapshotBalanceWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Run snapshot balance job completed");
  });

  snapshotBalanceWorker.on("failed", async (job: Job<RunAgentJobData> | undefined, err) => {
    if (job) {
      logger.error(`Job ${job.id} has failed with ${err.message}`);
      await setAgentStatus(job.data.agentId, "idle");
      return;
    }
    logger.error({ error: err.message }, "Run agent job failed");
  });

  snapshotBalanceWorker.on("stalled", async (jobId: string) => {
    const job = await runAgentQueue.getJob(jobId);
    if (!job) {
      return;
    }
    await setAgentStatus(job.data.agentId, "idle");
    return;
  });
}


export async function createSnapshotJob() {

  await snapshotBalanceQueue.upsertJobScheduler(
    `snap-shot-balance-scheduled`,
    {
      // 1hour
      every: 1000 * 60 * 5,
      immediately: true ,
    },
    {
      data: {
      },
      opts: {
        removeOnFail: true,
        removeOnComplete: true,
      },
    },
  );
}


