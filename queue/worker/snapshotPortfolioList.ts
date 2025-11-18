import { createWorker } from "@lib/bullmq";
import { getAgentByPortfolioId, setAgentStatus } from "@lib/db/query/agent";
import { getBalanceSnapshotByPortfolioId } from "@lib/db/query/balance-snapshot";
import { bulkInsertOrderHistory, getLastAsterOrder } from "@lib/db/query/order";
import { addPortfolioRealizedPnl, getPortfolios } from "@lib/db/query/portfolio";
import { getTradingSymbols } from "@lib/db/query/symbol";
import { bulkInsertTradeHistory, getLastAsterTrade } from "@lib/db/query/trade-history";
import type { Credentials } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { redis } from "@lib/redis/client";
import {
  type ActivePosition,
  type CompletedPosition,
  getActivePositionByPortfolio,
  getCompletedPositionByPortfolio,
} from "@services/portfolio";
import { getOrderHistory, getPortfolioBalance, getTradeHistory } from "@services/trading";
import type { Job } from "bullmq";
import { formatNumber } from "@/utils";
import { runAgentQueue } from "../job/runAgent";
import { snapshotBalanceQueue } from "../job/snapshotBalance";
import { snapshotPortfolioListQueue } from "../job/snapshotPortfolioList";
import { QueueNames, type SnapshotPortfolioListJobData } from "../types";

type PortfolioResposne = {
  name: string;
  avatar: string;
  balanceSnapshot: {
    timestamp: string;
    balance: number;
    totalBalance: number;
    totalPnl: number;
    availableBalance: number;
  }[];
  agent: Record<string, unknown>;
  activePosition: ActivePosition[];
  completedPosition: CompletedPosition[];
  pnl: number;
  unrealizePnl: number;
  lockBalance: number;
  totalBalance: number;
  availableBalance: number;
  activities: unknown[];
};
async function snapshotPortfolioListProcessor() {
  const cacheKey = `portfolio:list`;
  const data = await getPortfolios();

  // Populate Agent
  const response: PortfolioResposne[] = (
    await Promise.all(
      data.map(async (portfolio) => {
        if (!portfolio.isVisible) return null;
        if (!portfolio.credentials) return null;
        const agent = await getAgentByPortfolioId(portfolio.id);
        const balanceSnapshot = await getBalanceSnapshotByPortfolioId(portfolio.id);
        const balance = await getPortfolioBalance(portfolio.credentials as Credentials);

        const tradingSymbols = await getTradingSymbols();
        // Sync trade history per symbol: fetch -> save -> repeat if page full
        await Promise.all(
          tradingSymbols.map(async (s) => {
            const lastTrade = await getLastAsterTrade(portfolio.id, s.symbol);
            // Loop until less than limit fetched
            let fromId = lastTrade?.asterTradeId ? Number(lastTrade.asterTradeId) : undefined;
            for (;;) {
              const trades = await getTradeHistory(portfolio.credentials as Credentials, {
                symbol: s.symbol,
                ...(fromId && {
                  fromId: fromId,
                }),
                limit: 300,
              });

              const freshTrades =
                typeof fromId === "number"
                  ? trades.filter((t) => t.id > (fromId as number))
                  : trades;
              if (!freshTrades || freshTrades.length === 0) break;
              await bulkInsertTradeHistory(portfolio.id, freshTrades);
              // After inserting this page, accumulate realized pnl from just-fetched trades and add to portfolio.pnl
              const deltaRealized = freshTrades.reduce(
                (sum, t) => sum + Number(t.realizedPnl || 0),
                0,
              );
              if (deltaRealized) {
                await addPortfolioRealizedPnl(portfolio.id, deltaRealized);
              }
              if (freshTrades.length < 300) break;
              const lastTrade = freshTrades[freshTrades.length - 1];
              if (!lastTrade) break;
              fromId = lastTrade.id + 1;
            }

            const lastOrder = await getLastAsterOrder(portfolio.id, s.symbol);
            let fromOrderId = lastOrder?.orderId ? Number(lastOrder.orderId) : undefined;
            for (;;) {
              const orders = await getOrderHistory(portfolio.credentials as Credentials, {
                ...(fromOrderId && { fromId: fromOrderId }),
                symbol: s.symbol,
                limit: 300,
              });
              if (!orders || orders.length === 0) break;
              const freshOrders =
                typeof fromOrderId === "number"
                  ? orders.filter((o) => o.orderId > (fromOrderId as number))
                  : orders;
              if (!freshOrders || freshOrders.length === 0) break;
              const historyOrderDb = freshOrders.map((o) => ({
                portfolioId: portfolio.id,
                orderId: o.orderId.toString(),
                symbol: o.symbol,
                status: o.status as "FILLED" | "CANCELED" | "NEW" | "EXPIRED",
                clientOrderId: o.clientOrderId,
                avgPrice: o.avgPrice,
                side: o.side as "BUY" | "SELL",
                origQty: o.origQty,
                executedQty: o.executedQty,
                cumQuote: o.cumQuote,
                timeInForce: o.timeInForce,
                type: o.type as "MARKET" | "STOP_MARKET" | "TAKE_PROFIT_MARKET" | "STOP_LIMIT",
                reduceOnly: o.reduceOnly,
                closePosition: o.closePosition,
                stopPrice: o.stopPrice,
                workingType: o.workingType,
                priceProtect: o.priceProtect,
                origType: o.origType,
                time: new Date(o.time),
                updateTime: new Date(o.updateTime),
                newChainData: o.newChainData,
              }));
              await bulkInsertOrderHistory(historyOrderDb);
              if (freshOrders.length < 300) break;
              const lastOrder = freshOrders[freshOrders.length - 1];
              if (!lastOrder) break;
              fromOrderId = lastOrder.orderId + 1;
            }
          }),
        );

        const activePosition = await getActivePositionByPortfolio(portfolio.id);
        const completedPosition = await getCompletedPositionByPortfolio(portfolio.id);
        const unrealizePnl = activePosition.reduce(
          (acc, p) => acc + (Number(p.unrealizePnl) || 0),
          0,
        );
        const lockBalance = activePosition.reduce(
          (acc, p) => acc + (Number(p.notional) || 0) / (Number(p.leverage) || 1),
          0,
        );
        const totalBalance = parseFloat(balance.availableBalance) + lockBalance + unrealizePnl;

        return {
          name: portfolio.name,
          avatar: portfolio.avatar || "",
          balanceSnapshot: balanceSnapshot.map((snapshot) => ({
            timestamp: snapshot.createdAt.toISOString(),
            balance: formatNumber(snapshot.totalBalance),
            availableBalance: formatNumber(snapshot.availableBalance),
            totalPnl: formatNumber(snapshot.totalPnl),
            totalBalance: formatNumber(snapshot.totalBalance),
          })),
          agent: agent || {},
          completedPosition: completedPosition.map((p) => ({
            ...p,
            pnl: formatNumber(p.pnl),
            // Remove 'notional' property (not part of CompletedPosition)
          })),
          activePosition: activePosition.map((p) => ({
            ...p,
            unrealizePnl: formatNumber(p.unrealizePnl),
            notional: formatNumber((p as any).notional), // Type cast if notional is only on activePosition
          })),
          pnl: formatNumber(portfolio.pnl),
          unrealizePnl: formatNumber(unrealizePnl),
          lockBalance: formatNumber(lockBalance),
          totalBalance: formatNumber(totalBalance),
          availableBalance: formatNumber(parseFloat(balance.availableBalance)),
          activities: [],
        };
      }),
    )
  ).filter((r) => r !== null) as PortfolioResposne[];

  if (Array.isArray(response)) {
    await redis.set(cacheKey, JSON.stringify(response));
  }
}

export async function createSnapshotPortfolioListWorker() {
  const snapshotPortfolioListWorker = createWorker(
    QueueNames.SNAPSHOT_PORTFOLIO_LIST,
    snapshotPortfolioListProcessor,
    {
      concurrency: 1000,
    },
  );

  snapshotPortfolioListWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Run snapshot portfolio list job completed");
  });

  snapshotPortfolioListWorker.on(
    "failed",
    async (job: Job<SnapshotPortfolioListJobData> | undefined, err) => {
      if (job) {
        logger.error(`Job ${job.id} has failed with ${err.message}`);
        return;
      }
      logger.error({ error: err.message }, "Run agent job failed");
    },
  );

  snapshotPortfolioListWorker.on("stalled", async (jobId: string) => {
    const job = await runAgentQueue.getJob(jobId);
    if (!job) {
      return;
    }
    await setAgentStatus(job.data.agentId, "idle");
    return;
  });
}

export async function createSnapshotPortfolioListJob() {
  await snapshotPortfolioListQueue.upsertJobScheduler(
    `snap-shot-portfolio-list-scheduled`,
    {
      // 2 m
      every: 1000 * 60 * 2,
      immediately: true,
    },
    {
      data: {},
      opts: {
        removeOnFail: true,
        removeOnComplete: true,
      },
    },
  );
}
