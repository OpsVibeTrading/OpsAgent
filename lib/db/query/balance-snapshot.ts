import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { balanceSnapshot } from "../schema";

type CreateBalanceSnapshotData = {
  portfolioId: number;
  availableBalance: string;
  totalBalance: string;
  totalPnl: string;
  createdAt: Date
};
export async function createBalanceSnapshot(data: CreateBalanceSnapshotData) {
  const [inserted] = await db
    .insert(balanceSnapshot)
    .values({
      portfolioId: data.portfolioId,
      availableBalance: data.availableBalance.toString(),
      totalBalance: data.totalBalance.toString(),
      totalPnl: data.totalPnl.toString(),
      createdAt:data.createdAt,
    })
    .returning();
  return inserted;
}

export async function getBalanceSnapshotByPortfolioId(portfolioId: number, limit: number = 100) {
  const data = await db
    .select()
    .from(balanceSnapshot)
    .where(eq(balanceSnapshot.portfolioId, portfolioId))
    .orderBy(desc(balanceSnapshot.createdAt))
    .limit(limit);

  return data;
}
