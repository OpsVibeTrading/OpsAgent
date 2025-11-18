import { FlowProducer, type Processor, Queue, Worker } from "bullmq";
import connection from "@/lib/redis/client";

export function createQueue(name: string) {
  return new Queue(name, { connection });
}

export function createWorker(
  name: string,
  processor: Processor,
  options: Partial<import("bullmq").WorkerOptions> = {},
) {
  return new Worker(name, processor, { connection, ...options });
}

export function createFlowProducer() {
  return new FlowProducer({ connection });
}
