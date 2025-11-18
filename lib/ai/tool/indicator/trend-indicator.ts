import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { Credentials } from "@lib/db/schema";
import { getKlines } from "@services/trading";
import { tool } from "ai";
import {
  exponentialMovingAverage,
  movingAverageConvergenceDivergence,
  simpleMovingAverage,
} from "indicatorts";
import { z } from "zod";

const baseSchema = {
  symbol: z.string().describe("Trading pair, e.g., 'BTCUSDT'"),
  timeframe: z.string().default("1h").describe("Timeframe, e.g., '1m', '1h', '1d'"),
  limit: z.number().default(100).describe("Number of OHLCV data points to fetch"),
};

export const calculateExponentialMovingAverage = (credentials: Credentials) => tool({
  description: "Calculate the Exponential Moving Average (EMA) using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    period: z.number().default(10).describe("Period length for EMA"),
  }),
  execute: async ({
    symbol,
    timeframe,
    period,
    limit,
  }: {
    symbol: string;
    timeframe: string;
    period: number;
    limit: number;
  }): Promise<ToolResult<any>> => {
    try {
  
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const result = exponentialMovingAverage(asset.map((kline) => Number(kline.close)), { period });
      const lastValue = result[result.length - 1];
      return ok(lastValue, "Calculated EMA");
    } catch (error) {
      return fail("Failed to calculate EMA", error);
    }
  },
});

export const calculateMovingAverageConvergenceDivergence = (credentials: Credentials) => tool({
  description:
    "Calculate the Moving Average Convergence Divergence (MACD) using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    fastPeriod: z.number().default(12).describe("Fast period for MACD"),
    slowPeriod: z.number().default(26).describe("Slow period for MACD"),
    signalPeriod: z.number().default(9).describe("Signal period for MACD"),
  }),
  execute: async ({
    symbol,
    timeframe,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    limit,
  }: {
    symbol: string;
    timeframe: string;
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    limit: number;
  }): Promise<ToolResult<any>> => {
    try {
  
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const macdResult = movingAverageConvergenceDivergence(asset.map((kline) => Number(kline.close)), {
        fast: fastPeriod,
        slow: slowPeriod,
        signal: signalPeriod,
      });

      // Ensure we have values and get the last ones
      const lastMacdLine = macdResult.macdLine[macdResult.macdLine.length - 1] || 0;
      const lastSignalLine = macdResult.signalLine[macdResult.signalLine.length - 1] || 0;

      const result = {
        macdLine: lastMacdLine,
        signalLine: lastSignalLine,
        macdHistogram: lastMacdLine - lastSignalLine,
      };
      return ok(result, "Calculated MACD");
    } catch (error) {
      return fail("Failed to calculate MACD", error);
    }
  },
});

export const calculateSimpleMovingAverage = (credentials: Credentials) => tool({
  description: "Calculate the Simple Moving Average (SMA) using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    period: z.number().default(10).describe("Period length for SMA"),
  }),
  execute: async ({
    symbol,
    timeframe,
    period,
    limit,
  }: {
    symbol: string;
    timeframe: string;
    period: number;
    limit: number;
  }): Promise<ToolResult<any>> => {
    try {
  
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const result = simpleMovingAverage(asset.map((kline) => Number(kline.close)), { period });
      const lastValue = result[result.length - 1];
      return ok(lastValue, "Calculated SMA");
    } catch (error) {
      return fail("Failed to calculate SMA", error);
    }
  },
});

const trendIndicatorTools = {
  calculateExponentialMovingAverage,
  calculateMovingAverageConvergenceDivergence,
  calculateSimpleMovingAverage,
};
export default trendIndicatorTools;
