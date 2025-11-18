import { createRunAgentWorker } from "@/queue/worker/runAgent";
import { createSnapshotBalanceWorker, createSnapshotJob } from "@/queue/worker/snapshotBalance";
import {
  createSnapshotPortfolioListJob,
  createSnapshotPortfolioListWorker,
} from "@/queue/worker/snapshotPortfolioList";
import { createSummaryActivityWorker } from "@/queue/worker/summaryActivity";

createRunAgentWorker();
createSummaryActivityWorker();
createSnapshotBalanceWorker();
createSnapshotPortfolioListWorker();

createSnapshotJob();
createSnapshotPortfolioListJob();
