import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { type ActivitySummary, activitySummary } from "../schema";

export async function updateActivitySummary(
  agentId: number,
  toActivityId: number,
  summary: string,
) {
  await db.insert(activitySummary).values({
    agentId,
    toActivityId,
    summary,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getActivitySummary(agentId: number): Promise<ActivitySummary> {
  const row = await db
    .select()
    .from(activitySummary)
    .where(eq(activitySummary.agentId, agentId))
    .orderBy(desc(activitySummary.updatedAt))
    .limit(1);

  const [latest] = row;
  if (!latest) {
    const newRecord = await db
      .insert(activitySummary)
      .values({
        agentId,
        toActivityId: null,
        summary: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    const inserted = newRecord[0];
    if (!inserted) {
      throw new Error("Failed to insert activitySummary record");
    }
    return inserted;
  }

  return latest;
}
