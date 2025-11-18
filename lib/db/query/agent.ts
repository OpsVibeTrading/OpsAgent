import { and, eq } from "drizzle-orm";
import { db } from "../client";
import type { Agent } from "../schema";

import { agent } from "../schema";

type CreateAgentInput = {
  portfolioId: number;
  instruction: string;
  model: string;
};
export async function createAgent(data: CreateAgentInput): Promise<Agent> {
  const [inserted] = await db
    .insert(agent)
    .values({
      id: data.portfolioId,
      portfolioId: data.portfolioId,
      status: "not_started",
      instruction: data.instruction ?? null,
      model: data.model,
    })
    .returning();
  if (!inserted) {
    throw new Error("Failed to insert agent");
  }
  return inserted;
}

export async function getAgentById(id: number): Promise<Agent | null> {
  const [existing] = await db.select().from(agent).where(eq(agent.id, id));
  return existing || null;
}

export async function getAgentByPortfolioId(portfolioId: number) {
  const data = await db.select().from(agent).where(eq(agent.portfolioId, portfolioId));
  return data[0] || null;
}

export async function listAgents(): Promise<Agent[]> {
  const agents = await db.select().from(agent);
  return agents;
}

export async function tryBootstrapAgentToIdle(id: number) {
  const result = await db
    .update(agent)
    .set({ status: "idle", updatedAt: new Date() })
    .where(and(eq(agent.id, id), eq(agent.status, "not_started")))
    .returning({ id: agent.id });

  return result.length === 1;
}

export async function trySetAgentRunningFromIdle(id: number): Promise<boolean> {
  const result = await db
    .update(agent)
    .set({ status: "running", updatedAt: new Date() })
    .where(and(eq(agent.id, id), eq(agent.status, "idle")))
    .returning({ id: agent.id });

  return result.length === 1;
}

export async function trySetAgentPausedFromIdle(id: number): Promise<boolean> {
  const result = await db
    .update(agent)
    .set({ status: "paused", updatedAt: new Date() })
    .where(and(eq(agent.id, id), eq(agent.status, "idle")))
    .returning({ id: agent.id });

  return result.length === 1;
}

export async function tryResumeAgentToIdle(id: number): Promise<boolean> {
  const result = await db
    .update(agent)
    .set({ status: "idle", updatedAt: new Date() })
    .where(and(eq(agent.id, id), eq(agent.status, "paused")))
    .returning({ id: agent.id });

  return result.length === 1;
}

export function setAgentStatus(id: number, status: "not_started" | "running" | "idle" | "paused") {
  return db.update(agent).set({ status, updatedAt: new Date() }).where(eq(agent.id, id));
}
