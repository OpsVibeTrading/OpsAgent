import { createQueue } from "@lib/bullmq";
import { QueueNames } from "@/queue/types";

export const snapshotBalanceQueue = createQueue(QueueNames.SNAPSHOT_BALANCE);


