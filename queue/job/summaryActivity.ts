import { createQueue } from "@lib/bullmq";
import { QueueNames } from "@/queue/types";

export const summaryActivityQueue = createQueue(QueueNames.SUMMARY_ACTIVITY);
