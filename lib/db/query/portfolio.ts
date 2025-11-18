import { and, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import type { Credentials } from "../schema";
import { portfolio } from "../schema";

export type PortfolioData = {
  name: string;
  description?: string | null;
  avatar?: string | null;
  credentials?: Credentials | null;
};
export async function createPortfolio(data: PortfolioData) {
  const newPortfolio = await db.insert(portfolio).values(data).returning();
  return newPortfolio[0];
}

export async function getPortfolioById(id: number) {
  const data = await db
    .select()
    .from(portfolio)
    .where(and(eq(portfolio.id, id), isNull(portfolio.deletedAt)));
  return data[0] || null;
}

export async function getPortfolios() {
  return db.select().from(portfolio).where(isNull(portfolio.deletedAt));
}

export async function updatePortfolioCredentials(id: number, credentials: Credentials) {
  const updated = await db
    .update(portfolio)
    .set({ credentials, updatedAt: new Date() })
    .where(eq(portfolio.id, id))
    .returning();
  return updated[0] || null;
}

export async function addPortfolioRealizedPnl(id: number, delta: number) {
  if (!delta || Number.isNaN(delta)) return null;
  const existing = await getPortfolioById(id);
  const currentPnl = existing ? Number(existing.pnl) || 0 : 0;
  const nextPnl = (currentPnl + delta).toString();
  const updated = await db
    .update(portfolio)
    .set({ pnl: nextPnl, updatedAt: new Date() })
    .where(eq(portfolio.id, id))
    .returning();
  return updated[0] || null;
}
