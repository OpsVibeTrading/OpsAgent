import { db } from "../client";
import type { ExecutionTrigger } from "../schema";
import { execution as executionDB } from "../schema";
export type ExecutionCreateData = {
  agentId: number;
  trigger: ExecutionTrigger;
};
export async function createExecution(data: ExecutionCreateData) {
  const [execution] = await db
    .insert(executionDB)
    .values({
      status: "new",
      trigger: data.trigger,
      agentId: data.agentId,
    })
    .returning();
  return execution;
}
