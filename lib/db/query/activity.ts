import { and, asc, count, desc, eq, gt, type SQL } from "drizzle-orm";
import { db } from "../client";
import { type Activity, type ActivityStatus, activity } from "../schema";
import type { PaginationRequest, PaginationResponse } from "../type";

function removeRedacted(str: string): string {
  return str.replace(/\[REDACTED\]/g, "");
}

export type InsertActivityInput = {
  executionId?: number | null;
  agentId?: number | null;
  type: string;
  content: unknown;
  status?: "pending" | "running" | "completed" | "failed";
  agentName?: string | null;
  metadata?: unknown;
};

export async function insertActivity(input: InsertActivityInput) {
  const [row] = await db
    .insert(activity)
    .values({
      agentId: input.agentId ?? null,
      ...(input.executionId != null ? { executionId: input.executionId } : {}),
      type: input.type,
      content: typeof input.content === "string" ? removeRedacted(input.content) : input.content,
      metadata: input.metadata,
      status: input.status ?? "completed",
      agentName: input.agentName ?? null,
    })
    .returning();
  return row;
}

export type UpdateActivityInput = {
  content?: unknown;
  status?: "pending" | "running" | "completed" | "failed";
  metadata?: unknown;
};

export async function updateActivity(id: number, input: UpdateActivityInput) {
  const [row] = await db
    .update(activity)
    .set({
      content: typeof input.content === "string" ? removeRedacted(input.content) : input.content,
      status: input.status,
      metadata: input.metadata,
      updatedAt: new Date(),
    })
    .where(eq(activity.id, id))
    .returning();
  return row;
}

export type ActivityFilter = {
  agentId?: number;
  type?: string;
  status?: ActivityStatus;
  agentName?: string;
  pagination: PaginationRequest;
  order?: "asc" | "desc";
};
export async function getActivitiesByFilter(
  filter: ActivityFilter,
): Promise<PaginationResponse<Activity>> {
  const { agentId, type, status, agentName, pagination, order } = filter;

  let page = pagination.page;
  let pageSize = pagination.pageSize;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 10;
  if (pageSize > 100) pageSize = 100;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (agentId !== undefined) {
    conditions.push(eq(activity.agentId, agentId));
  }
  if (type) {
    conditions.push(eq(activity.type, type));
  }
  if (status) {
    conditions.push(eq(activity.status, status));
  }
  if (agentName) {
    conditions.push(eq(activity.agentName, agentName));
  }

  const whereExpr =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const orderByExpr = order === "asc" ? asc(activity.createdAt) : desc(activity.createdAt);

  const [items, total] = await Promise.all([
    db.select().from(activity).where(whereExpr).orderBy(orderByExpr).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(activity).where(whereExpr),
  ]);

  return {
    items: items as Activity[],
    count: total[0]?.count || 0,
    page,
    pageSize,
  };
}

export async function getLastActivityFromId(agentId: number, fromActivityId: number) {
  const activities = await db
    .select()
    .from(activity)
    .where(and(eq(activity.agentId, agentId), gt(activity.id, fromActivityId)))
    .orderBy(asc(activity.id));
  return activities as Activity[];
}


export async function getLastActitivy(agentId: number, type: string) {
  const act = await db
    .select()
    .from(activity)
    .where(and(eq(activity.agentId, agentId), eq(activity.type, type)))
    .orderBy(desc(activity.createdAt))
    .limit(1);
  return act[0] ?? null;
}