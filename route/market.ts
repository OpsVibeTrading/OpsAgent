import { createAsterTradingClient, type Ticker24hr } from "@lib/aster-trading";
import {
  priceTickerQuerySchema,
  ticker24hrQuerySchema,
} from "@lib/aster-trading/schemas";
import { catchAsync } from "@lib/response/exception";
import { sendError, sendSuccess } from "@lib/response/response";
import express from "express";
import { validateRequest } from "@/middleware";
import { redis } from "@lib/redis/client";
import { getTradingSymbols } from "@lib/db/query/symbol";
const router = express.Router();

// Public market data endpoints - no authentication required
// These endpoints provide real-time market data for all users

/**
 * Get all trading symbols
 * GET /api/v1/market/symbols
 */
const handleGetSymbols = async (_req: express.Request, res: express.Response) => {
  // Use a dummy API key for public market data endpoints
  const client = createAsterTradingClient({
    apiKey: process.env.ASTER_PUBLIC_API_KEY || "public",
    baseURL: process.env.ASTER_TRADING_BASE_URL || "https://example.com",
  });

  const symbols = await client.getTradingSymbols();
  return sendSuccess(res, "Trading symbols fetched successfully", symbols);
};

/**
 * Get 24hr ticker price change statistics
 * GET /api/v1/market/ticker/24hr?symbol=BTCUSDT
 * If symbol is not provided, returns data for all symbols
 */
const handleGet24hrTicker = async (req: express.Request, res: express.Response) => {
  const { query } = validateRequest({ query: ticker24hrQuerySchema }, req);

  const client = createAsterTradingClient({
    apiKey: process.env.ASTER_PUBLIC_API_KEY || "public",
    baseURL: process.env.ASTER_TRADING_BASE_URL || "https://example.com",
  });

  const ticker = await client.get24hrTicker(query.symbol);
  return sendSuccess(res, "24hr ticker data fetched successfully", ticker);
};

/**
 * Get current price ticker
 * GET /api/v1/market/ticker/price?symbol=BTCUSDT
 * If symbol is not provided, returns prices for all symbols
 */
const handleGetPriceTicker = async (req: express.Request, res: express.Response) => {
  const { query } = validateRequest({ query: priceTickerQuerySchema }, req);

  const client = createAsterTradingClient({
    apiKey: process.env.ASTER_PUBLIC_API_KEY || "public",
    baseURL: process.env.ASTER_TRADING_BASE_URL || "https://example.com",
  });

  const prices = await client.getPriceTicker(query.symbol);
  return sendSuccess(res, "Price ticker data fetched successfully", prices);
};

const handleGetTickers = async (req: express.Request, res: express.Response) => {
  const tradingSymbols = await getTradingSymbols();

  const symbols = tradingSymbols.map(s=>s.symbol)

  const cacheKey = `market:tickers:${symbols.join(",")}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return sendSuccess(res, "Tickers fetched successfully", JSON.parse(cachedData));
  }


  if (symbols.some((symbol) => symbol.includes("/"))) {
    return sendError(res, "Invalid symbol format, must be like: BTCUSDT");
  }
  if (symbols.length === 0) {
    return sendError(res, "Symbols are required");
  }

  const client = createAsterTradingClient({
    apiKey: process.env.ASTER_PUBLIC_API_KEY || "public",
    baseURL: process.env.ASTER_TRADING_BASE_URL || "https://example.com",
  });

  const response = await Promise.all(
    symbols.map(async (symbol) => {
      const ticker = (await client.get24hrTicker(symbol)) as Ticker24hr;
      if(!ticker) return null
      return {
        price: ticker.lastPrice,
        symbol: ticker.symbol,
        changePercent: parseFloat(ticker.priceChangePercent),
      };
    }),
  );
  if(response.filter((r=>r)).length){
    await redis.set(cacheKey, JSON.stringify(response), "EX", 30);
  }
  return sendSuccess(res, "Tickers fetched successfully", response);
};

// Routes
router.get("/symbols", catchAsync(handleGetSymbols));
router.get("/ticker/24hr", catchAsync(handleGet24hrTicker));
router.get("/ticker/price", catchAsync(handleGetPriceTicker));

router.get("/tickers", catchAsync(handleGetTickers));
export default router;
