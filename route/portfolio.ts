import type { OpenOrder, Position } from "@lib/aster-trading";
import {
  closePositionSchema,
  fetchPositionsQuerySchema,
  fetchTradeHistoryQuerySchema,
  quickLongSchema,
  quickShortSchema,
} from "@lib/aster-trading/schemas";
import { createAgent, getAgentByPortfolioId } from "@lib/db/query/agent";
import { getBalanceSnapshotByPortfolioId } from "@lib/db/query/balance-snapshot";
import { bulkInsertOrderHistory, getLastAsterOrder } from "@lib/db/query/order";
import {
  addPortfolioRealizedPnl,
  createPortfolio,
  getPortfolioById,
  getPortfolios,
  updatePortfolioCredentials,
} from "@lib/db/query/portfolio";
import { getTradingSymbols } from "@lib/db/query/symbol";
import type { GroupedOrder } from "@lib/db/query/trade-history";
import {
  bulkInsertTradeHistory,
  getGroupedOrdersByPortfolio,
  getLastAsterTrade,
} from "@lib/db/query/trade-history";
import type { Credentials } from "@lib/db/schema";
import { redis } from "@lib/redis/client";
import { catchAsync, NotFoundException } from "@lib/response/exception";
import { sendError, sendSuccess } from "@lib/response/response";
import {
  createPortfolioSchema,
  importApiKeySchema,
  portfolioIdParamSchema,
} from "@schema/portfolio";
import type { ActivePosition, CompletedPosition } from "@services/portfolio";
import { getActivePositionByPortfolio, getCompletedPositionByPortfolio } from "@services/portfolio";
import {
  closePosition,
  getActivePositionsWithOrders,
  getOrderHistory,
  getPortfolioBalance,
  getTradeHistory,
  getTradeHistoryGrouped,
  placeQuickLong,
  placeQuickShort,
} from "@services/trading";
import express from "express";
import { adminMiddleware, validateRequest } from "@/middleware";
import { formatNumber } from "@/utils";

const router = express.Router();

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
const handleListPortfolios = async (_req: express.Request, res: express.Response) => {
  const cacheKey = `portfolio:list`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return sendSuccess(res, "Portfolios fetched successfully", JSON.parse(cachedData));
  }
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

  return sendSuccess(res, "Portfolios fetched successfully", response);
};
const handleCreatePortfolio = async (req: express.Request, res: express.Response) => {
  const { body } = validateRequest({ body: createPortfolioSchema }, req);
  const { name, description, avatar, agentData, credentials } = body;
  const portfolio = await createPortfolio({
    name,
    description,
    avatar,
    credentials,
  });
  if (!portfolio) {
    return sendError(res, "Failed to create portfolio");
  }
  const agent = await createAgent({
    portfolioId: portfolio.id,
    instruction: agentData.instruction,
    model: agentData.model,
  });
  if (!agent) {
    return sendError(res, "Failed to create agent");
  }
  return sendSuccess(res, "Portfolio created successfully", {
    portfolio,
    agent,
  });
};
// Import API key to portfolio
const handleImportApiKey = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: portfolioIdParamSchema, body: importApiKeySchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  const credentials: Credentials = {
    apiKey: body.apiKey,
    apiSecret: body.apiSecret || "",
    password: body.password,
    baseUrl: body.baseUrl,
  };

  const updated = await updatePortfolioCredentials(params.portfolioId, credentials);
  return sendSuccess(res, "API key imported successfully", updated);
};

// Place quick long order
const handleQuickLong = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: portfolioIdParamSchema, body: quickLongSchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  if (!portfolio.credentials) {
    return sendError(res, "Portfolio has no trading credentials");
  }

  const result = await placeQuickLong(portfolio.credentials as Credentials, body);
  return sendSuccess(res, "Quick LONG order placed successfully", result);
};

// Place quick short order
const handleQuickShort = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: portfolioIdParamSchema, body: quickShortSchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  if (!portfolio.credentials) {
    return sendError(res, "Portfolio has no trading credentials");
  }

  const result = await placeQuickShort(portfolio.credentials as Credentials, body);
  return sendSuccess(res, "Quick SHORT order placed successfully", result);
};

// Close position
const handleClosePosition = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: portfolioIdParamSchema, body: closePositionSchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  if (!portfolio.credentials) {
    return sendError(res, "Portfolio has no trading credentials");
  }

  const result = await closePosition(portfolio.credentials as Credentials, body.symbol);
  return sendSuccess(res, "Position closed successfully", result);
};

// Get current positions with open orders
const handleGetPositions = async (req: express.Request, res: express.Response) => {
  const { params, query } = validateRequest(
    { params: portfolioIdParamSchema, query: fetchPositionsQuerySchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  if (!portfolio.credentials) {
    return sendError(res, "Portfolio has no trading credentials");
  }

  const positions = await getActivePositionsWithOrders(
    portfolio.credentials as Credentials,
    query.symbol,
  );
  return sendSuccess(res, "Positions fetched successfully", positions);
};

// Get trade history grouped by orderId
const handleGetTradeHistory = async (req: express.Request, res: express.Response) => {
  const { params, query } = validateRequest(
    { params: portfolioIdParamSchema, query: fetchTradeHistoryQuerySchema },
    req,
  );

  const portfolio = await getPortfolioById(params.portfolioId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  if (!portfolio.credentials) {
    return sendError(res, "Portfolio has no trading credentials");
  }

  const groupedTrades = await getTradeHistoryGrouped(portfolio.credentials as Credentials, {
    symbol: query.symbol,
    startTime: query.startTime,
    endTime: query.endTime,
    fromId: query.fromId,
    limit: query.limit,
  });

  return sendSuccess(res, "Trade history fetched successfully", groupedTrades);
};

// Get portfolio balance
// const handleGetBalance = async (req: express.Request, res: express.Response) => {
//   const { params } = validateRequest({ params: portfolioIdParamSchema }, req);

//   const portfolio = await getPortfolioById(params.portfolioId);
//   if (!portfolio) {
//     throw new NotFoundException("Portfolio not found");
//   }

//   if (!portfolio.credentials) {
//     return sendError(res, "Portfolio has no trading credentials");
//   }

//   const balance = await getPortfolioBalance(portfolio.credentials as Credentials);
//   return sendSuccess(res, "Balance fetched successfully", {balance});
// };

const handleGetLiveBalance = async (req: express.Request, res: express.Response) => {
  const cacheKey = `portfolio:live-balance`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return sendSuccess(res, "Live balance fetched successfully", JSON.parse(cachedData));
  }
  const portfolios = await getPortfolios();
  if (portfolios.length === 0) {
    return sendError(res, "No portfolio IDs provided");
  }
  const portfolioBalances = await Promise.all(
    portfolios.map(async (portfolio) => {
      if (!portfolio.credentials) {
        return null;
      }
      const balance = await getPortfolioBalance(portfolio.credentials as Credentials);
      const activePosition = await getActivePositionByPortfolio(portfolio.id);
      const lockBalance = activePosition.reduce(
        (acc, p) => acc + (Number(p.notional) || 0) / (Number(p.leverage) || 1),
        0,
      );
      const unrealizePnl = activePosition.reduce(
        (acc, p) => acc + (Number(p.unrealizePnl) || 0),
        0,
      );
      const totalBalance = parseFloat(balance.availableBalance) + lockBalance + unrealizePnl;
      return {
        timestamp: new Date().toISOString(),
        balances: {
          name: portfolio.name,
          balance: formatNumber(balance.availableBalance),
          totalBalance: formatNumber(totalBalance),
          unrealizePnl: formatNumber(unrealizePnl),
        },
      };
    }),
  );
  if (portfolioBalances.length) {
    await redis.set(cacheKey, JSON.stringify(portfolioBalances), "EX", 60);
  }

  return sendSuccess(res, "Live balance fetched successfully", portfolioBalances);
};

// Public routes
router.get("/", handleListPortfolios);
router.get("/:portfolioId/positions", handleGetPositions);
router.get("/:portfolioId/trade-history", handleGetTradeHistory);
// router.get("/:portfolioId/balance", handleGetBalance);
router.post("/", adminMiddleware, handleCreatePortfolio);
router.get("/live-balance", handleGetLiveBalance);

// Admin-only routes
router.post("/:portfolioId/import-api-key", adminMiddleware, handleImportApiKey);
router.post("/:portfolioId/quick-long", adminMiddleware, handleQuickLong);
router.post("/:portfolioId/quick-short", adminMiddleware, handleQuickShort);
router.post("/:portfolioId/close-position", adminMiddleware, handleClosePosition);
export default router;
