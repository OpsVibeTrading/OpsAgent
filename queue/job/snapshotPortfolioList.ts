import { createQueue } from "@lib/bullmq";
import { QueueNames } from "@/queue/types";

export const snapshotPortfolioListQueue = createQueue(QueueNames.SNAPSHOT_PORTFOLIO_LIST);
