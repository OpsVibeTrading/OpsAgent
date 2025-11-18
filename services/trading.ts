import { createAsterTradingClient } from "@lib/aster-trading";
import type {
  Balance,
  ClosePositionResponse,
  Kline,
  OpenOrder,
  OrderHistory,
  Position,
  QuickOrderResponse,
  Ticker24hr,
  Trade,
} from "@lib/aster-trading/client";
import { getTradingSymbols } from "@lib/db/query/symbol";
import type { Credentials } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { CACHE_KEY } from "@lib/redis";
import { redis } from "@lib/redis/client";

/**
 * Create a trading client for a portfolio
 */
export function createTradingClient(credentials: Credentials) {
  return createAsterTradingClient({
    apiKey: credentials.apiKey,
    baseURL: credentials.baseUrl,
  });
}

/**
 * Get portfolio balance
 */
export async function getPortfolioBalance(credentials: Credentials): Promise<Balance> {
  const client = createTradingClient(credentials);
  return await client.getBalance();
}

/**
 * Get active positions with open orders
 */
export async function getActivePositionsWithOrders(
  credentials: Credentials,
  symbol?: string,
): Promise<
  Array<
    Position & {
      openOrders: OpenOrder[];
    }
  >
> {
  const client = createTradingClient(credentials);

  // Fetch positions and open orders in parallel
  const [allPositions, allOpenOrders] = await Promise.all([
    client.getPositions(symbol),
    client.getOpenOrders(symbol),
  ]);

  // Filter only active positions (positionAmt != 0)
  const activePositions =allPositions ? allPositions.filter((pos) => Number(pos.positionAmt) > 0) : [];

  // Map positions with their associated orders
  return  activePositions.map((position) => {
    const openOrders = allOpenOrders ? allOpenOrders.filter((order) => order.symbol === position.symbol) : [];
    return {
      ...position,
      openOrders,
    };
  });
}

/**
 * Place a quick long order
 */
export async function placeQuickLong(
  credentials: Credentials,
  params: {
    symbol: string;
    usdtValue: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    leverage?: number;
  },
): Promise<QuickOrderResponse> {
  const client = createTradingClient(credentials);
  logger.info({ params }, "Placing quick LONG order");
  return await client.quickLong(params);
}

/**
 * Place a quick short order
 */
export async function placeQuickShort(
  credentials: Credentials,
  params: {
    symbol: string;
    usdtValue: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    leverage?: number;
  },
): Promise<QuickOrderResponse> {
  const client = createTradingClient(credentials);
  logger.info({ params }, "Placing quick SHORT order");
  return await client.quickShort(params);
}

/**
 * Close a position
 */
export async function closePosition(
  credentials: Credentials,
  symbol: string,
): Promise<ClosePositionResponse> {
  const client = createTradingClient(credentials);
  logger.info({ symbol }, "Closing position");
  return await client.closePosition(symbol);
}

/**
 * Get trade history grouped by orderId
 */
export async function getTradeHistoryGrouped(
  credentials: Credentials,
  params: {
    symbol: string;
    startTime?: number;
    endTime?: number;
    fromId?: number;
    limit?: number;
  },
): Promise<Record<number, Trade[]>> {
  const client = createTradingClient(credentials);
  const trades = await client.getTradeHistory(params);

  // Group trades by orderId
  const grouped: Record<number, Trade[]> = {};
  for (const trade of trades) {
    const orderTrades = grouped[trade.orderId];
    if (!orderTrades) {
      grouped[trade.orderId] = [trade];
    } else {
      orderTrades.push(trade);
    }
  }

  return grouped;
}

/**
 * Get raw trade history (un-grouped)
 */
export async function getTradeHistory(
  credentials: Credentials,
  params: {
    symbol: string;
    startTime?: number;
    endTime?: number;
    fromId?: number;
    limit?: number;
  },
): Promise<Trade[]> {
  const client = createTradingClient(credentials);
  return await client.getTradeHistory(params);
}

export async function getOrderHistory(
  credentials: Credentials,
  params: {
    symbol: string;
    startTime?: number;
    endTime?: number;
    fromId?: number;
    limit?: number;
  },
): Promise<OrderHistory[]> {
  const client = createTradingClient(credentials);
  return await client.getOrderHistory(params);
}

/**
 * Get tradable symbols with 24h ticker stats
 */
export async function getTradingSymbolsWithTicker(
  credentials: Credentials,
): Promise<Array<{ symbol: string; ticker: Ticker24hr | null }>> {
  const cacheKey = CACHE_KEY.tradingSymbolsWithTicker();
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as Array<{ symbol: string; ticker: Ticker24hr | null }>;
    } catch {
      // ignore parse error and fetch fresh
    }
  }

  const client = createTradingClient(credentials);
  const [symbols, allTickers] = await Promise.all([
    client.getTradingSymbols(),
    client.get24hrTicker() as Promise<Ticker24hr[]>,
  ]);

  const tickerMap = new Map<string, Ticker24hr>();
  for (const t of allTickers || []) {
    tickerMap.set(t.symbol, t);
  }

  const result = symbols.map((symbol) => ({ symbol, ticker: tickerMap.get(symbol) || null }));
  await redis.set(cacheKey, JSON.stringify(result), "EX", 30);
  return result;
}

/**
 * Get klines (candlesticks)
 */
export const getKlines = async (
  credentials: Credentials,
  params: {
    symbol: string;
    timeframe: string;
    limit?: number;
  },
): Promise<Kline[]> => {
  const client = createTradingClient(credentials);
  return await client.getKlines({ ...params, interval: params.timeframe });
};

export const isValidSymbol = async (symbol: string): Promise<boolean> => {
  const tradableSymbols = await getTradingSymbols();
  return tradableSymbols.some((s) => s.symbol === symbol);
};
