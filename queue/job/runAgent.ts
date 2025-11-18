import { createQueue } from "@lib/bullmq";
import { QueueNames } from "@/queue/types";

export const runAgentQueue = createQueue(QueueNames.RUN_AGENT);
